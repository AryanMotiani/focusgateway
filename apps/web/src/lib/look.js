// The theme for the current mode. Ids come from core, App.vue turns the active theme into
// data-theme-id (and .dark for dark themes) on <html>, style.css does the rest.
import { computed, ref } from 'vue'
import { APPEARANCE, appearanceFor, findTheme } from '@focusgateway/core'
import { store, call, toast } from './store.js'

const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null
export const systemDark = ref(!!media?.matches)
media?.addEventListener?.('change', (e) => (systemDark.value = e.matches))

export const lookMode = computed(() => (store.state?.settings?.uiMode === 'minimal' ? 'minimal' : 'game'))
export const themesFor = (mode) => APPEARANCE[mode === 'minimal' ? 'minimal' : 'game'].themes
/** { theme, night } saved for a mode */
export const lookFor = (mode) => appearanceFor(store.state?.settings, mode)
export const look = computed(() => lookFor(lookMode.value))
/** The theme on screen now: the night theme while the device is dark, if one is set. */
export const activeTheme = computed(() => {
  const l = look.value
  return findTheme(lookMode.value, systemDark.value && l.night ? l.night : l.theme)
})
export const isDark = computed(() => activeTheme.value?.tone === 'dark')

function save(part, mode) {
  return call('settings.update', { patch: { appearance: { [mode]: part } } }).catch((e) => toast(e.message, 'error'))
}
/** Picks the main theme for a mode, live. */
export const setTheme = (id, mode = lookMode.value) => save({ theme: id }, mode)
/** Picks the theme used while the device is in dark mode, or null for none. */
export const setNight = (id, mode = lookMode.value) => save({ night: id }, mode)
