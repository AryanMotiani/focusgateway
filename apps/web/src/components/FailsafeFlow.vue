<script setup>
import { computed, onMounted, ref } from 'vue'
import { requiredPhrase } from '@focusgateway/core'
import { store, call, toast } from '../lib/store.js'
import { countdown } from '../lib/format.js'
import Modal from './Modal.vue'
import PinField from './PinField.vue'
import TypeToConfirm from './TypeToConfirm.vue'
import Icon from './Icon.vue'

const props = defineProps({ target: Object })
const emit = defineEmits(['close', 'done'])
const copy = ref(null)
const pin = ref('')
const text = ref('')
const err = ref('')
const busy = ref(false)
const result = ref(null)
const confirmRef = ref(null)
const fs = computed(() => store.state.failsafe)
const step = computed(() => (result.value ? 'done' : fs.value?.step || 'loading'))
const remaining = computed(() => (fs.value?.cooldownEndsAt ? Math.max(0, fs.value.cooldownEndsAt - store.now) : 0))
const total = computed(() => (props.target.type === 'practice' ? 10 : store.state.settings.failsafeWaitSeconds) * 1000)
const practice = props.target.type === 'practice'

async function run(fn) {
  err.value = ''
  busy.value = true
  try {
    return await fn()
  } catch (e) {
    err.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(() => run(async () => (copy.value = (await call('failsafe.start', { target: props.target })).copy)))

async function cancel() {
  await call('failsafe.cancel').catch(() => {})
  if (!practice && step.value !== 'done') toast("That's the spirit. Back to it.", 'success')
  emit('close')
}
const cont = () => run(() => call('failsafe.continue'))
const submitPin = () => run(() => call('failsafe.pin', { pin: pin.value }))
const confirm = () =>
  run(async () => {
    result.value = await call('failsafe.confirm', { confirmation: text.value })
    emit('done', result.value)
  })
</script>

<template>
  <Modal :title="practice ? 'Failsafe practice run' : 'Failsafe'" :dismissable="false" @close="cancel">
    <p v-if="practice" class="mb-4 rounded-xl bg-accent-soft p-3 text-sm text-accent">
      This is a real run-through with a short 10 second wait. Nothing gets unlocked.
    </p>

    <div v-if="step === 'intent'" class="space-y-4">
      <div class="rounded-2xl bg-warm-soft p-5 text-center">
        <p class="h-display text-3xl">{{ copy?.title || 'Are you sure?' }}</p>
        <p class="mt-2 text-sm">{{ copy?.message }}</p>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        <button class="btn btn-primary py-3" @click="cancel">{{ copy?.cancel || "I'm Honorable" }}</button>
        <button class="btn py-3 text-muted" :disabled="busy" @click="cont">{{ copy?.continue || 'I Choose Comfort' }}</button>
      </div>
    </div>

    <div v-else-if="step === 'pin'" class="space-y-4">
      <p class="text-sm text-muted">Enter your PIN to continue.</p>
      <PinField v-model="pin" @enter="pin && submitPin()" />
      <div class="flex justify-between gap-2">
        <button class="btn" @click="cancel">Stop here</button>
        <button class="btn btn-primary" :disabled="!pin || busy" @click="submitPin">Continue</button>
      </div>
    </div>

    <div v-else-if="step === 'cooldown'" class="space-y-4">
      <div v-if="remaining > 0" class="flex flex-col items-center gap-3 py-2">
        <div class="relative grid h-36 w-36 place-items-center">
          <svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--fg-line)" stroke-width="6" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="var(--fg-accent)"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="276.5"
              :stroke-dashoffset="276.5 * (remaining / total)"
              class="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span class="font-mono text-2xl font-semibold">{{ countdown(remaining) }}</span>
        </div>
        <p class="max-w-xs text-center text-sm text-muted">
          Take a breath. Is this really worth it? You can walk away now and nothing is lost.
        </p>
      </div>
      <template v-else>
        <TypeToConfirm ref="confirmRef" v-model="text" :phrase="requiredPhrase('failsafe')" />
      </template>
      <div class="flex justify-between gap-2">
        <button class="btn btn-primary" @click="cancel">I'm Honorable</button>
        <button v-if="remaining <= 0" class="btn btn-danger" :disabled="!confirmRef?.valid || busy" @click="confirm">Unlock</button>
      </div>
    </div>

    <div v-else-if="step === 'done'" class="space-y-4 text-center">
      <div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="unlock" :size="26" /></div>
      <p v-if="result?.practice" class="text-sm">
        Practice complete. Now you know exactly how the emergency exit works, and how annoying it is on purpose.
      </p>
      <p v-else class="text-sm">Unlocked for the rest of this window. The rule comes back next time. It's logged in your history.</p>
      <button class="btn btn-primary w-full" @click="emit('close')">Close</button>
    </div>

    <p v-else class="py-6 text-center text-sm text-muted">One moment…</p>
    <p v-if="err" class="mt-3 rounded-xl bg-bad-soft p-3 text-sm text-bad">{{ err }}</p>
    <button v-if="err && step === 'loading'" class="btn mt-3 w-full" @click="emit('close')">Close</button>
  </Modal>
</template>
