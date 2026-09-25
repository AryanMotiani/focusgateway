<script setup>
// Home. A calm room with a window: focus timer in the middle, everything else in the drawer.
// Scenes, sill objects and music styles unlock with your level (packages/core/src/unlocks.js).
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { UNLOCKS, isUnlocked } from '@focusgateway/core'
import { store, call } from '../lib/store.js'
import { lofi, lofiState, playWithSettings } from '../lib/lofi.js'
import { progress } from '../lib/rewards.js'
import RoomScene from '../components/RoomScene.vue'
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

const ui = reactive({
  music: true,
  volume: saved.volume ?? 0.6,
  scene: LEGACY[saved.scene] || saved.scene || 'scene-night',
  style: saved.style || 'music-classic',
  objects: saved.objects !== false,
  mix: { rain: 0.5, cafe: 0, fire: 0, noise: 0, ...(saved.mix || {}) },
})
// never show something that is not unlocked (for example after importing old data)
if (!has(ui.scene)) ui.scene = 'scene-night'
if (!has(ui.style)) ui.style = 'music-classic'

const drawer = reactive({ open: window.innerWidth >= 1024, tab: 'tasks' })
const custom = ref(false)
const note = ref('')
const pulse = ref(0)
try {
  note.value = localStorage.getItem('focusgateway:room-note') || ''
} catch {}

