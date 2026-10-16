import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function getWorkCards(section) {
  return [...section.children].filter((el) => el.classList.contains('work-showcase'));
}

function wrapCards(section, cards) {
  const stack = document.createElement('div');
  stack.className = 'work-stack';

  const track = document.createElement('div');
  track.className = 'work-stack__track';

  cards[0].before(stack);
  stack.append(track);
  cards.forEach((card) => track.append(card));

  return { stack, track };
}

/** Inner layer gets scale/blur so sticky positioning stays identical on every card. */
function ensureMotionLayer(card) {
  let motion = card.querySelector(':scope > .work-showcase__motion');
  if (motion) return motion;
  motion = document.createElement('div');
  motion.className = 'work-showcase__motion';
  while (card.firstChild) motion.append(card.firstChild);
  card.append(motion);
  return motion;
}

function unwrapMotionLayer(card) {
  const motion = card.querySelector(':scope > .work-showcase__motion');
  if (!motion) return;
  while (motion.firstChild) card.insertBefore(motion.firstChild, motion);
  motion.remove();
}

export function initWorkStack() {
  const section = document.querySelector('#work.section-work');
  if (!section) return { destroy() {}, refresh() {} };

  const cards = getWorkCards(section);
  if (cards.length < 2) return { destroy() {}, refresh() {} };

  const { stack, track } = wrapCards(section, cards);
  const mm = gsap.matchMedia();

  // Sticky stack on all viewports (desktop, tablet, mobile)
  mm.add('all', () => {
    stack.classList.add('is-stacked');

    const total = cards.length;
    const triggers = [];
    const motions = cards.map((card) => ensureMotionLayer(card));
    const spacers = cards.map((card) => {
      const spacer = document.createElement('div');
      spacer.className = 'work-stack__spacer';
      spacer.setAttribute('aria-hidden', 'true');
      card.after(spacer);
      return spacer;
    });

    cards.forEach((card, i) => {
      card.style.zIndex = String(i + 1);
    });

    motions.forEach((motion) => {
      gsap.set(motion, {
        transformOrigin: '50% 50%',
        force3D: true,
        scale: 1,
        filter: 'blur(0px)',
      });
    });

    cards.forEach((card, i) => {
      if (i === total - 1) return;

      const next = cards[i + 1];
      const motion = motions[i];

      // Outgoing: shrink straight back (center), blur later. Incoming: no effects.
      const outgoing = gsap
        .timeline({
          scrollTrigger: {
            id: `work-stack-out-${i}`,
            trigger: next,
            start: 'top 85%',
            end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(motion, { scale: 1 }, { scale: 0.72, ease: 'none', duration: 0.62 }, 0)
        .to(motion, { scale: 0, ease: 'none', duration: 0.38 }, 0.62)
        .fromTo(
          motion,
          { filter: 'blur(0px)' },
          { filter: 'blur(18px)', ease: 'none', duration: 0.55 },
          0.4,
        );

      triggers.push(outgoing.scrollTrigger);
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh, { once: true });
    window.addEventListener('orientationchange', refresh, { passive: true });
    track.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
    requestAnimationFrame(() => {
      refresh();
      requestAnimationFrame(refresh);
    });

    return () => {
      stack.classList.remove('is-stacked');
      window.removeEventListener('orientationchange', refresh);
      triggers.forEach((t) => t?.kill());
      spacers.forEach((spacer) => spacer.remove());
      motions.forEach((motion) => {
        gsap.set(motion, { clearProps: 'transform,filter' });
      });
      cards.forEach((card) => {
        card.style.zIndex = '';
        unwrapMotionLayer(card);
      });
    };
  });

  return {
    refresh() {
      ScrollTrigger.refresh();
    },
    destroy() {
      mm.revert();
      cards.forEach((card) => {
        unwrapMotionLayer(card);
        stack.before(card);
      });
      stack.remove();
    },
  };
}
