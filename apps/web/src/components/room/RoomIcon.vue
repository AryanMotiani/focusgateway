<script setup>
// Extra icons for the study room windows and player (same Lucide-style strokes as Icon.vue).
// Anything not here falls back to Icon.vue.
import Icon from '../Icon.vue'

defineProps({ name: String, size: { type: [Number, String], default: 18 } })
const P = {
  minimize: 'M5 12h14',
  maximizeWin: 'M5 5h14v14H5z',
  restoreWin: 'M8 8h11v11H8z M5 16V5h11',
  skipBack: 'M19 20 9 12l10-8z M5 19V5',
  skipForward: 'M5 4l10 8-10 8z M19 5v14',
  shuffle: 'M16 3h5v5 M4 20 21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5',
  repeatOne: 'M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3 M11 10h1v4',
  playlist: 'M3 6h12 M3 12h12 M3 18h8 M17 18V9l4-1 M17 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  notes: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M8 13h8 M8 17h5',
  layout: 'M3 3h18v18H3z M3 9h18 M9 21V9',
  keyboard: 'M2 6h20v12H2z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M7 14h10',
  grip: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
}
</script>

<template>
  <svg
    v-if="P[name]"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path v-for="(d, i) in P[name].split(' M').map((s, i) => (i ? 'M' + s : s))" :key="i" :d="d" />
  </svg>
  <Icon v-else :name="name" :size="size" />
</template>
