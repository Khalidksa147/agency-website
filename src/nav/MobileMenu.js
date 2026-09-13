import { gsap } from 'gsap';

export function initMobileMenu(lenis) {
  const btn = document.querySelector('.menu-btn');
  const burger = btn?.querySelector('.menu-btn__burger');
  const menu = document.querySelector('.mobile-menu');
  const nav = menu?.querySelector('.mobile-nav');
  const curvePath = menu?.querySelector('.mobile-menu__curve-path');
  const links = menu ? [...menu.querySelectorAll('.mobile-nav__link')] : [];
  if (!btn || !burger || !menu || !nav || !curvePath) {
    return { close() {} };
  }

  let isOpen = false;
  let tl;
  let currentHref = document.querySelector('.nav-links .is-active a')?.getAttribute('href') || '#top';
  const ease = 'power3.inOut';

  const isRtl = () => document.documentElement.dir === 'rtl';
  const viewHeight = () => window.visualViewport?.height ?? window.innerHeight;
  const offscreen = () => (menu.offsetWidth + 100) * (isRtl() ? -1 : 1);
  const initialPath = () =>
    `M100 0 L200 0 L200 ${viewHeight()} L100 ${viewHeight()} Q-100 ${viewHeight() / 2} 100 0`;
  const targetPath = () =>
    `M100 0 L200 0 L200 ${viewHeight()} L100 ${viewHeight()} Q100 ${viewHeight() / 2} 100 0`;

  curvePath.setAttribute('d', initialPath());
  gsap.set(menu, { x: offscreen() });

  const setIndicator = (href) => {
    links.forEach((link) => {
      const dot = link.querySelector('.mobile-nav__indicator');
      gsap.to(dot, {
        scale: link.dataset.href === href ? 1 : 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    });
  };

  const buildTimeline = () => {
    const startX = offscreen();
    const slide = isRtl() ? -80 : 80;
    gsap.set(menu, { x: startX });
    curvePath.setAttribute('d', initialPath());

    const next = gsap.timeline({
      paused: true,
      defaults: { duration: 0.8, ease },
    });

    next.fromTo(menu, { x: startX }, { x: 0 }, 0);
    next.fromTo(
      curvePath,
      { attr: { d: initialPath() } },
      { attr: { d: targetPath() }, duration: 1 },
      0,
    );
    next.fromTo(links, { x: slide }, { x: 0, stagger: 0.05 }, 0);

    next.eventCallback('onReverseComplete', () => {
      document.body.classList.remove('menu-open');
      document.documentElement.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', btn.dataset.labelOpen || 'Open menu');
      menu.classList.remove('is-open');
      lenis?.start();
      isOpen = false;
    });

    return next;
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    document.body.classList.add('menu-open');
    document.documentElement.classList.add('menu-open');
    menu.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', btn.dataset.labelClose || 'Close menu');
    burger.classList.add('is-active');
    lenis?.stop();
    tl?.kill();
    tl = buildTimeline();
    tl.play();
    setIndicator(currentHref);
  };

  const close = () => {
    if (!isOpen) return;
    burger.classList.remove('is-active');
    gsap.to('.mobile-nav__indicator', { scale: 0, duration: 0.3 });
    tl?.reverse();
  };

  btn.addEventListener('click', () => {
    if (isOpen) close();
    else open();
  });

  links.forEach((link) => {
    link.addEventListener('mouseenter', () => setIndicator(link.dataset.href));
    link.querySelector('a')?.addEventListener('click', () => {
      currentHref = link.dataset.href;
      close();
    });
  });

  nav.addEventListener('mouseleave', () => {
    if (isOpen) setIndicator(currentHref);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1023 && isOpen) {
      close();
      return;
    }
    const path = isOpen && tl && !tl.reversed() ? targetPath() : initialPath();
    curvePath.setAttribute('d', path);
    if (!isOpen) gsap.set(menu, { x: offscreen() });
  });

  return { close };
}
