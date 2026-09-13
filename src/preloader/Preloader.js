const STORAGE_KEY = 'qiram.preloader';

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

const timers = [];

function later(fn, ms) {
  const id = window.setTimeout(fn, ms);
  timers.push(id);
  return id;
}

function clearTimers() {
  timers.splice(0).forEach((id) => window.clearTimeout(id));
}

function forcePreloader() {
  try {
    return new URLSearchParams(window.location.search).has('preloader');
  } catch {
    return false;
  }
}

function hasSeenPreloader() {
  if (forcePreloader()) return false;
  try {
    return Boolean(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function markPreloaderSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function shouldPlayPreloader() {
  return !hasSeenPreloader();
}

export function finishPreloader(root = document.getElementById('preloader')) {
  clearTimers();
  document.documentElement.classList.remove('is-preloading');
  if (!root) return;
  root.classList.remove('is-leaving');
  root.hidden = true;
  root.style.display = 'none';
  root.setAttribute('aria-hidden', 'true');
}

function finish(root) {
  finishPreloader(root);
}

export function initPreloader() {
  const root = document.getElementById('preloader');
  const wordEl = document.getElementById('preloader-word');
  const wordText = document.getElementById('preloader-word-text');
  const path = document.getElementById('preloader-path');

  if (!root || !wordEl || !wordText || !shouldPlayPreloader()) {
    finish(root);
    return Promise.resolve(false);
  }

  root.hidden = false;
  root.removeAttribute('aria-hidden');

  const setWord = (entry) => {
    wordText.textContent = entry.text;
    wordEl.lang = entry.lang;
    wordEl.dir = entry.lang === 'ar' ? 'rtl' : 'ltr';
  };

  setWord(WORDS[0]);

  if (path) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    path.setAttribute(
      'd',
      `M0 0 L${w} 0 L${w} ${h} Q${w / 2} ${h + 300} 0 ${h} L0 0`,
    );
  }

  WORDS.slice(1).reduce((wait, entry, i) => {
    const delay = i === 0 ? 1000 : 150;
    later(() => setWord(entry), wait + delay);
    return wait + delay;
  }, 0);

  const featuredCount = 2;
  const timeToLast =
    featuredCount * 1000 + Math.max(WORDS.length - 1 - featuredCount, 0) * 150;
  const leaveAt = timeToLast + 800;

  return new Promise((resolve) => {
    const done = (played) => {
      markPreloaderSeen();
      finish(root);
      resolve(played);
    };

    later(() => {
      wordEl.style.opacity = '0';
      root.classList.add('is-leaving');
      later(() => done(true), 800);
    }, leaveAt);

    later(() => done(true), leaveAt + 2000);
  });
}
