import { gsap } from 'gsap';

const COLORS = ['#d7ff4d', '#64f0dd', '#9877ff'];

function noise(n = 1) {
  return n / 2 - Math.random() * n;
}

function getXY(distance, pointIndex, totalPoints) {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
}

export function initGooeyNav(root) {
  if (!root) {
    return { setActiveFromHref() {}, refresh() {} };
  }

  const items = [...root.querySelectorAll('li')];
  const filter = root.querySelector('.gooey-filter');
  const text = root.querySelector('.gooey-text');
  if (!items.length || !filter || !text) {
    return { setActiveFromHref() {}, refresh() {} };
  }

  let activeIndex = Math.max(0, items.findIndex((item) => item.classList.contains('is-active')));

  const updatePosition = (el) => {
    if (getComputedStyle(root).display === 'none') return;
    const container = root.getBoundingClientRect();
    const pos = el.getBoundingClientRect();
    const box = {
      left: `${pos.x - container.x}px`,
      top: `${pos.y - container.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(filter.style, box);
    Object.assign(text.style, box);
    text.textContent = el.querySelector('a')?.textContent?.trim() || el.textContent.trim();
  };

  const makeParticles = () => {
    const count = 9;
    const reach = [32, 7];
    const spin = 70;

    filter.querySelectorAll('.gooey-particle').forEach((node) => node.remove());

    for (let i = 0; i < count; i += 1) {
      const duration = 0.72 + noise(0.28);
      const start = getXY(reach[0], count - i, count);
      const end = getXY(reach[1] + noise(5), count - i, count);
      const scale = 0.82 + noise(0.18);
      let rotate = noise(spin / 10);
      rotate = rotate > 0 ? (rotate + spin / 20) * 10 : (rotate - spin / 20) * 10;

      const particle = document.createElement('span');
      const point = document.createElement('span');
      particle.className = 'gooey-particle';
      point.className = 'gooey-point';
      point.style.background = COLORS[i % COLORS.length];
      particle.append(point);
      filter.append(particle);

      gsap.set(particle, { x: start[0], y: start[1], rotate: 0, opacity: 1 });
      gsap.set(point, { scale: 0, opacity: 0 });

      gsap.to(particle, {
        keyframes: [
          { duration: duration * 0.7, x: end[0] * 1.15, y: end[1] * 1.15, rotate: rotate * 0.5, ease: 'power2.in' },
          { duration: duration * 0.15, x: end[0], y: end[1], rotate: rotate * 0.66, ease: 'power1.out' },
          { duration: duration * 0.15, x: end[0] * 0.5, y: end[1] * 0.5, rotate: rotate * 1.1, ease: 'power1.in' },
        ],
        onComplete: () => particle.remove(),
      });

      gsap.to(point, {
        keyframes: [
          { duration: duration * 0.22, scale: scale * 0.28, opacity: 1, ease: 'power2.out' },
          { duration: duration * 0.4, scale, opacity: 1, ease: 'power1.out' },
          { duration: duration * 0.38, scale: 0, opacity: 0, ease: 'power1.in' },
        ],
      });
    }
  };

  const setActive = (index, { burst = false } = {}) => {
    if (index < 0 || index >= items.length) return;
    const item = items[index];
    const changed = index !== activeIndex;
    if (!changed && !burst && filter.classList.contains('is-active')) return;
    activeIndex = index;

    items.forEach((li, i) => {
      const on = i === index;
      li.classList.toggle('is-active', on);
      li.querySelector('a')?.classList.toggle('is-active', on);
    });

    updatePosition(item);
    text.classList.add('is-active');

    if (burst && changed) {
      filter.classList.remove('is-active');
      text.classList.remove('is-active');
      void filter.offsetWidth;
      filter.classList.add('is-active');
      text.classList.add('is-active');
      makeParticles();
    } else {
      filter.classList.add('is-active');
    }
  };

  items.forEach((item, index) => {
    item.querySelector('a')?.addEventListener('click', () => {
      setActive(index, { burst: true });
    });
  });

  const observer = new ResizeObserver(() => {
    updatePosition(items[activeIndex]);
  });
  observer.observe(root);

  setActive(activeIndex);

  return {
    setActiveFromHref(href, options) {
      const index = items.findIndex((item) => item.querySelector('a')?.getAttribute('href') === href);
      if (index >= 0) setActive(index, options);
    },
    refresh() {
      updatePosition(items[activeIndex]);
    },
  };
}
