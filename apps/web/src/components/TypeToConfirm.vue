<script setup>
// Type-to-confirm: the exact sentence + a real reason. Paste and drop are blocked,
// the backend re-checks the text anyway.
import { computed } from 'vue'
import { MIN_REASON_LENGTH } from '@focusgateway/core'
const props = defineProps({ phrase: String, modelValue: String })
const emit = defineEmits(['update:modelValue'])
const squash = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
const prefixOk = computed(() => squash(props.modelValue).toLowerCase().startsWith(squash(props.phrase).toLowerCase()))
const reason = computed(() => (prefixOk.value ? squash(props.modelValue).slice(squash(props.phrase).length).trim() : ''))
const valid = computed(() => prefixOk.value && reason.value.length >= MIN_REASON_LENGTH)
defineExpose({ valid })
const block = (e) => e.preventDefault()
</script>

<template>
  <div>
    <p class="mb-2 text-sm text-muted">Type this sentence, then finish it with your reason:</p>
    <p class="mb-3 rounded-xl bg-sunk px-3 py-2 font-mono text-[13px] select-none" @copy.prevent>{{ phrase }} …</p>
    <textarea
      class="input min-h-24 font-mono text-[13px]"
      :value="modelValue"
      spellcheck="false"
      autocomplete="off"
      @input="emit('update:modelValue', $event.target.value)"
      @paste="block"
      @drop="block"
      aria-label="Confirmation sentence"
    />
    <p class="mt-1.5 text-xs" :class="valid ? 'text-good' : 'text-muted'">
      <template v-if="!prefixOk">Start with the sentence above, word for word. Pasting is disabled.</template>
      <template v-else-if="!valid">Now add a real reason ({{ MIN_REASON_LENGTH }}+ characters).</template>
      <template v-else>OK. Be honest with yourself.</template>
    </p>
  </div>
</template>
