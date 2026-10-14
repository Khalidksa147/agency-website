/**
 * AnimatedEditorialSection — shallow 3D orbiting editorial card fan
 * Inspired by orbit poster-board compositions (continuous, seamless loop).
 */

const DEFAULT_CARDS = [
  {
    id: 'portrait',
    type: 'video',
    src: '/videos/editorial-01.mp4',
    mono: true,
    contrast: 1.15,
  },
  {
    id: 'sphere',
    type: 'graphic',
    variant: 'sphere',
  },
  {
    id: 'type-light',
    type: 'graphic',
    variant: 'type-light',
    lines: ['AB', '01', 'NW'],
  },
  {
    id: 'mono-mark',
    type: 'graphic',
    variant: 'mark',
  },
  {
    id: 'type-yellow',
    type: 'graphic',
    variant: 'type-yellow',
    lines: ['FORM', '92'],
  },
  {
    id: 'rings',
    type: 'graphic',
    variant: 'rings',
  },
  {
    id: 'cinematic',
    type: 'video',
    src: '/videos/editorial-02.mp4',
    mono: true,
    contrast: 1.25,
  },
  {
    id: 'detail',
    type: 'video',
    src: '/videos/editorial-04.mp4',
    mono: true,
    contrast: 1.2,
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

  if (card.type === 'video') {
    const video = document.createElement('video');
    video.className = 'editorial-card__media';
    video.src = card.src;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    if (card.mono) {
      video.style.filter = `grayscale(1) contrast(${card.contrast || 1.1})`;
    } else if (card.darken) {
      video.style.filter = 'brightness(0.72) contrast(1.12) saturate(0.75)';
    }
    inner.append(video);
  } else {
    inner.append(createGraphic(card));
  }

  article.append(inner);
  return article;
}

/**
 * @param {HTMLElement} root
 * @param {{ cards?: typeof DEFAULT_CARDS }} [options]
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

  const foreground = document.createElement('div');
  foreground.className = 'editorial-orbit__foreground';
  foreground.setAttribute('aria-hidden', 'true');
  foreground.innerHTML = `
    <svg class="editorial-orbit__curve" viewBox="0 0 1440 220" preserveAspectRatio="none">
      <path d="M0 220 V118 C 240 28, 520 8, 720 8 S 1200 28, 1440 118 V220 Z"/>
    </svg>`;

  stage.append(track, foreground);
  root.replaceChildren(stage);

  const videos = [...root.querySelectorAll('video')];
  const n = cardEls.length;
  let angle = 0;
  let raf = 0;
  let last = 0;
  let running = false;
  let destroyed = false;

  const state = {
    get radiusX() {
      return Math.max(460, root.clientWidth * 0.44);
    },
    get radiusZ() {
      return Math.max(220, root.clientWidth * 0.2);
    },
    // Orbit always runs; reduced-motion only softens speed (this section is the motion).
    get speed() {
      return reduced ? 0.1 : 0.18;
    },
  };

  function layoutCard(el, t) {
    // t in [0, 1) around the ring
    const theta = t * Math.PI * 2;
    // Front of ring faces camera at theta ≈ 0
    const x = Math.sin(theta) * state.radiusX;
    const z = Math.cos(theta) * state.radiusZ;
    // Depth factor: 1 at front, 0 at back
    const depth = (z + state.radiusZ) / (state.radiusZ * 2);
    const scale = 0.58 + depth * 0.52;
    // Face toward camera / fan outward
    const rotateY = -Math.sin(theta) * 42;
    const rotateX = 3 + (1 - depth) * 5;
    const y = Math.sin(theta) * 6 - depth * 22;

    el.style.transform =
      `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) ` +
      `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    el.style.zIndex = String(Math.round(100 + depth * 100));
    // Softly hide the rear of the ring so the fan reads as a shallow front arc
    const opacity = clamp(0.08 + depth ** 1.35 * 0.92, 0, 1);
    el.style.opacity = String(opacity);
    el.style.visibility = opacity < 0.12 ? 'hidden' : 'visible';
  }

  function render(offsetRad) {
    for (let i = 0; i < n; i += 1) {
      const t = ((i / n) + offsetRad / (Math.PI * 2)) % 1;
      layoutCard(cardEls[i], t < 0 ? t + 1 : t);
    }
  }

  function tryPlay(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Retry once media is ready (autoplay policies / late decode)
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
    angle = (angle + state.speed * direction * dt) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;
    render(angle);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running || destroyed) return;
    running = true;
    last = 0;
    // Always play muted loops while the section is visible
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

  // Initial pose, then start as soon as the section is on screen
  render(0);

  const io = new IntersectionObserver(
    ([entry]) => {
      if (destroyed) return;
      if (entry.isIntersecting) start();
      else stop();
    },
    { threshold: [0, 0.05, 0.15, 0.35], rootMargin: '10% 0px' },
  );
  io.observe(root);

  // IntersectionObserver can miss the first callback if already visible
  if (isInView()) start();
  else requestAnimationFrame(() => {
    if (!destroyed && isInView()) start();
  });

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      render(angle);
    }, 100);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = (e) => {
    reduced = e.matches;
    if (!running && isInView()) start();
    else if (running) playVideos(true);
  };
  mq.addEventListener('change', onMotion);

  // Kick play after decode in case IntersectionObserver fired before sources loaded
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
