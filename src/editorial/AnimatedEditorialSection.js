/**
 * AnimatedEditorialSection - shallow 3D orbiting editorial card fan
 * Inspired by orbit poster-board compositions (continuous, seamless loop).
 */

const DEFAULT_CARDS = [
  {
    id: 'project-3d',
    type: 'video',
    src: '/videos/3D%20Project%20vid.webm',
  },
  {
    id: 'project-farmers',
    type: 'video',
    src: '/videos/Farmers%20Project%20Vid.webm',
  },
  {
    id: 'project-logo',
    type: 'video',
    src: '/videos/Logo%20animation%20vid.webm',
  },
  // Halfway around the ring = back of the fan at start
  {
    id: 'project-valorat',
    type: 'video',
    src: '/videos/Valorat%20project%20vid.webm',
  },
  {
    id: 'project-parenting',
    type: 'video',
    src: '/videos/Parenting%20Project%20Vid.webm',
  },
  {
    id: 'project-line',
    type: 'video',
    src: '/videos/The%20line%20Project%20Vid.webm',
  },
];

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function createGraphic(card) {
  const el = document.createElement('div');
  el.className = `editorial-card__graphic editorial-card__graphic--${card.variant}`;

  if (card.variant === 'sphere') {
    el.innerHTML = `
      <div class="editorial-orb" aria-hidden="true">
        <span class="editorial-orb__core"></span>
        <span class="editorial-orb__shine"></span>
      </div>`;
  } else if (card.variant === 'type-light' || card.variant === 'type-yellow') {
    const stack = document.createElement('div');
    stack.className = 'editorial-type';
    (card.lines || ['EDIT', '01']).forEach((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      stack.append(span);
    });
    el.append(stack);
  } else if (card.variant === 'mark') {
    el.innerHTML = `
      <svg class="editorial-mark" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M32 12v40M12 32h40" stroke="currentColor" stroke-width="1"/>
        <circle cx="32" cy="32" r="2.2" fill="currentColor"/>
      </svg>`;
  } else if (card.variant === 'rings') {
    el.innerHTML = `
      <svg class="editorial-rings" viewBox="0 0 200 320" aria-hidden="true">
        <circle cx="100" cy="150" r="78" fill="none" stroke="currentColor" stroke-width="1"/>
        <circle cx="100" cy="150" r="52" fill="none" stroke="currentColor" stroke-width="1"/>
        <circle cx="100" cy="150" r="26" fill="none" stroke="currentColor" stroke-width="1"/>
        <path d="M22 150h156M100 72v156" stroke="currentColor" stroke-width="0.8" opacity="0.55"/>
      </svg>`;
  }

  return el;
}

function createCard(card, index) {
  const article = document.createElement('article');
  article.className = `editorial-card editorial-card--${card.type}`;
  article.dataset.id = card.id;
  article.dataset.index = String(index);

  const inner = document.createElement('div');
  inner.className = 'editorial-card__inner';

  if (card.type === 'image' || card.type === 'video') {
    const media = document.createElement(card.type === 'video' ? 'video' : 'img');
    media.className = 'editorial-card__media';
    media.src = card.src;
    media.alt = '';
    media.decoding = 'async';
    if (media.tagName === 'VIDEO') {
      media.muted = true;
      media.defaultMuted = true;
      media.volume = 0;
      media.loop = true;
      media.playsInline = true;
      media.autoplay = true;
      media.preload = 'auto';
      media.setAttribute('muted', '');
      media.setAttribute('autoplay', '');
      media.setAttribute('playsinline', '');
      media.setAttribute('webkit-playsinline', '');
    } else {
      media.loading = index < 3 ? 'eager' : 'lazy';
      media.setAttribute('draggable', 'false');
    }
    if (card.mono) {
      media.style.filter = `grayscale(1) contrast(${card.contrast || 1.1})`;
    } else if (card.darken) {
      media.style.filter = 'brightness(0.72) contrast(1.12) saturate(0.75)';
    }
    inner.append(media);
  } else {
    inner.append(createGraphic(card));
  }

  article.append(inner);
  return article;
}

/**
 * @param {HTMLElement} root
 * @param {{ cards?: typeof DEFAULT_CARDS, direction?: 1|-1 }} [options]
 */
