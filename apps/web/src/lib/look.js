// The look: Game or Calm, the theme for that mode, and light or dark for every theme.
// Ids come from core. App.vue turns the active theme into data-theme-id on <html> and the
// variant into .dark, style.css does the rest.
// Before there is any saved state (the approval screen, a moment on the public room) the
// choice lives in localStorage as a "guest look" and moves into settings once state exists.
import { computed, ref, watch } from 'vue'
import { APPEARANCE, APPEARANCE_MODES, appearanceFor, colorModeOf, findTheme, mergeAppearance, variantOf } from '@focusgateway/core'
import { store, call, toast } from './store.js'

// only read for the Auto colour mode, light and dark ignore the device
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
    // only the parts the current settings understand (older guest looks had a night theme)
    if (g.appearance) patch.appearance = Object.fromEntries(APPEARANCE_MODES.map((m) => [m, appearanceFor(g, m)]))
    if (g.colorMode) patch.colorMode = colorModeOf(g)
    if (Object.keys(patch).length) call('settings.update', { patch }).catch(() => {})
  },
  { immediate: true },
)

/** The settings the look reads: saved state, or the guest look before there is any. */
const settings = computed(() => store.state?.settings ?? guest.value ?? {})

export const lookMode = computed(() => (settings.value.uiMode === 'minimal' ? 'minimal' : 'game'))
export const themesFor = (mode) => APPEARANCE[mode === 'minimal' ? 'minimal' : 'game'].themes
/** { theme } saved for a mode */
export const lookFor = (mode) => appearanceFor(settings.value, mode)
export const look = computed(() => lookFor(lookMode.value))
export const activeTheme = computed(() => findTheme(lookMode.value, look.value.theme))
/** 'light' | 'dark' | 'auto', as saved. Light unless the user picks otherwise. */
export const colorMode = computed(() => colorModeOf(settings.value))
/** 'light' | 'dark': the variant on screen now (auto follows the device) */
export const variant = computed(() => variantOf(colorMode.value, systemDark.value))
export const isDark = computed(() => variant.value === 'dark')

function save(part, mode) {
  if (!store.state) {
    const r = mergeAppearance(guest.value?.appearance, { [mode]: part })
    if (!r.error) saveGuest({ ...guest.value, appearance: r.value })
    return Promise.resolve()
  }
  return call('settings.update', { patch: { appearance: { [mode]: part } } }).catch((e) => toast(e.message, 'error'))
}
/** Picks the theme for a mode, live. */
export const setTheme = (id, mode = lookMode.value) => save({ theme: id }, mode)
/** Light, dark or auto for every theme, live. */
export function setColorMode(next) {
  const m = colorModeOf({ colorMode: next })
  if (!store.state) {
    saveGuest({ ...guest.value, colorMode: m })
    return Promise.resolve()
  }
  return call('settings.update', { patch: { colorMode: m } }).catch((e) => toast(e.message, 'error'))
}
/** The one click switch: flips what is on screen now, so Auto becomes a fixed choice. */
export const toggleDark = () => setColorMode(isDark.value ? 'light' : 'dark')
/** Game or Calm, live. */
export function setLookMode(mode) {
  const uiMode = mode === 'minimal' ? 'minimal' : 'game'
  if (!store.state) {
    saveGuest({ ...guest.value, uiMode })
    return Promise.resolve()
  }
  return call('settings.update', { patch: { uiMode } }).catch((e) => toast(e.message, 'error'))
}
