<script setup>
import { store } from '../lib/store.js'
import Icon from './Icon.vue'
const tone = { success: 'bg-good-soft text-good', error: 'bg-bad-soft text-bad', info: 'bg-accent-soft text-accent' }
const icon = { success: 'checkCircle', error: 'alert', info: 'info' }
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
    <TransitionGroup enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-for="t in store.toasts" :key="t.id" class="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border border-line px-4 py-3 text-sm font-medium shadow-lg" :class="tone[t.kind]">
        <Icon :name="icon[t.kind]" :size="16" class="mt-0.5" />
        <span>{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>
