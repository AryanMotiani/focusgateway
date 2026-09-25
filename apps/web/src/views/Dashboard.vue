<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { nextWindowStart, startOfDay, addDays, computeStats, isHabitDue, isHabitDone, habitStreak } from '@focusgateway/core'
import { store, blocks, canBlock, call, attempt } from '../lib/store.js'
import { greeting, time, date, countdown } from '../lib/format.js'
import Icon from '../components/Icon.vue'
import TaskItem from '../components/TaskItem.vue'
import TaskEditor from '../components/TaskEditor.vue'
import FocusCard from '../components/FocusCard.vue'
import FailsafeFlow from '../components/FailsafeFlow.vue'
import { popXp, playHabit } from '../lib/rewards.js'
import { XP } from '@focusgateway/core'

const route = useRoute()
const router = useRouter()
const editing = ref(null)
const failsafe = ref(null)
const s = computed(() => store.state)
const stats = computed(() => computeStats(s.value, store.now))

const todayEnd = computed(() => addDays(startOfDay(store.now), 1))
const pendingIds = computed(() => new Set(blocks.value.blocks.flatMap((b) => b.pendingTaskIds)))
const todayTasks = computed(() =>
  s.value.tasks
    .filter(
      (t) =>
        !t.parentId &&
        (t.status !== 'done'
          ? t.deadline < todayEnd.value || pendingIds.value.has(t.id)
          : t.completedAt >= startOfDay(store.now) && t.deadline < todayEnd.value),
    )
    .filter((t) => !(t.startAt && t.startAt > todayEnd.value))
    .sort((a, b) => (a.status === 'done') - (b.status === 'done') || a.deadline - b.deadline),
)
const habits = computed(() => s.value.habits.filter((h) => !h.archived && isHabitDue(h, store.now)))
const nextUp = computed(() => {
  let best = null
  for (const r of s.value.rules) {
    const t = nextWindowStart(r, store.now)
    if (t && (!best || t < best.t)) best = { t, r }
  }
  return best
})
const taskById = (id) => s.value.tasks.find((t) => t.id === id)
async function toggleHabit(h, e) {
  const el = e.currentTarget
  const was = isHabitDone(s.value.habitLogs, h.id, store.now)
  await attempt(() => call('habits.toggle', { id: h.id })).catch(() => null)
  if (!was && isHabitDone(s.value.habitLogs, h.id, store.now)) {
    playHabit()
    popXp(el, XP.habit)
  }
}

