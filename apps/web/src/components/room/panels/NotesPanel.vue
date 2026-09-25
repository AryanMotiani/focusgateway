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
    class="block h-full min-h-28 w-full resize-none rounded-lg border border-white/8 bg-white/4 p-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/40 focus:border-white/25"
    placeholder="Park stray thoughts here so they stop nagging you."
    aria-label="Scratchpad"
  />
</template>
