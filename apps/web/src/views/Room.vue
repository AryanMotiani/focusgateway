<script setup>
// Home. An illustrated study room (components/room/StudyRoom.vue) with the focus timer in a
// compact card on the left and the drawer on the right, so the room stays in view.
// Scenes, decor and music styles unlock with your level (packages/core/src/unlocks.js).
// Keys: Space play, F full screen, C customize, D decorate, Z hide panels, T H B S drawer.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { UNLOCKS, isUnlocked } from '@focusgateway/core'
import { store, call } from '../lib/store.js'
import { lofi, lofiState, playWithSettings } from '../lib/lofi.js'
import { progress } from '../lib/rewards.js'
import StudyRoom from '../components/room/StudyRoom.vue'
import DecoratePanel from '../components/room/DecoratePanel.vue'
import RoomClock from '../components/room/RoomClock.vue'
import RoomDrawer from '../components/RoomDrawer.vue'
import StatusStrip from '../components/StatusStrip.vue'
import FocusCard from '../components/FocusCard.vue'
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
const wide = computed(() => width.value >= 1280)
const drawer = reactive({ open: recall('focusgateway:room-drawer', window.innerWidth >= 1024), tab: 'tasks' })
watch(
  () => drawer.open,
  (v) => remember('focusgateway:room-drawer', v),
)
const custom = ref(false)
const decorating = ref(false)
const decorTab = ref('items')
const hidden = ref(recall('focusgateway:room-hidden', false))
watch(hidden, (v) => remember('focusgateway:room-hidden', v))
const note = ref('')
try {
  note.value = localStorage.getItem('focusgateway:room-note') || ''
} catch {}

const scenes = UNLOCKS.filter((u) => u.kind === 'scene')
const styles = UNLOCKS.filter((u) => u.kind === 'music')
const unlockedCount = computed(() => UNLOCKS.filter((u) => has(u.id)).length)

