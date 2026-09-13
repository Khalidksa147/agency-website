import { initGooeyNav } from './nav/GooeyNav.js';
import { initMobileMenu } from './nav/MobileMenu.js';
import { initCopy, playHeroCopy, prepareHeroCopy } from './text/Copy.js';
import { initSmoothScroll } from './scroll/smooth.js';
import { markPageReady } from './preloader/Preloader.js';

const gooeyNavs = [initGooeyNav(document.querySelector('.nav-links'))];

function currentSectionHref() {
  const links = [...document.querySelectorAll('.nav-links a')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  const y = window.scrollY + 120;
  let current = sections[0];
  sections.forEach((section) => {
    if (section.offsetTop <= y) current = section;
  });
  if (!current) return '#top';
  return current.id === 'top' ? '#top' : `#${current.id}`;
}

function syncGooey(options) {
  const href = currentSectionHref();
  gooeyNavs.forEach((nav) => nav.setActiveFromHref(href, options));
}

function setNavScrolled(y = window.scrollY) {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  nav.classList.toggle('is-scrolled', y > 12);
}

function initNav() {
  window.addEventListener('resize', () => syncGooey(), { passive: true });
  syncGooey();
  setNavScrolled();
}

const canvas = document.querySelector('#orb-canvas');
const hero = document.querySelector('.hero');
const linesEl = document.querySelector('.page-lines');
let orb = null;
let lines = null;

function whenWindowLoaded() {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
}

function settle(ms = 360) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function bootVisuals() {
  const orbMod = window.__qiramOrbMod || import('./orb/HeroOrb.js');
  const linesMod = window.__qiramLinesMod || import('./lines/FloatingLines.js');
  const tasks = [];
  if (canvas) {
    tasks.push(
      orbMod.then(({ HeroOrb }) => {
        orb = new HeroOrb(canvas, { hero });
        return orb.whenReady();
      }),
    );
  }
  if (linesEl) {
    tasks.push(
      linesMod
        .then(({ FloatingLines }) => {
          lines = new FloatingLines(linesEl);
          return lines.whenReady();
        })
        .catch(() => {}),
    );
  }
  await Promise.all(tasks);
}

document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const section = btn.closest('.bilingual');
    if (!section) return;
    section.dataset.siteLang = section.dataset.siteLang === 'ar' ? 'en' : 'ar';
  });
});

const contactForm = document.querySelector('.contact-form');
const contactCount = contactForm?.querySelector('[data-count]');
contactForm?.querySelector('textarea')?.addEventListener('input', (event) => {
  if (contactCount) contactCount.textContent = String(event.currentTarget.value.length);
});

function initContactSelect() {
  const wrap = document.querySelector('.contact-select');
  const native = wrap?.querySelector('select');
  const btn = wrap?.querySelector('.contact-select-btn');
  const list = wrap?.querySelector('.contact-select-list');
  const label = btn?.querySelector('span');
  if (!wrap || !native || !btn || !list || !label) {
    return { refresh() {} };
  }

  const close = () => {
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  const refresh = () => {
    const current = native.value;
    list.replaceChildren();
    [...native.options]
      .filter((opt) => opt.value)
      .forEach((opt) => {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.dataset.value = opt.value;
        item.textContent = opt.textContent;
        item.classList.toggle('is-active', opt.value === current);
        item.addEventListener('click', () => {
          native.value = opt.value;
          label.textContent = opt.textContent;
          btn.classList.add('is-chosen');
          close();
          refresh();
        });
        list.append(item);
      });

    if (current) {
      label.textContent = native.selectedOptions[0]?.textContent || current;
      btn.classList.add('is-chosen');
    } else {
      label.textContent = native.options[0]?.textContent || '';
      btn.classList.remove('is-chosen');
    }
  };

  btn.addEventListener('click', () => {
    const open = list.hidden;
    list.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) close();
  });

  refresh();
  return { refresh };
}

const contactSelect = initContactSelect();

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button span');
  const original = button.textContent;
  button.textContent = document.documentElement.lang === 'ar' ? 'تم الإرسال' : 'Received';
  window.setTimeout(() => {
    button.textContent = original;
    event.currentTarget.reset();
    if (contactCount) contactCount.textContent = '0';
    contactSelect.refresh();
  }, 1600);
});

function initServiceGlow() {
  const cards = document.querySelectorAll('.service-card');
  cards.forEach((card) => {
    if (!card.querySelector('.edge-light')) {
      const glow = document.createElement('span');
      glow.className = 'edge-light';
      glow.setAttribute('aria-hidden', 'true');
      card.prepend(glow);
    }

    let rect = null;
    const pointer = { x: 0, y: 0 };

    const update = () => {
      if (!rect) return;
      const x = pointer.x - rect.left;
      const y = pointer.y - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
      const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let angle = 0;
      if (dx !== 0 || dy !== 0) {
        angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (angle < 0) angle += 360;
      }
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    };

    card.addEventListener('pointerenter', () => {
      rect = card.getBoundingClientRect();
      card.classList.add('is-glowing');
    });
    card.addEventListener('pointermove', (event) => {
      if (!rect) rect = card.getBoundingClientRect();
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      update();
    });
    card.addEventListener('pointerleave', () => {
      rect = null;
      card.classList.remove('is-glowing');
      card.style.setProperty('--edge-proximity', '0');
    });
  });
}

const lenis = initSmoothScroll({
  onScroll: (event) => {
    syncGooey();
    setNavScrolled(event?.scroll ?? window.scrollY);
  },
});

if (document.documentElement.classList.contains('is-preloading')) {
  lenis.stop();
}

window.addEventListener('scroll', () => setNavScrolled(window.scrollY), { passive: true });

initNav();
initMobileMenu(lenis);
initServiceGlow();

function revealCopy() {
  document.querySelectorAll('[data-copy]').forEach((el) => el.classList.add('is-copy-ready'));
}

function startCopy() {
  try {
    const played = playHeroCopy();
    initCopy({ skipHero: played });
  } catch {
    revealCopy();
  }
}

const fontsReady = document.fonts?.ready || Promise.resolve();
const preloaderReady = window.__qiramPreloader ?? Promise.resolve();

document.addEventListener('qiram:reveal', () => lenis.start(), { once: true });

Promise.all([fontsReady, whenWindowLoaded(), bootVisuals()])
  .then(() => settle(240))
  .then(() => {
    try {
      prepareHeroCopy();
    } catch {
      /* SplitText unavailable — startCopy will reveal instead */
    }
    markPageReady();
  });

preloaderReady
  .then(() => {
    startCopy();
    lenis.start();
  })
  .catch(() => {
    startCopy();
    lenis.start();
  });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    orb?.dispose();
    lines?.dispose();
    lenis?.destroy();
  });
}
