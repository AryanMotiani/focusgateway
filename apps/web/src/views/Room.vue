<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { startOfDay, addDays } from '@focusgateway/core'
import { store, call, attempt } from '../lib/store.js'
import { lofi } from '../lib/lofi.js'
import RoomScene from '../components/RoomScene.vue'
import FocusCard from '../components/FocusCard.vue'
import Icon from '../components/Icon.vue'
import logo from '../assets/logo.svg'

const player = lofi()
const saved = store.state?.settings?.lofi || {}
const ui = reactive({
  playing: player.playing,
  music: true,
  volume: saved.volume ?? 0.6,
  scene: saved.scene && ['night', 'sunset', 'morning'].includes(saved.scene) ? saved.scene : 'night',
  mix: { rain: 0.5, cafe: 0, fire: 0, noise: 0, ...(saved.mix || {}) },
})
const showTasks = ref(window.innerWidth > 1024)
const pulse = ref(0)
const note = ref('')
try {
  note.value = localStorage.getItem('focusgateway:room-note') || ''
} catch {}

const AMBI = [
  { key: 'rain', label: 'Rain', icon: 'rain' },
  { key: 'cafe', label: 'Café', icon: 'coffee' },
  { key: 'fire', label: 'Fire', icon: 'flame' },
  { key: 'noise', label: 'Brown noise', icon: 'wave' },
]
const SCENES = [
  ['night', 'Night'],
  ['sunset', 'Sunset'],
  ['morning', 'Morning'],
]

async function toggle() {
  if (player.playing) await player.stop()
  else {
    player.setVolume(ui.volume)
    player.setMix(ui.mix)
    player.setMusic(ui.music)
    await player.start()
  }
  ui.playing = player.playing
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
  () => ({ ...ui.mix }),
  (m) => player.setMix(m),
  { deep: true },
)

let saveT = null
watch(
  () => [ui.volume, ui.scene, { ...ui.mix }],
  () => {
    clearTimeout(saveT)
    saveT = setTimeout(
      () => call('settings.update', { patch: { lofi: { volume: ui.volume, scene: ui.scene, mix: { ...ui.mix } } } }).catch(() => {}),
      800,
    )
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
const tasks = computed(() => {
  const end = addDays(startOfDay(store.now), 1)
  return (store.state?.tasks || [])
    .filter((t) => !t.parentId && t.status !== 'done' && t.deadline < addDays(end, 1))
    .sort((a, b) => a.deadline - b.deadline)
    .slice(0, 8)
})
function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen?.()
}
function onKey(e) {
  if (e.target.closest('input, textarea')) return
  if (e.code === 'Space') {
    e.preventDefault()
    toggle()
  }
  if (e.key === 'f') fullscreen()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
const glass = 'rounded-3xl border border-white/10 bg-[#120f24]/55 backdrop-blur-xl'
</script>

<template>
  <div class="relative min-h-[100dvh] overflow-hidden bg-[#0b0918] text-white">
    <RoomScene :scene="ui.scene" :rain="ui.mix.rain" :pulse="pulse" />

    <div class="relative z-10 flex min-h-[100dvh] flex-col p-4 sm:p-8">
      <header class="flex items-center justify-between gap-3">
        <RouterLink
          to="/"
          class="flex items-center gap-2 rounded-full bg-black/25 py-1.5 pr-4 pl-1.5 text-sm font-medium backdrop-blur hover:bg-black/40"
        >
          <img :src="logo" alt="" class="h-7 w-7" /> FocusGateway
        </RouterLink>
        <div class="flex items-center gap-1.5">
          <div class="flex rounded-full bg-black/25 p-1 backdrop-blur">
            <button
              v-for="[k, l] in SCENES"
              :key="k"
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="ui.scene === k ? 'bg-white/90 text-[#120f24]' : 'text-white/75'"
              @click="ui.scene = k"
            >
              {{ l }}
            </button>
          </div>
          <button
            class="rounded-full bg-black/25 p-2 backdrop-blur hover:bg-black/40"
            aria-label="Full screen (F)"
            title="Full screen (F)"
            @click="fullscreen"
          >
            <Icon name="maximize" :size="16" />
          </button>
        </div>
      </header>

      <div class="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[1fr_340px]">
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
          <div class="mt-6 p-5" :class="glass">
            <FocusCard dark />
          </div>
        </section>

        <aside class="space-y-3 self-start lg:self-center">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
            :class="glass"
            @click="showTasks = !showTasks"
          >
            <span>Up next · {{ tasks.length }}</span
            ><Icon :name="showTasks ? 'x' : 'list'" :size="16" />
          </button>
          <div v-if="showTasks" class="space-y-3 p-4" :class="glass">
            <button
              v-for="t in tasks"
              :key="t.id"
              class="flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/10"
              @click="attempt(() => call('tasks.complete', { id: t.id }), 'Done. Nice.')"
            >
              <span class="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-white/50" />
              <span>{{ t.title }}</span>
            </button>
            <p v-if="!tasks.length" class="text-sm text-white/60">Nothing due soon. Enjoy the calm.</p>
            <textarea
              v-model="note"
              class="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/30"
              placeholder="Scratchpad: park stray thoughts here so they stop nagging you."
            />
          </div>
        </aside>
      </div>

      <footer class="flex flex-wrap items-center gap-x-6 gap-y-4 p-4 sm:px-6" :class="glass">
        <div class="flex items-center gap-3">
          <button
            class="grid h-12 w-12 place-items-center rounded-full bg-white text-[#120f24] transition hover:scale-105"
            :aria-label="ui.playing ? 'Pause (space)' : 'Play (space)'"
            @click="toggle"
          >
            <Icon :name="ui.playing ? 'pause' : 'play'" :size="20" />
          </button>
          <div>
            <p class="text-sm font-semibold">Lofi beats</p>
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
        <p class="text-[11px] text-white/50 max-sm:hidden">Space: play/pause · F: full screen</p>
      </footer>
    </div>
  </div>
</template>
