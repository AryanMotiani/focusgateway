// The theme for the current mode. Ids come from core, App.vue turns the active theme into
// data-theme-id (and .dark for dark themes) on <html>, style.css does the rest.
// Before there is any saved state (the approval screen, a moment on the public room) the
// choice lives in localStorage as a "guest look" and moves into settings once state exists.
import { computed, ref, watch } from 'vue'
import { APPEARANCE, appearanceFor, findTheme, mergeAppearance } from '@focusgateway/core'
import { store, call, toast } from './store.js'

const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null
export const systemDark = ref(!!media?.matches)
media?.addEventListener?.('change', (e) => (systemDark.value = e.matches))

const GUEST_KEY = 'focusgateway:look'
function readGuest() {
  try {
    const g = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null')
    return g && typeof g === 'object' ? g : null
  } catch {
    return null
  }
}
const guest = ref(readGuest())
function saveGuest(next) {
  guest.value = next
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(next))
  } catch {}
}
// state showed up (approved, or loaded): carry the guest look into settings, once
watch(
  () => !!store.state,
  (has) => {
    const g = guest.value
    if (!has || !g) return
    guest.value = null
    try {
      localStorage.removeItem(GUEST_KEY)
    } catch {}
    const patch = {}
    if (g.uiMode) patch.uiMode = g.uiMode
    if (g.appearance) patch.appearance = g.appearance
    if (Object.keys(patch).length) call('settings.update', { patch }).catch(() => {})
  },
  { immediate: true },
)

/** The settings the look reads: saved state, or the guest look before there is any. */
const settings = computed(() => store.state?.settings ?? guest.value ?? {})

export const lookMode = computed(() => (settings.value.uiMode === 'minimal' ? 'minimal' : 'game'))
export const themesFor = (mode) => APPEARANCE[mode === 'minimal' ? 'minimal' : 'game'].themes
/** { theme, night } saved for a mode */
export const lookFor = (mode) => appearanceFor(settings.value, mode)
export const look = computed(() => lookFor(lookMode.value))
/** The theme on screen now: the night theme while the device is dark, if one is set. */
export const activeTheme = computed(() => {
  const l = look.value
  return findTheme(lookMode.value, systemDark.value && l.night ? l.night : l.theme)
})
export const isDark = computed(() => activeTheme.value?.tone === 'dark')

function save(part, mode) {
  if (!store.state) {
    const r = mergeAppearance(guest.value?.appearance, { [mode]: part })
    if (!r.error) saveGuest({ ...guest.value, appearance: r.value })
    return Promise.resolve()
  }
  return call('settings.update', { patch: { appearance: { [mode]: part } } }).catch((e) => toast(e.message, 'error'))
}
/** Picks the main theme for a mode, live. */
export const setTheme = (id, mode = lookMode.value) => save({ theme: id }, mode)
/** Picks the theme used while the device is in dark mode, or null for none. */
export const setNight = (id, mode = lookMode.value) => save({ night: id }, mode)
/** Game or Calm, live. */
export function setLookMode(mode) {
  const uiMode = mode === 'minimal' ? 'minimal' : 'game'
  if (!store.state) {
    saveGuest({ ...guest.value, uiMode })
    return Promise.resolve()
  }
  return call('settings.update', { patch: { uiMode } }).catch((e) => toast(e.message, 'error'))
}
