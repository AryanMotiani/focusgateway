<script setup>
import { computed, ref } from 'vue'
import { computeStats, fromDateKey } from '@focusgateway/core'
import { store } from '../lib/store.js'
import { dateTime } from '../lib/format.js'
import BarChart from '../components/BarChart.vue'

const range = ref('week')
const stats = computed(() => computeStats(store.state, store.now, { range: range.value }))
const SECTIONS = [
  ['windows', 'Task-Gated windows'],
  ['hard', 'Hard blocks'],
  ['tasks', 'Tasks'],
  ['focus', 'Focus'],
]
const lbl = (key) => new Date(fromDateKey(key)).toLocaleDateString([], { weekday: 'narrow' })
const full = (key) => new Date(fromDateKey(key)).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const charts = computed(() => [
  { title: 'Tasks completed', data: stats.value.days.map((d) => ({ label: lbl(d.date), title: full(d.date), value: d.completed })), color: 'var(--fg-accent)' },
  { title: 'Minutes focused', data: stats.value.days.map((d) => ({ label: lbl(d.date), title: full(d.date), value: d.focusMin })), color: 'var(--fg-warm)', unit: ' min' },
  { title: 'Habits done', data: stats.value.days.map((d) => ({ label: lbl(d.date), title: full(d.date), value: d.habitsDone })), color: 'var(--fg-good)' },
])
const tags = computed(() => Object.entries(stats.value.byTag).sort((a, b) => b[1] - a[1]))
const tagMax = computed(() => Math.max(1, ...tags.value.map((t) => t[1])))

const EVENTS = {
  task_completed: 'Completed', task_deleted: 'Deleted task', subtask_deleted: 'Deleted subtask', deadline_delayed: 'Delayed deadline',
  priority_downgraded: 'Lowered priority', deadline_tightened: 'Tightened deadline', priority_raised: 'Raised priority', task_forwarded: 'Sent to next window',
  missed_deadline: 'Missed deadline', failsafe_used: 'Used Failsafe', failsafe_resisted: 'Walked away from Failsafe', window_unlocked: 'Unlocked a window',
  window_respected: 'Respected a hard block', focus_completed: 'Finished a focus session', focus_stopped_early: 'Stopped focus early', focus_started: 'Started focus',
  rule_created: 'Created rule', rule_edited: 'Edited rule', rule_edited_active: 'Edited an active rule', rule_deleted: 'Deleted rule', task_detached: 'Detached task from window',
  task_attached: 'Attached task to window', pin_recovered: 'Reset PIN with recovery code', data_imported: 'Imported data',
}
const BAD = new Set(['task_deleted', 'subtask_deleted', 'deadline_delayed', 'priority_downgraded', 'task_forwarded', 'missed_deadline', 'failsafe_used', 'focus_stopped_early', 'rule_edited_active', 'rule_deleted', 'task_detached'])
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-display text-4xl">Accountability</h1>
        <p class="text-sm text-muted">An honest mirror. No points, no guilt, just what happened.</p>
      </div>
      <div class="flex rounded-xl border border-line bg-card p-0.5 text-sm">
        <button v-for="[k, l] in [['week', '7 days'], ['month', '30 days'], ['all', 'All time']]" :key="k" class="rounded-lg px-3 py-1.5 font-medium" :class="range === k ? 'bg-accent-soft text-accent' : 'text-muted'" @click="range = k">{{ l }}</button>
      </div>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <section v-for="c in charts" :key="c.title" class="card p-4">
        <h2 class="mb-3 text-sm font-semibold">{{ c.title }} <span class="font-normal text-muted">· 14 days</span></h2>
        <BarChart :data="c.data" :color="c.color" :unit="c.unit" :height="110" />
      </section>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <section v-for="[key, title] in SECTIONS" :key="key" class="card flex flex-col overflow-hidden">
        <h2 class="px-4 pt-4 text-sm font-semibold">{{ title }}</h2>
        <div class="flex-1 space-y-2 p-4">
          <div v-for="(v, k) in stats.sections[key].good" :key="k" class="flex items-baseline justify-between gap-3">
            <span class="text-sm">{{ k }}</span><span class="text-2xl font-semibold text-accent">{{ v }}</span>
          </div>
        </div>
        <div class="space-y-2 border-t border-line bg-sunk p-4">
          <div v-for="(v, k) in stats.sections[key].bad" :key="k" class="flex items-baseline justify-between gap-3 text-muted">
            <span class="text-sm">{{ k }}</span><span class="text-lg font-medium">{{ v }}</span>
          </div>
        </div>
      </section>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <section class="card p-4">
        <h2 class="mb-3 text-sm font-semibold">Completed by tag</h2>
        <div v-if="tags.length" class="space-y-2">
          <div v-for="[t, n] in tags" :key="t" class="text-sm">
            <div class="mb-1 flex justify-between"><span>{{ t }}</span><span class="text-muted">{{ n }}</span></div>
            <div class="h-2 rounded-full bg-sunk"><div class="h-2 rounded-full bg-accent" :style="{ width: (n / tagMax) * 100 + '%' }" /></div>
          </div>
        </div>
        <p v-else class="text-sm text-muted">Finish some tagged tasks to see where your time goes.</p>
      </section>
      <section class="card p-4">
        <h2 class="mb-3 text-sm font-semibold">History</h2>
        <ol class="max-h-96 space-y-1 overflow-y-auto pr-1">
          <li v-for="e in stats.history" :key="e.id" class="flex gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-sunk">
            <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="BAD.has(e.type) ? 'bg-muted/40' : 'bg-accent'" />
            <span class="flex-1" :class="BAD.has(e.type) && 'text-muted'">
              {{ EVENTS[e.type] || e.type }}<template v-if="e.title">: <b class="font-medium">{{ e.title }}</b></template>
              <span v-if="e.reason" class="block text-xs italic">“{{ e.reason }}”</span>
            </span>
            <time class="shrink-0 text-xs text-muted">{{ dateTime(e.at) }}</time>
          </li>
          <li v-if="!stats.history.length" class="text-sm text-muted">Nothing logged in this period yet.</li>
        </ol>
      </section>
    </div>
  </div>
</template>
