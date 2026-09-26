<script setup>
// The study room's blocking pill, always at the top: green "Blocking on" with what is active,
// or red "Blocking off" with the one thing to do about it. Clicking it opens the Blocking
// status checklist (BlockingStatus.vue in a dialog), which has a fix for every step.
// dot: only a small coloured shield, for the bar that shows while the panels are hidden.
import { computed } from 'vue'
import { store, blocks, blockingIssue, extensionOutdated } from '../../lib/store.js'
import { showBlockingStatus } from './guard.js'
import { browser } from './install.js'
import Icon from '../Icon.vue'

defineProps({ dot: Boolean })

const state = computed(() => {
  if (!store.ready) return null
  const issue = blockingIssue.value
  if (issue === 'no-extension')
    return { id: 'off', tone: 'bad', label: 'Blocking off', detail: browser === 'phone' ? 'needs a computer' : 'add the extension' }
  if (issue === 'not-approved') return { id: 'off', tone: 'bad', label: 'Blocking off', detail: 'approve this site' }
  if (issue === 'no-access') return { id: 'off', tone: 'bad', label: 'Blocking off', detail: 'allow website access' }
  if (extensionOutdated.value) return { id: 'on', tone: 'warn', label: 'Blocking on', detail: 'update the extension' }
  const list = blocks.value.blocks
  const focus = list.some((b) => b.kind === 'focus')
  const rules = list.filter((b) => b.kind !== 'focus').length
  let detail
  if (focus) detail = rules ? `focus session and ${rules} rule${rules === 1 ? '' : 's'}` : 'focus session running'
  else if (rules) detail = `${rules} rule${rules === 1 ? '' : 's'} active`
  else if (store.state?.agent?.paired) detail = 'extension and lock agent'
  else detail = 'extension connected'
  return { id: 'on', tone: 'good', label: 'Blocking on', detail }
})
const title = computed(() =>
  state.value?.tone === 'bad'
    ? `${state.value.label}: ${state.value.detail}. Nothing is blocked in this browser. Click to see how to fix it.`
    : `${state.value?.label}: ${state.value?.detail}. Click to see the blocking status.`,
)
</script>

<template>
  <button
    v-if="state && dot"
    type="button"
    class="grid h-9 w-9 shrink-0 place-items-center rounded-(--fg-room-btn-radius)"
    :data-blocking-pill="state.id"
    :title="title"
    :aria-label="`${state.label}, ${state.detail}. Blocking status`"
    @click="showBlockingStatus"
  >
    <span class="bp-dot grid h-6 w-6 place-items-center rounded-full" :class="'bp-' + state.tone">
      <Icon :name="state.tone === 'bad' ? 'alert' : 'shield'" :size="13" />
    </span>
  </button>
  <button
    v-else-if="state"
    type="button"
    class="room-glass room-pill flex max-w-full min-w-0 items-center gap-2 py-1.5 pr-3 pl-1.5 text-xs font-bold"
    :data-blocking-pill="state.id"
    :title="title"
    :aria-label="`${state.label}, ${state.detail}. Open the blocking status`"
    @click="showBlockingStatus"
  >
    <span class="bp-dot grid h-6 w-6 shrink-0 place-items-center rounded-full" :class="'bp-' + state.tone">
      <Icon :name="state.tone === 'bad' ? 'alert' : 'shield'" :size="13" />
    </span>
    <span class="shrink-0" :class="state.tone === 'bad' ? 'text-bad' : state.tone === 'warn' ? 'text-caution' : 'text-good'">{{
      state.label
    }}</span>
    <span class="min-w-0 truncate font-semibold text-muted max-xl:hidden" data-blocking-detail>{{ state.detail }}</span>
  </button>
</template>

<style scoped>
.bp-good {
  background: var(--fg-good);
  color: var(--fg-on-good, #fff);
}
.bp-warn {
  background: var(--fg-caution-soft);
  color: var(--fg-caution);
}
.bp-bad {
  background: var(--fg-bad);
  color: var(--fg-on-bad, #fff);
}
</style>
