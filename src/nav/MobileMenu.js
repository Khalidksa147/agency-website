import { gsap } from 'gsap';

export function initMobileMenu(lenis) {
  const btn = document.querySelector('.menu-btn');
  const slider = btn?.querySelector('.menu-btn__slider');
  const menu = document.querySelector('.mobile-menu');
  const nav = menu?.querySelector('.mobile-nav-links');
  const links = menu ? [...menu.querySelectorAll('.mobile-nav-links a')] : [];
  if (!btn || !menu || !nav) {
    return { close() {} };
  }

  let isOpen = false;
  let tl;

  const isRtl = () => document.documentElement.dir === 'rtl';

  const buildTimeline = () => {
    const rtl = isRtl();
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const insetX = Math.min(rect.left, vw - rect.right);

    gsap.set(menu, { clearProps: 'left,right' });
    gsap.set(menu, {
      top: rect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: 25,
      left: rtl ? insetX : vw - insetX - rect.width,
      right: rtl ? vw - insetX - rect.width : insetX,
    });

    const next = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.inOut' },
    });

    next.to(menu, {
      top: 0,
      left: 0,
      right: 0,
      width: () => window.innerWidth,
      height: () => window.innerHeight,
      borderRadius: 0,
      duration: 0.75,
    });

    if (slider) {
      next.to(slider, { top: '-100%', duration: 0.5 }, 0);
    }

    next.add(() => nav.classList.add('is-visible'), 0.2);

    next.set(
      links,
      {
        opacity: 0,
        rotateX: 90,
        y: 80,
        x: rtl ? 20 : -20,
        transformPerspective: 300,
        transformOrigin: 'bottom',
      },
      0,
    );

    next.to(
      links,
      {
        opacity: 1,
        rotateX: 0,
        y: 0,
        x: 0,
        duration: 0.65,
        ease: 'back.out(1.2)',
        stagger: 0.1,
      },
      0.5,
    );

    next.eventCallback('onReverseComplete', () => {
      nav.classList.remove('is-visible');
      menu.hidden = true;
      document.body.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', btn.dataset.labelOpen || 'Open menu');
      lenis?.start();
      isOpen = false;
    });

    return next;
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', btn.dataset.labelClose || 'Close menu');
    lenis?.stop();
    tl?.kill();
    tl = buildTimeline();
    tl.play();
  };

  const close = () => {
    if (!isOpen) return;
    tl?.reverse();
  };

  btn.addEventListener('click', () => {
    if (isOpen) close();
    else open();
    btn.blur();
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', close);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1023 && isOpen) close();
  });

  return { close };
}