export function initAnimatedEditorialSection(root, options = {}) {
  if (!root) return null;

  const cards = options.cards || DEFAULT_CARDS;
  let reduced = prefersReducedMotion();
  // RTL pages read right→left; reverse orbit so the fan travels that way.
  const direction =
    options.direction ??
    (document.documentElement.getAttribute('dir') === 'rtl' ||
    document.documentElement.lang === 'ar'
      ? -1
      : 1);

  root.classList.add('editorial-orbit');
  root.setAttribute('aria-label', 'Editorial animated showcase');

  const stage = document.createElement('div');
  stage.className = 'editorial-orbit__stage';

  const track = document.createElement('div');
  track.className = 'editorial-orbit__track';

  const cardEls = cards.map((card, i) => {
    const el = createCard(card, i);
    track.append(el);
    return el;
  });

  stage.append(track);
  root.replaceChildren(stage);

  const videos = [...root.querySelectorAll('video')];
  const n = cardEls.length;
  const twoPi = Math.PI * 2;
  let angle = 0;
  let raf = 0;
  let last = 0;
  let running = false;
  let destroyed = false;
  let radiusX = Math.max(460, root.clientWidth * 0.44);
  let radiusZ = Math.max(220, root.clientWidth * 0.2);
  let isMobile = false;
  let speed = 0.26;

  function syncSpeed() {
    if (reduced) {
      speed = isMobile ? 0.09 : 0.14;
    } else {
      speed = isMobile ? 0.16 : 0.26;
    }
  }

  function measure() {
    isMobile = window.matchMedia('(max-width: 650px)').matches;
    if (isMobile) {
      // Mobile ring: ~20% wider than previous tight spacing
      radiusX = Math.max(240, root.clientWidth * 0.36);
      radiusZ = Math.max(130, root.clientWidth * 0.17);
    } else {
      radiusX = Math.max(460, root.clientWidth * 0.44);
      radiusZ = Math.max(220, root.clientWidth * 0.2);
    }
    syncSpeed();
  }

  function layoutCard(el, t) {
    const theta = t * twoPi;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const x = sinT * radiusX;
    const z = cosT * radiusZ;
    const depth = (z + radiusZ) / (radiusZ * 2);
    const scale = 0.58 + depth * 0.52;
    const rotateY = -sinT * 42;
    const rotateX = 3 + (1 - depth) * 5;
    const y = sinT * 6 - depth * 22;
    const opacity = clamp(0.08 + depth ** 1.35 * 0.92, 0, 1);

    el.style.transform =
      `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) ` +
      `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    el.style.zIndex = String((100 + depth * 100) | 0);
    el.style.opacity = opacity.toFixed(3);
    el.style.visibility = opacity < 0.12 ? 'hidden' : 'visible';
  }

  function render(offsetRad) {
    const offset = offsetRad / twoPi;
    for (let i = 0; i < n; i += 1) {
      let t = (i / n + offset) % 1;
      if (t < 0) t += 1;
      layoutCard(cardEls[i], t);
    }
  }

  function tryPlay(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        const retry = () => {
          video.muted = true;
          video.play()?.catch?.(() => {});
        };
        video.addEventListener('canplay', retry, { once: true });
        video.addEventListener('loadeddata', retry, { once: true });
      });
    }
  }

  function playVideos(shouldPlay) {
    videos.forEach((video) => {
      if (shouldPlay) tryPlay(video);
      else video.pause();
    });
  }

  function tick(ts) {
    if (destroyed || !running) return;
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    angle += speed * direction * dt;
    if (angle >= twoPi || angle <= -twoPi) angle %= twoPi;
    if (angle < 0) angle += twoPi;
    render(angle);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running || destroyed) return;
    running = true;
    last = 0;
    playVideos(true);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    playVideos(false);
  }

  function isInView() {
    const rect = root.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > vh * 0.08 && rect.top < vh * 0.92;
  }

  measure();
  render(0);

  const io = new IntersectionObserver(
    ([entry]) => {
      if (destroyed) return;
      if (entry.isIntersecting) start();
      else stop();
    },
    { threshold: 0.05, rootMargin: '12% 0px' },
  );
  io.observe(root);

  if (isInView()) start();
  else {
    requestAnimationFrame(() => {
      if (!destroyed && isInView()) start();
    });
  }

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      render(angle);
    }, 120);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = (e) => {
    reduced = e.matches;
    syncSpeed();
    if (!running && isInView()) start();
    else if (running) playVideos(true);
  };
  mq.addEventListener('change', onMotion);

  videos.forEach((video) => {
    video.addEventListener(
      'loadeddata',
      () => {
        if (running) tryPlay(video);
      },
      { once: true },
    );
  });

  return {
    destroy() {
      destroyed = true;
      stop();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      mq.removeEventListener('change', onMotion);
      root.replaceChildren();
      root.classList.remove('editorial-orbit');
    },
  };
}

export { DEFAULT_CARDS };
