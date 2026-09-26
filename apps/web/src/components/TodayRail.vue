<script setup>
// Right-hand rail on wide screens: what is due today and today's habits, on every page.
import { ref } from 'vue'
import TasksPanel from './panels/TasksPanel.vue'
import HabitsPanel from './panels/HabitsPanel.vue'
import Icon from './Icon.vue'
let saved = true
try {
  saved = localStorage.getItem('regimen:rail') !== '0'
} catch {}
const open = ref(saved)
function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem('regimen:rail', open.value ? '1' : '0')
  } catch {}
}
</script>

<template>
  <aside class="sticky top-0 hidden h-screen shrink-0 border-l border-line xl:block" :class="open ? 'w-80' : 'w-12'">
    <button
      class="absolute top-5 -left-3.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
      :aria-label="open ? 'Hide today rail' : 'Show today rail'"
      @click="toggle"
    >
      <Icon :name="open ? 'chevronRight' : 'chevronLeft'" :size="14" />
    </button>
    <div v-if="open" class="h-full space-y-6 overflow-y-auto px-5 py-6">
      <section>
        <h2 class="h-display mb-3 text-lg">Today</h2>
        <TasksPanel today-only :limit="8" />
      </section>
      <section>
        <h2 class="h-display mb-3 text-lg">Habits</h2>
        <HabitsPanel />
      </section>
    </div>
    <div v-else class="flex flex-col items-center gap-4 pt-16 text-muted"><Icon name="list" /><Icon name="target" /></div>
  </aside>
</template>
