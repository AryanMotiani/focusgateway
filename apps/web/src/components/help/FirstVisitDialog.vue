<script setup>
// Once per browser: the first time someone uses the app without the extension, a friendly
// note that blocking needs it. Dismissing it only hides this dialog, the red chips and the
// room notice stay until the extension is added.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../../lib/store.js'
import { browser, installTarget, canInstall, PHONE_NOTE } from './install.js'
import Modal from '../Modal.vue'
import Icon from '../Icon.vue'

const SEEN_KEY = 'focusgateway:no-extension-seen'
function seen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}
const dismissed = ref(seen())
const route = useRoute()
const router = useRouter()
// not on the landing page, the setup, PIN recovery or the Install page itself
const SKIP = new Set(['/home', '/welcome', '/recover', '/install'])
const open = computed(
  () =>
    !dismissed.value &&
    store.ready &&
    store.mode === 'local' &&
    !store.health.extension &&
    !store.pendingApproval &&
    route.matched.length &&
    !SKIP.has(route.path),
)
const install = installTarget()

function close() {
  dismissed.value = true
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {}
}
function openInstall() {
  close()
  router.push('/install')
}
</script>

<template>
  <Modal v-if="open" title="Site blocking needs the free extension" @close="close">
    <div data-first-visit class="space-y-4 text-sm">
      <div class="flex items-start gap-3 rounded-xl bg-accent-soft p-3.5">
        <Icon name="puzzle" :size="22" class="mt-0.5 shrink-0 text-accent" />
        <p>
          Tasks, habits and the study room work right here.
          <b>Nothing is blocked in this browser</b> until you add the extension.
        </p>
      </div>
      <p v-if="browser === 'phone'" class="text-muted">{{ PHONE_NOTE }}</p>
      <p v-else-if="browser === 'safari'" class="text-muted">
        Safari can not run it. Use Chrome, Edge, Brave or Firefox, or the lock agent from the Install page.
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <a v-if="install?.store" :href="install.url" target="_blank" rel="noopener" class="btn btn-primary" @click="close"
          ><Icon name="puzzle" :size="16" /> {{ install.label }}</a
        >
        <button v-else-if="canInstall || browser === 'safari'" class="btn btn-primary" @click="openInstall">
          <Icon name="puzzle" :size="16" /> Add the extension
        </button>
        <button class="btn" :class="browser === 'phone' ? 'btn-primary' : 'btn-ghost'" data-continue-without @click="close">
          {{ browser === 'phone' ? 'Got it' : 'Continue without blocking' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