const scenes = UNLOCKS.filter((u) => u.kind === 'scene')
const styles = UNLOCKS.filter((u) => u.kind === 'music')
const objects = UNLOCKS.filter((u) => u.kind === 'object')
const shownObjects = computed(() => (ui.objects ? objects.filter((o) => has(o.id)).map((o) => o.id) : []))
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
  () => [ui.volume, ui.scene, ui.style, ui.objects, { ...ui.mix }],
  () => {
    if (!store.state) return
    clearTimeout(saveT)
    saveT = setTimeout(() => {
      const lofiPatch = { volume: ui.volume, scene: ui.scene, style: ui.style, objects: ui.objects, mix: { ...ui.mix } }
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

const off = player.onBeat(({ step }) => {
  pulse.value = step === 0 ? 1 : 0.4
  setTimeout(() => (pulse.value = 0), 180)
})
onBeforeUnmount(off)

const clock = computed(() => new Date(store.now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen?.()
}
function onKey(e) {
  if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
  if (e.code === 'Space') {
    e.preventDefault()
    toggle()
  }
  if (e.key === 'f') fullscreen()
  if (e.key === 'c') custom.value = !custom.value
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
const glass = 'rounded-3xl border border-white/10 bg-[#120f24]/55 backdrop-blur-xl'
const pill = 'rounded-full bg-black/25 backdrop-blur hover:bg-black/40'
</script>

<template>
  <div class="relative min-h-[100dvh] overflow-hidden bg-[#0b0918] text-white">
    <RoomScene :scene="ui.scene" :rain="ui.mix.rain" :pulse="pulse" :objects="shownObjects" />

    <div class="relative z-10 flex min-h-[100dvh] flex-col gap-4 p-3 sm:p-6 lg:p-8">
      <header class="flex flex-wrap items-center gap-2">
        <RouterLink
          :to="store.state?.onboarding?.completed ? '/today' : '/home'"
          class="flex items-center gap-2 py-1.5 pr-4 pl-1.5 text-sm font-bold"
          :class="pill"
        >
          <img :src="logo" alt="" class="h-7 w-7" /> <span class="max-sm:hidden">FocusGateway</span>
        </RouterLink>
        <nav v-if="store.state?.onboarding?.completed" class="flex items-center gap-0.5 p-1" :class="pill" aria-label="Pages">
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
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
            :class="pill"
            title="Customize the room (C)"
            @click="custom = !custom"
          >
            <Icon name="sparkles" :size="15" /> Room <span class="text-white/55">{{ unlockedCount }}/{{ UNLOCKS.length }}</span>
          </button>
          <button class="p-2" :class="pill" aria-label="Full screen (F)" title="Full screen (F)" @click="fullscreen">
            <Icon name="maximize" :size="16" />
          </button>
        </div>
      </header>

      <StatusStrip v-if="store.state?.onboarding?.completed" glass />

      <div class="grid flex-1 items-start gap-5 lg:grid-cols-[1fr_380px] lg:items-center">
        <section class="max-w-xl">
          <p
            class="font-display text-7xl leading-none tracking-tight sm:text-8xl lg:text-9xl"
            style="text-shadow: 0 4px 40px rgba(0, 0, 0, 0.35)"
          >
            {{ clock }}
          </p>
          <p class="mt-2 text-white/70">
            {{ store.state?.focus?.active ? 'Deep in it. Keep going.' : 'Put on some beats. Start a focus round.' }}
          </p>
          <div class="mt-5 p-5" :class="glass">
            <FocusCard dark />
          </div>
          <details class="mt-3 max-w-xl" :class="glass">
            <summary class="cursor-pointer px-4 py-2.5 text-sm font-bold text-white/80">Scratchpad</summary>
            <textarea
              v-model="note"
              class="m-3 mt-0 min-h-24 w-[calc(100%-1.5rem)] rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/30"
              placeholder="Park stray thoughts here so they stop nagging you."
            />
          </details>
        </section>

        <RoomDrawer v-if="store.state?.onboarding?.completed" v-model:open="drawer.open" v-model:tab="drawer.tab" class="lg:self-center" />
        <div v-else class="p-5 text-sm" :class="glass">
          <p class="font-bold">This is the study room.</p>
          <p class="mt-1 text-white/70">
            Set up FocusGateway to keep tasks, habits and blocks right here, and to unlock new scenes as you level up.
          </p>
          <RouterLink to="/welcome" class="mt-3 inline-block rounded-full bg-white px-4 py-2 font-bold text-[#120f24]"
            >Set up, it is free</RouterLink
          >
        </div>
      </div>

      <!-- customize: scenes, music styles, sill objects -->
      <section v-if="custom" class="space-y-4 p-4 sm:p-5" :class="glass" aria-label="Customize room">
        <div class="flex items-center justify-between">
          <p class="font-bold">
            Your room <span class="text-sm font-normal text-white/55">· level {{ level }}. New things unlock as you level up.</span>
          </p>
          <button class="rounded-full p-1.5 hover:bg-white/10" aria-label="Close" @click="custom = false">
            <Icon name="x" :size="16" />
          </button>
        </div>
        <div>
          <p class="hud-label mb-2 text-xs text-white/55">Scene</p>
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
        <div>
          <div class="mb-2 flex items-center justify-between">
            <p class="hud-label text-xs text-white/55">On the window sill</p>
            <label class="flex items-center gap-1.5 text-xs text-white/70"
              ><input v-model="ui.objects" type="checkbox" class="accent-white" /> show objects</label
            >
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="o in objects"
              :key="o.id"
              class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              :class="has(o.id) ? 'bg-white/10' : 'bg-white/5 text-white/40'"
              :title="has(o.id) ? 'Unlocked' : `Unlocks at level ${o.level}`"
              ><Icon :name="has(o.id) ? 'check' : 'lock'" :size="12" />{{ o.name
              }}<span v-if="!has(o.id)" class="num">LV {{ o.level }}</span></span
            >
          </div>
        </div>
      </section>

      <footer class="flex flex-wrap items-center gap-x-6 gap-y-4 p-4 sm:px-6" :class="glass">
        <div class="flex items-center gap-3">
          <button
            class="grid h-12 w-12 place-items-center rounded-full bg-white text-[#120f24] transition hover:scale-105"
            :aria-label="lofiState.playing ? 'Pause (space)' : 'Play (space)'"
            @click="toggle"
          >
            <Icon :name="lofiState.playing ? 'pause' : 'play'" :size="20" />
          </button>
          <div>
            <p class="text-sm font-semibold">{{ styles.find((s) => s.id === ui.style)?.name || 'Lofi beats' }}</p>
            <label class="flex items-center gap-1.5 text-xs text-white/70"
              ><input v-model="ui.music" type="checkbox" class="accent-white" /> music on</label
            >
          </div>
        </div>
        <label class="flex items-center gap-2 text-xs text-white/70"
          ><Icon name="volume" :size="16" />
          <input v-model.number="ui.volume" type="range" min="0" max="1" step="0.01" class="w-24 accent-white" aria-label="Volume" />
        </label>
        <div class="flex flex-1 flex-wrap gap-x-5 gap-y-2">
          <label v-for="a in AMBI" :key="a.key" class="flex items-center gap-2 text-xs text-white/80">
            <Icon :name="a.icon" :size="15" /> {{ a.label }}
            <input
              v-model.number="ui.mix[a.key]"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="w-20 accent-white"
              :aria-label="a.label + ' volume'"
            />
          </label>
        </div>
        <p class="text-[11px] text-white/50 max-lg:hidden">Space play · F full screen · C customize · T H B S drawer</p>
      </footer>
    </div>
  </div>
</template>
