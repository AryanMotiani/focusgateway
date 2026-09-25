<script setup>
// Three rings for this week: tasks finished, focus minutes vs goal, habits kept.
import Ring from './Ring.vue'
import Icon from '../Icon.vue'
defineProps({ rings: Object })
const RINGS = [
  { key: 'tasks', label: 'Tasks', color: 'var(--fg-accent)', unit: '' },
  { key: 'focus', label: 'Focus', color: 'var(--fg-warm)', unit: ' min' },
  { key: 'habits', label: 'Habits', color: 'var(--fg-good)', unit: '' },
]
</script>
<template>
  <div>
    <div class="grid grid-cols-3 gap-2">
      <div v-for="r in RINGS" :key="r.key" class="flex flex-col items-center text-center">
        <div class="relative">
          <Ring :pct="rings[r.key].pct" :color="r.color" :size="84" :stroke="10" />
          <span class="num absolute inset-0 grid place-items-center text-lg">{{ Math.round((rings[r.key].pct || 0) * 100) }}%</span>
        </div>
        <p class="hud-label mt-1.5 text-xs">{{ r.label }}</p>
        <p class="text-[11px] text-muted">{{ rings[r.key].value }} / {{ rings[r.key].goal || 0 }}{{ r.unit }}</p>
      </div>
    </div>
    <p v-if="rings.perfect" class="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-good">
      <Icon name="sparkles" :size="15" /> Perfect week so far
    </p>
  </div>
</template>
