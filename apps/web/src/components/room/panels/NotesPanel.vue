<script setup>
// The scratchpad: park stray thoughts. Kept on this device only.
import { ref, watch } from 'vue'

const note = ref('')
try {
  note.value = localStorage.getItem('focusgateway:room-note') || ''
} catch {}
watch(note, (v) => {
  try {
    localStorage.setItem('focusgateway:room-note', v)
  } catch {}
})
</script>

<template>
  <textarea
    v-model="note"
    class="room-well block h-full min-h-28 w-full resize-none p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent"
    placeholder="Park stray thoughts here so they stop nagging you."
    aria-label="Scratchpad"
  />
</template>
