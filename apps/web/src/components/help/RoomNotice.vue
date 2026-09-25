<script setup>
// A small glass pill in the study room saying why blocking is off here, with the fix.
// In the trial room (no setup yet, or no extension) it says so plainly.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { store, blockingIssue, extensionOutdated } from '../../lib/store.js'
import { showBlockingOff, showBlockingStatus } from './guard.js'
import { installTarget, browser } from './install.js'
import Icon from '../Icon.vue'

const router = useRouter()
const onboarded = computed(() => !!store.state?.onboarding?.completed)
const install = installTarget()

const notice = computed(() => {
  const issue = blockingIssue.value
  if (issue === 'no-extension')
    return {
      id: 'trial',
      bad: true,
      text: onboarded.value
        ? 'Site blocking is off until you add the extension.'
        : 'Trial room. Site blocking is off until you add the extension.',
      action: browser === 'phone' ? 'Why?' : 'Add extension',
      run: () =>
        browser === 'phone'
          ? showBlockingStatus()
          : install?.store
            ? window.open(install.url, '_blank', 'noopener')
            : router.push('/install'),
    }
  if (issue === 'not-approved')
    return {
      id: 'not-approved',
      bad: true,
      text: 'Blocking is off: this site is not connected to the extension.',
      action: 'Connect',
      run: () => showBlockingOff('not-approved', 'info'),
    }
  if (issue === 'no-access')
    return {
      id: 'no-access',
      bad: true,
      text: 'Blocking is off: the extension can not reach websites.',
      action: 'Fix it',
      run: () => showBlockingOff('no-access', 'info'),
    }
  if (extensionOutdated.value)
    return {
      id: 'outdated',
      text: 'Update your extension to use the latest features.',
      action: 'Update',
      run: () => router.push('/install'),
    }
  return null
})
</script>

<template>
  <div
    v-if="notice"
    :data-room-notice="notice.id"
    class="room-glass room-pill flex max-w-full items-center gap-2 py-1.5 pr-1.5 pl-3 text-xs font-bold"
    role="status"
  >
    <span
      class="grid h-5 w-5 shrink-0 place-items-center rounded-full"
      :class="notice.bad ? 'bg-bad text-on-bad' : 'bg-caution-soft text-caution'"
    >
      <Icon :name="notice.bad ? 'shield' : 'sparkles'" :size="12" />
    </span>
    <span class="min-w-0">{{ notice.text }}</span>
    <button
      class="room-on shrink-0 rounded-(--fg-room-btn-radius) px-2.5 py-1 text-xs font-bold"
      data-room-notice-action
      @click="notice.run"
    >
      {{ notice.action }}
    </button>
  </div>
</template>
