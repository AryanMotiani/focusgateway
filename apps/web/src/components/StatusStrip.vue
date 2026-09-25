<script setup>
// The one strip that sits on top of every screen: level + XP, streak, what is blocked
// right now, the focus timer and the music. It ties all pages together.
import { computed } from 'vue'
import { focusPhase, taskStreak } from '@focusgateway/core'
import { store, blocks } from '../lib/store.js'
import { progress, isGame } from '../lib/rewards.js'
import { countdown } from '../lib/format.js'
import { lofi, lofiState, playWithSettings } from '../lib/lofi.js'
import Icon from './Icon.vue'

const props = defineProps({ glass: Boolean })
const player = lofi()
const p = computed(() => progress.value)
const streak = computed(() => (store.state ? taskStreak(store.state, store.now) : 0))
const focus = computed(() => {
  const f = store.state?.focus?.active
  return f ? focusPhase(f, store.now) : null
})
const firstBlock = computed(() => blocks.value.blocks.find((b) => b.kind !== 'focus'))
const blockText = computed(() => {
  const b = firstBlock.value
  if (!b) return null
  if (b.kind === 'gated')
    return b.pendingTaskIds.length
      ? `${b.name}: ${b.pendingTaskIds.length} quest${b.pendingTaskIds.length === 1 ? '' : 's'} to unlock`
      : `${b.name}: add a task`
  return `${b.name} · ${countdown(b.until - store.now)}`
})
const playing = computed(() => lofiState.playing)
function toggleMusic() {
  return player.playing ? player.stop() : playWithSettings(store.state?.settings)
}
const shell = computed(() =>
  props.glass
    ? 'border border-white/10 bg-[#0f0e18]/55 text-white backdrop-blur-xl'
    : isGame.value
      ? 'bg-hud text-hud-ink border-2 border-hud-line border-b-4 border-b-black/40'
      : 'card text-ink',
)
const sub = computed(() => (props.glass ? 'text-white/60' : isGame.value ? 'text-hud-muted' : 'text-muted'))
</script>

<template>
  <div v-if="p" class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-2.5 sm:px-4" :class="shell">
    <RouterLink to="/stats?tab=badges" class="flex min-w-0 flex-1 items-center gap-3 sm:min-w-56" :title="`${p.xp} XP total`">
      <span
        class="num grid h-9 min-w-9 shrink-0 place-items-center rounded-xl px-2 text-sm"
        :class="isGame && !glass ? 'bg-accent text-on-accent shadow-[inset_0_-3px_0_var(--fg-accent-deep)]' : 'bg-accent-soft text-accent'"
        >{{ isGame ? 'LV ' : '' }}{{ p.level }}</span
      >
      <span class="min-w-0 flex-1">
        <span class="hud-label flex justify-between gap-2" :class="sub"
          ><span>{{ p.title }}</span
          ><span class="num">{{ p.into }} / {{ p.needed }} XP</span></span
        >
        <span class="xpbar mt-1 block" :class="glass && '!bg-white/15'"><i :style="{ width: Math.max(3, p.progress * 100) + '%' }" /></span>
      </span>
    </RouterLink>

    <span class="flex items-center gap-1.5 text-sm font-bold text-warm" :title="`${streak} day streak: every task due finished`">
      <Icon name="flame" :size="16" /><span class="num">{{ streak }}</span
      ><span class="hud-label hidden sm:inline" :class="sub">day streak</span>
    </span>

    <RouterLink v-if="focus" to="/room" class="flex items-center gap-2 text-sm" :title="focus.phase === 'work' ? 'Focus round' : 'Break'">
      <Icon name="target" :size="16" :class="focus.phase === 'work' ? 'text-accent' : 'text-warm'" />
      <span class="num text-base">{{ countdown(focus.phaseEnds - store.now) }}</span>
      <span class="hud-label hidden md:inline" :class="sub">{{ focus.phase === 'work' ? 'focus' : 'break' }} {{ focus.iteration }}</span>
    </RouterLink>

    <RouterLink v-if="blockText" to="/blocking" class="flex min-w-0 items-center gap-1.5 text-sm" :title="blockText">
      <Icon name="lock" :size="15" :class="firstBlock.locked ? 'text-bad' : 'text-accent'" />
      <span class="max-w-52 truncate">{{ blockText }}</span>
      <span v-if="blocks.blocks.length > 1" class="hud-label" :class="sub">+{{ blocks.blocks.length - 1 }}</span>
    </RouterLink>
    <span v-else class="hidden items-center gap-1.5 text-sm sm:flex" :class="sub"><Icon name="unlock" :size="15" /> All clear</span>

    <button
      class="grid h-8 w-8 place-items-center rounded-full transition"
      :class="glass ? 'bg-white/10 hover:bg-white/20' : isGame ? 'bg-white/10 hover:bg-white/20' : 'bg-sunk hover:bg-line'"
      :aria-label="playing ? 'Pause music' : 'Play lofi music'"
      :title="playing ? 'Pause music' : 'Play lofi music'"
      @click="toggleMusic"
    >
      <Icon :name="playing ? 'pause' : 'music'" :size="15" />
    </button>
  </div>
</template>
