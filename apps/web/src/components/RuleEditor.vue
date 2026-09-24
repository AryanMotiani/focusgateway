<script setup>
import { computed, reactive, ref } from 'vue'
import { parseHHMM, formatMinutes } from '@focusgateway/core'
import { store, call, toast } from '../lib/store.js'
import { withPin } from '../lib/actions.js'
import { endOfToday } from '../lib/format.js'
import Modal from './Modal.vue'
import SitePicker from './SitePicker.vue'
import DayPicker from './DayPicker.vue'
import Icon from './Icon.vue'

const props = defineProps({ rule: Object, mode: { type: String, default: 'gated' } })
const emit = defineEmits(['close', 'saved', 'edit-rule'])
const editing = !!props.rule
const r = props.rule || {}
const f = reactive({
  mode: r.mode || props.mode,
  name: r.name || '',
  siteIds: [...(r.siteIds || [])],
  days: [...(r.days || [1, 2, 3, 4, 5])],
  start: formatMinutes(r.start ?? 16 * 60),
  end: formatMinutes(r.end ?? 19 * 60),
  failsafe: r.failsafe !== false,
})
const attach = ref([])
const newTasks = ref([{ title: '', priority: 'medium' }])
const conflict = ref(null)
const error = ref('')
const openTasks = computed(() => store.state.tasks.filter((t) => !t.parentId && t.status !== 'done' && !t.ruleId))
const crossesMidnight = computed(() => (parseHHMM(f.end) ?? 0) <= (parseHHMM(f.start) ?? 0))

async function save() {
  error.value = ''
  conflict.value = null
  const payload = { name: f.name, siteIds: f.siteIds, days: f.days, start: parseHHMM(f.start), end: parseHHMM(f.end), failsafe: f.failsafe }
  try {
    if (!editing) {
      const tasks =
        f.mode === 'gated' ? newTasks.value.filter((t) => t.title.trim()).map((t) => ({ ...t, deadline: endOfToday(store.now) })) : []
      await call('rules.create', { ...payload, mode: f.mode, taskIds: attach.value, newTasks: tasks })
      toast('Rule created. It starts at the next window.', 'success')
    } else {
      const res = await withPin(
        'rules.update',
        { id: r.id, patch: payload },
        { title: 'This rule is active', message: 'Editing a live rule needs your PIN.' },
      )
      if (res === undefined) return
      toast('Rule updated', 'success')
    }
    emit('saved')
    emit('close')
  } catch (e) {
    if (e.code === 'CONFLICT') conflict.value = e
    else error.value = e.message
  }
}
</script>

<template>
  <Modal :title="editing ? 'Edit rule' : 'New blocking rule'" wide @close="emit('close')">
    <form class="space-y-5" @submit.prevent="save">
      <div v-if="!editing" class="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          class="rounded-2xl border p-4 text-left transition"
          :class="f.mode === 'gated' ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent'"
          @click="f.mode = 'gated'"
        >
          <p class="flex items-center gap-2 font-semibold"><Icon name="unlock" :size="16" /> Task-Gated window</p>
          <p class="mt-1 text-sm text-muted">
            Sites stay blocked during the window until your tasks for it are done. Unfinished work keeps them blocked after it ends.
          </p>
        </button>
        <button
          type="button"
          class="rounded-2xl border p-4 text-left transition"
          :class="f.mode === 'hard' ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent'"
          @click="f.mode = 'hard'"
        >
          <p class="flex items-center gap-2 font-semibold"><Icon name="lock" :size="16" /> Hard Block</p>
          <p class="mt-1 text-sm text-muted">
            Sites are blocked for the whole window, no matter what. Good for sleep, classes and exam season.
          </p>
        </button>
      </div>

      <div>
        <label class="label" for="r-name">Name</label>
        <input
          id="r-name"
          v-model="f.name"
          class="input"
          :placeholder="f.mode === 'hard' ? 'e.g. No phone-brain after 11' : 'e.g. Evening study'"
          maxlength="80"
        />
      </div>

      <div>
        <span class="label">Block these sites</span>
        <SitePicker v-model="f.siteIds" />
      </div>

      <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <span class="label">Days</span>
          <DayPicker v-model="f.days" />
        </div>
        <div>
          <span class="label">From / to</span>
          <div class="flex items-center gap-2">
            <input v-model="f.start" type="time" class="input w-32" aria-label="Start time" required />
            <span class="text-muted">to</span>
            <input v-model="f.end" type="time" class="input w-32" aria-label="End time" required />
          </div>
          <p v-if="crossesMidnight" class="mt-1 text-xs text-muted">
            {{ f.start === f.end ? 'Runs a full 24 hours.' : 'Runs past midnight into the next day.' }}
          </p>
        </div>
      </div>

      <div v-if="f.mode === 'hard'" class="rounded-2xl border p-4" :class="f.failsafe ? 'border-line' : 'border-bad bg-bad-soft'">
        <label class="flex cursor-pointer items-start gap-3">
          <input v-model="f.failsafe" type="checkbox" class="mt-1 h-4 w-4 accent-[var(--fg-accent)]" />
          <span>
            <span class="font-semibold">Allow Failsafe override</span>
            <span class="block text-sm text-muted">Emergency exit with your PIN, a forced wait and a typed reason.</span>
          </span>
        </label>
        <div v-if="!f.failsafe" class="mt-3 flex gap-2 text-sm text-bad">
          <Icon name="alert" :size="18" class="mt-0.5" />
          <p>
            <b>No escape hatch.</b> While this window is active there is no way to unlock, edit or delete it. Not with your PIN, not in an
            emergency. You can change this any time the window is not running. At your own risk.
          </p>
        </div>
      </div>

      <div v-if="f.mode === 'gated' && !editing" class="space-y-3">
        <span class="label">Tasks that unlock this window (at least one)</span>
        <div v-for="(t, i) in newTasks" :key="i" class="flex gap-2">
          <input
            v-model="t.title"
            class="input"
            :placeholder="i === 0 ? 'e.g. Revise chapter 5 notes' : 'Another task'"
            @keydown.enter.prevent="newTasks.push({ title: '', priority: 'medium' })"
          />
          <select v-model="t.priority" class="input w-28" aria-label="Priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button type="button" class="btn btn-sm" @click="newTasks.push({ title: '', priority: 'medium' })">
          <Icon name="plus" :size="14" /> Another task
        </button>
        <p class="text-xs text-muted">
          New tasks are due at the end of today. Change deadlines, add subtasks or make them repeat on the Tasks page.
        </p>
        <div v-if="openTasks.length">
          <p class="label mt-3">Or attach existing tasks</p>
          <div class="max-h-40 space-y-1 overflow-y-auto">
            <label v-for="t in openTasks" :key="t.id" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sunk">
              <input v-model="attach" type="checkbox" :value="t.id" /> {{ t.title }}
            </label>
          </div>
        </div>
      </div>

      <div v-if="conflict" class="rounded-xl bg-caution-soft p-3 text-sm">
        <p class="font-semibold text-caution">Overlapping rule</p>
        <p class="mt-1">{{ conflict.message }}</p>
        <button type="button" class="btn btn-sm mt-2" @click="emit('edit-rule', conflict.details.conflictRuleId)">Open that rule</button>
      </div>
      <p v-if="error" class="rounded-xl bg-bad-soft p-3 text-sm text-bad">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-primary" :disabled="!f.siteIds.length || !f.days.length">
          {{ editing ? 'Save rule' : 'Create rule' }}
        </button>
      </div>
    </form>
  </Modal>
</template>
