<script setup>
import { computed, ref } from 'vue'
import { gatedStatus, windowAt, isLocked, findSite, formatMinutes, tasksForRule } from '@focusgateway/core'
import { store, blocks, canBlock } from '../lib/store.js'
import { withPin } from '../lib/actions.js'
import { daysLabel } from '../lib/format.js'
import Icon from '../components/Icon.vue'
import RuleEditor from '../components/RuleEditor.vue'
import TaskEditor from '../components/TaskEditor.vue'
import FocusCard from '../components/FocusCard.vue'
import FailsafeFlow from '../components/FailsafeFlow.vue'

const editor = ref(null)
const taskFor = ref(null)
const failsafe = ref(null)
const gated = computed(() => store.state.rules.filter((r) => r.mode === 'gated'))
const hard = computed(() => store.state.rules.filter((r) => r.mode === 'hard'))

function status(r) {
  const blocking = blocks.value.blocks.find((b) => b.ruleId === r.id)
  if (r.mode === 'hard') {
    if (!windowAt(r, store.now)) return { label: 'Not running', tone: 'muted' }
    return blocking ? { label: 'Blocking now', tone: 'accent' } : { label: 'Unlocked with Failsafe', tone: 'caution' }
  }
  const g = gatedStatus(store.state, r, store.now)
  if (g.status === 'inactive') return { label: 'Not running', tone: 'muted' }
  if (g.status === 'unlocked') return { label: 'Unlocked, tasks done', tone: 'good' }
  if (!blocking) return { label: 'Unlocked with Failsafe', tone: 'caution' }
  return { label: g.status === 'extended' ? 'Still blocked, tasks open' : 'Blocking now', tone: 'accent' }
}
const TONE = { muted: 'bg-sunk text-muted', accent: 'bg-accent-soft text-accent', good: 'bg-good-soft text-good', caution: 'bg-caution-soft text-caution' }
const siteNames = (r) => r.siteIds.map((id) => findSite(store.state, id)?.name || id)
const open = (r) => tasksForRule(store.state, r.id).filter((t) => t.status !== 'done').length

