<script setup>
import { computed, ref } from 'vue'
import { startOfDay, addDays, isoWeekday, formatMinutes, taskColor } from '@focusgateway/core'
import { store } from '../lib/store.js'
import { updateTask } from '../lib/actions.js'
import { time, DAY_NAMES } from '../lib/format.js'
import Icon from '../components/Icon.vue'
import TaskEditor from '../components/TaskEditor.vue'
import RuleEditor from '../components/RuleEditor.vue'

const offset = ref(0)
const editing = ref(null)
const editingRule = ref(null)
const over = ref(-1)
const weekStart = computed(() => addDays(startOfDay(store.now), -(isoWeekday(store.now) - 1) + offset.value * 7))
const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart.value, i)
    const wd = isoWeekday(d)
    return {
      d,
      wd,
      isToday: d === startOfDay(store.now),
      rules: store.state.rules.filter((r) => r.days.includes(wd)).sort((a, b) => a.start - b.start),
      tasks: store.state.tasks
        .filter((t) => !t.parentId && t.deadline >= d && t.deadline < addDays(d, 1))
        .sort((a, b) => a.deadline - b.deadline),
    }
  }),
)
const range = computed(() => {
  const a = new Date(weekStart.value)
  const b = new Date(addDays(weekStart.value, 6))
  const o = { month: 'short', day: 'numeric' }
  return `${a.toLocaleDateString([], o)} to ${b.toLocaleDateString([], o)}`
})
const DOT = { green: 'bg-good', yellow: 'bg-caution', red: 'bg-bad' }

async function drop(day, e) {
  over.value = -1
  const t = store.state.tasks.find((x) => x.id === e.dataTransfer.getData('text/fg-task'))
  if (!t) return
  const old = new Date(t.deadline)
  const next = new Date(day.d)
  next.setHours(old.getHours(), old.getMinutes(), 0, 0)
  if (next.getTime() === t.deadline) return
  await updateTask(t, { deadline: next.getTime() })
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="h-display text-4xl">Schedule</h1>
        <p class="text-sm text-muted">Blocking windows and deadlines for the week. Drag a task to another day to move its deadline.</p>
      </div>
      <div class="flex items-center gap-1">
        <button class="btn btn-sm" aria-label="Previous week" @click="offset--"><Icon name="chevronLeft" :size="16" /></button>
        <button class="btn btn-sm" @click="offset = 0">This week</button>
        <button class="btn btn-sm" aria-label="Next week" @click="offset++"><Icon name="chevronRight" :size="16" /></button>
      </div>
    </header>
    <p class="text-sm font-medium">{{ range }}</p>

    <div class="grid gap-2 md:grid-cols-7">
      <section
        v-for="(day, i) in days"
        :key="day.d"
        class="min-h-40 rounded-2xl border p-2.5 transition"
        :class="[day.isToday ? 'border-accent bg-card' : 'border-line bg-card/60', over === i && '!border-accent !bg-accent-soft/50']"
        @dragover.prevent="over = i"
        @dragleave="over = -1"
        @drop.prevent="drop(day, $event)"
      >
        <p class="mb-2 flex items-baseline justify-between text-xs font-semibold" :class="day.isToday ? 'text-accent' : 'text-muted'">
          <span>{{ DAY_NAMES[day.wd - 1] }}</span
          ><span class="text-base">{{ new Date(day.d).getDate() }}</span>
        </p>
        <div class="space-y-1.5">
          <button
            v-for="r in day.rules"
            :key="r.id"
            class="block w-full rounded-lg px-2 py-1 text-left text-[11px] leading-tight"
            :class="r.mode === 'hard' ? 'bg-bad-soft text-bad' : 'bg-accent-soft text-accent'"
            @click="editingRule = r"
          >
            <span class="font-semibold">{{ formatMinutes(r.start) }}–{{ formatMinutes(r.end) }}</span
            ><br />{{ r.name }}
          </button>
          <div
            v-for="t in day.tasks"
            :key="t.id"
            draggable="true"
            class="cursor-grab rounded-lg border border-line bg-paper px-2 py-1.5 text-xs active:cursor-grabbing"
            :class="t.status === 'done' && 'opacity-50'"
            @dragstart="$event.dataTransfer.setData('text/fg-task', t.id)"
            @click="editing = t"
          >
            <p class="flex items-center gap-1.5 font-medium" :class="t.status === 'done' && 'line-through'">
              <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="DOT[taskColor(t)]" />{{ t.title }}
            </p>
            <p class="mt-0.5 text-muted">{{ time(t.deadline) }}</p>
          </div>
        </div>
      </section>
    </div>
    <div class="flex flex-wrap gap-4 text-xs text-muted">
      <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-accent-soft" /> Task-gated window</span>
      <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-bad-soft" /> Hard block</span>
    </div>
    <TaskEditor v-if="editing" :task="editing" @close="editing = null" />
    <RuleEditor v-if="editingRule" :rule="editingRule" @close="editingRule = null" />
  </div>
</template>
