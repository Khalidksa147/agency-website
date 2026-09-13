const STORAGE_KEY = 'qiram.preloader';
const FEATURED_MS = 1000;
const CYCLE_MS = 250;
const HOLD_MS = 800;
const LEAVE_MS = 800;
const FAILSAFE_MS = 28000;

const WORDS = [
  { text: 'Hello', lang: 'en' },
  { text: 'مرحبا', lang: 'ar' },
  { text: 'Bonjour', lang: 'en' },
  { text: 'Ciao', lang: 'en' },
  { text: 'Olá', lang: 'en' },
  { text: 'やあ', lang: 'ja' },
  { text: 'Hallå', lang: 'sv' },
  { text: 'Guten tag', lang: 'de' },
  { text: 'Hallo', lang: 'de' },
];

const boot = (globalThis.__qiramBoot ||= {
  ready: false,
  resolveReady: null,
});

const timers = [];

function later(fn, ms) {
  const id = window.setTimeout(fn, ms);
  timers.push(id);
  return id;
}

function clearTimers() {
  timers.splice(0).forEach((id) => window.clearTimeout(id));
}

function forceIntro() {
  try {
    return new URLSearchParams(window.location.search).has('preloader');
  } catch {
    return false;
  }
}

function hasSeenIntro() {
  if (forceIntro()) return false;
  try {
    return Boolean(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function shouldPlayIntro() {
  return !hasSeenIntro();
}

export function markPageReady() {
  boot.ready = true;
  boot.resolveReady?.();
}

function whenPageReady() {
  if (boot.ready) return Promise.resolve();
  return new Promise((resolve) => {
    boot.resolveReady = resolve;
  });
}

function curtainPath(width, height, dip) {
  return `M0 0 L${width} 0 L${width} ${height} Q${width / 2} ${height + dip} 0 ${height} L0 0`;
}

function flattenCurtain(path) {
  if (!path) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const from = 300;
  const ms = 700;
  const started = performance.now();
  const ease = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

  const step = (now) => {
    const t = Math.min((now - started) / ms, 1);
    path.setAttribute('d', curtainPath(width, height, from * (1 - ease(t))));
    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

export function finishPreloader(root = document.getElementById('preloader')) {
  clearTimers();
  document.documentElement.classList.remove('is-preloading', 'is-intro');
  if (!root) return;
  root.hidden = true;
  root.style.display = 'none';
  root.setAttribute('aria-hidden', 'true');
  root.classList.remove('is-leaving');
}

function playIntro(wordEl, wordText) {
  const setWord = (entry) => {
    wordText.textContent = entry.text;
    wordEl.lang = entry.lang;
    wordEl.dir = entry.lang === 'ar' ? 'rtl' : 'ltr';
  };

  setWord(WORDS[0]);

  WORDS.slice(1).reduce((wait, entry, i) => {
    const delay = i === 0 ? FEATURED_MS : CYCLE_MS;
    later(() => setWord(entry), wait + delay);
    return wait + delay;
  }, 0);

  const timeToLast = FEATURED_MS + Math.max(WORDS.length - 2, 0) * CYCLE_MS;
  return timeToLast + HOLD_MS;
}

export function initPreloader() {
  const root = document.getElementById('preloader');
  const wordEl = document.getElementById('preloader-word');
  const wordText = document.getElementById('preloader-word-text');
  const path = document.getElementById('preloader-path');
  const intro = shouldPlayIntro();

  if (!root) {
    return Promise.resolve(false);
  }

  document.documentElement.classList.add('is-preloading');
  document.documentElement.classList.toggle('is-intro', intro);
  root.hidden = false;
  root.removeAttribute('aria-hidden');

  if (wordEl && !intro) {
    wordEl.hidden = true;
  }

  if (path) {
    path.setAttribute('d', curtainPath(window.innerWidth, window.innerHeight, 300));
  }

  const introDone = new Promise((resolve) => {
    if (!intro || !wordEl || !wordText) {
      resolve();
      return;
    }
    const leaveAt = playIntro(wordEl, wordText);
    later(resolve, leaveAt);
  });

  return new Promise((resolve) => {
    let settled = false;
    const done = (played) => {
      if (settled) return;
      settled = true;
      if (intro) markIntroSeen();
      if (wordEl) wordEl.style.opacity = '0';
      flattenCurtain(path);
      root.classList.add('is-leaving');
      document.documentElement.classList.remove('is-preloading', 'is-intro');
      document.dispatchEvent(new Event('qiram:reveal'));
      later(() => {
        finishPreloader(root);
        resolve(played);
      }, LEAVE_MS);
    };

    Promise.all([introDone, whenPageReady()]).then(() => done(intro));
    later(() => done(intro), FAILSAFE_MS);
  });
}
