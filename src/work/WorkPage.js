export function initWorkPage() {
  const root = document.querySelector('.page-work');
  if (!root) return;

  const projects = [...root.querySelectorAll('[data-work-project]')];
  const filters = [...root.querySelectorAll('[data-work-filter]')];

  function applyFilter(value) {
    const activeFilter = value || 'all';
    filters.forEach((btn) => {
      const on = btn.dataset.workFilter === activeFilter;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    projects.forEach((project) => {
      const tags = (project.dataset.workTags || '').split(/\s+/).filter(Boolean);
      const show = activeFilter === 'all' || tags.includes(activeFilter);
      project.classList.toggle('is-filtered-out', !show);
      project.toggleAttribute('hidden', !show);
      project.setAttribute('aria-hidden', String(!show));
    });
  }

  filters.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
    btn.addEventListener('click', () => applyFilter(btn.dataset.workFilter));
  });

  applyFilter(filters.find((b) => b.classList.contains('is-active'))?.dataset.workFilter || 'all');
}
