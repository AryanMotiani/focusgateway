import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createBackend } from '../src/backend.js'
import { migrate, defaultState } from '../src/state.js'
import {
  APPEARANCE,
  DEFAULT_APPEARANCE,
  LEGACY_PALETTES,
  activeTheme,
  appearanceFor,
  legacyAppearance,
  mergeAppearance,
} from '../src/appearance.js'

function backend() {
  let saved = null
  const storage = {
    load: async () => (saved ? structuredClone(saved) : null),
    save: async (s) => {
      saved = structuredClone(s)
    },
  }
  return createBackend({ storage, now: () => new Date(2026, 8, 21, 9).getTime(), hashIterations: 1000 })
}

describe('theme catalog', () => {
  it('has unique ids, both tones, distinct fonts and defaults that exist', () => {
    const allIds = []
    for (const mode of ['game', 'minimal']) {
      const themes = APPEARANCE[mode].themes
      expect(themes.length).toBeGreaterThanOrEqual(3)
      allIds.push(...themes.map((t) => t.id))
      expect(new Set(themes.map((t) => t.tone))).toEqual(new Set(['light', 'dark']))
      // every theme has its own heading and its own body typeface within the mode
      expect(new Set(themes.map((t) => t.heading.name)).size).toBe(themes.length)
      expect(new Set(themes.map((t) => t.body.name)).size).toBe(themes.length)
      for (const t of themes) {
        expect(t.heading.name).not.toBe(t.body.name)
        expect(t.swatch.length).toBeGreaterThanOrEqual(6)
      }
      expect(themes.map((t) => t.id)).toContain(DEFAULT_APPEARANCE[mode].theme)
      for (const pair of Object.values(LEGACY_PALETTES[mode])) {
        const [light, dark] = pair.map((id) => themes.find((t) => t.id === id))
        expect(light.tone).toBe('light')
        expect(dark.tone).toBe('dark')
      }
    }
    // ids are unique across modes too, so [data-theme-id] in CSS never collides
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('falls back to defaults for missing or unknown ids and drops a night theme equal to the day one', () => {
    expect(appearanceFor({}, 'game')).toEqual(DEFAULT_APPEARANCE.game)
    expect(appearanceFor({ appearance: { minimal: { theme: 'nordic', night: 'nope' } } }, 'minimal')).toEqual({
      theme: 'nordic',
      night: null,
    })
    expect(appearanceFor({ appearance: { game: { theme: 'arcade', night: 'arcade' } } }, 'game')).toEqual({ theme: 'arcade', night: null })
    // a Calm theme is not a Game theme
    expect(appearanceFor({ appearance: { game: { theme: 'paper' } } }, 'game').theme).toBe('sunny')
  })

  it('uses the night theme only when the device is dark', () => {
    const settings = { appearance: { game: { theme: 'sunny', night: 'night-owl' } } }
    expect(activeTheme(settings, 'game', false).id).toBe('sunny')
    expect(activeTheme(settings, 'game', true).id).toBe('night-owl')
    expect(activeTheme({ appearance: { game: { theme: 'sunny', night: null } } }, 'game', true).id).toBe('sunny')
  })

  it('merges per mode and names the bad id', () => {
    const r = mergeAppearance(DEFAULT_APPEARANCE, { game: { theme: 'arcade' } })
    expect(r.value.game).toEqual({ theme: 'arcade', night: null })
    expect(r.value.minimal).toEqual(DEFAULT_APPEARANCE.minimal)
    const n = mergeAppearance(r.value, { minimal: { night: 'midnight' } })
    expect(n.value.minimal).toEqual({ theme: 'paper', night: 'midnight' })
    expect(mergeAppearance(n.value, { minimal: { night: null } }).value.minimal.night).toBe(null)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { game: { theme: 'studio' } }).error).toMatch(/studio/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { retro: {} }).error).toMatch(/retro/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { game: { palette: 'grape' } }).error).toMatch(/palette/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, 'arcade').error).toBeTruthy()
  })
})

