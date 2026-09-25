<script setup>
import { computed } from 'vue'
import { nextWindowStart } from '@focusgateway/core'
import { store, blocks, canBlock } from '../../lib/store.js'
import { countdown, time, date } from '../../lib/format.js'
import Icon from '../Icon.vue'

const props = defineProps({ dark: Boolean })
const taskTitle = (id) => store.state.tasks.find((t) => t.id === id)?.title
const nextUp = computed(() => {
  let best = null
  for (const r of store.state?.rules || []) {
    const t = nextWindowStart(r, store.now)
    if (t && (!best || t < best.t)) best = { t, r }
  }
  return best
})
const sub = computed(() => (props.dark ? 'text-white/55' : 'text-muted'))
const tile = computed(() => (props.dark ? 'bg-white/8' : 'bg-sunk'))
</script>

<template>
  <div class="space-y-2">
    <RouterLink
      v-if="!canBlock"
      to="/install"
      class="flex items-center gap-2 rounded-xl p-3 text-sm"
      :class="dark ? 'bg-warm/20' : 'bg-warm-soft'"
    >
      <Icon name="puzzle" class="text-warm" /> <span class="flex-1">Blocking is off here. Get the free extension.</span>
    </RouterLink>
    <div v-for="b in blocks.blocks" :key="b.ruleId || b.focusId" class="flex items-start gap-3 rounded-xl p-3" :class="tile">
      <Icon :name="b.kind === 'focus' ? 'target' : 'lock'" :class="b.locked ? 'text-bad' : 'text-accent'" class="mt-0.5" />
      <div class="min-w-0 flex-1 text-sm">
        <p class="font-bold">{{ b.name }}</p>
        <p v-if="b.kind === 'gated'" class="text-xs" :class="sub">
          <template v-if="b.pendingTaskIds.length"
            >Finish {{ b.pendingTaskIds.map(taskTitle).filter(Boolean).slice(0, 2).join(', ') }} to unlock</template
          >
          <template v-else>Add a task to earn this window</template>
        </p>
        <p v-else class="text-xs" :class="sub">Opens in {{ countdown(b.until - store.now) }}</p>
      </div>
    </div>
    <p v-if="!blocks.blocks.length" class="rounded-xl p-3 text-sm" :class="tile">
      <b>Nothing blocked.</b>
      <span v-if="nextUp" class="block text-xs" :class="sub"
        >Next: {{ nextUp.r.name }}, {{ date(nextUp.t) === date(store.now) ? 'today' : date(nextUp.t) }} at {{ time(nextUp.t) }}</span
      >
    </p>
    <RouterLink
      to="/blocking"
      class="block pt-1 text-center text-xs font-bold"
      :class="dark ? 'text-white/70 hover:text-white' : 'text-accent'"
      >Rules and schedules →</RouterLink
    >
  </div>
</template>
