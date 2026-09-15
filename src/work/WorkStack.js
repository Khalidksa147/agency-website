import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STACK_MQ = '(min-width: 1024px)';

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

export function initWorkStack() {
  const section = document.querySelector('#work.section-work');
  if (!section) return { destroy() {}, refresh() {} };

  const cards = getWorkCards(section);
  if (cards.length < 2) return { destroy() {}, refresh() {} };

  const { stack, track } = wrapCards(section, cards);
  const mm = gsap.matchMedia();

  mm.add(STACK_MQ, () => {
    stack.classList.add('is-stacked');

    const total = cards.length;
    const triggers = [];

    cards.forEach((card, i) => {
      card.style.zIndex = String(i + 1);
      gsap.set(card, {
        transformOrigin: '50% 50%',
        force3D: true,
      });
    });

    cards.forEach((card, i) => {
      if (i === total - 1) return;

      const next = cards[i + 1];

      // Outgoing card: slowly scales to 0 as the next card becomes sticky on top.
      const outgoing = gsap.to(card, {
        scale: 0,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          id: `work-stack-out-${i}`,
          trigger: next,
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // Incoming card: settles from a slight offset into full focus.
      gsap.set(next, { yPercent: 8, scale: 0.96 });
      const incoming = gsap.to(next, {
        yPercent: 0,
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          id: `work-stack-in-${i}`,
          trigger: next,
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      triggers.push(outgoing.scrollTrigger, incoming.scrollTrigger);
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh, { once: true });
    track.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
    requestAnimationFrame(() => {
      refresh();
      requestAnimationFrame(refresh);
    });

    return () => {
      stack.classList.remove('is-stacked');
      triggers.forEach((t) => t?.kill());
      cards.forEach((card) => {
        card.style.zIndex = '';
        gsap.set(card, { clearProps: 'transform,opacity' });
      });
    };
  });

  return {
    refresh() {
      ScrollTrigger.refresh();
    },
    destroy() {
      mm.revert();
      cards.forEach((card) => stack.before(card));
      stack.remove();
    },
  };
}
