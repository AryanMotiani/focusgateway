<script setup>
import { ref, watch } from 'vue'
import { dialogs } from '../lib/dialogs.js'
import Modal from './Modal.vue'
import PinField from './PinField.vue'
import TypeToConfirm from './TypeToConfirm.vue'
import Icon from './Icon.vue'

const pin = ref('')
const text = ref('')
const confirmRef = ref(null)
watch(
  () => dialogs.current,
  () => {
    pin.value = ''
    text.value = ''
  },
)
const d = () => dialogs.current
</script>

<template>
  <Modal v-if="dialogs.current" :title="dialogs.current.title" @close="d().resolve(null)">
    <template v-if="dialogs.current.kind === 'pin'">
      <p v-if="dialogs.current.message" class="mb-3 text-sm text-muted">{{ dialogs.current.message }}</p>
      <PinField v-model="pin" @enter="pin && d().resolve(pin)" />
      <div class="mt-5 flex justify-end gap-2">
        <button class="btn" @click="d().resolve(null)">Cancel</button>
        <button class="btn btn-primary" :disabled="!pin" @click="d().resolve(pin)">Continue</button>
      </div>
    </template>

    <template v-else-if="dialogs.current.kind === 'confirm'">
      <p v-if="dialogs.current.message" class="mb-4 text-sm text-muted">{{ dialogs.current.message }}</p>
      <TypeToConfirm ref="confirmRef" v-model="text" :phrase="dialogs.current.phrase" />
      <div class="mt-5 flex justify-end gap-2">
        <button class="btn" @click="d().resolve(null)">Keep it</button>
        <button class="btn btn-danger" :disabled="!confirmRef?.valid" @click="d().resolve(text)">Confirm</button>
      </div>
    </template>

    <template v-else-if="dialogs.current.kind === 'yesno'">
      <p class="text-sm text-muted whitespace-pre-line">{{ dialogs.current.message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button class="btn" @click="d().resolve(false)">{{ dialogs.current.no }}</button>
        <button class="btn" :class="dialogs.current.danger ? 'btn-danger' : 'btn-primary'" @click="d().resolve(true)">
          {{ dialogs.current.yes }}
        </button>
      </div>
    </template>

    <template v-else-if="dialogs.current.kind === 'praise'">
      <div class="flex items-center gap-3 rounded-xl bg-good-soft p-4 text-good">
        <Icon name="sparkles" :size="22" />
        <p class="text-sm font-medium">{{ dialogs.current.message }}</p>
      </div>
      <div class="mt-5 flex justify-end"><button class="btn btn-primary" @click="d().resolve(true)">Let's go</button></div>
    </template>
  </Modal>
</template>
