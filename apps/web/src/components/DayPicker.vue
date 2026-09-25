<script setup>
import { DAY_NAMES } from '../lib/format.js'
const model = defineModel({ type: Array, default: () => [] })
const toggle = (d) => (model.value = model.value.includes(d) ? model.value.filter((x) => x !== d) : [...model.value, d].sort())
const presets = [
  ['Weekdays', [1, 2, 3, 4, 5]],
  ['Every day', [1, 2, 3, 4, 5, 6, 7]],
  ['Weekends', [6, 7]],
]
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-1.5" role="group" aria-label="Days">
      <button
        v-for="(n, i) in DAY_NAMES"
        :key="n"
        type="button"
        :aria-pressed="model.includes(i + 1)"
        class="h-10 w-11 rounded-xl border text-sm font-semibold transition"
        :class="model.includes(i + 1) ? 'border-accent bg-accent text-on-accent' : 'border-line bg-card text-muted hover:border-accent'"
        @click="toggle(i + 1)"
      >
        {{ n }}
      </button>
    </div>
    <div class="mt-2 flex gap-3 text-xs">
      <button
        v-for="[label, days] in presets"
        :key="label"
        type="button"
        class="font-medium text-accent hover:underline"
        @click="model = [...days]"
      >
        {{ label }}
      </button>
    </div>
  </div>
</template>
