import { CARD_COUNT } from './constants.js';

const PROJECTS = [
  {
    title: 'The Line',
    video: '/videos/The%20line%20Project%20Vid.webm',
  },
  {
    title: 'Parenting',
    video: '/videos/Parenting%20Project%20Vid.webm',
  },
  {
    title: 'Farmers',
    video: '/videos/Farmers%20Project%20Vid.webm',
  },
  {
    title: '3D Brand',
    video: '/videos/3D%20Project%20vid.webm',
  },
  {
    title: 'Valorat',
    video: '/videos/Valorat%20project%20vid.webm',
  },
  {
    title: 'Logo Motion',
    video: '/videos/Logo%20animation%20vid.webm',
  },
];

export function buildCards(count = CARD_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const project = PROJECTS[i % PROJECTS.length];
    return {
      id: i,
      title: project.title,
      href: '/work/',
      video: project.video,
      cover: '',
    };
  });
}

/**
 * Grab a still from a video to use as the card cover.
 * Cached per video URL so 34 cards sharing 6 videos only decode 6 times.
 */
function captureVideoThumbnail(src, atTime = 0.35) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.src = src;

    let settled = false;
    const finish = (url) => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      video.load();
      resolve(url || '');
    };

    const draw = () => {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 360;
      if (!w || !h) {
        finish('');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        finish('');
        return;
      }
      try {
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            finish(blob ? URL.createObjectURL(blob) : '');
          },
          'image/jpeg',
          0.88,
        );
      } catch {
        finish('');
      }
    };

    const onReady = async () => {
      try {
        // Nudge the decoder so seeking has a frame to show.
        const play = video.play();
        if (play?.then) await play.catch(() => {});
        video.pause();
      } catch {
        /* ignore autoplay blocks — seek may still work */
      }

      const duration = Number.isFinite(video.duration) ? video.duration : 1;
      const t = Math.min(Math.max(atTime, 0.05), Math.max(duration * 0.2, 0.05));

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        draw();
      };
      video.addEventListener('seeked', onSeeked);

      try {
        video.currentTime = t;
      } catch {
        video.removeEventListener('seeked', onSeeked);
        draw();
      }
    };

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('error', () => finish(''), { once: true });
    window.setTimeout(() => finish(''), 8000);
  });
}

/**
 * Set each card.cover to a thumbnail of its own video, then decode the image
 * so nothing pops mid-deal.
 */
export async function prepareCardThumbnails(cards, onProgress) {
  const total = cards.length;
  let done = 0;
  const cache = new Map();

  const prepared = await Promise.all(
    cards.map(async (card) => {
      let cover = cache.get(card.video);
      if (!cover) {
        cover = await captureVideoThumbnail(card.video);
        cache.set(card.video, cover);
      }

      if (cover) {
        try {
          const img = new Image();
          img.decoding = 'async';
          img.src = cover;
          if (typeof img.decode === 'function') await img.decode();
          else {
            await new Promise((res, rej) => {
              img.onload = res;
              img.onerror = rej;
            });
          }
        } catch {
          /* still assign cover — browser may paint from blob cache */
        }
      }

      done += 1;
      onProgress?.(done / total);
      return { ...card, cover };
    }),
  );

  return prepared;
}

/** @deprecated use prepareCardThumbnails */
export async function decodeCovers(cards, onProgress) {
  return prepareCardThumbnails(cards, onProgress);
}
