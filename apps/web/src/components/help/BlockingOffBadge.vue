<script setup>
// Red "Blocking is off" marker for the status strip and the focus card. Only shows when
// blocking can not work in this browser (see blockingIssue in lib/store.js).
// big: a full-width warning box instead of a small chip.
import { computed } from 'vue'
import { blockingIssue, store } from '../../lib/store.js'
import { showBlockingOff } from './guard.js'
import Icon from '../Icon.vue'

defineProps({ big: Boolean })
const running = computed(() => !!store.state?.focus?.active)
const text = computed(
  () =>
    ({
      'no-extension': 'No extension in this browser, so sites still open.',
      'not-approved': 'This site is not connected to the extension yet.',
      'no-access': 'The extension has no access to websites yet.',
    })[blockingIssue.value],
)
</script>

<template>
  <template v-if="blockingIssue">
    <button
      v-if="big"
      type="button"
      data-blocking-off-box
      class="flex w-full items-start gap-2.5 rounded-xl border-2 border-bad bg-bad-soft p-3 text-left text-sm text-ink"
      @click="showBlockingOff(blockingIssue, 'info')"
    >
      <Icon name="alert" :size="18" class="mt-0.5 shrink-0 text-bad" />
      <span class="min-w-0 flex-1">
        <b class="text-bad">{{ running ? 'Timer only: nothing is blocked.' : 'Blocking is off.' }}</b> {{ text }}
        <span class="font-semibold text-bad underline">Fix it</span>
      </span>
    </button>
    <button
      v-else
      type="button"
      data-blocking-off-chip
      class="flex items-center gap-1.5 rounded-full bg-bad px-2.5 py-1 text-xs font-bold text-on-bad"
      :title="text"
      @click="showBlockingOff(blockingIssue, 'info')"
    >
      <Icon name="alert" :size="13" /> Blocking is off
    </button>
  </template>
</template>
