<script setup>
// One box per task, one column per day. Filled = done on time, striped = late,
// crossed = missed, outline = still open. Colour edge shows priority.
const props = defineProps({ days: Array })
const STATE = { done: 'Done on time', late: 'Done late', missed: 'Missed', open: 'Still open' }
const RAR = { low: 'var(--fg-rar-low, #38a8f5)', medium: 'var(--fg-rar-medium, #9a7bff)', high: 'var(--fg-rar-high, #f2a900)' }
const dow = (ts) => new Date(ts).toLocaleDateString([], { weekday: 'narrow' })
const full = (ts) => new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
function boxStyle(b) {
  const c = RAR[b.priority] || RAR.medium
  if (b.state === 'done') return { background: 'var(--fg-good)', boxShadow: `inset 0 -3px 0 ${c}` }
  if (b.state === 'late')
    return {
      background:
        'repeating-linear-gradient(135deg, var(--fg-caution) 0 3px, color-mix(in srgb, var(--fg-caution) 45%, transparent) 3px 6px)',
    }
  if (b.state === 'missed') return { background: 'color-mix(in srgb, var(--fg-bad) 22%, transparent)', border: '1.5px solid var(--fg-bad)' }
  return { border: `1.5px dashed ${c}` }
}
</script>

<template>
  <div>
    <div class="flex items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2">
      <div v-for="d in props.days" :key="d.date" class="flex min-w-5 flex-1 flex-col items-center gap-1" :title="full(d.ts)">
        <div class="flex min-h-24 flex-col-reverse gap-1">
          <span
            v-for="b in d.boxes.slice(0, 10)"
            :key="b.id"
            class="grid h-4 w-4 place-items-center rounded-[4px] text-[9px] leading-none font-black text-bad sm:h-5 sm:w-5"
            :style="boxStyle(b)"
            :title="`${b.title}: ${STATE[b.state]}`"
            >{{ b.state === 'missed' ? '×' : '' }}</span
          >
          <span v-if="d.boxes.length > 10" class="text-center text-[9px] text-muted">+{{ d.boxes.length - 10 }}</span>
        </div>
        <span class="hud-label text-[10px] text-muted">{{ dow(d.ts) }}</span>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
      <span v-for="(l, k) in STATE" :key="k" class="flex items-center gap-1.5"
        ><span class="h-3 w-3 rounded-[3px]" :style="boxStyle({ state: k, priority: 'medium' })" />{{ l }}</span
      >
    </div>
  </div>
</template>
