import { CARD_COUNT } from './constants.js';

const PROJECTS = [
  {
    title: 'The Line',
    video: '/videos/The%20line%20Project%20Vid.webm?v=20261021',
    cover: '/videos/The%20line%20Project%20thumbnail.webp',
  },
  {
    title: 'Parenting',
    video: '/videos/Parenting%20Project%20Vid.webm',
    cover: '/videos/Parenting%20Project%20Thumbnail.webp',
  },
  {
    title: 'Farmers',
    video: '/videos/Farmers%20Project%20Vid.webm',
    cover: '/videos/Farmers%20Project%20thumbnail.webp',
  },
  {
    title: '3D Brand',
    video: '/videos/3D%20Project%20vid.webm',
    cover: '/videos/3D%20Project%20thumbnail.webp',
  },
  {
    title: 'Valorat',
    video: '/videos/Valorat%20project%20vid.webm',
    cover: '/videos/Valorat%20project%20thumbnail.webp',
  },
  {
    title: 'Logo Motion',
    video: '/videos/Logo%20animation%20vid.webm',
    cover: '/videos/Logo%20animation%20thumbnail.webp',
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
      cover: project.cover,
    };
  });
}

/**
 * Decode static WebP covers so cards paint sharp from the first deal frame.
 * No video seek/canvas capture — keeps the hero reveal light.
 */
export async function prepareCardThumbnails(cards, onProgress) {
  const total = cards.length;
  let done = 0;
  const decoded = new Map();

  const prepared = await Promise.all(
    cards.map(async (card) => {
      const cover = card.cover || '';
      if (cover && !decoded.has(cover)) {
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
          decoded.set(cover, true);
        } catch {
          decoded.set(cover, false);
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