onMounted(() => {
  if (route.query.failsafe) {
    failsafe.value = { type: 'rule', id: String(route.query.failsafe) }
    router.replace('/today')
  }
})
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm text-muted">{{ date(store.now) }}</p>
        <h1 class="h-display text-4xl sm:text-5xl">{{ greeting(store.now) }}.</h1>
      </div>
      <div class="flex items-center gap-2">
        <span class="chip !bg-warm-soft !text-warm !text-sm"><Icon name="flame" :size="14" /> {{ stats.streak }} day streak</span>
        <button class="btn btn-primary" @click="editing = {}"><Icon name="plus" :size="16" /> Task</button>
      </div>
    </header>

    <RouterLink v-if="!canBlock" to="/install" class="flex items-center gap-3 rounded-2xl border border-warm/40 bg-warm-soft p-4 text-sm">
      <Icon name="puzzle" :size="22" class="text-warm" />
      <span class="flex-1"
        ><b>Site blocking is off in this browser.</b> Tasks, habits and the study room work, and are saved on this device. Install the free
        extension to turn blocking on.</span
      >
      <Icon name="chevronRight" />
    </RouterLink>

    <!-- blocking status -->
    <section class="card overflow-hidden">
      <div v-if="blocks.blocks.length" class="divide-y divide-line">
        <div v-for="b in blocks.blocks" :key="b.ruleId || b.focusId" class="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <div
            class="grid h-11 w-11 place-items-center rounded-2xl"
            :class="b.locked ? 'bg-bad-soft text-bad' : 'bg-accent-soft text-accent'"
          >
            <Icon :name="b.kind === 'focus' ? 'target' : 'lock'" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">
              {{ b.name }}
              <span class="ml-1 text-xs font-medium text-muted">{{
                b.kind === 'hard'
                  ? 'Hard block'
                  : b.kind === 'gated'
                    ? b.extended
                      ? 'Window over, tasks still open'
                      : 'Task-gated'
                    : 'Focus'
              }}</span>
            </p>
            <p class="text-sm text-muted">
              <template v-if="b.kind === 'gated'">
                <template v-if="b.pendingTaskIds.length"
                  >Finish
                  {{
                    b.pendingTaskIds
                      .map((id) => taskById(id)?.title)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(', ')
                  }}{{ b.pendingTaskIds.length > 3 ? '…' : '' }} to unlock.</template
                >
                <template v-else>No tasks attached, so it stays blocked. Add one and finish it.</template>
              </template>
              <template v-else>Opens in {{ countdown(b.until - store.now) }} ({{ time(b.until) }})</template>
            </p>
          </div>
          <button
            v-if="!b.locked && b.kind !== 'focus'"
            class="btn btn-ghost btn-sm text-muted"
            @click="failsafe = { type: 'rule', id: b.ruleId }"
          >
            Failsafe
          </button>
          <span v-if="b.locked" class="chip !bg-bad-soft !text-bad">no failsafe</span>
        </div>
      </div>
      <div v-else class="flex flex-wrap items-center gap-4 p-5">
        <div class="grid h-11 w-11 place-items-center rounded-2xl bg-good-soft text-good"><Icon name="unlock" /></div>
        <div class="flex-1">
          <p class="font-semibold">Nothing is blocked right now</p>
          <p class="text-sm text-muted" v-if="nextUp">
            Next: <b>{{ nextUp.r.name }}</b> {{ date(nextUp.t) === date(store.now) ? 'today' : date(nextUp.t) }} at {{ time(nextUp.t) }}
          </p>
          <p class="text-sm text-muted" v-else>No blocking rules yet.</p>
        </div>
        <RouterLink to="/blocking" class="btn btn-sm">{{ s.rules.length ? 'Manage rules' : 'Create a rule' }}</RouterLink>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <!-- tasks -->
      <section>
        <div class="mb-3 flex items-baseline justify-between">
          <h2 class="text-lg font-semibold">Today's tasks</h2>
          <span class="text-sm text-muted">{{ stats.today.tasksDone }}/{{ stats.today.tasksDue }} done</span>
        </div>
        <div class="space-y-2">
          <TaskItem
            v-for="t in todayTasks"
            :key="t.id"
            :task="t"
            @edit="editing = { task: $event }"
            @add-subtask="editing = { parent: $event }"
          />
          <button
            v-if="!todayTasks.length"
            class="card flex w-full flex-col items-center gap-2 border-dashed p-8 text-center text-muted hover:border-accent"
            @click="editing = {}"
          >
            <Icon name="sparkles" :size="22" />
            <span class="text-sm">Nothing due today. Add the one thing that would make today a win.</span>
          </button>
        </div>
      </section>

      <div class="space-y-6">
        <section class="card p-5">
          <h2 class="mb-3 flex items-center justify-between font-semibold">
            Focus session <RouterLink to="/room" class="text-xs font-medium text-accent">Open study room →</RouterLink>
          </h2>
          <FocusCard />
        </section>

        <section class="card p-5">
          <h2 class="mb-3 flex items-center justify-between font-semibold">
            Habits today <RouterLink to="/habits" class="text-xs font-medium text-accent">All habits →</RouterLink>
          </h2>
          <div v-if="habits.length" class="space-y-1.5">
            <button
              v-for="h in habits"
              :key="h.id"
              class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sunk"
              @click="toggleHabit(h, $event)"
            >
              <span
                class="grid h-7 w-7 place-items-center rounded-full border-2 text-sm transition"
                :class="isHabitDone(s.habitLogs, h.id, store.now) ? 'border-good bg-good text-white' : 'border-line'"
              >
                <Icon v-if="isHabitDone(s.habitLogs, h.id, store.now)" name="check" :size="14" />
                <span v-else>{{ h.emoji }}</span>
              </span>
              <span class="flex-1 text-sm font-medium">{{ h.name }}</span>
              <span class="text-xs text-muted">{{ habitStreak(h, s.habitLogs, store.now) }}🔥</span>
            </button>
          </div>
          <p v-else class="text-sm text-muted">
            No habits scheduled today. <RouterLink to="/habits" class="text-accent underline">Add one</RouterLink>
          </p>
        </section>

        <section class="grid grid-cols-3 gap-2 text-center">
          <div class="card p-3">
            <p class="num text-2xl">{{ stats.today.focusMin }}</p>
            <p class="text-xs text-muted">focus min</p>
          </div>
          <div class="card p-3">
            <p class="num text-2xl">{{ stats.today.tasksDone }}</p>
            <p class="text-xs text-muted">tasks done</p>
          </div>
          <div class="card p-3">
            <p class="num text-2xl">{{ stats.today.habitsDone }}/{{ stats.today.habitsDue }}</p>
            <p class="text-xs text-muted">habits</p>
          </div>
        </section>
      </div>
    </div>

    <TaskEditor v-if="editing" :task="editing.task" :parent="editing.parent" @close="editing = null" />
    <FailsafeFlow v-if="failsafe" :target="failsafe" @close="failsafe = null" />
  </div>
</template>
