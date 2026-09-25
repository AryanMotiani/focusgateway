<script setup>
// The time, or the focus countdown while a round runs. Kept in its own component so the
// once-a-second tick re-renders only this, never the room.
import { computed } from 'vue'
import { focusPhase } from '@focusgateway/core'
import { store } from '../../lib/store.js'
import { countdown } from '../../lib/format.js'

defineProps({ compact: Boolean })
const phase = computed(() => {
  const f = store.state?.focus?.active
  return f ? focusPhase(f, store.now) : null
})
const text = computed(() =>
  phase.value
    ? countdown(phase.value.phaseEnds - store.now)
    : new Date(store.now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
)
const label = computed(() => (phase.value ? (phase.value.phase === 'work' ? `Focus · round ${phase.value.iteration}` : 'Break') : null))
</script>

<template>
  <span v-if="compact" class="num inline-flex items-center gap-2">
    <span v-if="label" class="h-2 w-2 rounded-full" :class="phase.phase === 'work' ? 'bg-accent' : 'bg-warm'" />{{ text }}
  </span>
  <div v-else>
    <p v-if="label" class="hud-label text-xs" :class="phase.phase === 'work' ? 'text-accent' : 'text-warm'">{{ label }}</p>
    <p class="font-display text-5xl leading-none tracking-tight" style="text-shadow: 0 4px 30px rgba(0, 0, 0, 0.35)">{{ text }}</p>
  </div>
</template>
