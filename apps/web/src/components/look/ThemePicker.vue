<script setup>
// The themes of one mode as big preview cards. Picking one applies it right away.
import { computed } from 'vue'
import { themesFor, lookFor, setTheme } from '../../lib/look.js'
import ThemeCard from './ThemeCard.vue'

const props = defineProps({ mode: { type: String, default: 'game' }, compact: Boolean })
const themes = computed(() => themesFor(props.mode))
const current = computed(() => lookFor(props.mode).theme)
</script>

<template>
  <div
    class="grid gap-3"
    :class="compact ? 'grid-cols-2' : 'sm:grid-cols-2'"
    role="radiogroup"
    :aria-label="`${mode === 'game' ? 'Game' : 'Calm'} themes`"
  >
    <ThemeCard
      v-for="t in themes"
      :key="t.id"
      :theme="t"
      :mode="mode"
      :compact="compact"
      :selected="current === t.id"
      @pick="setTheme($event, mode)"
    />
  </div>
</template>
