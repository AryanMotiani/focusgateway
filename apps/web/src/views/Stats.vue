<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { computeStats, fromDateKey } from '@focusgateway/core'
import { store } from '../lib/store.js'
import { dateTime } from '../lib/format.js'
import { yearGrid, taskBoxes, weekRings, taskStreak, bestTaskStreak } from '@focusgateway/core'
import BarChart from '../components/BarChart.vue'
import YearHeatmap from '../components/viz/YearHeatmap.vue'
import TaskBoxes from '../components/viz/TaskBoxes.vue'
import WeekRings from '../components/viz/WeekRings.vue'
import BadgeGrid from '../components/viz/BadgeGrid.vue'
import LevelCard from '../components/viz/LevelCard.vue'
import Ring from '../components/viz/Ring.vue'
import Icon from '../components/Icon.vue'
import HelpButton from '../components/help/HelpButton.vue'
import { milestones, progress, isGame } from '../lib/rewards.js'

const route = useRoute()
const router = useRouter()

// Tabs: one view at a time, remembered in the URL so other pages can link straight to one (?tab=badges).
const TABS = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'badges', label: 'Badges', icon: 'sparkles' },
  { id: 'numbers', label: 'Numbers', icon: 'chart' },
  { id: 'history', label: 'History', icon: 'list' },
]
const tab = computed(() => (TABS.some((t) => t.id === route.query.tab) ? route.query.tab : 'calendar'))
const tabEls = ref([])
function selectTab(id, focus = false) {
  if (id !== tab.value) router.replace({ query: { ...route.query, tab: id } })
  if (focus) nextTick(() => tabEls.value[TABS.findIndex((t) => t.id === id)]?.focus())
}
function onTabKey(e) {
  const i = TABS.findIndex((t) => t.id === tab.value)
  const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  selectTab(TABS[(next + TABS.length) % TABS.length].id, true)
}

const range = ref('week')
const RANGES = [
  ['week', '7 days'],
  ['month', '30 days'],
  ['all', 'All time'],
]
// visuals refresh once a minute, that is plenty for day-level data
const minute = computed(() => store.minute)
const heat = computed(() => yearGrid(store.state, minute.value, { kind: 'tasks' }))
const boxes = computed(() => taskBoxes(store.state, minute.value, 14))
const rings = computed(() => weekRings(store.state, minute.value))
const streak = computed(() => taskStreak(store.state, minute.value))
const best = computed(() => bestTaskStreak(store.state, minute.value))
const clearRate = computed(() => {
  const cells = heat.value.weeks.flat().filter((c) => c && c.total)
  return cells.length ? Math.round((cells.filter((c) => c.ratio === 1).length / cells.length) * 100) : 0
})
const earned = computed(() => milestones.value.filter((m) => m.achieved).length)
const nextBadge = computed(() => milestones.value.filter((m) => !m.achieved).sort((a, b) => b.progress - a.progress)[0])
const stats = computed(() => computeStats(store.state, minute.value, { range: range.value }))

// Overview
const RING_KEYS = [
  ['tasks', 'Tasks', 'var(--fg-accent)'],
  ['focus', 'Focus', 'var(--fg-warm)'],
  ['habits', 'Habits', 'var(--fg-good)'],
]
const weekPct = computed(() => (rings.value.tasks.pct + rings.value.focus.pct + rings.value.habits.pct) / 3)
const hours = (min) => (min < 60 ? `${min} minute${min === 1 ? '' : 's'}` : `${Math.round((min / 60) * 10) / 10} hours`)
const summary = computed(() => {
  const { tasks, focus, habits } = rings.value
  const parts = []
  parts.push(tasks.goal ? `finished ${tasks.value} of ${tasks.goal} task${tasks.goal === 1 ? '' : 's'}` : 'had no tasks due')
  parts.push(focus.value ? `focused ${hours(focus.value)}` : 'have not logged a focus session yet')
  if (habits.goal) parts.push(`kept ${habits.value} of ${habits.goal} habit check-ins`)
  const last = parts.pop()
  return `This week you ${parts.length ? `${parts.join(', ')} and ${last}` : last}.`
})

