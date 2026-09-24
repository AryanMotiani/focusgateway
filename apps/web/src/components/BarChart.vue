<script setup>
// Minimal accessible SVG bar chart.
import { computed, ref } from 'vue'
const props = defineProps({
  data: Array, // [{ label, value, title? }]
  color: { type: String, default: 'var(--fg-accent)' },
  unit: { type: String, default: '' },
  height: { type: Number, default: 140 },
})
const hover = ref(-1)
const max = computed(() => Math.max(1, ...props.data.map((d) => d.value)))
const W = 100
const bw = computed(() => W / props.data.length)
</script>

<template>
  <div class="relative">
    <svg
      :viewBox="`0 0 ${W} ${height / 3}`"
      class="w-full overflow-visible"
      :style="{ height: height + 'px' }"
      preserveAspectRatio="none"
      role="img"
      :aria-label="data.map((d) => `${d.label}: ${d.value}${unit}`).join(', ')"
    >
      <line
        x1="0"
        :y1="height / 3"
        :x2="W"
        :y2="height / 3"
        stroke="var(--fg-line)"
        stroke-width="0.3"
        vector-effect="non-scaling-stroke"
      />
      <g v-for="(d, i) in data" :key="i" @mouseenter="hover = i" @mouseleave="hover = -1">
        <rect :x="i * bw" y="0" :width="bw" :height="height / 3" fill="transparent" />
        <rect
          :x="i * bw + bw * 0.18"
          :y="height / 3 - (d.value / max) * (height / 3 - 2)"
          :width="bw * 0.64"
          :height="Math.max(d.value ? 0.6 : 0, (d.value / max) * (height / 3 - 2))"
          rx="0.8"
          :fill="color"
          :opacity="hover === -1 || hover === i ? 1 : 0.45"
          class="transition-opacity"
        />
      </g>
    </svg>
    <div class="mt-1.5 flex text-[10px] text-muted">
      <span v-for="(d, i) in data" :key="i" class="flex-1 text-center" :class="{ 'max-sm:invisible': i % 2 && data.length > 7 }">{{
        d.label
      }}</span>
    </div>
    <div
      v-if="hover >= 0"
      class="pointer-events-none absolute -top-2 rounded-lg bg-ink px-2 py-1 text-xs font-medium text-paper shadow"
      :style="{ left: `calc(${(hover + 0.5) * bw}% - 30px)` }"
    >
      {{ data[hover].title || data[hover].label }}: {{ data[hover].value }}{{ unit }}
    </div>
  </div>
</template>
