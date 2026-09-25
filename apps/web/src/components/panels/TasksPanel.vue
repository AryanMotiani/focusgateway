<script setup>
// Every open task, grouped by when it is due, with quick add on top.
// Used in the study room drawer (dark) and the Today rail (light).
import { computed, ref } from 'vue'
import { startOfDay, addDays, XP } from '@focusgateway/core'
import { store, call, attempt, toast } from '../../lib/store.js'
import { deadlineLabel, endOfToday } from '../../lib/format.js'
import { popXp, playTick, isGame, currentXp } from '../../lib/rewards.js'
import Icon from '../Icon.vue'
import TaskEditor from '../TaskEditor.vue'

const props = defineProps({ dark: Boolean, todayOnly: Boolean, limit: { type: Number, default: 0 } })
const title = ref('')
const priority = ref('medium')
const editing = ref(null)
const expanded = ref({})
const CAP = 5
const PRI = ['low', 'medium', 'high']
const DOT = { low: '#38a8f5', medium: '#9a7bff', high: '#f2a900' }

const groups = computed(() => {
  const today = startOfDay(store.minute)
  const tomorrow = addDays(today, 1)
  const week = addDays(today, 7)
  const open = (store.state?.tasks || []).filter((t) => !t.parentId && t.status !== 'done').sort((a, b) => a.deadline - b.deadline)
  const g = [
    { key: 'today', label: 'Today', items: open.filter((t) => t.deadline >= store.minute && t.deadline < tomorrow) },
    { key: 'overdue', label: 'Overdue', tone: 'bad', items: open.filter((t) => t.deadline < store.minute).reverse() },
    { key: 'week', label: 'This week', items: open.filter((t) => t.deadline >= tomorrow && t.deadline < week) },
    { key: 'later', label: 'Later', items: open.filter((t) => t.deadline >= week) },
  ]
  const list = props.todayOnly ? g.slice(0, 2) : g
  return list
    .filter((x) => x.items.length)
    .map((x) => {
      const cap = props.limit || (expanded.value[x.key] ? Infinity : CAP)
      return { ...x, total: x.items.length, items: x.items.slice(0, cap) }
    })
})
const doneToday = computed(
  () => (store.state?.tasks || []).filter((t) => !t.parentId && t.status === 'done' && t.completedAt >= startOfDay(store.minute)).length,
)

async function add() {
  const t = title.value.trim()
  if (!t) return
  await attempt(() => call('tasks.create', { title: t, priority: priority.value, deadline: endOfToday(store.now), tags: [] })).catch(
    () => null,
  )
  title.value = ''
}
async function complete(t, e) {
  const el = e.currentTarget
  const before = currentXp()
  const r = await attempt(() => call('tasks.complete', { id: t.id })).catch(() => null)
  if (r === null) return
  playTick()
  popXp(el, currentXp() - before)
  if (!isGame.value) toast('Done. Nice.', 'success')
}
const cyclePri = () => (priority.value = PRI[(PRI.indexOf(priority.value) + 1) % 3])
const sub = computed(() => (props.dark ? 'text-white/55' : 'text-muted'))
const row = computed(() => (props.dark ? 'hover:bg-white/10' : 'hover:bg-sunk'))
</script>

<template>
  <div class="space-y-4">
    <form class="flex items-center gap-1.5 rounded-xl p-1" :class="dark ? 'bg-white/10' : 'bg-sunk'" @submit.prevent="add">
      <button
        type="button"
        class="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        :title="`Priority: ${priority} (click to change)`"
        :aria-label="`Priority ${priority}`"
        @click="cyclePri"
      >
        <span class="h-3 w-3 rounded-full" :style="{ background: DOT[priority] }" />
      </button>
      <input
        v-model="title"
        class="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
        :class="dark ? 'placeholder:text-white/40' : 'placeholder:text-muted'"
        placeholder="Add a task for today…"
        maxlength="140"
        aria-label="New task"
      />
      <button
        type="submit"
        class="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        :class="dark ? 'bg-white/15' : 'bg-card'"
        aria-label="Add"
      >
        <Icon name="plus" :size="16" />
      </button>
    </form>

    <div v-for="g in groups" :key="g.key">
      <p class="hud-label mb-1 flex justify-between text-[11px]" :class="g.tone === 'bad' ? 'text-bad' : sub">
        <span>{{ g.label }}</span
        ><span>{{ g.items.length }}</span>
      </p>
      <ul>
        <li v-for="t in g.items" :key="t.id" class="group flex items-start gap-2.5 rounded-xl px-2 py-1.5" :class="row">
          <button
            class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 transition hover:scale-110 game:rounded-md"
            :class="dark ? 'rounded-full border-white/50 hover:border-white' : 'rounded-full border-line hover:border-good'"
            :style="{ borderLeftColor: DOT[t.priority] }"
            :aria-label="`Complete ${t.title}`"
            @click="complete(t, $event)"
          />
          <button class="min-w-0 flex-1 text-left" @click="editing = t">
            <span class="block text-sm leading-snug break-words">{{ t.title }}</span>
            <span class="text-[11px]" :class="t.deadline < store.now ? 'text-bad' : sub">
              {{ deadlineLabel(t.deadline, store.now).text }}<template v-if="t.ruleId"> · unlocks a window</template>
            </span>
          </button>
          <span v-if="isGame" class="num mt-0.5 text-[10px] text-xp opacity-80">+{{ XP.task[t.priority] }}</span>
        </li>
      </ul>
      <button
        v-if="g.total > g.items.length && !limit"
        class="mt-1 w-full rounded-lg py-1 text-xs font-bold"
        :class="dark ? 'text-white/60 hover:bg-white/10' : 'text-muted hover:bg-sunk'"
        @click="expanded = { ...expanded, [g.key]: true }"
      >
        Show {{ g.total - g.items.length }} more
      </button>
    </div>
    <p v-if="!groups.length" class="py-4 text-center text-sm" :class="sub">
      Nothing open. {{ doneToday ? `${doneToday} done today.` : 'Add the one thing that would make today a win.' }}
    </p>
    <RouterLink to="/tasks" class="block text-center text-xs font-bold" :class="dark ? 'text-white/70 hover:text-white' : 'text-accent'"
      >All tasks, subtasks and tags →</RouterLink
    >
    <TaskEditor v-if="editing" :task="editing" @close="editing = null" />
  </div>
</template>
