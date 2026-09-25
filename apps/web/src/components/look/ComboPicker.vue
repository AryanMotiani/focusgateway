<script setup>
// One-click looks: palette + heading font + body font picked to go together.
import { computed } from 'vue'
import { APPEARANCE, appearanceFor } from '@focusgateway/core'
import { store } from '../../lib/store.js'
import { isDark, setLook, findPalette, findHeading, findBody } from '../../lib/look.js'
import PaletteDots from './PaletteDots.vue'

const props = defineProps({ mode: { type: String, default: 'game' }, limit: Number, compact: Boolean })
const combos = computed(() => {
  const list = APPEARANCE[props.mode].combos.map((c) => ({
    ...c,
    colors: findPalette(props.mode, c.palette).swatch[isDark.value ? 'dark' : 'light'],
    heading: findHeading(props.mode, c.heading),
    body: findBody(props.mode, c.body),
  }))
  return props.limit ? list.slice(0, props.limit) : list
})
const cur = computed(() => appearanceFor(store.state?.settings, props.mode))
const active = (c) => cur.value.palette === c.palette && cur.value.heading === c.heading.id && cur.value.body === c.body.id
const pick = (c) => setLook({ palette: c.palette, heading: c.heading.id, body: c.body.id }, props.mode)
</script>

<template>
  <div class="grid gap-2" :class="compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'">
    <button
      v-for="c in combos"
      :key="c.id"
      type="button"
      class="flex min-w-0 flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition"
      :class="active(c) ? 'border-accent bg-accent-soft' : 'border-line bg-card hover:border-ink/25'"
      :aria-pressed="active(c)"
      @click="pick(c)"
    >
      <PaletteDots :colors="c.colors" size="sm" />
      <span
        class="block w-full leading-tight"
        :class="compact ? 'text-base' : 'truncate text-lg'"
        :style="{ fontFamily: c.heading.family, fontWeight: c.heading.weight }"
        >{{ c.name }}</span
      >
      <span v-if="!compact" class="block w-full truncate text-[11px] text-muted" :style="{ fontFamily: c.body.family }"
        >{{ c.heading.name }} + {{ c.body.name }}</span
      >
    </button>
  </div>
</template>
