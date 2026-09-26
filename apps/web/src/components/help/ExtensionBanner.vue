<script setup>
// A banner above every page for the two problems a connected extension can still have:
// no access to websites (Firefox can install it without), or a version older than this site.
// The study room shows the same through components/help/RoomNotice.vue.
import { ref } from 'vue'
import { store, blockingIssue, extensionOutdated, APP_VERSION, requestHostAccess } from '../../lib/store.js'
import { showBlockingOff } from './guard.js'
import Icon from '../Icon.vue'

const KEY = 'regimen:update-dismissed'
function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
// hiding the update note lasts until the next version of the site
const hidden = ref(read())
function hide() {
  hidden.value = APP_VERSION
  try {
    localStorage.setItem(KEY, APP_VERSION)
  } catch {}
}
const fixAccess = () => (store.mode === 'extension' ? requestHostAccess() : showBlockingOff('no-access', 'info'))
</script>

<template>
  <div
    v-if="blockingIssue === 'no-access'"
    data-extension-banner="no-access"
    role="alert"
    class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-2 border-bad bg-bad-soft px-4 py-2.5 text-sm"
  >
    <Icon name="alert" :size="18" class="shrink-0 text-bad" />
    <span class="min-w-0 flex-1"
      ><b class="text-bad">Blocking is off.</b> The extension has no access to websites yet, so it can not stop them.</span
    >
    <button class="btn btn-sm btn-primary" @click="fixAccess">Fix it</button>
  </div>
  <div
    v-else-if="extensionOutdated && hidden !== APP_VERSION"
    data-extension-banner="outdated"
    role="status"
    class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-caution-soft px-4 py-2.5 text-sm"
  >
    <Icon name="sparkles" :size="18" class="shrink-0 text-caution" />
    <span class="min-w-0 flex-1"
      ><b class="text-caution">Update your extension to use the latest features.</b>
      <span class="text-muted"> Yours is {{ store.health.version }}, this site is {{ APP_VERSION }}. Blocking still works.</span></span
    >
    <RouterLink to="/install" class="btn btn-sm">How to update</RouterLink>
    <button class="btn btn-ghost btn-sm" aria-label="Hide until the next version" @click="hide"><Icon name="x" :size="14" /></button>
  </div>
</template>