const AMBI = [
  { key: 'rain', label: 'Rain', icon: 'rain' },
  { key: 'cafe', label: 'Café', icon: 'coffee' },
  { key: 'fire', label: 'Fire', icon: 'flame' },
  { key: 'noise', label: 'Brown noise', icon: 'wave' },
]
const NAV = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/tasks', label: 'Tasks', icon: 'list' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/blocking', label: 'Blocking', icon: 'shield' },
  { to: '/habits', label: 'Habits', icon: 'target' },
  { to: '/stats', label: 'Accountability', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

async function toggle() {
  if (player.playing) return player.stop()
  await playWithSettings({ lofi: { volume: ui.volume, mix: { ...ui.mix }, style: ui.style } })
  player.setMusic(ui.music)
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
watch(
  () => ({ ...ui.mix }),
  (m) => player.setMix(m),
  { deep: true },
)

let saveT = null
watch(
  () => [ui.volume, ui.scene, ui.style, { ...ui.mix }],
  () => {
    if (!store.state) return
    clearTimeout(saveT)
    saveT = setTimeout(() => {
      const lofiPatch = { volume: ui.volume, scene: ui.scene, style: ui.style, mix: { ...ui.mix } }
      call('settings.update', { patch: { lofi: lofiPatch } }).catch(() => {})
    }, 800)
  },
  { deep: true },
)
watch(note, (v) => {
  try {
    localStorage.setItem('focusgateway:room-note', v)
  } catch {}
})

const roomEl = ref(null)
const startDrag = (id, e) => roomEl.value?.startDrag(id, e)
function decorate(tab) {
  if (!onboarded.value) return
  if (typeof tab === 'string') decorTab.value = tab
  decorating.value = typeof tab === 'string' ? true : !decorating.value
  custom.value = false
}

// on phones the room scrolls sideways: start with the desk in the middle
const scroller = ref(null)
const heroH = computed(() => {
  if (!narrow.value) return 0
  const vh = window.innerHeight
  return Math.round(hidden.value ? vh - 96 : decorating.value ? Math.min(vh * 0.44, 380) : Math.min(vh * 0.5, 440))
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
function onKey(e) {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
  if (e.code === 'Space' && !e.target.closest('button, a')) {
    e.preventDefault()
    toggle()
  }
  const k = e.key.toLowerCase()
  if (k === 'f') fullscreen()
  if (k === 'c') custom.value = !custom.value
  if (k === 'd') decorate()
  if (k === 'z') hidden.value = !hidden.value
  if (e.key === 'Escape') {
    if (decorating.value) decorating.value = false
    else if (custom.value) custom.value = false
    else if (hidden.value) hidden.value = false
  }
}
const onResize = () => (width.value = window.innerWidth)
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
const glass = 'rounded-3xl border border-white/10 bg-[#15121f]/85 backdrop-blur-xl'
const pill = 'rounded-full bg-[#15121f]/75 backdrop-blur hover:bg-[#120f24]/75'
const chipOn = 'rounded-full bg-white text-[#120f24]'
</script>

<template>
  <div class="relative overflow-hidden bg-[#0b0918] text-white" :class="narrow ? 'min-h-[100dvh]' : 'h-[100dvh]'">
    <!-- the room: full screen on desktop, a sideways scrolling picture on phones -->
    <StudyRoom
      v-if="!narrow"
      ref="roomEl"
      class="absolute inset-x-0 top-0 transition-[bottom] duration-300"
      :class="decorating ? 'bottom-[272px]' : 'bottom-0'"
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
      class="z-20 flex flex-wrap items-center gap-2 p-3 sm:p-5"
      :class="narrow ? 'absolute inset-x-0 top-0' : 'absolute inset-x-0 top-0'"
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
        <StatusStrip v-if="onboarded && wide && panels" glass class="max-w-[620px] flex-1 !py-1.5" />
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
            :class="custom ? chipOn : pill"
            title="Scene and music (C)"
            :aria-pressed="custom"
            @click="custom = !custom"
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

    <!-- scene and music -->
    <section
      v-if="custom && !hidden"
      class="z-30 space-y-4 p-4 sm:p-5"
      :class="[glass, narrow ? 'relative mx-3 mt-3' : 'absolute top-20 right-5 max-h-[calc(100dvh-7rem)] w-[440px] overflow-y-auto']"
      aria-label="Scene and music"
    >
      <div class="flex items-center justify-between">
        <p class="font-bold">
          Scene and music <span class="text-sm font-normal text-white/55">· level {{ level }}</span>
        </p>
        <button class="rounded-full p-1.5 hover:bg-white/10" aria-label="Close" @click="custom = false">
          <Icon name="x" :size="16" />
        </button>
      </div>
      <div>
        <p class="hud-label mb-2 text-xs text-white/55">Out the window</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="sc in scenes"
            :key="sc.id"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition"
            :class="
              ui.scene === sc.id
                ? 'bg-white text-[#120f24]'
                : has(sc.id)
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'cursor-not-allowed bg-white/5 text-white/40'
            "
            :disabled="!has(sc.id)"
            :title="has(sc.id) ? sc.name : `Unlocks at level ${sc.level}`"
            @click="ui.scene = sc.id"
          >
            <Icon v-if="!has(sc.id)" name="lock" :size="12" />{{ sc.name }}<span v-if="!has(sc.id)" class="num">LV {{ sc.level }}</span>
          </button>
        </div>
      </div>
      <div>
        <p class="hud-label mb-2 text-xs text-white/55">Music style</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="st in styles"
            :key="st.id"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition"
            :class="
              ui.style === st.id
                ? 'bg-white text-[#120f24]'
                : has(st.id)
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'cursor-not-allowed bg-white/5 text-white/40'
            "
            :disabled="!has(st.id)"
            :title="has(st.id) ? st.name : `Unlocks at level ${st.level}`"
            @click="ui.style = st.id"
          >
            <Icon :name="has(st.id) ? 'music' : 'lock'" :size="12" />{{ st.name
            }}<span v-if="!has(st.id)" class="num">LV {{ st.level }}</span>
          </button>
        </div>
      </div>
      <div v-if="onboarded" class="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <button
          class="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
          @click="decorate('items')"
        >
          <Icon name="edit" :size="13" /> Decorate the room
        </button>
        <button
          class="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
          @click="decorate('avatar')"
        >
          <Icon name="sparkles" :size="13" /> Change your avatar
        </button>
      </div>
      <p v-else class="text-xs text-white/55">Set up FocusGateway to decorate the room and change your avatar.</p>
    </section>

    <!-- left: time and focus. right: the drawer -->
    <div
      v-if="panels"
      class="z-10 flex flex-col gap-3"
      :class="narrow ? 'relative p-3' : 'absolute bottom-5 left-5 w-[360px] max-h-[calc(100dvh-6rem)] overflow-y-auto'"
    >
      <StatusStrip v-if="onboarded && !wide" glass />
      <div class="p-4" :class="glass">
        <div class="flex items-end justify-between gap-3 whitespace-nowrap">
          <RoomClock />
          <p class="pb-1 text-right text-xs whitespace-normal text-white/60">
            {{ store.state?.focus?.active ? 'Deep in it. Keep going.' : 'Put on some beats.' }}
          </p>
        </div>
        <div v-if="store.state" class="mt-4 border-t border-white/10 pt-4"><FocusCard dark /></div>
        <details class="mt-3 rounded-2xl bg-white/5">
          <summary class="cursor-pointer px-3 py-2 text-xs font-bold text-white/75">Scratchpad</summary>
          <textarea
            v-model="note"
            class="m-2 mt-0 min-h-20 w-[calc(100%-1rem)] rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/30"
            placeholder="Park stray thoughts here so they stop nagging you."
          />
        </details>
      </div>
      <RoomDrawer v-if="onboarded && narrow" v-model:open="drawer.open" v-model:tab="drawer.tab" />
      <div v-if="!onboarded" class="p-4 text-sm" :class="glass">
        <p class="font-bold">This is the study room.</p>
        <p class="mt-1 text-white/70">
          Set up FocusGateway to keep tasks, habits and blocks right here, and to unlock new scenes and decor as you level up.
        </p>
        <RouterLink to="/welcome" class="mt-3 inline-block rounded-full bg-white px-4 py-2 font-bold text-[#120f24]"
          >Set up, it is free</RouterLink
        >
      </div>
      <!-- player -->
      <div class="p-3" :class="glass">
        <div class="flex items-center gap-3">
          <button
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#120f24] transition hover:scale-105"
            :aria-label="lofiState.playing ? 'Pause (space)' : 'Play (space)'"
            @click="toggle"
          >
            <Icon :name="lofiState.playing ? 'pause' : 'play'" :size="18" />
          </button>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ styles.find((s) => s.id === ui.style)?.name || 'Lofi beats' }}</p>
            <label class="flex items-center gap-1.5 text-xs text-white/70"
              ><input v-model="ui.music" type="checkbox" class="accent-white" /> music on</label
            >
          </div>
          <label class="flex items-center gap-1.5 text-xs text-white/70"
            ><Icon name="volume" :size="15" />
            <input v-model.number="ui.volume" type="range" min="0" max="1" step="0.01" class="w-20 accent-white" aria-label="Volume" />
          </label>
        </div>
        <details class="mt-2">
          <summary class="cursor-pointer text-xs font-bold text-white/60">Ambience</summary>
          <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <label v-for="a in AMBI" :key="a.key" class="flex items-center gap-2 text-xs text-white/80">
              <Icon :name="a.icon" :size="14" />
              <input
                v-model.number="ui.mix[a.key]"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full min-w-0 accent-white"
                :aria-label="a.label + ' volume'"
                :title="a.label"
              />
            </label>
          </div>
        </details>
      </div>
      <p class="text-[11px] text-white/45 max-lg:hidden">
        Space play · F full screen · C scene · D decorate · Z hide panels · T H B S drawer
      </p>
    </div>

    <RoomDrawer
      v-if="panels && onboarded && !narrow"
      v-model:open="drawer.open"
      v-model:tab="drawer.tab"
      class="absolute right-5 bottom-5 z-10 w-[380px] max-lg:w-[330px]"
    />

    <!-- decorate: the tray and the avatar editor -->
    <DecoratePanel
      v-if="decorating"
      v-model:tab="decorTab"
      :start-drag="startDrag"
      class="z-20"
      :class="narrow ? 'relative m-3' : 'absolute inset-x-5 bottom-4 h-[252px]'"
      @close="decorating = false"
    />

    <!-- panels hidden: only a small timer and the player -->
    <div
      v-if="hidden"
      class="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#120f24]/60 py-1.5 pr-1.5 pl-4 text-sm font-bold backdrop-blur-xl"
    >
      <RoomClock compact />
      <button
        class="grid h-9 w-9 place-items-center rounded-full bg-white text-[#120f24]"
        :aria-label="lofiState.playing ? 'Pause (space)' : 'Play (space)'"
        @click="toggle"
      >
        <Icon :name="lofiState.playing ? 'pause' : 'play'" :size="15" />
      </button>
      <button
        class="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"
        aria-label="Show panels (Z)"
        title="Show panels (Z)"
        @click="hidden = false"
      >
        <Icon name="eye" :size="16" />
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
</style>
