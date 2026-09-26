<script setup>
// Light or Dark for every theme, as a clear sun and moon switch. auto: also offer Auto,
// which follows the device. Light is the default, so nothing turns dark by itself.
import { colorMode, setColorMode } from '../../lib/look.js'
import Icon from '../Icon.vue'

defineProps({ auto: Boolean, wide: Boolean })
const OPTIONS = [
  ['light', 'Light', 'sun'],
  ['dark', 'Dark', 'moon'],
  ['auto', 'Auto', 'monitor'],
]
</script>

<template>
  <div
    class="flex rounded-xl border border-line bg-sunk p-0.5 text-sm"
    :class="wide ? 'w-full' : 'w-fit'"
    role="radiogroup"
    aria-label="Light or dark"
    data-color-mode-switch
  >
    <button
      v-for="[id, label, icon] in auto ? OPTIONS : OPTIONS.slice(0, 2)"
      :key="id"
      type="button"
      role="radio"
      :aria-checked="colorMode === id"
      :title="id === 'auto' ? 'Match my device' : `${label} mode`"
      :data-color-mode="id"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition"
      :class="colorMode === id ? 'bg-card text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'"
      @click="setColorMode(id)"
    >
      <Icon :name="icon" :size="15" :class="colorMode === id && id !== 'auto' && 'text-accent'" />
      {{ label }}
    </button>
  </div>
</template>
