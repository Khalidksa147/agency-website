export function initAboutPage() {
  const root = document.querySelector('.page-about');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const jumpLinks = [...root.querySelectorAll('.about-hero__jump a')];
  const sections = jumpLinks
    .map((link) => {
      const id = link.getAttribute('href');
      if (!id?.startsWith('#')) return null;
      const el = root.querySelector(id);
      return el ? { link, el, id } : null;
    })
    .filter(Boolean);

  function sectionTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function setActiveJump() {
    if (!sections.length) return;
    const y = window.scrollY + window.innerHeight * 0.35;
    let active = sections[0];
    for (const item of sections) {
      if (sectionTop(item.el) <= y) active = item;
    }
    sections.forEach((item) => {
      item.link.classList.toggle('is-active', item === active);
    });
  }

  window.addEventListener('scroll', setActiveJump, { passive: true });
  window.addEventListener('resize', setActiveJump, { passive: true });
  setActiveJump();

  const heroVisual = root.querySelector('.about-hero__visual');
  const heroImg = heroVisual?.querySelector('img');
  if (heroVisual && heroImg && !reduceMotion) {
    heroVisual.addEventListener('pointermove', (event) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      heroImg.style.transform = `scale(1.06) translate(${x * -12}px, ${y * -10}px)`;
      heroVisual.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
      heroVisual.style.setProperty('--my', `${(y + 0.5) * 100}%`);
    });
    heroVisual.addEventListener('pointerleave', () => {
      heroImg.style.transform = '';
      heroVisual.style.removeProperty('--mx');
      heroVisual.style.removeProperty('--my');
    });
  }

  const counters = [...root.querySelectorAll('[data-count-to]')];
  const animateCounter = (el) => {
    if (el.dataset.countDone === '1') return;
    el.dataset.countDone = '1';
    const target = Number(el.dataset.countTo) || 0;
    const suffix = el.dataset.countSuffix || '';
    const prefix = el.dataset.countPrefix || '';
    if (reduceMotion) {
      el.textContent = `${prefix}${target}${suffix}`;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const value = Math.round(target * eased);
      el.textContent = `${prefix}${value}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (counters.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' },
    );
    counters.forEach((el) => io.observe(el));

    const kick = () => {
      counters.forEach((el) => {
        if (el.dataset.countDone === '1') return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
          animateCounter(el);
          io.unobserve(el);
        }
      });
    };
    document.addEventListener('qiram:reveal', kick, { once: true });
    window.setTimeout(kick, 900);
  } else {
    counters.forEach(animateCounter);
  }

  const valueItems = [...root.querySelectorAll('.about-values__grid li')];
  const valueDetail = root.querySelector('[data-value-detail]');
  const valueDetailTitle = valueDetail?.querySelector('[data-value-title]');
  const valueDetailBody = valueDetail?.querySelector('[data-value-body]');

  function setActiveValue(item, { focus = false } = {}) {
    valueItems.forEach((li) => {
      const on = li === item;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-pressed', String(on));
    });
    if (valueDetail && item) {
      const title = item.querySelector('h3')?.textContent?.trim() || '';
      const body = item.dataset.valueMore || item.querySelector('p')?.textContent?.trim() || '';
      if (valueDetailTitle) valueDetailTitle.textContent = title;
      if (valueDetailBody) valueDetailBody.textContent = body;
      valueDetail.classList.add('is-visible');
    }
    if (focus) item?.focus({ preventScroll: true });
  }

  valueItems.forEach((item) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-pressed', 'false');

    item.addEventListener('pointermove', (event) => {
      const rect = item.getBoundingClientRect();
      item.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      item.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });

    item.addEventListener('click', () => setActiveValue(item));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setActiveValue(item);
      }
    });
  });

  if (valueItems[0]) setActiveValue(valueItems[0]);

  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 18;
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * strength;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });

  const storyMedia = root.querySelector('.about-story__media');
  const storyImg = storyMedia?.querySelector('img');
  if (storyMedia && storyImg && !reduceMotion && 'IntersectionObserver' in window) {
    const onScroll = () => {
      const rect = storyMedia.getBoundingClientRect();
      const view = window.innerHeight || 1;
      const progress = Math.min(1, Math.max(0, 1 - rect.top / view));
      storyImg.style.transform = `scale(1.08) translateY(${(progress - 0.5) * 24}px)`;
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
          } else {
            window.removeEventListener('scroll', onScroll);
          }
        });
      },
      { threshold: 0.05 },
    );
    io.observe(storyMedia);
  }
}