// Numbers
const SECTIONS = [
  ['windows', 'Task-Gated windows'],
  ['hard', 'Hard blocks'],
  ['tasks', 'Tasks'],
  ['focus', 'Focus'],
]
const lbl = (key) => new Date(fromDateKey(key)).toLocaleDateString([], { weekday: 'narrow' })
const full = (key) => new Date(fromDateKey(key)).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const charts = computed(() => [
  {
    title: 'Tasks completed',
    data: stats.value.days.map((d) => ({ label: lbl(d.date), title: full(d.date), value: d.completed })),
    color: 'var(--fg-accent)',
  },
  {
    title: 'Minutes focused',
    data: stats.value.days.map((d) => ({ label: lbl(d.date), title: full(d.date), value: d.focusMin })),
    color: 'var(--fg-warm)',
    unit: ' min',
  },
  {
    title: 'Habits done',
    data: stats.value.days.map((d) => ({ label: lbl(d.date), title: full(d.date), value: d.habitsDone })),
    color: 'var(--fg-good)',
  },
])
const tags = computed(() => Object.entries(stats.value.byTag).sort((a, b) => b[1] - a[1]))
const tagMax = computed(() => Math.max(1, ...tags.value.map((t) => t[1])))

const EVENTS = {
  task_completed: 'Completed',
  task_deleted: 'Deleted task',
  subtask_deleted: 'Deleted subtask',
  deadline_delayed: 'Delayed deadline',
  priority_downgraded: 'Lowered priority',
  deadline_tightened: 'Tightened deadline',
  priority_raised: 'Raised priority',
  task_forwarded: 'Sent to next window',
  missed_deadline: 'Missed deadline',
  failsafe_used: 'Used Failsafe',
  failsafe_resisted: 'Walked away from Failsafe',
  window_unlocked: 'Unlocked a window',
  window_respected: 'Respected a hard block',
  focus_completed: 'Finished a focus session',
  focus_stopped_early: 'Stopped focus early',
  focus_started: 'Started focus',
  rule_created: 'Created rule',
  rule_edited: 'Edited rule',
  rule_edited_active: 'Edited an active rule',
  rule_deleted: 'Deleted rule',
  task_detached: 'Detached task from window',
  task_attached: 'Attached task to window',
  pin_recovered: 'Reset PIN with recovery code',
  data_imported: 'Imported data',
}
const BAD = new Set([
  'task_deleted',
  'subtask_deleted',
  'deadline_delayed',
  'priority_downgraded',
  'task_forwarded',
  'missed_deadline',
  'failsafe_used',
  'focus_stopped_early',
  'rule_edited_active',
  'rule_deleted',
  'task_detached',
])
const tile = 'card flex min-w-0 flex-col gap-2 p-4'
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h1 class="h-display text-4xl">Accountability</h1>
        <p class="text-sm text-muted">
          {{
            isGame ? 'Your trophy room. Every box is a promise you kept, or did not.' : 'An honest mirror. No guilt, just what happened.'
          }}
        </p>
      </div>
      <HelpButton page="stats" />
    </header>

    <!-- Overview -->
    <section aria-label="Overview" class="space-y-3" data-tour="stats-overview">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RouterLink
          v-if="progress"
          :to="{ query: { tab: 'badges' } }"
          :class="[tile, isGame && '!border-hud-line !bg-hud !text-hud-ink']"
          aria-label="Level, see badges"
        >
          <span class="hud-label" :class="isGame ? 'text-hud-muted' : 'text-muted'">Level {{ progress.level }}</span>
          <span class="h-display truncate text-2xl leading-tight">{{ progress.title }}</span>
          <span class="mt-auto">
            <span class="xpbar block !h-1.5" :class="isGame && '!bg-white/10'"
              ><i :style="{ width: Math.max(2, progress.progress * 100) + '%' }"
            /></span>
            <span class="num mt-1 block text-[11px]" :class="isGame ? 'text-hud-muted' : 'text-muted'"
              >{{ progress.into }} / {{ progress.needed }} XP</span
            >
          </span>
        </RouterLink>

        <RouterLink :to="{ query: { tab: 'calendar' } }" :class="tile">
          <span class="hud-label text-muted">Streak</span>
          <span class="flex items-center gap-1.5 text-warm">
            <Icon name="flame" :size="22" /><span class="num text-3xl leading-none text-ink">{{ streak }}</span>
            <span class="text-sm text-muted">day{{ streak === 1 ? '' : 's' }}</span>
          </span>
          <span class="mt-auto text-[11px] text-muted">Best {{ best }} · {{ clearRate }}% days cleared</span>
        </RouterLink>

        <RouterLink :to="{ query: { tab: 'numbers' } }" :class="tile">
          <span class="hud-label text-muted">This week</span>
          <span class="flex items-center gap-3">
            <span class="relative shrink-0">
              <Ring :pct="weekPct" color="var(--fg-accent)" :size="54" :stroke="7" />
              <span class="num absolute inset-0 grid place-items-center text-sm">{{ Math.round(weekPct * 100) }}%</span>
            </span>
            <span class="min-w-0 space-y-0.5 text-[11px] text-muted">
              <span v-for="[k, l, c] in RING_KEYS" :key="k" class="flex items-center gap-1.5"
                ><span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: c }" /> {{ l }}
                <b class="num ml-auto pl-1 text-ink">{{ Math.round(rings[k].pct * 100) }}%</b></span
              >
            </span>
          </span>
        </RouterLink>

        <RouterLink :to="{ query: { tab: 'badges' } }" :class="tile">
          <span class="hud-label text-muted">Badges</span>
          <span class="flex items-baseline gap-1">
            <span class="num text-3xl leading-none">{{ earned }}</span
            ><span class="text-sm text-muted">/ {{ milestones.length }}</span>
          </span>
          <span class="mt-auto">
            <span class="block h-1.5 overflow-hidden rounded-full bg-sunk"
              ><span class="block h-full rounded-full bg-xp" :style="{ width: (earned / Math.max(1, milestones.length)) * 100 + '%' }"
            /></span>
            <span v-if="nextBadge" class="mt-1 block truncate text-[11px] text-muted">Next: {{ nextBadge.name }}</span>
          </span>
        </RouterLink>
      </div>
      <p class="text-sm">{{ summary }}</p>
    </section>

    <!-- Tabs -->
    <div>
      <div
        role="tablist"
        aria-label="Accountability views"
        data-tour="stats-tabs"
        class="gap-1"
        :class="isGame ? 'grid grid-cols-4 rounded-2xl bg-sunk p-1' : 'flex border-b border-line sm:gap-2'"
        @keydown="onTabKey"
      >
        <button
          v-for="t in TABS"
          :id="`tab-${t.id}`"
          :key="t.id"
          ref="tabEls"
          role="tab"
          type="button"
          :aria-selected="tab === t.id"
          :aria-controls="`panel-${t.id}`"
          :tabindex="tab === t.id ? 0 : -1"
          class="flex min-w-0 items-center justify-center gap-1.5 text-[13px] transition sm:text-sm"
          :class="
            isGame
              ? [
                  'rounded-xl px-1 py-2 font-extrabold sm:px-3',
                  tab === t.id ? 'bg-accent text-on-accent shadow-[inset_0_-3px_0_var(--fg-accent-deep)]' : 'text-muted hover:bg-card',
                ]
              : [
                  '-mb-px border-b-2 px-1 py-2.5 font-medium sm:px-3',
                  tab === t.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
                ]
          "
          @click="selectTab(t.id)"
        >
          <Icon :name="t.icon" :size="15" class="hidden shrink-0 sm:block" /> {{ t.label }}
        </button>
      </div>

      <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`" tabindex="0" class="mt-5 space-y-4 outline-none">
        <!-- Calendar -->
        <template v-if="tab === 'calendar'">
          <section class="card p-4 sm:p-5">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 class="h-display text-xl">Every day, cleared or not</h2>
              <div class="flex flex-wrap gap-2 text-xs font-bold">
                <span class="chip !bg-warm-soft !text-warm"><Icon name="flame" :size="13" /> {{ streak }} day streak</span>
                <span class="chip">Best: {{ best }}</span>
                <span class="chip">{{ clearRate }}% days cleared</span>
              </div>
            </div>
            <YearHeatmap :grid="heat" label="tasks done" />
          </section>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section class="card min-w-0 p-4 sm:p-5">
              <h2 class="h-display mb-1 text-xl">Task boxes</h2>
              <p class="mb-4 text-xs text-muted">Last 14 days. One box per task, the bottom edge shows priority.</p>
              <TaskBoxes :days="boxes" />
            </section>
            <section class="card min-w-0 p-4 sm:p-5">
              <h2 class="h-display mb-4 text-xl">This week</h2>
              <WeekRings :rings="rings" />
              <p class="mt-3 text-center text-[11px] text-muted">Change the weekly focus goal in Settings.</p>
            </section>
          </div>
        </template>

        <!-- Badges -->
        <template v-else-if="tab === 'badges'">
          <LevelCard />
          <section class="card p-4 sm:p-5">
            <div class="mb-4 flex items-baseline justify-between">
              <h2 class="h-display text-xl">Badges</h2>
              <span class="text-sm text-muted"
                ><b class="num text-ink">{{ earned }}</b> / {{ milestones.length }} earned</span
              >
            </div>
            <BadgeGrid :milestones="milestones" />
          </section>
        </template>

        <!-- Numbers -->
        <template v-else-if="tab === 'numbers'">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="h-display text-2xl">The numbers</h2>
            <div class="flex rounded-xl border border-line bg-card p-0.5 text-sm" role="group" aria-label="Range">
              <button
                v-for="[k, l] in RANGES"
                :key="k"
                type="button"
                class="rounded-lg px-3 py-1.5 font-medium"
                :class="range === k ? 'bg-accent-soft text-accent' : 'text-muted'"
                :aria-pressed="range === k"
                @click="range = k"
              >
                {{ l }}
              </button>
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <section v-for="c in charts" :key="c.title" class="card p-4">
              <h3 class="mb-3 text-sm font-semibold">{{ c.title }} <span class="font-normal text-muted">· 14 days</span></h3>
              <BarChart :data="c.data" :color="c.color" :unit="c.unit" :height="110" />
            </section>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <section v-for="[key, title] in SECTIONS" :key="key" class="card flex flex-col overflow-hidden">
              <h3 class="px-4 pt-4 text-sm font-semibold">{{ title }}</h3>
              <div class="flex-1 space-y-2 p-4">
                <div v-for="(v, k) in stats.sections[key].good" :key="k" class="flex items-baseline justify-between gap-3">
                  <span class="text-sm">{{ k }}</span
                  ><span class="text-2xl font-semibold text-accent">{{ v }}</span>
                </div>
              </div>
              <div class="space-y-2 border-t border-line bg-sunk p-4">
                <div v-for="(v, k) in stats.sections[key].bad" :key="k" class="flex items-baseline justify-between gap-3 text-muted">
                  <span class="text-sm">{{ k }}</span
                  ><span class="text-lg font-medium">{{ v }}</span>
                </div>
              </div>
            </section>
          </div>
          <section class="card p-4">
            <h3 class="mb-3 text-sm font-semibold">Completed by tag</h3>
            <div v-if="tags.length" class="space-y-2">
              <div v-for="[t, n] in tags" :key="t" class="text-sm">
                <div class="mb-1 flex justify-between">
                  <span>{{ t }}</span
                  ><span class="text-muted">{{ n }}</span>
                </div>
                <div class="h-2 rounded-full bg-sunk">
                  <div class="h-2 rounded-full bg-accent" :style="{ width: (n / tagMax) * 100 + '%' }" />
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-muted">Finish some tagged tasks to see where your time goes.</p>
          </section>
        </template>

        <!-- History -->
        <template v-else>
          <section class="card p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 class="h-display text-xl">History</h2>
              <div class="flex rounded-xl border border-line bg-card p-0.5 text-sm" role="group" aria-label="Range">
                <button
                  v-for="[k, l] in RANGES"
                  :key="k"
                  type="button"
                  class="rounded-lg px-3 py-1.5 font-medium"
                  :class="range === k ? 'bg-accent-soft text-accent' : 'text-muted'"
                  :aria-pressed="range === k"
                  @click="range = k"
                >
                  {{ l }}
                </button>
              </div>
            </div>
            <ol class="space-y-1">
              <li v-for="e in stats.history" :key="e.id" class="flex gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-sunk">
                <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="BAD.has(e.type) ? 'bg-muted/40' : 'bg-accent'" />
                <span class="min-w-0 flex-1" :class="BAD.has(e.type) && 'text-muted'">
                  {{ EVENTS[e.type] || e.type
                  }}<template v-if="e.title"
                    >: <b class="font-medium">{{ e.title }}</b></template
                  >
                  <span v-if="e.reason" class="block text-xs italic">“{{ e.reason }}”</span>
                </span>
                <time class="shrink-0 text-xs text-muted">{{ dateTime(e.at) }}</time>
              </li>
              <li v-if="!stats.history.length" class="text-sm text-muted">Nothing logged in this period yet.</li>
            </ol>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>
