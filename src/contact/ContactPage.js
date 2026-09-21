export function initContactPage() {
  const root = document.querySelector('.page-contact');
  if (!root) return;

  const form = root.querySelector('.contact-form');
  const chips = [...root.querySelectorAll('[data-project-type]')];
  const native = form?.querySelector('select[name="type"]');
  const selectBtn = form?.querySelector('.contact-select-btn span');
  const preview = root.querySelector('[data-brief]');
  const progress = root.querySelector('[data-form-progress]');
  const progressVal = root.querySelector('[data-form-progress-val]');
  const fields = form
    ? [...form.querySelectorAll('input[name], textarea[name], select[name]')]
    : [];

  const briefMap = {
    name: preview?.querySelector('[data-brief-name]'),
    company: preview?.querySelector('[data-brief-company]'),
    type: preview?.querySelector('[data-brief-type]'),
    message: preview?.querySelector('[data-brief-message]'),
    email: preview?.querySelector('[data-brief-email]'),
  };

  const placeholders = {
    name: document.documentElement.lang === 'ar' ? 'اسمك' : 'Your name',
    company: document.documentElement.lang === 'ar' ? 'شركتك' : 'Your company',
    type: document.documentElement.lang === 'ar' ? 'نوع المشروع' : 'Project type',
    message: document.documentElement.lang === 'ar' ? 'تفاصيل المشروع…' : 'Project details…',
    email: document.documentElement.lang === 'ar' ? 'بريدك' : 'Your email',
  };

  function syncChips(value) {
    chips.forEach((chip) => {
      const on = chip.dataset.projectType === value;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', String(on));
    });
  }

  function setType(value, label) {
    if (!native || !value) return;
    native.value = value;
    if (selectBtn) {
      selectBtn.textContent = label || native.selectedOptions[0]?.textContent || value;
      form?.querySelector('.contact-select-btn')?.classList.add('is-chosen');
    }
    syncChips(value);
    updateBrief();
    updateProgress();
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      setType(chip.dataset.projectType, chip.textContent.trim());
    });
  });

  native?.addEventListener('change', () => {
    syncChips(native.value);
    updateBrief();
    updateProgress();
  });

  function updateBrief() {
    if (!form || !preview) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (briefMap.name) briefMap.name.textContent = data.name || placeholders.name;
    if (briefMap.company) briefMap.company.textContent = data.company || placeholders.company;
    if (briefMap.email) briefMap.email.textContent = data.email || placeholders.email;
    if (briefMap.message) briefMap.message.textContent = data.message || placeholders.message;
    if (briefMap.type) {
      const opt = native?.selectedOptions?.[0];
      briefMap.type.textContent = (opt && opt.value ? opt.textContent : '') || placeholders.type;
    }
    preview.classList.toggle('has-content', Boolean(data.name || data.company || data.message || data.type));
  }

  function updateProgress() {
    if (!form || !progress) return;
    const required = fields.filter((el) => el.required);
    const filled = required.filter((el) => String(el.value || '').trim().length > 0).length;
    const pct = required.length ? Math.round((filled / required.length) * 100) : 0;
    progress.style.setProperty('--progress', `${pct}%`);
    if (progressVal) progressVal.textContent = `${pct}%`;
    progress.classList.toggle('is-complete', pct === 100);
  }

  fields.forEach((field) => {
    field.addEventListener('input', () => {
      updateBrief();
      updateProgress();
    });
    field.addEventListener('change', () => {
      updateBrief();
      updateProgress();
    });
  });

  // Observe custom select clicks updating the native value
  form?.querySelector('.contact-select-list')?.addEventListener('click', () => {
    window.requestAnimationFrame(() => {
      syncChips(native?.value || '');
      updateBrief();
      updateProgress();
    });
  });

  root.querySelectorAll('[data-copy-email]').forEach((btn) => {
    const email = btn.dataset.copyEmail;
    if (!email) return;
    btn.addEventListener('click', async (event) => {
      if (btn.tagName === 'A') event.preventDefault();
      try {
        await navigator.clipboard.writeText(email);
        const label = btn.querySelector('[data-copy-label]');
        if (!label) return;
        const prev = label.textContent;
        label.textContent = document.documentElement.lang === 'ar' ? 'تم النسخ' : 'Copied';
        btn.classList.add('is-copied');
        window.setTimeout(() => {
          label.textContent = prev;
          btn.classList.remove('is-copied');
        }, 1400);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  });

  root.querySelectorAll('.contact-faq__item').forEach((item) => {
    const trigger = item.querySelector('button');
    const panel = item.querySelector('.contact-faq__panel');
    if (!trigger || !panel) return;
    trigger.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      root.querySelectorAll('.contact-faq__item.is-open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('is-open');
          other.querySelector('button')?.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('is-open', !open);
      trigger.setAttribute('aria-expanded', String(!open));
    });
  });

  const channelCards = root.querySelectorAll('.contact-channel');
  channelCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  });

  form?.addEventListener('contact:reset', () => {
    syncChips('');
    updateBrief();
    updateProgress();
  });

  syncChips(native?.value || '');
  updateBrief();
  updateProgress();
}
