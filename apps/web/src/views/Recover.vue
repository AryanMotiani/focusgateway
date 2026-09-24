<script setup>
import { ref } from 'vue'
import { call, toast } from '../lib/store.js'
import { download } from '../lib/format.js'
import PinField from '../components/PinField.vue'
import logo from '../assets/logo.svg'

const code = ref('')
const pin = ref('')
const again = ref('')
const fresh = ref('')
const err = ref('')
async function recover() {
  err.value = ''
  if (pin.value !== again.value) return (err.value = "The new PINs don't match.")
  try {
    const r = await call('security.recover', { code: code.value, newPin: pin.value })
    fresh.value = r.recoveryCode
    download('focusgateway-recovery-code.txt', `FocusGateway recovery code\n\n${r.recoveryCode}\n\nIt works once. Keep it somewhere safe, away from this computer.\n`)
    toast('New PIN set', 'success')
  } catch (e) {
    err.value = e.message
  }
}
</script>

<template>
  <div class="grid min-h-screen place-items-center p-4">
    <div class="card w-full max-w-md p-6">
      <img :src="logo" alt="" class="h-10 w-10" />
      <template v-if="!fresh">
        <h1 class="mt-4 text-xl font-semibold">Forgot your PIN?</h1>
        <p class="mt-1 text-sm text-muted">Enter the recovery code you saved during setup. It works once, then you get a new one.</p>
        <form class="mt-5 space-y-3" @submit.prevent="recover">
          <input v-model="code" class="input font-mono tracking-widest uppercase" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off" aria-label="Recovery code" />
          <PinField v-model="pin" placeholder="New PIN (6+ characters)" autocomplete="new-password" />
          <PinField v-model="again" placeholder="New PIN again" autocomplete="new-password" />
          <p v-if="err" class="rounded-xl bg-bad-soft p-3 text-sm text-bad">{{ err }}</p>
          <button class="btn btn-primary w-full" :disabled="!code || pin.length < 6">Reset PIN</button>
        </form>
        <p class="mt-4 text-xs text-muted">Lost both? Your PIN only guards Failsafe and changes to running rules. Blocks still end on schedule, and task-gated windows still open when you finish your tasks.</p>
      </template>
      <template v-else>
        <h1 class="mt-4 text-xl font-semibold">New PIN set</h1>
        <p class="mt-1 text-sm text-muted">Here is your new recovery code. We downloaded it as a file too. The old one no longer works.</p>
        <p class="mt-4 rounded-xl bg-sunk p-3 text-center font-mono text-lg tracking-widest">{{ fresh }}</p>
        <RouterLink to="/" class="btn btn-primary mt-5 w-full">Back to FocusGateway</RouterLink>
      </template>
      <RouterLink v-if="!fresh" to="/settings" class="mt-3 block text-center text-sm text-muted">Cancel</RouterLink>
    </div>
  </div>
</template>
