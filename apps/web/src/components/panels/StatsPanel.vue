<script setup>
import { computed } from 'vue'
import { weekRings, taskStreak } from '@focusgateway/core'
import { store } from '../../lib/store.js'
import { progress, milestones } from '../../lib/rewards.js'
import Ring from '../viz/Ring.vue'
import Icon from '../Icon.vue'

const props = defineProps({ dark: Boolean })
const minute = computed(() => Math.floor(store.now / 60000) * 60000)
const rings = computed(() => weekRings(store.state, minute.value))
const streak = computed(() => taskStreak(store.state, minute.value))
const next = computed(() => milestones.value.filter((m) => !m.achieved).sort((a, b) => b.progress - a.progress)[0])
const RINGS = [
  ['tasks', 'Tasks', 'var(--fg-accent)'],
  ['focus', 'Focus', 'var(--fg-warm)'],
  ['habits', 'Habits', 'var(--fg-good)'],
]
const sub = computed(() => (props.dark ? 'text-white/55' : 'text-muted'))
</script>

<template>
  <div v-if="progress" class="space-y-4">
    <div class="flex items-center gap-3">
      <span class="num grid h-12 w-12 place-items-center rounded-2xl bg-accent text-xl text-on-accent">{{ progress.level }}</span>
      <div class="flex-1">
        <p class="font-bold">{{ progress.title }}</p>
        <p class="text-xs" :class="sub">
          {{ progress.into }} / {{ progress.needed }} XP · <Icon name="flame" :size="11" class="inline text-warm" /> {{ streak }} days
        </p>
      </div>
    </div>
    <div class="grid grid-cols-3 text-center">
      <div v-for="[k, l, c] in RINGS" :key="k" class="flex flex-col items-center">
        <div class="relative">
          <Ring :pct="rings[k].pct" :color="c" :size="58" :stroke="7" :class="dark && '[&_circle:first-child]:stroke-white/10'" />
          <span class="num absolute inset-0 grid place-items-center text-xs">{{ Math.round(rings[k].pct * 100) }}%</span>
        </div>
        <span class="hud-label mt-1 text-[10px]" :class="sub">{{ l }}</span>
      </div>
    </div>
    <div v-if="next" class="rounded-xl p-3 text-xs" :class="dark ? 'bg-white/8' : 'bg-sunk'">
      <p :class="sub">Closest badge</p>
      <p class="font-bold">{{ next.name }} · {{ next.value }}/{{ next.target }}</p>
      <div class="mt-1.5 h-1.5 rounded-full" :class="dark ? 'bg-white/10' : 'bg-card'">
        <div class="h-1.5 rounded-full bg-xp" :style="{ width: Math.max(3, next.progress * 100) + '%' }" />
      </div>
    </div>
    <RouterLink to="/stats" class="block text-center text-xs font-bold" :class="dark ? 'text-white/70 hover:text-white' : 'text-accent'"
      >Heatmap, task boxes and badges →</RouterLink
    >
  </div>
</template>
