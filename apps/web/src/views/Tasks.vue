<script setup>
import { computed, ref } from 'vue'
import { startOfDay, addDays } from '@focusgateway/core'
import { store, call, attempt } from '../lib/store.js'
import Icon from '../components/Icon.vue'
import TaskItem from '../components/TaskItem.vue'
import TaskEditor from '../components/TaskEditor.vue'

const editing = ref(null)
const view = ref('list')
const show = ref('open')
const q = ref('')
const tag = ref('')
const pri = ref('')
const rule = ref('')

const top = computed(() =>
  store.state.tasks.filter((t) => {
    if (t.parentId) return false
    if (show.value === 'open' && t.status === 'done') return false
    if (show.value === 'done' && t.status !== 'done') return false
    if (q.value && !(t.title + ' ' + (t.notes || '')).toLowerCase().includes(q.value.toLowerCase())) return false
    if (tag.value && !(t.tags || []).includes(tag.value)) return false
    if (pri.value && t.priority !== pri.value) return false
    if (rule.value && t.ruleId !== rule.value) return false
    return true
  }),
)

const groups = computed(() => {
  const today = startOfDay(store.now)
  const buckets = [
    ['Overdue', (t) => t.deadline < store.now && t.status !== 'done'],
    ['Today', (t) => t.deadline < addDays(today, 1)],
    ['Tomorrow', (t) => t.deadline < addDays(today, 2)],
    ['Next 7 days', (t) => t.deadline < addDays(today, 8)],
    ['Later', () => true],
  ]
  const out = buckets.map(([name]) => ({ name, tasks: [] }))
  const sorted = [...top.value].sort((a, b) => (show.value === 'done' ? b.completedAt - a.completedAt : a.deadline - b.deadline))
  for (const t of sorted) out[buckets.findIndex(([, fn]) => fn(t))].tasks.push(t)
  return out.filter((g) => g.tasks.length)
})

// Board (drag and drop between To do / Done)
const columns = computed(() => [
  { key: 'todo', name: 'To do', tasks: top.value.filter((t) => t.status !== 'done').sort((a, b) => a.deadline - b.deadline) },
  { key: 'done', name: 'Done', tasks: top.value.filter((t) => t.status === 'done').sort((a, b) => b.completedAt - a.completedAt).slice(0, 30) },
])
const dragOver = ref('')
function onDrop(col, e) {
  dragOver.value = ''
  const id = e.dataTransfer.getData('text/fg-task')
  const t = store.state.tasks.find((x) => x.id === id)
  if (!t || (col === 'done') === (t.status === 'done')) return
  attempt(() => call(col === 'done' ? 'tasks.complete' : 'tasks.reopen', { id }))
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="h-display text-4xl">Tasks</h1>
      <div class="flex gap-2">
        <div class="flex rounded-xl border border-line bg-card p-0.5 text-sm" role="tablist">
          <button v-for="v in ['list', 'board']" :key="v" class="rounded-lg px-3 py-1.5 font-medium capitalize" :class="view === v ? 'bg-accent-soft text-accent' : 'text-muted'" @click="view = v">{{ v }}</button>
        </div>
        <button class="btn btn-primary" @click="editing = {}"><Icon name="plus" :size="16" /> New task</button>
      </div>
    </header>

    <div class="flex flex-wrap gap-2">
      <input v-model="q" class="input max-w-56" placeholder="Search tasks" aria-label="Search tasks" />
      <select v-if="view === 'list'" v-model="show" class="input w-auto" aria-label="Status"><option value="open">Open</option><option value="done">Done</option><option value="all">All</option></select>
      <select v-model="tag" class="input w-auto" aria-label="Tag"><option value="">All tags</option><option v-for="t in store.state.tags" :key="t">{{ t }}</option></select>
      <select v-model="pri" class="input w-auto" aria-label="Priority"><option value="">Any priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <select v-model="rule" class="input w-auto" aria-label="Window"><option value="">Any window</option><option v-for="r in store.state.rules.filter((r) => r.mode === 'gated')" :key="r.id" :value="r.id">{{ r.name }}</option></select>
    </div>

    <template v-if="view === 'list'">
      <section v-for="g in groups" :key="g.name">
        <h2 class="mb-2 text-sm font-semibold" :class="g.name === 'Overdue' ? 'text-bad' : 'text-muted'">{{ g.name }} <span class="font-normal">· {{ g.tasks.length }}</span></h2>
        <div class="space-y-2">
          <TaskItem v-for="t in g.tasks" :key="t.id" :task="t" @edit="editing = { task: $event }" @add-subtask="editing = { parent: $event }" />
        </div>
      </section>
      <div v-if="!groups.length" class="card p-10 text-center text-muted">
        <p class="text-sm">{{ show === 'done' ? 'Nothing finished yet. Soon.' : 'No tasks here.' }}</p>
        <button v-if="show !== 'done'" class="btn btn-primary mt-4" @click="editing = {}">Add a task</button>
      </div>
    </template>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <section v-for="c in columns" :key="c.key" class="rounded-2xl border-2 border-dashed p-3 transition" :class="dragOver === c.key ? 'border-accent bg-accent-soft/40' : 'border-transparent bg-sunk'"
        @dragover.prevent="dragOver = c.key" @dragleave="dragOver = ''" @drop.prevent="onDrop(c.key, $event)">
        <h2 class="mb-3 px-1 text-sm font-semibold text-muted">{{ c.name }} · {{ c.tasks.length }}</h2>
        <div class="min-h-24 space-y-2">
          <div v-for="t in c.tasks" :key="t.id" draggable="true" class="cursor-grab active:cursor-grabbing" @dragstart="$event.dataTransfer.setData('text/fg-task', t.id)">
            <TaskItem :task="t" @edit="editing = { task: $event }" @add-subtask="editing = { parent: $event }" />
          </div>
        </div>
        <p class="mt-2 px-1 text-xs text-muted">Drag cards between columns.</p>
      </section>
    </div>

    <TaskEditor v-if="editing" :task="editing.task" :parent="editing.parent" @close="editing = null" />
  </div>
</template>
