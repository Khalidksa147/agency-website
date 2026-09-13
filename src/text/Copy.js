import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(SplitText, ScrollTrigger);

const HERO_LIFT_DELAY = 0.1;

const splits = [];
const heroPlayers = new Map();
let observer = null;

function animateElement(element, { deferHero = false } = {}) {
  const animateOnScroll = element.dataset.copyScroll !== 'false';
  const delay = Number(element.dataset.copyDelay || 0);
  const targets = element.hasAttribute('data-copy-wrapper')
    ? [...element.children]
    : [element];

  targets.forEach((target) => {
    const split = SplitText.create(target, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line++',
      lineThreshold: 0.1,
      autoSplit: true,
      onSplit(self) {
        const indent = window.getComputedStyle(target).textIndent;
        if (indent && indent !== '0px' && self.lines[0]) {
          self.lines[0].style.paddingInlineStart = indent;
          target.style.textIndent = '0';
        }

        element.classList.add('is-copy-ready');
        if (!self.lines.length) return;

        const props = {
          yPercent: 100,
          duration: 1.55,
          stagger: 0.16,
          ease: 'power4.out',
          delay,
        };

        if (!animateOnScroll && deferHero) {
          gsap.set(self.lines, { yPercent: 100 });
          heroPlayers.set(element, () =>
            gsap.to(self.lines, {
              yPercent: 0,
              duration: props.duration,
              stagger: props.stagger,
              ease: props.ease,
              delay: delay + HERO_LIFT_DELAY,
            }),
          );
          return;
        }

        if (animateOnScroll) {
          return gsap.from(self.lines, {
            ...props,
            scrollTrigger: {
              trigger: element,
              start: 'top 75%',
              once: true,
            },
          });
        }

        return gsap.from(self.lines, {
          ...props,
          delay: delay + HERO_LIFT_DELAY,
        });
      },
    });

    splits.push(split);
  });
}

function observeRest() {
  if (observer) return;
  const rest = [...document.querySelectorAll('[data-copy]')].filter(
    (el) => el.dataset.copyScroll !== 'false',
  );
  if (!rest.length) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animateElement(entry.target);
      });
    },
    { rootMargin: '45% 0px', threshold: 0.01 },
  );
  rest.forEach((el) => observer.observe(el));
}

export function revertCopy() {
  observer?.disconnect();
  observer = null;
  heroPlayers.clear();
  splits.splice(0).forEach((split) => split.revert());
  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.classList.remove('is-copy-ready');
  });
}

export function prepareHeroCopy() {
  if (heroPlayers.size) return;
  document
    .querySelectorAll('[data-copy]')
    .forEach((el) => {
      if (el.dataset.copyScroll === 'false') animateElement(el, { deferHero: true });
    });
}

export function playHeroCopy() {
  if (!heroPlayers.size) return false;
  heroPlayers.forEach((play) => play());
  heroPlayers.clear();
  return true;
}

export function initCopy({ skipHero = false } = {}) {
  if (!skipHero) {
    revertCopy();
    document.querySelectorAll('[data-copy]').forEach((el) => {
      if (el.dataset.copyScroll === 'false') animateElement(el);
    });
  }
  observeRest();
}
