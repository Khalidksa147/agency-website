export function initServicesPage() {
  const root = document.querySelector('.page-services');
  if (!root) return;

  const services = [...root.querySelectorAll('[data-service]')];
  const filters = [...root.querySelectorAll('[data-service-filter]')];

  function applyFilter(value) {
    const activeFilter = value || 'all';
    filters.forEach((btn) => {
      const on = btn.dataset.serviceFilter === activeFilter;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    services.forEach((service) => {
      const key = service.dataset.service || '';
      const show = activeFilter === 'all' || key === activeFilter;
      service.classList.toggle('is-filtered-out', !show);
      service.setAttribute('aria-hidden', String(!show));
    });
  }

  filters.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
    btn.addEventListener('click', () => applyFilter(btn.dataset.serviceFilter));
  });

  services.forEach((service) => {
    const tags = [...service.querySelectorAll('.svc-tags li')];
    tags.forEach((tag) => {
      tag.setAttribute('tabindex', '0');
      tag.setAttribute('role', 'button');
      const activate = () => {
        tags.forEach((t) => t.classList.toggle('is-active', t === tag));
      };
      tag.addEventListener('click', activate);
      tag.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });
  });

  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 16;
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

  applyFilter(filters.find((b) => b.classList.contains('is-active'))?.dataset.serviceFilter || 'all');
}
