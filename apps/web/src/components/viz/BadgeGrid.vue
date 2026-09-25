<script setup>
// Milestone badges grouped by track. Earned ones glow, the next one shows progress,
// later ones stay dim so there is always something ahead.
import { computed } from 'vue'
import Icon from '../Icon.vue'
const props = defineProps({ milestones: Array })
const TRACKS = {
  tasks: ['Finisher', 'var(--fg-accent)'],
  streak: ['Streaks', 'var(--fg-warm)'],
  habit: ['Habits', 'var(--fg-good)'],
  focus: ['Deep focus', '#38a8f5'],
  windows: ['Earned windows', '#9a7bff'],
  resisted: ['Willpower', 'var(--fg-bad)'],
  perfect: ['Perfect weeks', 'var(--fg-xp)'],
}
const groups = computed(() =>
  Object.entries(TRACKS).map(([g, [name, color]]) => {
    const list = props.milestones.filter((m) => m.group === g)
    const next = list.find((m) => !m.achieved)
    return { g, name, color, list, next, earned: list.filter((m) => m.achieved).length }
  }),
)
</script>
<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div v-for="t in groups" :key="t.g" class="rounded-2xl bg-sunk p-3">
      <div class="mb-2 flex items-baseline justify-between">
        <p class="hud-label text-xs">{{ t.name }}</p>
        <p class="text-[11px] text-muted">{{ t.earned }}/{{ t.list.length }}</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="m in t.list"
          :key="m.id"
          class="relative grid h-10 w-10 place-items-center rounded-xl transition"
          :class="m.achieved ? 'text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]' : 'border-2 border-dashed border-line text-muted/60'"
          :style="m.achieved ? { background: t.color } : m === t.next ? { borderColor: t.color, color: t.color } : {}"
          :title="`${m.name}${m.achieved ? ' (earned)' : `: ${m.value}/${m.target}`}`"
        >
          <Icon :name="m.icon" :size="16" />
          <span class="num absolute -right-1 -bottom-1 rounded-md bg-card px-1 text-[9px] text-ink ring-1 ring-line">{{ m.target }}</span>
        </span>
      </div>
      <div v-if="t.next" class="mt-2.5">
        <p class="text-[11px] text-muted">
          Next: <b class="text-ink">{{ t.next.name }}</b> · {{ t.next.value }}/{{ t.next.target }}
        </p>
        <div class="mt-1 h-1.5 rounded-full bg-card">
          <div class="h-1.5 rounded-full" :style="{ width: Math.max(3, t.next.progress * 100) + '%', background: t.color }" />
        </div>
      </div>
      <p v-else class="mt-2 text-[11px] font-bold" :style="{ color: t.color }">Track complete</p>
    </div>
  </div>
</template>
