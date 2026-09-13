import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initSmoothScroll({ onScroll } = {}) {
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
