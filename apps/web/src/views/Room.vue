<script setup>
// Home. An illustrated study room (components/room/StudyRoom.vue) with every panel in its own
// window: focus, music, planner (tasks, habits, blocks, progress), status, scratchpad and
// scene. Drag a window by its title bar, resize it from any edge or corner, minimize it to
// the dock or maximize it. The layout is saved per device size (lib/windows.js).
// On phones the windows stack in a column under the room, and can collapse or go full screen.
// Scenes, decor and music styles unlock with your level (packages/core/src/unlocks.js).
// Keys: Space play, F full screen, C scene, D decorate, N scratchpad, Z hide panels,
// T H B S planner tabs, Esc restores a maximized window.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { UNLOCKS, isUnlocked, isTrackUnlocked, trackById } from '@focusgateway/core'
import { store, call } from '../lib/store.js'
import { lofi, lofiState, playWithSettings, savedTrack } from '../lib/lofi.js'
import { createWindows } from '../lib/windows.js'
import { progress } from '../lib/rewards.js'
import StudyRoom from '../components/room/StudyRoom.vue'
import DecoratePanel from '../components/room/DecoratePanel.vue'
import RoomClock from '../components/room/RoomClock.vue'
import RoomWindow from '../components/room/RoomWindow.vue'
import RoomDock from '../components/room/RoomDock.vue'
import RoomIcon from '../components/room/RoomIcon.vue'
import FocusPanel from '../components/room/panels/FocusPanel.vue'
import PlayerPanel from '../components/room/panels/PlayerPanel.vue'
import NotesPanel from '../components/room/panels/NotesPanel.vue'
import ScenePanel from '../components/room/panels/ScenePanel.vue'
import RoomDrawer from '../components/RoomDrawer.vue'
import StatusStrip from '../components/StatusStrip.vue'
import Icon from '../components/Icon.vue'
import logo from '../assets/logo.svg'

const player = lofi()
const saved = store.state?.settings?.lofi || {}
const LEGACY = { night: 'scene-night', sunset: 'scene-sunset', morning: 'scene-morning' }
const level = computed(() => progress.value?.level || 1)
const has = (id) => isUnlocked(id, level.value)
const onboarded = computed(() => !!store.state?.onboarding?.completed)

const ui = reactive({
  music: true,
  volume: saved.volume ?? 0.6,
  scene: LEGACY[saved.scene] || saved.scene || 'scene-night',
  style: saved.style || 'music-classic',
  mix: { rain: 0.5, cafe: 0, fire: 0, noise: 0, ...(saved.mix || {}) },
})
// never show something that is not unlocked (for example after importing old data)
if (!has(ui.scene)) ui.scene = 'scene-night'
if (!has(ui.style)) ui.style = 'music-classic'

// only tracks of unlocked styles play, and the saved track shows before anything plays
player.setUnlockCheck((id) => isTrackUnlocked(id, level.value))
if (!player.playing) player.setTrack(savedTrack({ lofi: { ...saved, style: ui.style } }).id)