async function remove(r) {
  await withPin('rules.delete', { id: r.id }, { always: true, title: `Delete “${r.name}”?`, message: 'Deleting a rule always needs your PIN. Attached tasks are kept.' })
}
function editRuleById(id) {
  editor.value = { rule: store.state.rules.find((r) => r.id === id) }
}
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-display text-4xl">Blocking</h1>
        <p class="text-sm text-muted">Everything that keeps you off distracting sites. Blocks stack: a site is blocked if any rule says so.</p>
      </div>
      <button class="btn btn-primary" @click="editor = { mode: 'gated' }"><Icon name="plus" :size="16" /> New rule</button>
    </header>

    <RouterLink v-if="!canBlock" to="/install" class="flex items-center gap-3 rounded-2xl bg-warm-soft p-4 text-sm">
      <Icon name="alert" class="text-warm" /> <span class="flex-1">Rules are saved, but nothing is enforced until you install the extension.</span><Icon name="chevronRight" />
    </RouterLink>

    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Task-Gated windows</h2>
        <button class="btn btn-sm" @click="editor = { mode: 'gated' }"><Icon name="plus" :size="14" /> Add</button>
      </div>
      <p class="mb-3 text-sm text-muted">Blocked during the window until the tasks attached to it are done. If the window ends with tasks still open, the block continues until you finish them.</p>
      <div class="grid gap-3 md:grid-cols-2">
        <article v-for="r in gated" :key="r.id" class="card p-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="font-semibold">{{ r.name }}</h3>
              <p class="text-sm text-muted">{{ daysLabel(r.days) }} · {{ formatMinutes(r.start) }}–{{ formatMinutes(r.end) }}</p>
            </div>
            <span class="chip shrink-0" :class="TONE[status(r).tone]">{{ status(r).label }}</span>
          </div>
          <p class="mt-2 text-sm">{{ siteNames(r).join(', ') }}</p>
          <p class="mt-1 text-xs text-muted">{{ open(r) }} open task{{ open(r) === 1 ? '' : 's' }} attached</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <button class="btn btn-sm" @click="taskFor = r"><Icon name="plus" :size="13" /> Task</button>
            <RouterLink :to="{ path: '/tasks' }" class="btn btn-sm">Tasks</RouterLink>
            <button class="btn btn-sm" @click="editor = { rule: r }"><Icon name="edit" :size="13" /> Edit</button>
            <button class="btn btn-sm" @click="remove(r)"><Icon name="trash" :size="13" /></button>
            <button v-if="blocks.blocks.some((b) => b.ruleId === r.id)" class="btn btn-sm btn-ghost ml-auto text-muted" @click="failsafe = { type: 'rule', id: r.id }">Failsafe</button>
          </div>
        </article>
        <button v-if="!gated.length" class="card flex flex-col items-center gap-1 border-dashed p-6 text-sm text-muted hover:border-accent md:col-span-2" @click="editor = { mode: 'gated' }">
          <Icon name="unlock" :size="22" /> e.g. “Weekdays 4 to 7 pm, Instagram and YouTube stay blocked until homework is done.”
        </button>
      </div>
    </section>

    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Hard blocks</h2>
        <button class="btn btn-sm" @click="editor = { mode: 'hard' }"><Icon name="plus" :size="14" /> Add</button>
      </div>
      <p class="mb-3 text-sm text-muted">Blocked for the whole window. Can't overlap a Task-Gated window on the same site.</p>
      <div class="grid gap-3 md:grid-cols-2">
        <article v-for="r in hard" :key="r.id" class="card p-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="flex items-center gap-1.5 font-semibold">{{ r.name }} <Icon v-if="isLocked(r)" name="lock" :size="14" class="text-bad" /></h3>
              <p class="text-sm text-muted">{{ daysLabel(r.days) }} · {{ formatMinutes(r.start) }}–{{ formatMinutes(r.end) }}</p>
            </div>
            <span class="chip shrink-0" :class="TONE[status(r).tone]">{{ status(r).label }}</span>
          </div>
          <p class="mt-2 text-sm">{{ siteNames(r).join(', ') }}</p>
          <p class="mt-1 text-xs" :class="isLocked(r) ? 'text-bad' : 'text-muted'">{{ isLocked(r) ? 'No failsafe: fully locked while running' : 'Failsafe allowed' }}</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <button class="btn btn-sm" @click="editor = { rule: r }"><Icon name="edit" :size="13" /> Edit</button>
            <button class="btn btn-sm" @click="remove(r)"><Icon name="trash" :size="13" /></button>
            <button v-if="!isLocked(r) && blocks.blocks.some((b) => b.ruleId === r.id)" class="btn btn-sm btn-ghost ml-auto text-muted" @click="failsafe = { type: 'rule', id: r.id }">Failsafe</button>
          </div>
        </article>
        <button v-if="!hard.length" class="card flex flex-col items-center gap-1 border-dashed p-6 text-sm text-muted hover:border-accent md:col-span-2" @click="editor = { mode: 'hard' }">
          <Icon name="moon" :size="22" /> e.g. “Every night 11 pm to 7 am, no Reddit, no YouTube.”
        </button>
      </div>
    </section>

    <section class="card p-5">
      <h2 class="text-lg font-semibold">Focus mode</h2>
      <p class="mb-4 text-sm text-muted">Start right now, no scheduling. Sites stay blocked through work and break rounds.</p>
      <FocusCard />
    </section>

    <RuleEditor v-if="editor" :key="editor.rule?.id || editor.mode" :rule="editor.rule" :mode="editor.mode" @close="editor = null" @edit-rule="editRuleById" />
    <TaskEditor v-if="taskFor" :defaults="{ ruleId: taskFor.id }" @close="taskFor = null" />
    <FailsafeFlow v-if="failsafe" :target="failsafe" @close="failsafe = null" />
  </div>
</template>
