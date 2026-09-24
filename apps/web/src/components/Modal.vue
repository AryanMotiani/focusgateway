<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Icon from './Icon.vue'
const props = defineProps({ title: String, wide: Boolean, dismissable: { type: Boolean, default: true } })
const emit = defineEmits(['close'])
const panel = ref(null)
const onKey = (e) => e.key === 'Escape' && props.dismissable && emit('close')
onMounted(() => {
  document.addEventListener('keydown', onKey)
  panel.value?.querySelector('input, textarea, select, button.btn-primary')?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-[#0b0918]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" @mousedown.self="dismissable && emit('close')">
      <div ref="panel" role="dialog" aria-modal="true" :aria-label="title"
        class="card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        :class="wide ? 'sm:max-w-2xl' : 'sm:max-w-md'">
        <div class="mb-4 flex items-start justify-between gap-4">
          <h2 class="text-lg font-semibold leading-tight">{{ title }}</h2>
          <button v-if="dismissable" class="btn-ghost -m-1 rounded-lg p-1 text-muted hover:text-ink" aria-label="Close" @click="emit('close')"><Icon name="x" /></button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