function recall(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
function remember(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {}
}

const width = ref(window.innerWidth)
const narrow = computed(() => width.value < 768)
const drawerTab = ref(recall('focusgateway:room-drawer-tab', 'tasks'))
watch(drawerTab, (v) => remember('focusgateway:room-drawer-tab', v))
const decorating = ref(false)
const decorTab = ref('items')
const hidden = ref(recall('focusgateway:room-hidden', false))
watch(hidden, (v) => remember('focusgateway:room-hidden', v))

const unlockedCount = computed(() => UNLOCKS.filter((u) => has(u.id)).length)
const NAV = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/tasks', label: 'Tasks', icon: 'list' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/blocking', label: 'Blocking', icon: 'shield' },
  { to: '/habits', label: 'Habits', icon: 'target' },
  { to: '/stats', label: 'Accountability', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

// --- windows ---
const ALL_WINDOWS = [
  { id: 'status', title: 'Status', icon: 'pulse', min: [300, 84], max: [1200, 220], onboarded: true },
  { id: 'focus', title: 'Focus', icon: 'clock', min: [250, 150], max: [1100, 1000] },
  { id: 'player', title: 'Music', icon: 'headphones', min: [270, 176], max: [800, 1100] },
  { id: 'drawer', title: 'Planner', icon: 'list', min: [280, 200], max: [1100, 1600], onboarded: true },
  { id: 'notes', title: 'Scratchpad', icon: 'notes', min: [220, 140], max: [1000, 1000] },
  { id: 'scene', title: 'Scene and music', icon: 'sparkles', min: [300, 220], max: [680, 1000] },
  { id: 'welcome', title: 'Welcome', icon: 'home', min: [260, 150], max: [560, 420], onboarded: false },
]
const WINDOWS = ALL_WINDOWS.filter((w) => w.onboarded === undefined || w.onboarded === onboarded.value)
const M = 16 // room margin
const GAP = 8
/** The default layout: focus and music on the left, planner on the right, status up top. */
function layout(vw, vh) {
  if (vw < 768) return { notes: { min: true }, scene: { min: true } }
  const wide = vw >= 1180
  const big = vw >= 1600 && vh >= 960
  const lw = big ? 400 : 360 // the left column
  const pH = big ? 300 : 184
  // on narrower screens the dock would sit on the bottom windows, so they stay above it
  const bottom = vh - (vw >= 1180 ? M : 64)
  const player = { x: M, y: bottom - pH, w: lw, h: pH }
  let status
  if (wide) {
    // in the gap between the logo and pages on the left and the buttons on the right
    const x0 = 444
    const x1 = vw - 356
    const w = Math.min(660, x1 - x0)
    status = { x: Math.round(x0 + (x1 - x0 - w) / 2), y: 12, w, h: 90 }
  } else status = { x: M, y: 76, w: Math.min(760, vw - 2 * M), h: 90 }
  const top = wide ? 80 : status.y + status.h + GAP
  const fH = Math.max(200, Math.min(onboarded.value ? 380 : 190, player.y - GAP - top))
  const focus = { x: M, y: player.y - GAP - fH, w: lw, h: fH }
  const dW = vw >= 1600 ? 420 : wide ? 400 : Math.min(380, vw - lw - 2 * M - GAP)
  const dH = Math.min(vh >= 1000 ? 660 : 560, bottom - top)
  const drawer = { x: vw - M - dW, y: bottom - dH, w: dW, h: dH }
  return {
    status,
    focus,
    player,
    drawer,
    welcome: { x: M, y: focus.y - GAP - 170, w: lw, h: 170 },
    notes: { x: vw - M - 320, y: Math.max(top, drawer.y - GAP - 230), w: 320, h: 230, min: true },
    scene: { x: vw - M - 460, y: top, w: 460, h: 480, min: true },
  }
}
const ctl = createWindows({
  specs: Object.fromEntries(WINDOWS.map((w) => [w.id, { min: w.min, max: w.max }])),
  layout,
  area: (vw, vh) => ({ l: 12, t: 12, r: vw - 12, b: vh - 12 }),
  // a maximized window leaves the header and the dock free
  maxArea: (vw, vh) => ({ l: 12, t: 76, r: vw - 12, b: vh - 66 }),
  storageKey: `focusgateway:room-layout:${onboarded.value ? 'v1' : 'guest'}`,
})
// on phones a maximized window covers the whole screen, header and dock included
const phoneFull = computed(() => narrow.value && WINDOWS.some((w) => ctl.wm.wins[w.id]?.max && !ctl.wm.wins[w.id]?.min))
const winOpen = (id) => ctl.wm.wins[id] && !ctl.wm.wins[id].min
function resetLayout() {
  ctl.reset()
}

// --- sound ---
async function toggle() {
  if (player.playing) return player.stop()
  await playWithSettings({ lofi: { volume: ui.volume, mix: { ...ui.mix }, style: ui.style, track: lofiState.track } })
  player.setMusic(ui.music)
}
function choose(t) {
  if (!isTrackUnlocked(t.id, level.value)) return
  player.setTrack(t.id)
  ui.style = t.style
  if (!lofiState.playing) toggle()
}
function setStyle(id) {
  if (has(id)) ui.style = id
}
watch(
  () => ui.volume,
  (v) => player.setVolume(v),
)
watch(
  () => ui.music,
  (v) => player.setMusic(v),
)
watch(
  () => ui.style,
  (v) => player.setStyle(v),
)
// the radio moves on by itself: keep the style in step
watch(
  () => lofiState.track,
  () => {
    if (lofiState.style !== ui.style && has(lofiState.style)) ui.style = lofiState.style
  },
)
watch(
  () => ({ ...ui.mix }),
  (m) => player.setMix(m),
  { deep: true },
)

let saveT = null
watch(
  () => [ui.volume, ui.scene, ui.style, lofiState.track, { ...ui.mix }],
  () => {
    if (!store.state) return
    clearTimeout(saveT)
    saveT = setTimeout(() => {
      const lofiPatch = { volume: ui.volume, scene: ui.scene, style: ui.style, mix: { ...ui.mix } }
      const t = trackById(lofiState.track)
      if (t && t.style === ui.style && isTrackUnlocked(t.id, level.value)) lofiPatch.track = t.id
      call('settings.update', { patch: { lofi: lofiPatch } }).catch(() => {})
    }, 800)
  },
  { deep: true },
)

const roomEl = ref(null)
const startDrag = (id, e) => roomEl.value?.startDrag(id, e)
function decorate(tab) {
  if (!onboarded.value) return
  if (typeof tab === 'string') decorTab.value = tab
  decorating.value = typeof tab === 'string' ? true : !decorating.value
}

// on phones the room scrolls sideways: start with the desk in the middle
const scroller = ref(null)
const heroH = computed(() => {
  if (!narrow.value) return 0
  const vh = window.innerHeight
  return Math.round(hidden.value ? vh - 96 : decorating.value ? Math.min(vh * 0.44, 380) : Math.min(vh * 0.42, 380))
})
function centerRoom() {
  const s = scroller.value
  if (s) s.scrollLeft = (s.scrollWidth * 840) / 1600 - s.clientWidth / 2
}
watch([narrow, heroH], () => nextTick(centerRoom))

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen?.()
}
// T H B S from the planner: show that tab, or minimize the planner when it already shows it
function plannerKey(tab) {
  const w = ctl.wm.wins.drawer
  if (!w) return
  if (!w.min && drawerTab.value === tab && (narrow.value || w.z === ctl.wm.top - 1)) return ctl.minimize('drawer')
  drawerTab.value = tab
  ctl.restore('drawer')
}
function onKey(e) {
  if (e.key === 'Escape') {
    if (decorating.value) decorating.value = false
    else if (panels.value && ctl.unmaximizeTop()) e.preventDefault()
    else if (hidden.value) hidden.value = false
    return
  }
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
  if (e.code === 'Space' && !e.target.closest('button, a, [tabindex]')) {
    e.preventDefault()
    toggle()
  }
  const k = e.key.toLowerCase()
  if (k === 'f') fullscreen()
  if (k === 'c') ctl.toggleMin('scene')
  if (k === 'n') ctl.toggleMin('notes')
  if (k === 'd') decorate()
  if (k === 'z') hidden.value = !hidden.value
}
const onResize = () => {
  width.value = window.innerWidth
  ctl.setViewport(window.innerWidth, window.innerHeight)
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
  nextTick(centerRoom)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
})

