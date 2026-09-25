<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { taskColor, forwardsLeft, FORWARD_LIMITS, XP } from '@focusgateway/core'
import { store, call, attempt, toast } from '../lib/store.js'
import { deadlineLabel, humanDuration } from '../lib/format.js'
import { deleteTask } from '../lib/actions.js'
import Icon from './Icon.vue'
import { popXp, playTick, isGame } from '../lib/rewards.js'

const props = defineProps({ task: Object, compact: Boolean, showRule: { type: Boolean, default: true } })
const emit = defineEmits(['edit', 'add-subtask'])
const open = ref(false)
const popping = ref(false)

const subtasks = computed(() => store.state.tasks.filter((t) => t.parentId === props.task.id))
const subDone = computed(() => subtasks.value.filter((t) => t.status === 'done').length)
const color = computed(() => taskColor(props.task))
const due = computed(() => deadlineLabel(props.task.deadline, store.now))
const rule = computed(() => props.task.ruleId && store.state.rules.find((r) => r.id === props.task.ruleId))
const done = computed(() => props.task.status === 'done')
const forwarded = computed(() => props.task.forwardedUntil && props.task.forwardedUntil > store.now)
const canForward = computed(
  () =>
    !props.task.parentId &&
    rule.value &&
    !done.value &&
    forwardsLeft(props.task) > 0 &&
    props.task.deadline > store.now &&
    !forwarded.value,
)
const COLORS = { green: 'bg-good', yellow: 'bg-caution', red: 'bg-bad' }
const PRI = { high: 'text-bad', medium: 'text-caution', low: 'text-muted' }

// What finishing this task is worth right now (shown as a reward tag in game mode)
const reward = computed(() =>
  props.task.parentId ? XP.subtask : XP.task[props.task.priority] + (props.task.deadline >= store.now ? XP.onTimeBonus : 0),
)
const RAR = { low: 'rar-low', medium: 'rar-medium', high: 'rar-high' }

async function toggle(e) {
  if (done.value) return attempt(() => call('tasks.reopen', { id: props.task.id }))
  const el = e?.currentTarget
  const worth = reward.value
  popping.value = true
  setTimeout(() => (popping.value = false), 500)
  const r = await attempt(() => call('tasks.complete', { id: props.task.id }))
  playTick()
  popXp(el, worth)
  if (r?.next) toast('Nice. The next one is scheduled.', 'success')
}
async function forward() {
  const r = await attempt(() => call('tasks.forward', { id: props.task.id }))
  if (r) toast(`Sent to the next window. ${forwardsLeft(r.task)} forward${forwardsLeft(r.task) === 1 ? '' : 's'} left.`, 'info')
}

// optional per-task stopwatch
const running = ref(null)
const tick = ref(0)
let iv = null
function startTimer() {
  running.value = Date.now()
  iv = setInterval(() => (tick.value = Date.now() - running.value), 1000)
}
async function stopTimer() {
  clearInterval(iv)
  const sec = Math.round((Date.now() - running.value) / 1000)
  running.value = null
  tick.value = 0
  if (sec >= 5) await attempt(() => call('tasks.logTime', { id: props.task.id, seconds: sec }))
}
onBeforeUnmount(() => running.value && stopTimer())
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-2xl border border-line bg-card transition hover:shadow-sm game:border-2 game:border-b-4 game:border-b-edge"
    :class="{ 'opacity-60': forwarded }"
  >
    <span v-if="isGame && !compact" class="absolute inset-y-0 left-0 w-1.5 bg-(--rar)" :class="RAR[task.priority]" aria-hidden="true" />
    <div class="flex items-start gap-3 p-3 sm:p-3.5" :class="isGame && !compact && 'pl-4 sm:pl-5'">
      <button
        class="relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition"
        :class="[done ? 'border-good bg-good text-white' : 'border-line hover:border-good', popping && 'scale-125', isGame && 'rounded-lg']"
        :aria-label="done ? 'Mark as not done' : 'Mark as done'"
        @click="toggle"
      >
        <Icon v-if="done" name="check" :size="14" />
      </button>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <button class="min-w-0 text-left" @click="emit('edit', task)">
            <p class="font-medium leading-snug break-words" :class="done && 'text-muted line-through'">{{ task.title }}</p>
          </button>
          <div class="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <button
              v-if="!task.parentId && !compact"
              class="rounded-lg p-1.5 text-muted hover:bg-sunk hover:text-ink"
              title="Add subtask"
              @click="emit('add-subtask', task)"
            >
              <Icon name="plus" :size="15" />
            </button>
            <button
              v-if="!done && !compact"
              class="rounded-lg p-1.5 text-muted hover:bg-sunk hover:text-ink"
              :title="running ? 'Stop timer' : 'Start timer'"
              @click="running ? stopTimer() : startTimer()"
            >
              <Icon :name="running ? 'pause' : 'clock'" :size="15" />
            </button>
            <button class="rounded-lg p-1.5 text-muted hover:bg-sunk hover:text-ink" title="Edit" @click="emit('edit', task)">
              <Icon name="edit" :size="15" />
            </button>
            <button class="rounded-lg p-1.5 text-muted hover:bg-bad-soft hover:text-bad" title="Delete" @click="deleteTask(task)">
              <Icon name="trash" :size="15" />
            </button>
          </div>
        </div>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            class="inline-flex items-center gap-1.5 font-medium"
            :class="PRI[task.priority]"
            :title="`${task.forwardCount}/${FORWARD_LIMITS[task.priority]} forwards used`"
          >
            <span class="h-2 w-2 rounded-full" :class="COLORS[color]" />{{ task.priority }}
          </span>
          <span
            :class="{
              'text-bad font-medium': due.tone === 'bad' && !done,
              'text-caution font-medium': due.tone === 'caution' && !done,
              'text-muted': due.tone === 'muted' || done,
            }"
            >{{ due.text }}</span
          >
          <span v-if="rule && showRule" class="inline-flex items-center gap-1 text-accent"
            ><Icon name="lock" :size="12" />{{ rule.name }}</span
          >
          <span v-if="forwarded" class="text-muted">forwarded to next window</span>
          <span v-if="task.recurrence" class="text-muted" title="Repeats"
            >↻
            {{
              task.recurrence.type === 'daily' ? 'daily' : task.recurrence.type === 'weekly' ? 'weekly' : `every ${task.recurrence.every}d`
            }}</span
          >
          <span v-for="t in task.tags" :key="t" class="chip">{{ t }}</span>
          <span v-if="isGame && !done" class="num ml-auto text-[11px] text-xp" :title="`Worth ${reward} XP`">+{{ reward }} XP</span>
          <button v-if="subtasks.length" class="text-muted hover:text-ink" @click="open = !open">
            {{ subDone }}/{{ subtasks.length }} subtasks {{ open ? '▴' : '▾' }}
          </button>
          <span v-if="running" class="font-mono text-accent">{{ humanDuration(tick) }} ⏱</span>
          <span v-else-if="task.timeSpentSec >= 60" class="text-muted">{{ humanDuration(task.timeSpentSec * 1000) }} tracked</span>
          <button
            v-if="canForward"
            class="inline-flex items-center gap-1 font-medium text-muted hover:text-accent"
            :title="`${forwardsLeft(task)} left`"
            @click="forward"
          >
            <Icon name="forward" :size="12" /> next window
          </button>
        </div>
        <div v-if="open && subtasks.length" class="mt-3 space-y-2">
          <TaskItem v-for="s in subtasks" :key="s.id" :task="s" compact :show-rule="false" @edit="emit('edit', $event)" />
        </div>
      </div>
    </div>
  </div>
</template>
