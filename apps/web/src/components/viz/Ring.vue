<script setup>
import { computed } from 'vue'
const props = defineProps({ pct: Number, color: String, size: { type: Number, default: 72 }, stroke: { type: Number, default: 9 } })
const r = computed(() => (props.size - props.stroke) / 2)
const c = computed(() => 2 * Math.PI * r.value)
</script>
<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90" aria-hidden="true">
    <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" :stroke-width="stroke" stroke="var(--fg-sunk)" />
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="r"
      fill="none"
      :stroke-width="stroke"
      :stroke="color"
      stroke-linecap="round"
      :stroke-dasharray="c"
      :stroke-dashoffset="c * (1 - Math.min(1, pct || 0))"
      style="transition: stroke-dashoffset 0.8s ease"
    />
  </svg>
</template>
