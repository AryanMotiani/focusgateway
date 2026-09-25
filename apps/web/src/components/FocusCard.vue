<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { focusPhase } from '@focusgateway/core'
import { store, call, attempt, canBlock } from '../lib/store.js'
import { withConfirm } from '../lib/actions.js'
import { countdown } from '../lib/format.js'
import { lofi } from '../lib/lofi.js'
import SitePicker from './SitePicker.vue'
import Modal from './Modal.vue'
import Icon from './Icon.vue'

// compact: one line (start, or the round and stop), for the study room's folded card
defineProps({ dark: Boolean, compact: Boolean })
const PRESETS = [
  { label: 'Pomodoro', work: 25, brk: 5, n: 4 },
  { label: 'Deep work', work: 50, brk: 10, n: 2 },
  { label: 'Sprint', work: 15, brk: 3, n: 3 },
]
const f = reactive({ work: 25, brk: 5, n: 4 })
const picking = ref(false)
const lastSites = computed(() => store.state.focus.history.at(-1)?.siteIds || store.state.rules.flatMap((r) => r.siteIds))
const siteIds = ref([...new Set(lastSites.value.length ? lastSites.value : ['youtube', 'instagram', 'reddit', 'x-twitter'])])

const active = computed(() => store.state.focus.active)
const phase = computed(() => (active.value ? focusPhase(active.value, store.now) : null))
const phaseLeft = computed(() => (phase.value ? phase.value.phaseEnds - store.now : 0))
const phaseTotal = computed(() => (phase.value ? (phase.value.phase === 'work' ? active.value.workMin : active.value.breakMin) * 60000 : 1))

// chime on phase change
let lastKey = ''
watch(phase, (p) => {
  if (!p) return
  const k = p.iteration + p.phase
  if (lastKey && k !== lastKey && lofi().playing) lofi().chime()
  lastKey = k
})

const start = () =>
  attempt(
    () => call('focus.start', { workMin: f.work, breakMin: f.brk, iterations: f.n, siteIds: siteIds.value }),
    'Focus session started. Sites are blocked.',
  )
const stop = () =>
  withConfirm('focus.stop', {}, 'stop_focus', '', {
    title: 'Stop early?',
    message: 'Stopping early is logged. If it is an emergency, that is OK.',
  })
const siteNames = computed(() => siteIds.value.map((id) => store.state.customSites.find((s) => s.id === id)?.name || id).length)
</script>

<template>
  <div :class="dark ? 'text-white' : ''">
    <template v-if="compact">
      <div v-if="active && phase" class="flex items-center justify-between gap-3 text-xs">
        <p class="font-semibold tracking-wide uppercase" :class="phase.phase === 'work' ? 'text-accent' : 'text-warm'">
          {{ phase.phase === 'work' ? 'Focus' : 'Break' }} · round {{ phase.iteration }} of {{ active.iterations }}
        </p>
        <button class="btn btn-sm" :class="dark && '!bg-white/10 !text-white !border-white/20'" @click="stop">Stop early</button>
      </div>
      <div v-else class="flex items-center gap-3">
        <button class="btn btn-primary" :disabled="!siteIds.length" @click="start"><Icon name="play" :size="14" /> Start focus</button>
        <span class="num text-xs" :class="dark ? 'text-white/60' : 'text-muted'">{{ f.work }} min focus, {{ f.n }} rounds</span>
      </div>
    </template>
    <template v-else-if="active && phase">
      <div class="flex items-center gap-5">
        <div class="relative grid h-28 w-28 shrink-0 place-items-center">
          <svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" :stroke="dark ? 'rgba(255,255,255,.15)' : 'var(--fg-line)'" stroke-width="7" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              :stroke="phase.phase === 'work' ? 'var(--fg-accent)' : 'var(--fg-warm)'"
              stroke-width="7"
              stroke-linecap="round"
              stroke-dasharray="276.5"
              :stroke-dashoffset="276.5 * (phaseLeft / phaseTotal)"
              class="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span class="font-mono text-xl font-semibold">{{ countdown(phaseLeft) }}</span>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-semibold tracking-wide uppercase" :class="phase.phase === 'work' ? 'text-accent' : 'text-warm'">
            {{ phase.phase === 'work' ? 'Focus' : 'Break' }} · round {{ phase.iteration }} of {{ active.iterations }}
          </p>
          <p class="mt-1 text-sm" :class="dark ? 'text-white/70' : 'text-muted'">
            {{ active.siteIds.length }} site{{ active.siteIds.length === 1 ? '' : 's' }} blocked until
            {{ new Date(phase.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}, breaks included.
          </p>
          <button class="btn btn-sm mt-3" :class="dark && '!bg-white/10 !text-white !border-white/20'" @click="stop">Stop early</button>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in PRESETS"
          :key="p.label"
          class="rounded-full border px-3 py-1 text-xs font-medium transition"
          :class="
            f.work === p.work && f.brk === p.brk && f.n === p.n
              ? 'border-accent bg-accent text-on-accent'
              : dark
                ? 'border-white/20 hover:border-white/50'
                : 'border-line hover:border-accent'
          "
          @click="Object.assign(f, { work: p.work, brk: p.brk, n: p.n })"
        >
          {{ p.label }} {{ p.work }}/{{ p.brk }}
        </button>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-2 text-xs" :class="dark ? 'text-white/70' : 'text-muted'">
        <label
          >Focus min<input
            v-model.number="f.work"
            type="number"
            min="1"
            max="240"
            class="input mt-1"
            :class="dark && '!bg-white/10 !text-white !border-white/20'"
        /></label>
        <label
          >Break min<input
            v-model.number="f.brk"
            type="number"
            min="0"
            max="60"
            class="input mt-1"
            :class="dark && '!bg-white/10 !text-white !border-white/20'"
        /></label>
        <label
          >Rounds<input
            v-model.number="f.n"
            type="number"
            min="1"
            max="12"
            class="input mt-1"
            :class="dark && '!bg-white/10 !text-white !border-white/20'"
        /></label>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button class="btn btn-primary" :disabled="!siteIds.length" @click="start"><Icon name="play" :size="14" /> Start focus</button>
        <button class="btn btn-ghost btn-sm" :class="dark && '!text-white/80 hover:!bg-white/10'" @click="picking = true">
          Blocking {{ siteNames }} site{{ siteNames === 1 ? '' : 's' }} · change
        </button>
      </div>
      <p v-if="!canBlock" class="mt-2 text-xs" :class="dark ? 'text-white/60' : 'text-muted'">
        The timer works here. <RouterLink to="/install" class="underline">Install the extension</RouterLink> to actually block sites.
      </p>
    </template>
    <Modal v-if="picking" title="Sites to block while focusing" wide @close="picking = false">
      <SitePicker v-model="siteIds" />
      <div class="mt-4 flex justify-end"><button class="btn btn-primary" @click="picking = false">Done</button></div>
    </Modal>
  </div>
</template>
