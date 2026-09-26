<script setup>
// "Test blocking": one click that proves this browser really blocks. It turns on a one minute
// block for example.com, opens it in a new tab, and waits for Regimen's blocked page to
// report back (extension/src/blocked.js sends blocking.hit).
import { ref } from 'vue'
import { TEST_DOMAIN } from '@regimen/core'
import { store, call, refresh, blockingIssue, checkHealth } from '../../lib/store.js'
import { showBlockingOff } from './guard.js'
import Icon from '../Icon.vue'

defineProps({ compact: Boolean })
const status = ref('idle') // idle | running | passed | failed | off
let tab = null

async function run() {
  await checkHealth()
  if (blockingIssue.value) {
    status.value = 'off'
    showBlockingOff(blockingIssue.value, 'test')
    return
  }
  status.value = 'running'
  // open the tab inside the click, so popup blockers allow it, then point it at the test site
  tab = window.open('about:blank', '_blank')
  try {
    const test = await call('blocking.test')
    const url = `https://${TEST_DOMAIN}/?regimen-test=${test.id}`
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
    const started = Date.now()
    while (Date.now() - started < 12_000) {
      await new Promise((r) => setTimeout(r, 500))
      await refresh()
      if (store.state?.runtime?.blockTest?.id === test.id && store.state.runtime.blockTest.hitAt) {
        status.value = 'passed'
        return
      }
    }
    status.value = 'failed'
  } catch {
    status.value = 'failed'
  }
}
</script>

<template>
  <div data-blocking-test>
    <div class="flex flex-wrap items-center gap-3">
      <button class="btn" :class="!compact && 'btn-primary'" :disabled="status === 'running'" @click="run">
        <Icon name="shield" :size="16" /> {{ status === 'running' ? 'Testing...' : 'Test blocking' }}
      </button>
      <p v-if="status === 'idle'" class="text-sm text-muted">
        Opens {{ TEST_DOMAIN }} in a new tab with a one minute test block and tells you if it was blocked.
      </p>
      <p v-else-if="status === 'running'" class="text-sm text-muted" role="status">Opening {{ TEST_DOMAIN }} in a new tab...</p>
    </div>
    <p v-if="status === 'passed'" role="status" class="mt-3 flex items-start gap-2 rounded-xl bg-good-soft p-3 text-sm text-good">
      <Icon name="checkCircle" :size="18" class="mt-0.5 shrink-0" />
      <span
        ><b>Blocking works in this browser.</b> The test site was sent to the blocked page. Your rules and focus sessions block the same
        way.</span
      >
    </p>
    <div v-else-if="status === 'failed'" role="status" class="mt-3 rounded-xl border-2 border-bad bg-bad-soft p-3 text-sm">
      <p class="flex items-center gap-2 font-semibold text-bad"><Icon name="alert" :size="18" /> The test site was not blocked.</p>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-muted">
        <li>Private or incognito window? Allow Regimen there in your browser's extension settings.</li>
        <li>Firefox: open the extension's settings and switch on access to all websites.</li>
        <li>Check that the Regimen extension is switched on, then reload this page and try again.</li>
        <li>Did the new tab open? If your browser blocked the pop-up, allow pop-ups for this site.</li>
      </ul>
    </div>
    <p v-else-if="status === 'off'" class="mt-3 text-sm font-semibold text-bad">
      Blocking is off in this browser, so there is nothing to test yet.
    </p>
  </div>
</template>
