<script setup>
// A small screenshot of the app drawn in one theme, in the light or dark variant on screen
// now: its own typefaces, colours, corners and texture. The card scopes the theme and the
// variant itself (data-theme-id, .dark), so it never depends on the theme that is active.
import Icon from '../Icon.vue'
import { isDark } from '../../lib/look.js'

defineProps({
  theme: { type: Object, required: true },
  mode: { type: String, default: 'game' },
  selected: Boolean,
  compact: Boolean,
})
defineEmits(['pick'])
const HEAT = [0, 2, 1, 3, 3, 2, 0, 3, 1, 3, 2, 3, 3, 1]
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="selected"
    :aria-label="`${theme.name} theme`"
    class="group relative block w-full min-w-0 rounded-2xl p-1 text-left transition"
    :class="selected ? 'bg-accent' : 'bg-transparent hover:bg-line'"
    @click="$emit('pick', theme.id)"
  >
    <div
      class="theme-scope overflow-hidden rounded-xl border border-black/10"
      :data-theme-id="theme.id"
      :data-mode="mode"
      :class="isDark && 'dark'"
    >
      <div class="space-y-2.5 p-3" :class="compact ? 'sm:p-2.5' : 'sm:p-4'">
        <div v-if="mode === 'game'" class="flex items-center gap-2 rounded-xl border-2 border-hud-line bg-hud px-2.5 py-1.5 text-hud-ink">
          <span class="num grid h-7 min-w-7 place-items-center rounded-lg bg-accent px-1.5 text-xs text-on-accent">LV 7</span>
          <span class="min-w-0 flex-1">
            <span class="hud-label flex justify-between gap-2 text-hud-muted"><span>Scholar</span><span class="num">340 XP</span></span>
            <span class="xpbar mt-1 block"><i style="width: 64%" /></span>
          </span>
          <span class="flex items-center gap-0.5 text-xs font-bold text-warm"
            ><Icon name="flame" :size="13" /><span class="num">6</span></span
          >
        </div>
        <div v-else class="flex items-center justify-between gap-2">
          <span class="hud-label text-muted">Today</span>
          <span class="num text-xs text-accent">Level 7</span>
        </div>

        <p class="h-display truncate leading-none" :class="compact ? 'text-xl' : 'text-[1.7rem]'">{{ theme.name }}</p>

        <div class="card relative flex items-center gap-2 overflow-hidden py-2 pr-2.5" :class="mode === 'game' ? 'pl-3.5' : 'pl-2.5'">
          <span v-if="mode === 'game'" class="rar-high absolute inset-y-0 left-0 w-1.5 bg-(--rar)" aria-hidden="true" />
          <span class="grid h-4 w-4 shrink-0 place-items-center rounded-md border-2 border-good bg-good text-on-good"
            ><Icon name="check" :size="10"
          /></span>
          <span class="min-w-0 flex-1 truncate text-sm">Problem set 3</span>
          <span v-if="mode === 'game'" class="num shrink-0 text-[11px] text-xp">+20 XP</span>
          <span v-else class="chip shrink-0">School</span>
        </div>

        <div v-if="!compact" class="flex flex-wrap items-center gap-1.5">
          <span v-if="mode === 'game'" class="chip">School</span>
          <span class="chip !bg-warm-soft !text-warm"><Icon name="flame" :size="11" /> 6 days</span>
          <span class="chip !bg-good-soft !text-good">Done 2/3</span>
          <span class="ml-auto flex gap-[3px]" aria-hidden="true">
            <i v-for="(h, i) in HEAT" :key="i" class="block h-2.5 w-2.5 rounded-[3px]" :style="{ background: `var(--fg-heat-${h})` }" />
          </span>
        </div>
        <div v-if="mode === 'minimal' && !compact" class="xpbar"><i style="width: 64%" /></div>

        <div class="flex gap-2">
          <span class="btn btn-primary btn-sm flex-1">Start focus</span>
          <span v-if="!compact" class="btn btn-sm">Later</span>
        </div>
        <p v-if="!compact" class="truncate text-[11px] text-muted">{{ theme.heading.name }} and {{ theme.body.name }}</p>
      </div>
    </div>
    <span
      v-if="selected"
      class="absolute -top-2.5 -right-2.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent ring-4 ring-paper"
      aria-hidden="true"
      ><Icon name="check" :size="13"
    /></span>
  </button>
</template>