describe('migrating the old palette look', () => {
  it('maps each old palette to its closest light and dark theme', () => {
    expect(legacyAppearance({ palette: 'arcade' }, 'game', 'dark')).toEqual({ theme: 'arcade', night: null })
    expect(legacyAppearance({ palette: 'forest' }, 'game', 'light')).toEqual({ theme: 'storybook', night: null })
    expect(legacyAppearance({ palette: 'sand' }, 'minimal', 'system')).toEqual({ theme: 'paper', night: 'studio' })
    expect(legacyAppearance({ palette: 'nope' }, 'minimal', 'dark')).toEqual({ theme: 'midnight', night: null })
  })

  it('carries system, light and dark into themes and removes the old switch', () => {
    const old = defaultState()
    old.settings.theme = 'system'
    old.settings.appearance = {
      game: { palette: 'grape', heading: 'nunito', body: 'nunito' },
      minimal: { palette: 'slate', heading: 'geist', body: 'geist' },
    }
    const m = migrate(old)
    expect(m.settings.appearance).toEqual({
      game: { theme: 'sunny', night: 'night-owl' },
      minimal: { theme: 'nordic', night: 'studio' },
    })
    expect('theme' in m.settings).toBe(false)

    old.settings.theme = 'dark'
    expect(migrate(old).settings.appearance).toEqual({
      game: { theme: 'night-owl', night: null },
      minimal: { theme: 'studio', night: null },
    })
    old.settings.theme = 'light'
    expect(migrate(old).settings.appearance.minimal).toEqual({ theme: 'nordic', night: null })
  })

  it('handles saves from before appearance existed and is stable once migrated', () => {
    const older = defaultState()
    delete older.settings.appearance
    older.settings.theme = 'dark'
    expect(migrate(older).settings.appearance).toEqual({
      game: { theme: 'night-owl', night: null },
      minimal: { theme: 'midnight', night: null },
    })
    const fresh = migrate(null)
    expect(fresh.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    const picked = migrate({ ...fresh, settings: { ...fresh.settings, appearance: { game: { theme: 'arcade', night: null } } } })
    expect(picked.settings.appearance.game).toEqual({ theme: 'arcade', night: null })
    expect(migrate(picked).settings.appearance).toEqual(picked.settings.appearance)
  })
})

describe('settings.update appearance', () => {
  it('starts with defaults and keeps the other mode when one mode changes', async () => {
    const be = backend()
    const { state } = await be.dispatch('state.get')
    expect(state.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    await be.dispatch('settings.update', { patch: { appearance: { minimal: { theme: 'midnight' } } } })
    await be.dispatch('settings.update', { patch: { appearance: { game: { night: 'arcade' } } } })
    const after = (await be.dispatch('state.get')).state.settings.appearance
    expect(after.minimal).toEqual({ theme: 'midnight', night: null })
    expect(after.game).toEqual({ theme: 'sunny', night: 'arcade' })
  })

  it('rejects unknown ids with VALIDATION and changes nothing', async () => {
    const be = backend()
    await expect(
      be.dispatch('settings.update', { patch: { sounds: false, appearance: { game: { theme: 'comic-sans' } } } }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
    const { state } = await be.dispatch('state.get')
    expect(state.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    expect(state.settings.sounds).toBe(true)
  })
})

// WCAG contrast of every theme, read straight from the stylesheet the app ships
const css = readFileSync(new URL('../../../apps/web/src/style.css', import.meta.url), 'utf8')
function tokens(id) {
  const m = css.match(new RegExp(`\\[data-theme-id='${id}'\\]\\s*\\{([^}]*)\\}`))
  if (!m) throw new Error(`no block for ${id}`)
  return Object.fromEntries([...m[1].matchAll(/--fg-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((x) => [x[1], x[2].toLowerCase()]))
}
const lum = (hex) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
// [text, background, minimum]
const PAIRS = [
  ...['paper', 'card', 'sunk'].flatMap((bg) => [
    ['ink', bg, 4.5],
    ['muted', bg, 4.5],
    ['accent', bg, 4.5],
  ]),
  ['on-accent', 'accent', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['warm', 'warm-soft', 4.5],
  ['warm', 'card', 3],
  ['good', 'good-soft', 4.5],
  ['good', 'card', 3],
  ['caution', 'caution-soft', 4.5],
  ['bad', 'bad-soft', 4.5],
  ['bad', 'card', 3],
  ['on-good', 'good', 3],
  ['on-bad', 'bad', 4.5],
  ['hud-ink', 'hud', 4.5],
  ['hud-muted', 'hud', 4.5],
  ['xp', 'card', 3],
  ['xpbar', 'sunk', 3],
  // inside the game HUD the same roles use their HUD colours
  ['hud-xp', 'hud', 3],
  ['hud-warm', 'hud', 3],
  ['hud-accent', 'hud', 3],
  ['hud-on-accent', 'hud-accent', 4.5],
  ['hud-good', 'hud', 3],
  ['hud-bad', 'hud', 3],
  ['hud-xpbar', 'hud-line', 3],
  ['heat-3', 'heat-0', 3],
  ['rar-low', 'card', 3],
  ['rar-medium', 'card', 3],
  ['rar-high', 'card', 3],
]

describe('theme contrast', () => {
  for (const t of [...APPEARANCE.game.themes, ...APPEARANCE.minimal.themes]) {
    it(`${t.name} meets WCAG AA`, () => {
      const v = tokens(t.id)
      const fails = PAIRS.filter(([a, b, min]) => {
        if (!v[a] || !v[b]) throw new Error(`${t.id} is missing --fg-${v[a] ? b : a}`)
        return contrast(v[a], v[b]) < min
      }).map(([a, b, min]) => `${a} on ${b}: ${contrast(v[a], v[b]).toFixed(2)} < ${min}`)
      expect(fails).toEqual([])
    })
  }
})
