<script setup>
import { computed } from 'vue'
import { isHabitDue, isHabitDone, habitStreak } from '@regimen/core'
import { store, call, attempt } from '../../lib/store.js'
import { popXp, playHabit, currentXp } from '../../lib/rewards.js'
import Icon from '../Icon.vue'

const props = defineProps({ dark: Boolean })
const COLORS = { violet: '#7c6cf2', amber: '#e09a3e', green: '#2fa877', rose: '#e0607a', sky: '#3b9bd9', slate: '#6b7280' }
const habits = computed(() => (store.state?.habits || []).filter((h) => !h.archived && isHabitDue(h, store.minute)))
const done = (h) => isHabitDone(store.state.habitLogs, h.id, store.minute)
async function toggle(h, e) {
  const el = e.currentTarget
  const was = done(h)
  const before = currentXp()
  await attempt(() => call('habits.toggle', { id: h.id })).catch(() => null)
  if (!was && done(h)) {
    playHabit()
    popXp(el, currentXp() - before)
  }
}
const sub = computed(() => (props.dark ? 'text-white/55' : 'text-muted'))
</script>

<template>
  <div>
    <div v-if="habits.length" class="grid grid-cols-2 gap-2">
      <button
        v-for="h in habits"
        :key="h.id"
        class="flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition active:scale-95"
        :style="done(h) ? { background: COLORS[h.color], borderColor: COLORS[h.color], color: 'white' } : {}"
        :class="!done(h) && (dark ? 'border-white/15 hover:border-white/40' : 'border-line hover:border-ink/30')"
        @click="toggle(h, $event)"
      >
        <span class="text-xl">{{ h.emoji || '•' }}</span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-bold">{{ h.name }}</span>
          <span class="flex items-center gap-1 text-[11px]" :class="done(h) ? 'text-white/85' : sub"
            ><Icon name="flame" :size="11" /> {{ habitStreak(h, store.state.habitLogs, store.minute) }}</span
          >
        </span>
      </button>
    </div>
    <p v-else class="py-3 text-center text-sm" :class="sub">No habits due today.</p>
    <RouterLink
      to="/habits"
      class="mt-3 block text-center text-xs font-bold"
      :class="dark ? 'text-white/70 hover:text-white' : 'text-accent'"
      >Year view and all habits →</RouterLink
    >
  </div>
</template>
