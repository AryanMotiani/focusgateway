// Palette, heading font and body font for the current mode. The ids come from core,
// App.vue turns them into data attributes on <html>, style.css does the rest.
import { computed, ref } from 'vue'
import { APPEARANCE, appearanceFor } from '@focusgateway/core'
import { store, call, toast } from './store.js'

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const systemDark = ref(!!media?.matches)
media?.addEventListener?.('change', (e) => (systemDark.value = e.matches))

export const lookMode = computed(() => (store.state?.settings?.uiMode === 'minimal' ? 'minimal' : 'game'))
export const isDark = computed(() => {
  const t = store.state?.settings?.theme || 'system'
  return t === 'dark' || (t === 'system' && systemDark.value)
})
export const catalog = computed(() => APPEARANCE[lookMode.value])
export const look = computed(() => appearanceFor(store.state?.settings, lookMode.value))

export const findPalette = (mode, id) => APPEARANCE[mode].palettes.find((p) => p.id === id)
export const findHeading = (mode, id) => APPEARANCE[mode].headings.find((p) => p.id === id)
export const findBody = (mode, id) => APPEARANCE[mode].bodies.find((p) => p.id === id)

/** Applies part of a look ({ palette }, or a whole combo) to one mode, live. */
export function setLook(part, mode = lookMode.value) {
  const { palette, heading, body } = part
  const clean = Object.fromEntries(Object.entries({ palette, heading, body }).filter(([, v]) => v))
  return call('settings.update', { patch: { appearance: { [mode]: clean } } }).catch((e) => toast(e.message, 'error'))
}
