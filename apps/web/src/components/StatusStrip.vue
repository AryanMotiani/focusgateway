<script setup>
// The one strip that sits on top of every screen: level + XP, streak, what is blocked
// right now, the focus timer and the music (with the track name). It ties all pages together.
// bare: inside a study room window (the window draws the glass). glass: its own room glass.
// Both use the theme's room colours (style.css .room-ui and .room-glass).
import { computed } from 'vue'
import { focusPhase, taskStreak, trackById, trackStyle } from '@focusgateway/core'
import { store, blocks } from '../lib/store.js'
import { progress, isGame } from '../lib/rewards.js'
import { countdown } from '../lib/format.js'
import { lofi, lofiState, playWithSettings, savedTrack } from '../lib/lofi.js'
import Icon from './Icon.vue'

const props = defineProps({ glass: Boolean, bare: Boolean })
const player = lofi()
const p = computed(() => progress.value)
const streak = computed(() => (store.state ? taskStreak(store.state, store.minute) : 0))
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
// what plays, or what will play: the saved track until the music has started once
const track = computed(() => (lofiState.chosen ? trackById(lofiState.track) : savedTrack(store.state?.settings)))
const trackTip = computed(() =>
  playing.value ? `Now playing: ${track.value.name} (${trackStyle(track.value)?.name}). Pause` : `Play ${track.value.name}`,
)
function toggleMusic() {
  return player.playing ? player.stop() : playWithSettings(store.state?.settings)
}
const shell = computed(() =>
  props.bare
    ? 'text-ink'
    : props.glass
      ? 'room-ui room-glass'
      : isGame.value
        ? 'bg-hud text-hud-ink border-2 border-hud-line border-b-4 border-b-black/40'
        : 'card text-ink',
)
const sub = computed(() => (props.glass || props.bare ? 'text-muted' : isGame.value ? 'text-hud-muted' : 'text-muted'))
</script>

<template>
  <div v-if="p" class="flex flex-wrap items-center gap-x-4 gap-y-2" :class="[shell, !bare && 'rounded-2xl px-3 py-2.5 sm:px-4']">
    <RouterLink to="/stats?tab=badges" class="flex min-w-48 flex-1 items-center gap-3 sm:min-w-56" :title="`${p.xp} XP total`">
      <span
        class="num grid h-9 min-w-9 shrink-0 place-items-center rounded-xl px-2 text-sm"
        :class="isGame && !glass ? 'bg-accent text-on-accent shadow-[inset_0_-3px_0_var(--fg-accent-deep)]' : 'bg-accent-soft text-accent'"
        >{{ isGame ? 'LV ' : '' }}{{ p.level }}</span
      >
      <span class="min-w-0 flex-1">
        <span class="hud-label flex justify-between gap-2" :class="sub"
          ><span>{{ p.title }}</span
          ><span class="num whitespace-nowrap">{{ p.into }} / {{ p.needed }} XP</span></span
        >
        <span class="xpbar mt-1 block"><i :style="{ width: Math.max(3, p.progress * 100) + '%' }" /></span>
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
      class="flex h-8 max-w-56 min-w-8 items-center gap-2 rounded-full transition"
      :class="[
        glass || bare ? 'bg-sunk hover:bg-line' : isGame ? 'bg-white/10 hover:bg-white/20' : 'bg-sunk hover:bg-line',
        'justify-center px-2 lg:justify-start lg:pr-3.5',
      ]"
      :aria-label="playing ? `Pause music, now playing ${track.name}` : `Play lofi music, ${track.name}`"
      :title="trackTip"
      data-status-music
      @click="toggleMusic"
    >
      <Icon :name="playing ? 'pause' : 'music'" :size="15" />
      <span class="truncate text-xs font-semibold max-lg:hidden">{{ track.name }}</span>
    </button>
  </div>
</template>
