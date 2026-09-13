import { gsap } from 'gsap';

function viewBox() {
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };
}

function clipFromButton(btn) {
  const rect = btn.getBoundingClientRect();
  const { width, height } = viewBox();
  const top = Math.max(0, rect.top);
  const left = Math.max(0, rect.left);
  const right = Math.max(0, width - rect.right);
  const bottom = Math.max(0, height - rect.bottom);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 25px)`;
}

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
    const fromClip = clipFromButton(btn);

    gsap.set(menu, {
      clipPath: fromClip,
      '-webkit-clip-path': fromClip,
    });
    gsap.set(slider, { yPercent: 0 });

    const next = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.inOut' },
    });

    next.to(menu, {
      clipPath: 'inset(0px 0px 0px 0px round 0px)',
      '-webkit-clip-path': 'inset(0px 0px 0px 0px round 0px)',
      duration: 0.75,
    });

    if (slider) {
      next.to(slider, { yPercent: -50, duration: 0.5 }, 0);
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
      menu.classList.remove('is-open');
      menu.hidden = true;
      gsap.set(menu, { clearProps: 'clipPath' });
      document.body.classList.remove('menu-open');
      document.documentElement.classList.remove('menu-open');
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
    document.body.classList.add('menu-open');
    document.documentElement.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', btn.dataset.labelClose || 'Close menu');
    lenis?.stop();
    tl?.kill();
    const fromClip = clipFromButton(btn);
    gsap.set(menu, {
      clipPath: fromClip,
      '-webkit-clip-path': fromClip,
    });
    menu.hidden = false;
    menu.classList.add('is-open');
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
