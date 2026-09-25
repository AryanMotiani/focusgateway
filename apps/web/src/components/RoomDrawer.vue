<script setup>
// The study room's side drawer: tasks, habits, blocks and progress without leaving the room.
// Keys: T H B S switch tabs (and open the drawer), Esc closes. Closed, it is just the tab bar
// (on wide screens a small pill, so it covers little of the room).
// windowed: inside a study room window, which does the folding (minimize) itself. Then the
// tabs always show their content, the keys are passed up as a `key` event, and the content
// fills the window, so a taller window shows more rows.
import { computed, onBeforeUnmount, onMounted } from 'vue'
import TasksPanel from './panels/TasksPanel.vue'
import HabitsPanel from './panels/HabitsPanel.vue'
import BlocksPanel from './panels/BlocksPanel.vue'
import StatsPanel from './panels/StatsPanel.vue'
import Icon from './Icon.vue'

const props = defineProps({ windowed: Boolean, w: { type: Number, default: 380 } })
const emit = defineEmits(['key'])
const tab = defineModel('tab', { type: String, default: 'tasks' })
const open = defineModel('open', { type: Boolean, default: false })
const TABS = [
  { id: 'tasks', label: 'Tasks', icon: 'list', key: 't' },
  { id: 'habits', label: 'Habits', icon: 'target', key: 'h' },
  { id: 'blocks', label: 'Blocks', icon: 'shield', key: 'b' },
  { id: 'stats', label: 'Progress', icon: 'chart', key: 's' },
]
function onKey(e) {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
  if (props.windowed) {
    const t = TABS.find((x) => x.key === e.key.toLowerCase())
    if (t) emit('key', t.id)
    return
  }
  if (e.key === 'Escape' && open.value) return (open.value = false)
  const t = TABS.find((x) => x.key === e.key.toLowerCase())
  if (!t) return
  if (open.value && tab.value === t.id) open.value = false
  else {
    tab.value = t.id
    open.value = true
  }
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
const shown = computed(() => props.windowed || open.value)
</script>

<template>
  <aside
    class="flex flex-col overflow-hidden"
    :class="windowed ? 'h-full' : 'room-ui room-glass rounded-(--fg-room-radius) transition-all'"
    aria-label="Room drawer"
  >
    <div class="flex items-center gap-1" :class="windowed ? 'border-b border-line px-2 py-1.5' : 'p-1.5'" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.id"
        role="tab"
        class="flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold transition"
        :class="[
          'rounded-(--fg-room-btn-radius) font-(family-name:--fg-font-btn)',
          shown && tab === t.id ? 'room-on' : 'room-hover text-muted',
        ]"
        :title="
          windowed
            ? `${t.label} (${t.key.toUpperCase()})`
            : `${t.label} (${t.key.toUpperCase()})${open && tab === t.id ? ', press again to close' : ''}`
        "
        :aria-selected="shown && tab === t.id"
        :data-tab="t.id"
        @click="windowed ? (tab = t.id) : open && tab === t.id ? (open = false) : ((tab = t.id), (open = true))"
      >
        <Icon :name="t.icon" :size="15" /><span :class="windowed ? (w < 360 ? 'sr-only' : '') : 'max-sm:hidden'">{{ t.label }}</span>
      </button>
      <button
        v-if="open && !windowed"
        class="room-hover grid h-8 w-8 shrink-0 place-items-center rounded-(--fg-room-btn-radius) text-muted"
        aria-label="Fold the drawer (Esc)"
        title="Fold the drawer (Esc)"
        @click="open = false"
      >
        <Icon name="chevronDown" :size="16" />
      </button>
    </div>
    <div v-if="shown" class="overflow-y-auto" :class="windowed ? 'min-h-0 flex-1 px-3.5 pt-3 pb-4' : 'max-h-[min(50vh,520px)] p-4 pt-2'">
      <TasksPanel v-if="tab === 'tasks'" />
      <HabitsPanel v-else-if="tab === 'habits'" />
      <BlocksPanel v-else-if="tab === 'blocks'" />
      <StatsPanel v-else />
    </div>
    <p v-else class="px-4 pb-3 text-[11px] text-muted sm:hidden">Tap a tab to peek at tasks, habits, blocks or progress.</p>
  </aside>
</template>
