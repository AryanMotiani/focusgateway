<script setup>
// The study room's side drawer: tasks, habits, blocks and progress without leaving the room.
// Keys: T H B S switch tabs (and open the drawer), Esc closes.
import { onBeforeUnmount, onMounted } from 'vue'
import TasksPanel from './panels/TasksPanel.vue'
import HabitsPanel from './panels/HabitsPanel.vue'
import BlocksPanel from './panels/BlocksPanel.vue'
import StatsPanel from './panels/StatsPanel.vue'
import Icon from './Icon.vue'

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
</script>

<template>
  <aside
    class="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#120f24]/60 text-white backdrop-blur-xl transition-all"
    aria-label="Room drawer"
  >
    <div class="flex items-center gap-1 p-1.5">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-xs font-bold transition"
        :class="open && tab === t.id ? 'bg-white text-[#120f24]' : 'text-white/70 hover:bg-white/10 hover:text-white'"
        :title="`${t.label} (${t.key.toUpperCase()})`"
        :aria-pressed="open && tab === t.id"
        @click="open && tab === t.id ? (open = false) : ((tab = t.id), (open = true))"
      >
        <Icon :name="t.icon" :size="15" /><span class="max-sm:hidden">{{ t.label }}</span>
      </button>
    </div>
    <div v-if="open" class="max-h-[min(50vh,520px)] overflow-y-auto p-4 pt-2">
      <TasksPanel v-if="tab === 'tasks'" dark />
      <HabitsPanel v-else-if="tab === 'habits'" dark />
      <BlocksPanel v-else-if="tab === 'blocks'" dark />
      <StatsPanel v-else dark />
    </div>
    <p v-else class="px-4 pb-3 text-[11px] text-white/45">
      <span class="sm:hidden">Tap a tab to peek at tasks, habits, blocks or progress.</span
      ><span class="max-sm:hidden">Press T, H, B or S to peek without leaving the room.</span>
    </p>
  </aside>
</template>
