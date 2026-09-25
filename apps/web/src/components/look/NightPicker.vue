<script setup>
// Optional second theme for when the device is in dark mode. Off by default.
import { computed } from 'vue'
import { themesFor, lookFor, setNight } from '../../lib/look.js'

const props = defineProps({ mode: { type: String, default: 'game' } })
const current = computed(() => lookFor(props.mode))
const options = computed(() => themesFor(props.mode).filter((t) => t.id !== current.value.theme))
</script>

<template>
  <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Night theme">
    <button
      type="button"
      role="radio"
      :aria-checked="!current.night"
      class="rounded-xl border-2 px-3 py-2 text-sm font-semibold transition"
      :class="!current.night ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-ink/30'"
      @click="setNight(null, mode)"
    >
      Off
    </button>
    <button
      v-for="t in options"
      :key="t.id"
      type="button"
      role="radio"
      :aria-checked="current.night === t.id"
      class="theme-scope flex items-center gap-2.5 rounded-xl border-2 px-3 py-1.5 transition"
      :class="current.night === t.id ? 'border-accent' : 'border-transparent opacity-85 hover:opacity-100'"
      :data-theme-id="t.id"
      :data-mode="mode"
      @click="setNight(t.id, mode)"
    >
      <span class="flex -space-x-1" aria-hidden="true">
        <i v-for="c in t.swatch.slice(3, 6)" :key="c" class="block h-3.5 w-3.5 rounded-full ring-2 ring-paper" :style="{ background: c }" />
      </span>
      <span class="h-display text-lg leading-none">{{ t.name }}</span>
    </button>
  </div>
</template>
