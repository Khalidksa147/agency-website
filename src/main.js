import { initGooeyNav } from './nav/GooeyNav.js';
import { initMobileMenu } from './nav/MobileMenu.js';
import { initCopy, playHeroCopy, prepareHeroCopy } from './text/Copy.js';
import { initSmoothScroll } from './scroll/smooth.js';
import { initPreloader, markPageReady } from './preloader/Preloader.js';
import { initWorkStack } from './work/WorkStack.js?v=20260915ag';
import { initContactPage } from './contact/ContactPage.js?v=20260921c';
import { initAboutPage } from './about/AboutPage.js?v=20260921c';
import { initWorkPage } from './work/WorkPage.js?v=20260921c';
import { initServicesPage } from './services/ServicesPage.js?v=20260921c';

window.__qiramPreloader ??= initPreloader();

const gooeyNavs = [initGooeyNav(document.querySelector('.nav-links'))];
const navEl = document.querySelector('.nav');
const navLinks = [...document.querySelectorAll('.nav-links a')];
const canvas = document.querySelector('#orb-canvas');
const hero = document.querySelector('.hero');
const linesEl = document.querySelector('.page-lines');

let orb = null;
let lines = null;
let lastHref = '';
let lastScrolled = null;
let sections = [];

function refreshSections() {
  sections = navLinks
    .map((link) => {
      const id = link.getAttribute('href');
      if (!id || !id.startsWith('#')) return null;
      const el = document.querySelector(id);
      if (!el) return null;
      return {
        href: el.id === 'top' ? '#top' : `#${el.id}`,
        top: el.offsetTop,
      };
    })
    .filter(Boolean);
}

function currentSectionHref() {
  const y = window.scrollY + 120;
  let current = sections[0];
  for (let i = 0; i < sections.length; i += 1) {
    if (sections[i].top <= y) current = sections[i];
  }
  return current?.href || '#top';
}

function syncGooey(options) {
  const href = currentSectionHref();
  if (!options?.burst && href === lastHref) return;
  lastHref = href;
  gooeyNavs.forEach((nav) => nav.setActiveFromHref(href, options));
}

function setNavScrolled(y = window.scrollY) {
  if (!navEl) return;
  const scrolled = y > 12;
  if (scrolled === lastScrolled) return;
  lastScrolled = scrolled;
  navEl.classList.toggle('is-scrolled', scrolled);
}

function initNav() {
  refreshSections();
  window.addEventListener(
    'resize',
    () => {
      refreshSections();
      syncGooey();
    },
    { passive: true },
  );
  syncGooey();
  setNavScrolled();
}

function whenIdle(fn, timeout = 240) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout });
    return;
  }
  window.setTimeout(fn, timeout);
}

function afterFirstPaint(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function bootOrb() {
  if (!canvas || orb) return;
  import('./orb/HeroOrb.js')
    .then(({ HeroOrb }) => {
      orb = new HeroOrb(canvas, { hero });
    })
    .catch(() => {});
}

function bootLines() {
  if (!linesEl || lines) return;
    import('./lines/FloatingLines.js?v=20260916a')
      .then(({ FloatingLines }) => {
        lines = new FloatingLines(linesEl);
      })
      .catch(() => {});
}

function bootVisuals() {
  afterFirstPaint(() => {
    whenIdle(bootOrb, 160);
    whenIdle(bootLines, 480);
  });
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
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"] span');
  const original = button?.textContent;
  form.classList.add('is-sent');
  if (button) {
    button.textContent = document.documentElement.lang === 'ar' ? 'تم الإرسال' : 'Received';
  }
  window.setTimeout(() => {
    form.classList.remove('is-sent');
    if (button && original) button.textContent = original;
    form.reset();
    if (contactCount) contactCount.textContent = '0';
    contactSelect.refresh();
    form.dispatchEvent(new CustomEvent('contact:reset'));
  }, 2200);
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
    let raf = 0;
    const pointer = { x: 0, y: 0 };

    const update = () => {
      raf = 0;
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

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    card.addEventListener('pointerenter', () => {
      rect = card.getBoundingClientRect();
      card.classList.add('is-glowing');
    });
    card.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      schedule();
    });
    card.addEventListener('pointerleave', () => {
      rect = null;
      card.classList.remove('is-glowing');
      card.style.setProperty('--edge-proximity', '0');
    });
  });
}

function initServiceSvgPause() {
  const cards = document.querySelectorAll('.service-card');
  if (!cards.length) return;

  const setPlaying = (card, play) => {
    card.querySelectorAll('svg').forEach((svg) => {
      if (play) svg.unpauseAnimations?.();
      else svg.pauseAnimations?.();
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => setPlaying(entry.target, entry.isIntersecting));
    },
    { rootMargin: '20% 0px', threshold: 0.01 },
  );

  cards.forEach((card) => {
    setPlaying(card, false);
    observer.observe(card);
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

initNav();
initMobileMenu(lenis);
initServiceGlow();
initServiceSvgPause();
const workStack = initWorkStack();

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

function revealPage() {
  try {
    prepareHeroCopy();
  } catch {
    /* SplitText unavailable — startCopy will reveal instead */
  }
  markPageReady();
}

const preloaderReady = window.__qiramPreloader ?? Promise.resolve();

document.addEventListener(
  'qiram:reveal',
  () => {
    lenis.start();
    bootVisuals();
    workStack?.refresh();
  },
  { once: true },
);

function initMagneticButtons() {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    if (el.dataset.magneticBound) return;
    el.dataset.magneticBound = '1';
    const strength = Number(el.dataset.magnetic) || 14;
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * strength;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}

revealPage();
initContactPage();
initAboutPage();
initWorkPage();
initServicesPage();
initMagneticButtons();

preloaderReady
  .then(() => {
    startCopy();
    lenis.start();
    bootVisuals();
    workStack?.refresh();
  })
  .catch(() => {
    startCopy();
    lenis.start();
    bootVisuals();
    workStack?.refresh();
  });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    orb?.dispose();
    lines?.dispose();
    workStack?.destroy();
    lenis?.destroy();
  });
}
