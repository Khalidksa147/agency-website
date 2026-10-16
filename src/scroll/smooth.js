import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lowPower } from '../motionPrefs.js';

gsap.registerPlugin(ScrollTrigger);

function createNativeScroll({ onScroll } = {}) {
  document.documentElement.style.scrollBehavior = 'smooth';
  const handler = () => {
    ScrollTrigger.update();
    onScroll?.({ scroll: window.scrollY });
  };
  window.addEventListener('scroll', handler, { passive: true });
  return {
    stop() {},
    start() {},
    destroy() {
      window.removeEventListener('scroll', handler);
      document.documentElement.style.scrollBehavior = '';
    },
    raf() {},
    on() {},
    scroll: 0,
  };
}

export function initSmoothScroll({ onScroll } = {}) {
  const touch =
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);

  if (lowPower || touch) {
    return createNativeScroll({ onScroll });
  }

  const lenis = new Lenis({
    autoRaf: false,
    anchors: true,
    lerp: 0.1,
    smoothWheel: true,
    allowNestedScroll: true,
    respectReducedMotion: false,
  });

  lenis.on('scroll', (event) => {
    ScrollTrigger.update();
    onScroll?.(event);
  });

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
