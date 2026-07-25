export const vUppercaseOnDrag = {
  mounted(el: HTMLElement) {
    if (!el || typeof el.addEventListener !== 'function') return;

    el.addEventListener('dragstart', () => {
      const titleEl = el.querySelector('.task-title');
      if (titleEl) {
        el.dataset.originalTitle = titleEl.textContent || '';
        titleEl.textContent = (titleEl.textContent || '').toUpperCase();
      }
    });

    el.addEventListener('dragend', () => {
      const titleEl = el.querySelector('.task-title');
      if (titleEl && el.dataset.originalTitle) {
        titleEl.textContent = el.dataset.originalTitle;
      }
    });
  },
};

export const vFormatDate = {
  mounted(el: HTMLElement, binding: { value: string | Date }) {
    if (!el || !binding.value) return;
    const date = new Date(binding.value);
    if (!isNaN(date.getTime())) {
      el.textContent = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  },
  updated(el: HTMLElement, binding: { value: string | Date }) {
    if (!el || !binding.value) return;
    const date = new Date(binding.value);
    if (!isNaN(date.getTime())) {
      el.textContent = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  },
};
