<script setup>
import { computed, reactive, ref } from 'vue'
import { store, call, attempt } from '../lib/store.js'
import { toLocalInput, fromLocalInput, endOfToday } from '../lib/format.js'
import { updateTask } from '../lib/actions.js'
import Modal from './Modal.vue'
import DayPicker from './DayPicker.vue'

const props = defineProps({ task: Object, parent: Object, defaults: Object })
const emit = defineEmits(['close', 'saved'])
const editing = !!props.task
const parent = computed(() => props.parent || (props.task?.parentId && store.state.tasks.find((t) => t.id === props.task.parentId)))
const src = props.task || {}
const f = reactive({
  title: src.title || '',
  notes: src.notes || '',
  priority: src.priority || parent.value?.priority || 'medium',
  deadline: toLocalInput(src.deadline || parent.value?.deadline || props.defaults?.deadline || endOfToday(store.now)),
  startAt: toLocalInput(src.startAt),
  tags: [...(src.tags || props.defaults?.tags || [])],
  ruleId: src.ruleId ?? props.defaults?.ruleId ?? '',
  repeat: src.recurrence?.type || 'none',
  repeatDays: src.recurrence?.days || [1, 2, 3, 4, 5],
  repeatEvery: src.recurrence?.every || 2,
  recurrenceReset: src.recurrenceReset || 'accumulate',
})
const newTag = ref('')
const gatedRules = computed(() => store.state.rules.filter((r) => r.mode === 'gated'))
const isSub = computed(() => !!parent.value)
const PRIS = [
  ['low', 'Low', '5 forwards'],
  ['medium', 'Medium', '3 forwards'],
  ['high', 'High', '1 forward'],
]

function toggleTag(t) {
  f.tags = f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t]
}
function addTag() {
  const t = newTag.value.trim()
  if (t && !f.tags.includes(t)) f.tags.push(t)
  newTag.value = ''
}
function recurrence() {
  if (f.repeat === 'none') return null
  if (f.repeat === 'weekly') return { type: 'weekly', days: f.repeatDays }
  if (f.repeat === 'interval') return { type: 'interval', every: Number(f.repeatEvery) }
  return { type: 'daily' }
}

async function save() {
  const data = {
    title: f.title,
    notes: f.notes,
    priority: f.priority,
    deadline: fromLocalInput(f.deadline),
    startAt: fromLocalInput(f.startAt),
    tags: f.tags,
  }
  if (!isSub.value) Object.assign(data, { ruleId: f.ruleId || null, recurrence: recurrence(), recurrenceReset: f.recurrenceReset })
  if (!editing) {
    if (isSub.value) data.parentId = parent.value.id
    await attempt(() => call('tasks.create', data), isSub.value ? 'Subtask added' : 'Task added')
  } else {
    const patch = {}
    for (const [k, v] of Object.entries(data)) if (JSON.stringify(v ?? null) !== JSON.stringify(props.task[k] ?? null)) patch[k] = v
    if (!Object.keys(patch).length) return emit('close')
    const r = await updateTask(props.task, patch)
    if (r === undefined) return
  }
  emit('saved')
  emit('close')
}
</script>

<template>
  <Modal :title="editing ? 'Edit task' : isSub ? `Subtask of “${parent.title}”` : 'New task'" wide @close="emit('close')">
    <form class="space-y-4" @submit.prevent="save">
      <div>
        <label class="label" for="t-title">Title</label>
        <input
          id="t-title"
          v-model="f.title"
          class="input text-base"
          placeholder="e.g. Finish physics problem set 3"
          maxlength="200"
          required
        />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="t-deadline">Deadline</label>
          <input id="t-deadline" v-model="f.deadline" type="datetime-local" class="input" required />
          <p v-if="isSub" class="mt-1 text-xs text-muted">Can't be later than the parent. Try an earlier time to set your own order.</p>
        </div>
        <div>
          <span class="label">Priority</span>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="[v, l, hint] in PRIS"
              :key="v"
              type="button"
              class="rounded-xl border px-2 py-1.5 text-sm transition"
              :class="f.priority === v ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line hover:border-accent'"
              :title="hint"
              @click="f.priority = v"
            >
              {{ l }}
            </button>
          </div>
          <p class="mt-1 text-xs text-muted">Higher priority = fewer chances to push it to a later window.</p>
        </div>
      </div>

      <div v-if="!isSub">
        <label class="label" for="t-rule">Unlocks a study window</label>
        <select id="t-rule" v-model="f.ruleId" class="input">
          <option value="">Not attached</option>
          <option v-for="r in gatedRules" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
        <p class="mt-1 text-xs text-muted">Sites in that window stay blocked until every attached task is done.</p>
      </div>

      <div>
        <span class="label">Tags</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="t in [...new Set([...store.state.tags, ...f.tags])]"
            :key="t"
            type="button"
            class="rounded-full border px-3 py-1 text-xs transition"
            :class="f.tags.includes(t) ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line hover:border-accent'"
            @click="toggleTag(t)"
          >
            {{ t }}
          </button>
          <input
            v-model="newTag"
            class="w-28 rounded-full border border-dashed border-line bg-transparent px-3 py-1 text-xs outline-none focus:border-accent"
            placeholder="+ new tag"
            @keydown.enter.prevent="addTag"
            @blur="addTag"
          />
        </div>
      </div>

      <details class="rounded-xl border border-line p-3" :open="!!(f.notes || f.startAt || f.repeat !== 'none')">
        <summary class="cursor-pointer text-sm font-semibold">More options</summary>
        <div class="mt-3 space-y-4">
          <div>
            <label class="label" for="t-notes">Notes</label>
            <textarea id="t-notes" v-model="f.notes" class="input min-h-20" placeholder="Links, details, what done looks like…" />
          </div>
          <div>
            <label class="label" for="t-start">Starts (optional)</label>
            <input id="t-start" v-model="f.startAt" type="datetime-local" class="input" />
          </div>
          <div v-if="!isSub">
            <label class="label" for="t-repeat">Repeat</label>
            <select id="t-repeat" v-model="f.repeat" class="input">
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">On certain weekdays</option>
              <option value="interval">Every few days</option>
            </select>
            <div v-if="f.repeat === 'weekly'" class="mt-2"><DayPicker v-model="f.repeatDays" /></div>
            <div v-if="f.repeat === 'interval'" class="mt-2 flex items-center gap-2 text-sm">
              Every <input v-model="f.repeatEvery" type="number" min="1" max="365" class="input w-20" /> days
            </div>
            <div v-if="f.repeat !== 'none'" class="mt-3">
              <span class="label">Forward count between repeats</span>
              <label class="flex items-start gap-2 text-sm"
                ><input v-model="f.recurrenceReset" type="radio" value="accumulate" class="mt-1" /><span
                  ><b>Keep adding up</b> (default). If you pushed Monday's reading back once, Tuesday's starts with 1 used. Keeps you honest
                  over time.</span
                ></label
              >
              <label class="mt-1 flex items-start gap-2 text-sm"
                ><input v-model="f.recurrenceReset" type="radio" value="cycle" class="mt-1" /><span
                  ><b>Fresh each time.</b> Every repeat starts with all its forwards available.</span
                ></label
              >
            </div>
          </div>
        </div>
      </details>

      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="btn" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-primary">{{ editing ? 'Save' : 'Add task' }}</button>
      </div>
    </form>
  </Modal>
</template>