const panels = computed(() => !hidden.value && !decorating.value)
const HINT = 'Space play · F full screen · C scene · D decorate · N scratchpad · Z hide panels · T H B S planner · Esc restore'
const track = computed(() => trackById(lofiState.track))
const pill = 'rounded-full bg-[#15121f]/75 backdrop-blur hover:bg-[#120f24]/75'
const chipOn = 'rounded-full bg-white text-[#120f24]'
</script>

<template>
  <div class="relative bg-[#0b0918] text-white" :class="narrow ? 'min-h-[100dvh]' : 'h-[100dvh] overflow-hidden'">
    <!-- the room: full screen on desktop, a sideways scrolling picture on phones -->
    <StudyRoom
      v-if="!narrow"
      ref="roomEl"
      class="absolute inset-x-0 top-0 transition-[bottom] duration-300"
      :class="decorating ? (decorTab === 'avatar' || decorTab === 'room' ? 'bottom-[326px]' : 'bottom-[272px]') : 'bottom-0'"
      :scene="ui.scene"
      :rain="ui.mix.rain"
      :fit="decorating ? 'contain' : 'cover'"
      :editable="decorating"
    />
    <div v-else ref="scroller" data-room-scroll class="room-scroll overflow-x-auto overflow-y-hidden" :style="{ height: heroH + 'px' }">
      <StudyRoom
        ref="roomEl"
        :style="{ width: Math.round((heroH * 16) / 9) + 'px', height: heroH + 'px' }"
        :scene="ui.scene"
        :rain="ui.mix.rain"
        :editable="decorating"
      />
    </div>

    <header
      class="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-2 p-3 sm:p-5 [&>*]:pointer-events-auto"
    >
      <template v-if="!hidden">
        <RouterLink :to="onboarded ? '/today' : '/home'" class="flex items-center gap-2 py-1.5 pr-4 pl-1.5 text-sm font-bold" :class="pill">
          <img :src="logo" alt="" class="h-7 w-7" /> <span class="max-lg:hidden">FocusGateway</span>
        </RouterLink>
        <nav v-if="onboarded" class="flex items-center gap-0.5 p-1 max-sm:hidden" :class="pill" aria-label="Pages">
          <RouterLink
            v-for="n in NAV"
            :key="n.to"
            :to="n.to"
            class="grid h-8 w-8 place-items-center rounded-full text-white/75 hover:bg-white/15 hover:text-white"
            :title="n.label"
            :aria-label="n.label"
          >
            <Icon :name="n.icon" :size="16" />
          </RouterLink>
        </nav>
        <div class="ml-auto flex items-center gap-1.5">
          <button
            v-if="onboarded"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
            :class="decorating ? chipOn : pill"
            title="Decorate the room and your avatar (D)"
            :aria-pressed="decorating"
            @click="decorate()"
          >
            <Icon name="edit" :size="15" /> Decorate
          </button>
          <button
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
            :class="winOpen('scene') && panels ? chipOn : pill"
            title="Scene and music (C)"
            :aria-pressed="winOpen('scene')"
            @click="decorating ? ((decorating = false), ctl.restore('scene')) : ctl.toggleMin('scene')"
          >
            <Icon name="sparkles" :size="15" /> <span class="max-sm:hidden">Scene</span>
            <span class="num opacity-60 max-sm:hidden">{{ unlockedCount }}/{{ UNLOCKS.length }}</span>
          </button>
          <button class="p-2" :class="pill" aria-label="Hide panels (Z)" title="Hide panels (Z)" @click="hidden = true">
            <Icon name="eyeOff" :size="16" />
          </button>
          <button class="p-2 max-sm:hidden" :class="pill" aria-label="Full screen (F)" title="Full screen (F)" @click="fullscreen">
            <Icon name="maximize" :size="16" />
          </button>
        </div>
      </template>
    </header>

    <!-- the windows -->
    <div
      v-if="panels"
      data-room-windows
      :class="
        narrow ? ['relative flex flex-col gap-3 p-3 pb-24', phoneFull ? 'z-50' : 'z-10'] : 'pointer-events-none absolute inset-0 z-10'
      "
    >
      <RoomWindow v-if="onboarded" id="status" title="Status" icon="pulse" :ctl="ctl" :stacked="narrow">
        <StatusStrip bare />
      </RoomWindow>
      <RoomWindow v-if="!onboarded" id="welcome" title="Welcome" icon="home" :ctl="ctl" :stacked="narrow">
        <p class="font-bold">This is the study room.</p>
        <p class="mt-1 text-sm text-white/70">
          Set up FocusGateway to keep tasks, habits and blocks right here, and to unlock new scenes and decor as you level up.
        </p>
        <RouterLink to="/welcome" class="mt-3 inline-block rounded-full bg-white px-4 py-2 text-sm font-bold text-[#120f24]"
          >Set up, it is free</RouterLink
        >
      </RoomWindow>
      <RoomWindow id="focus" title="Focus" icon="clock" :ctl="ctl" :stacked="narrow">
        <template #default="s"><FocusPanel :w="s.w" :h="s.h" :max="s.max" /></template>
      </RoomWindow>
      <RoomWindow id="player" title="Music" icon="headphones" :ctl="ctl" :stacked="narrow">
        <template #default="s">
          <PlayerPanel :w="s.w" :h="s.h" :max="s.max" :ui="ui" :level="level" @toggle="toggle" @choose="choose" />
        </template>
      </RoomWindow>
      <RoomWindow v-if="onboarded" id="drawer" title="Planner" icon="list" :ctl="ctl" :stacked="narrow" :pad="false">
        <template #default="s">
          <RoomDrawer v-model:tab="drawerTab" windowed :w="s.w" @key="plannerKey" />
        </template>
      </RoomWindow>
      <RoomWindow id="notes" title="Scratchpad" icon="notes" :ctl="ctl" :stacked="narrow">
        <NotesPanel />
      </RoomWindow>
      <RoomWindow id="scene" title="Scene and music" icon="sparkles" :ctl="ctl" :stacked="narrow">
        <ScenePanel
          :ui="ui"
          :level="level"
          :onboarded="onboarded"
          @scene="(id) => has(id) && (ui.scene = id)"
          @style="setStyle"
          @decorate="decorate"
        />
      </RoomWindow>

      <!-- snap guides while dragging -->
      <template v-if="!narrow">
        <i v-if="ctl.wm.guides.x != null" class="guide guide-x" :style="{ left: ctl.wm.guides.x + 'px' }" />
        <i v-if="ctl.wm.guides.y != null" class="guide guide-y" :style="{ top: ctl.wm.guides.y + 'px' }" />
      </template>
    </div>

    <RoomDock
      v-if="panels && (!narrow || (!phoneFull && WINDOWS.some((w) => ctl.wm.wins[w.id]?.min)))"
      :ctl="ctl"
      :items="WINDOWS"
      :stacked="narrow"
      :hint="HINT"
      :class="narrow ? 'fixed inset-x-3 bottom-3 z-40' : 'absolute bottom-3 left-1/2 z-[15] -translate-x-1/2'"
      @reset="resetLayout"
    />

    <!-- decorate: the tray and the avatar editor -->
    <DecoratePanel
      v-if="decorating"
      v-model:tab="decorTab"
      :start-drag="startDrag"
      class="z-20"
      :class="
        narrow ? 'relative m-3' : ['absolute inset-x-5 bottom-4', decorTab === 'avatar' || decorTab === 'room' ? 'h-[306px]' : 'h-[252px]']
      "
      @close="decorating = false"
    />

    <!-- panels hidden: only a small timer and the player -->
    <div
      v-if="hidden"
      class="fixed bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#120f24]/60 py-1.5 pr-1.5 pl-4 text-sm font-bold backdrop-blur-xl"
    >
      <RoomClock compact />
      <span
        v-if="track"
        class="max-w-44 truncate text-xs font-semibold text-white/60 max-sm:hidden"
        :title="`Now playing: ${track.name}`"
        >{{ track.name }}</span
      >
      <button
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#120f24]"
        :aria-label="lofiState.playing ? 'Pause (space)' : 'Play (space)'"
        @click="toggle"
      >
        <Icon :name="lofiState.playing ? 'pause' : 'play'" :size="15" />
      </button>
      <button
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
        aria-label="Show panels (Z)"
        title="Show panels (Z)"
        @click="hidden = false"
      >
        <RoomIcon name="eye" :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.room-scroll {
  scrollbar-width: none;
}
.room-scroll::-webkit-scrollbar {
  display: none;
}
.guide {
  position: absolute;
  z-index: 2000;
  pointer-events: none;
  background: color-mix(in srgb, var(--fg-accent) 70%, transparent);
}
.guide-x {
  top: 0;
  bottom: 0;
  width: 1px;
}
.guide-y {
  left: 0;
  right: 0;
  height: 1px;
}
</style>
