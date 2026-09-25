<script setup>
// GitHub / HabitKit style year grid. Columns are weeks, rows are Mon..Sun.
import { computed } from 'vue'
const props = defineProps({
  grid: Object, // { weeks: [[cell|null x7]], months: [{index, month}] }
  color: { type: String, default: 'var(--fg-accent)' },
  label: { type: String, default: 'done' },
})
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const cols = computed(() => props.grid.weeks.length)
const MIX = [0, 35, 65, 100]
function style(c) {
  if (!c) return { background: 'transparent' }
  if (!c.due && !c.done) return { background: 'var(--fg-heat-0)', opacity: 0.45 }
  if (!c.level) return { background: 'var(--fg-heat-0)' }
  return { background: `color-mix(in srgb, ${props.color} ${MIX[c.level]}%, var(--fg-heat-0))` }
}
function title(c) {
  if (!c) return ''
  const d = new Date(c.ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  if (!c.total) return `${d}: nothing due`
  return `${d}: ${c.done}/${c.total} ${props.label}`
}
</script>

<template>
  <div class="min-w-0">
    <div class="grid gap-[3px]" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }">
      <span
        v-for="m in grid.months"
        :key="m.index"
        class="hud-label truncate text-[10px] text-muted"
        :style="{ gridColumn: `${m.index + 1} / span 4`, gridRow: 1 }"
        >{{ MONTHS[m.month] }}</span
      >
      <template v-for="(col, w) in grid.weeks" :key="w">
        <span
          v-for="(c, d) in col"
          :key="d"
          class="aspect-square rounded-[3px] game:rounded-[4px]"
          :style="{ ...style(c), gridColumn: w + 1, gridRow: d + 2 }"
          :title="title(c)"
        />
      </template>
    </div>
    <div class="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
      less
      <span v-for="l in [0, 1, 2, 3]" :key="l" class="h-2.5 w-2.5 rounded-[3px]" :style="style({ level: l, due: true })" />
      more
    </div>
  </div>
</template>
