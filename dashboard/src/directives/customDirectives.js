'use strict';

/**
 * Vue 3 directive: v-uppercase-on-drag
 * Uppercases task title during HTML5 drag operation.
 */
const vUppercaseOnDrag = {
  mounted(el) {
    if (!el || typeof el.addEventListener !== 'function') return;

    el.addEventListener('dragstart', () => {
      const titleEl = el.querySelector('.task-title');
      if (titleEl) {
        el.dataset.originalTitle = titleEl.textContent;
        titleEl.textContent = titleEl.textContent.toUpperCase();
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

/**
 * Vue 3 directive: v-format-date
 * Formats a Date object or ISO string to a human-readable format.
 */
const vFormatDate = {
  mounted(el, binding) {
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
  updated(el, binding) {
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

module.exports = { vUppercaseOnDrag, vFormatDate };
