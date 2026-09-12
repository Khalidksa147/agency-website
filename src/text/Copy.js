import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(SplitText, ScrollTrigger);

const splits = [];

function animateElement(element) {
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

        return gsap.from(self.lines, props);
      },
    });

    splits.push(split);
  });
}

export function revertCopy() {
  splits.splice(0).forEach((split) => split.revert());
  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.classList.remove('is-copy-ready');
  });
}

export function initCopy() {
  revertCopy();
  document.querySelectorAll('[data-copy]').forEach(animateElement);
}
