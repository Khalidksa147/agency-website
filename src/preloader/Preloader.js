import { gsap } from 'gsap';

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

function finish(root) {
  document.documentElement.classList.remove('is-preloading');
  if (!root) return;
  root.hidden = true;
  root.style.display = 'none';
  root.setAttribute('aria-hidden', 'true');
}

export function initPreloader() {
  const root = document.getElementById('preloader');
  const wordEl = document.getElementById('preloader-word');
  const wordText = document.getElementById('preloader-word-text');
  const path = document.getElementById('preloader-path');

  if (!root || !wordEl || !wordText || !path || !shouldPlayPreloader()) {
    finish(root);
    return Promise.resolve(false);
  }

  markPreloaderSeen();
  root.hidden = false;
  root.removeAttribute('aria-hidden');

  const dimension = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const getPaths = () => {
    const initialPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height + 300} 0 ${dimension.height} L0 0`;
    const targetPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height} 0 ${dimension.height} L0 0`;
    return { initialPath, targetPath };
  };

  const setInitialPath = () => {
    path.setAttribute('d', getPaths().initialPath);
  };

  setInitialPath();

  const setWord = (entry) => {
    wordText.textContent = entry.text;
    wordEl.lang = entry.lang;
    wordEl.dir = entry.lang === 'ar' ? 'rtl' : 'ltr';
  };

  let index = 0;
  setWord(WORDS[index]);

  gsap.to(wordEl, {
    opacity: 0.75,
    duration: 1,
    delay: 0.2,
  });

  const cycleWords = () => {
    if (index === WORDS.length - 1) return;
    const delay = index <= 1 ? 1 : 0.15;
    gsap.delayedCall(delay, () => {
      index += 1;
      setWord(WORDS[index]);
      cycleWords();
    });
  };

  cycleWords();

  const featuredCount = 2;
  const timeToLast = featuredCount * 1 + Math.max(WORDS.length - 1 - featuredCount, 0) * 0.15;
  const totalDelay = timeToLast + 0.8;

  const onResize = () => {
    dimension.width = window.innerWidth;
    dimension.height = window.innerHeight;
    setInitialPath();
  };

  window.addEventListener('resize', onResize);

  return new Promise((resolve) => {
    gsap.delayedCall(totalDelay, () => {
      const { initialPath, targetPath } = getPaths();
      const tl = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: () => {
          window.removeEventListener('resize', onResize);
          finish(root);
          resolve(true);
        },
      });

      tl.to(wordEl, { opacity: 0, duration: 0.3 }, 0);
      tl.to(root, {
        y: '-100vh',
        duration: 0.8,
        delay: 0.2,
        ease: 'power4.inOut',
      }, 0);
      tl.fromTo(
        path,
        { attr: { d: initialPath } },
        {
          attr: { d: targetPath },
          duration: 0.7,
          delay: 0.3,
          ease: 'power4.inOut',
        },
        0,
      );
    });
  });
}
