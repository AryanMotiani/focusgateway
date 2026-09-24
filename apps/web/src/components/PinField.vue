<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'
defineProps({
  modelValue: String,
  placeholder: { type: String, default: 'PIN' },
  autocomplete: { type: String, default: 'current-password' },
})
const emit = defineEmits(['update:modelValue', 'enter'])
const show = ref(false)
</script>

<template>
  <div class="relative">
    <input
      class="input pr-10 font-mono tracking-widest"
      :type="show ? 'text' : 'password'"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      inputmode="text"
      @input="emit('update:modelValue', $event.target.value)"
      @keydown.enter="emit('enter')"
    />
    <button
      type="button"
      class="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-ink"
      :aria-label="show ? 'Hide PIN' : 'Show PIN'"
      @click="show = !show"
    >
      <Icon :name="show ? 'eyeOff' : 'eye'" :size="16" />
    </button>
  </div>
</template>
