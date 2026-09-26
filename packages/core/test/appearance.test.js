import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createBackend } from '../src/backend.js'
import { migrate, defaultState } from '../src/state.js'
import {
  APPEARANCE,
  COLOR_MODES,
  DARK_BEFORE_VARIANTS,
  DEFAULT_APPEARANCE,
  LEGACY_PALETTES,
  LOOK_VERSION,
  activeLook,
  appearanceFor,
  colorModeOf,
  legacyAppearance,
  mergeAppearance,
  variantOf,
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

const ALL = [...APPEARANCE.game.themes, ...APPEARANCE.minimal.themes]

describe('theme catalog', () => {
  it('has unique ids, distinct fonts, a swatch per variant and defaults that exist', () => {
    const allIds = []
    for (const mode of ['game', 'minimal']) {
      const themes = APPEARANCE[mode].themes
      expect(themes.length).toBeGreaterThanOrEqual(3)
      allIds.push(...themes.map((t) => t.id))
      // every theme has its own heading and its own body typeface within the mode
      expect(new Set(themes.map((t) => t.heading.name)).size).toBe(themes.length)
      expect(new Set(themes.map((t) => t.body.name)).size).toBe(themes.length)
      for (const t of themes) {
        expect(t.heading.name).not.toBe(t.body.name)
        expect(t.swatch.light.length).toBeGreaterThanOrEqual(6)
        expect(t.swatch.dark.length).toBeGreaterThanOrEqual(6)
        expect('tone' in t).toBe(false)
      }
      expect(themes.map((t) => t.id)).toContain(DEFAULT_APPEARANCE[mode].theme)
      for (const pair of Object.values(LEGACY_PALETTES[mode])) for (const id of pair) expect(themes.some((t) => t.id === id)).toBe(true)
    }
    // ids are unique across modes too, so [data-theme-id] in CSS never collides
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('falls back to defaults for missing or unknown ids and keeps no night theme', () => {
    expect(appearanceFor({}, 'game')).toEqual(DEFAULT_APPEARANCE.game)
    expect(appearanceFor({ appearance: { minimal: { theme: 'nordic', night: 'midnight' } } }, 'minimal')).toEqual({ theme: 'nordic' })
    // a Calm theme is not a Game theme
    expect(appearanceFor({ appearance: { game: { theme: 'paper' } } }, 'game').theme).toBe('sunny')
  })

  it('draws light unless the user picks dark, and follows the device only on auto', () => {
    expect(COLOR_MODES).toEqual(['light', 'dark', 'auto'])
    expect(colorModeOf({})).toBe('light')
    expect(colorModeOf({ colorMode: 'purple' })).toBe('light')
    expect(variantOf('light', true)).toBe('light')
    expect(variantOf('dark', false)).toBe('dark')
    expect(variantOf('auto', false)).toBe('light')
    expect(variantOf('auto', true)).toBe('dark')
    const s = { appearance: { game: { theme: 'arcade' } }, colorMode: 'dark' }
    expect(activeLook(s, 'game', false)).toMatchObject({ theme: { id: 'arcade' }, variant: 'dark' })
    expect(activeLook({ ...s, colorMode: 'light' }, 'game', true)).toMatchObject({ theme: { id: 'arcade' }, variant: 'light' })
  })

  it('merges per mode and names the bad id or key', () => {
    const r = mergeAppearance(DEFAULT_APPEARANCE, { game: { theme: 'arcade' } })
    expect(r.value.game).toEqual({ theme: 'arcade' })
    expect(r.value.minimal).toEqual(DEFAULT_APPEARANCE.minimal)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { game: { theme: 'studio' } }).error).toMatch(/studio/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { retro: {} }).error).toMatch(/retro/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { game: { palette: 'grape' } }).error).toMatch(/palette/)
    // the night theme is gone
    expect(mergeAppearance(DEFAULT_APPEARANCE, { minimal: { night: 'midnight' } }).error).toMatch(/night/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, 'arcade').error).toBeTruthy()
  })
})

describe('migrating older looks', () => {
  it('maps each old palette to its closest light and dark theme', () => {
    expect(legacyAppearance({ palette: 'arcade' }, 'game', 'dark')).toEqual({ theme: 'arcade' })
    expect(legacyAppearance({ palette: 'forest' }, 'game', 'light')).toEqual({ theme: 'storybook' })
    expect(legacyAppearance({ palette: 'sand' }, 'minimal', 'system')).toEqual({ theme: 'paper' })
    expect(legacyAppearance({ palette: 'sand' }, 'minimal', undefined)).toEqual({ theme: 'paper' })
    expect(legacyAppearance({ palette: 'nope' }, 'minimal', 'dark')).toEqual({ theme: 'midnight' })
  })

  it('carries the old light and system switch into light, and dark into the dark variant', () => {
    const old = defaultState()
    delete old.settings.lookVersion
    delete old.settings.colorMode
    old.settings.theme = 'system'
    old.settings.appearance = {
      game: { palette: 'grape', heading: 'nunito', body: 'nunito' },
      minimal: { palette: 'slate', heading: 'geist', body: 'geist' },
    }
    const m = migrate(old)
    expect(m.settings.appearance).toEqual({ game: { theme: 'sunny' }, minimal: { theme: 'nordic' } })
    expect(m.settings.colorMode).toBe('light')
    expect('theme' in m.settings).toBe(false)
    expect(m.settings.lookVersion).toBe(LOOK_VERSION)

    old.settings.theme = 'dark'
    const d = migrate(old)
    expect(d.settings.appearance).toEqual({ game: { theme: 'night-owl' }, minimal: { theme: 'studio' } })
    expect(d.settings.colorMode).toBe('dark')
    old.settings.theme = 'light'
    expect(migrate(old).settings.colorMode).toBe('light')
  })

  it('turns a picked dark-only theme into that theme drawn dark, and drops night themes', () => {
    for (const lookVersion of [undefined, 2]) {
      const v2 = defaultState()
      v2.settings.lookVersion = lookVersion
      delete v2.settings.colorMode
      // Arcade was only dark before, so the user chose a dark look: keep it dark
      v2.settings.appearance = { game: { theme: 'arcade', night: null }, minimal: { theme: 'paper', night: null } }
      let m = migrate(v2)
      expect(m.settings.appearance).toEqual({ game: { theme: 'arcade' }, minimal: { theme: 'paper' } })
      expect(m.settings.colorMode).toBe('dark')
      // a light theme with a night theme: the night theme is gone and the look stays light
      v2.settings.appearance = { game: { theme: 'sunny', night: 'night-owl' }, minimal: { theme: 'paper', night: 'midnight' } }
      m = migrate(v2)
      expect(m.settings.appearance).toEqual({ game: { theme: 'sunny' }, minimal: { theme: 'paper' } })
      expect(m.settings.colorMode).toBe('light')
      // the mode in use decides: a dark Calm theme does not darken Game
      v2.settings.appearance = { game: { theme: 'sunny' }, minimal: { theme: 'studio' } }
      expect(migrate(v2).settings.colorMode).toBe('light')
      v2.settings.uiMode = 'minimal'
      expect(migrate(v2).settings.colorMode).toBe('dark')
    }
    expect([...DARK_BEFORE_VARIANTS].sort()).toEqual(['arcade', 'midnight', 'night-owl', 'studio'])
  })

  it('keeps a current save as it is, light included, and is stable', () => {
    const fresh = migrate(null)
    expect(fresh.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    expect(fresh.settings.colorMode).toBe('light')
    // a user on version 3 who picked Arcade light keeps it light
    const picked = migrate({ ...fresh, settings: { ...fresh.settings, appearance: { game: { theme: 'arcade' } }, colorMode: 'light' } })
    expect(picked.settings.appearance.game).toEqual({ theme: 'arcade' })
    expect(picked.settings.colorMode).toBe('light')
    const auto = migrate({ ...fresh, settings: { ...fresh.settings, colorMode: 'auto' } })
    expect(auto.settings.colorMode).toBe('auto')
    expect(migrate(auto).settings).toEqual(auto.settings)
    expect(migrate({ ...fresh, settings: { ...fresh.settings, colorMode: 'sepia' } }).settings.colorMode).toBe('light')
  })

  it('gives new users the light Sunny Quest theme in Game mode, even on a dark device', () => {
    const s = defaultState()
    expect(s.settings.uiMode).toBe('game')
    expect(s.settings.appearance.game).toEqual({ theme: 'sunny' })
    expect(s.settings.colorMode).toBe('light')
    expect(activeLook(s.settings, 'game', true)).toMatchObject({ theme: { id: 'sunny' }, variant: 'light' })
  })
})

describe('settings.update appearance', () => {
  it('starts with defaults and keeps the other mode when one mode changes', async () => {
    const be = backend()
    const { state } = await be.dispatch('state.get')
    expect(state.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    expect(state.settings.colorMode).toBe('light')
    await be.dispatch('settings.update', { patch: { appearance: { minimal: { theme: 'midnight' } } } })
    await be.dispatch('settings.update', { patch: { colorMode: 'dark' } })
    const after = (await be.dispatch('state.get')).state.settings
    expect(after.appearance).toEqual({ game: { theme: 'sunny' }, minimal: { theme: 'midnight' } })
    expect(after.colorMode).toBe('dark')
  })

  it('rejects unknown ids and colour modes with VALIDATION and changes nothing', async () => {
    const be = backend()
    await expect(
      be.dispatch('settings.update', { patch: { sounds: false, appearance: { game: { theme: 'comic-sans' } } } }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(be.dispatch('settings.update', { patch: { colorMode: 'night' } })).rejects.toMatchObject({ code: 'VALIDATION' })
    const { state } = await be.dispatch('state.get')
    expect(state.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    expect(state.settings.colorMode).toBe('light')
    expect(state.settings.sounds).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------
// WCAG contrast of every theme in both variants, read straight from the stylesheet the app
// ships. A variant is what the cascade gives an element with data-theme-id (light) or with
// data-theme-id and .dark (dark), so text and surfaces are always checked from one block.
const WEB = new URL('../../../apps/web/src/', import.meta.url)
const css = readFileSync(new URL('style.css', WEB), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const blocksFor = (selector) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].trim() === selector).map((m) => m[2])
const decls = (body) => Object.fromEntries([...body.matchAll(/--fg-([\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]))
const baseOf = (id) => Object.assign({}, ...blocksFor(`[data-theme-id='${id}']`).map(decls))
const darkOf = (id) => Object.assign({}, ...blocksFor(`[data-theme-id='${id}'].dark`).map(decls))
function variant(id, v) {
  const base = baseOf(id)
  if (!Object.keys(base).length) throw new Error(`no block for ${id}`)
  return v === 'dark' ? { ...base, ...darkOf(id) } : base
}
const isColour = (value) => /#[0-9a-f]{3,8}\b|rgba?\(/i.test(value)

// '#rrggbb' or 'rgb(r g b / a)' and 'rgba(r, g, b, a)' composited over a solid backdrop
function rgb(value, backdrop) {
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16))
  const m = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/i)
  if (!m) return null
  let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  const c = [m[1], m[2], m[3]].map(Number)
  if (a >= 1) return c
  if (!backdrop) throw new Error(`${value} is see-through and has no backdrop`)
  return c.map((x, i) => x * a + backdrop[i] * (1 - a))
}
const lum = (c) => {
  const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
/** a token's colour; `over` names the solid token a see-through one sits on */
function colour(v, name) {
  const [token, over] = name.split(' over ')
  if (!v[token]) throw new Error(`missing --fg-${token}`)
  return (
    rgb(v[token], over ? colour(v, over) : null) ??
    (() => {
      throw new Error(`--fg-${token} is not a colour: ${v[token]}`)
    })()
  )
}

// the tinted surfaces every theme draws text on: toasts, banners, chips, picked options
const SOFTS = ['accent-soft', 'warm-soft', 'good-soft', 'bad-soft', 'caution-soft']
// [text, surface, minimum]. 4.5 for text, 3 for bars, checkboxes and other UI parts.
const PAIRS = [
  // page, sidebar and mobile bars (paper), cards, modals and popovers (card), wells and chips (sunk)
  ...['paper', 'card', 'sunk'].flatMap((bg) => [
    ['ink', bg, 4.5],
    ['muted', bg, 4.5],
    ['accent', bg, 4.5],
  ]),
  ...SOFTS.map((bg) => ['ink', bg, 4.5]),
  ['muted', 'accent-soft', 4.5],
  ['muted', 'warm-soft', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['warm', 'warm-soft', 4.5],
  ['good', 'good-soft', 4.5],
  ['bad', 'bad-soft', 4.5],
  ['caution', 'caution-soft', 4.5],
  ...['paper', 'card'].flatMap((bg) => [
    ['warm', bg, 4.5],
    ['good', bg, 4.5],
    ['bad', bg, 4.5],
    ['caution', bg, 4.5],
    ['xp', bg, 4.5],
    ['coin-ink', bg, 4.5],
  ]),
  // filled buttons, ticks and badges
  ['on-accent', 'accent', 4.5],
  ['on-good', 'good', 4.5],
  ['on-bad', 'bad', 4.5],
  // tooltips are drawn inverted
  ['paper', 'ink', 4.5],
  // UI parts
  ['accent', 'paper', 3],
  ['xpbar', 'sunk', 3],
  ['heat-3', 'heat-0', 3],
  ['rar-low', 'card', 3],
  ['rar-medium', 'card', 3],
  ['rar-high', 'card', 3],
  // the HUD (status strip, level card): inside it the roles use their HUD colours
  ['hud-ink', 'hud', 4.5],
  ['hud-muted', 'hud', 4.5],
  ['hud-ink', 'hud-line', 4.5],
  ['hud-muted', 'hud-line', 4.5],
  ['hud-xp', 'hud', 4.5],
  ['hud-warm', 'hud', 4.5],
  ['hud-good', 'hud', 4.5],
  ['hud-bad', 'hud', 4.5],
  ['hud-accent', 'hud', 3],
  ['hud-on-accent', 'hud-accent', 4.5],
  ['hud-on-bad', 'hud-bad', 4.5],
  ['hud-xpbar', 'hud-line', 3],
  // the study room windows: the window colour before its transparency, with the header bar,
  // wells, fields and hover rows laid over it, and the active tab
  ['room-ink', 'room-base', 7],
  ['room-muted', 'room-base', 4.5],
  ['room-ink', 'room-bg over room-base', 4.5],
  ['room-ink', 'room-sunk over room-base', 4.5],
  ['room-muted', 'room-sunk over room-base', 4.5],
  ['room-ink', 'room-field over room-base', 4.5],
  ['room-ink', 'room-hover over room-base', 4.5],
  ['room-ink', 'room-dock over room-base', 4.5],
  ['accent', 'room-base', 4.5],
  ['coin-ink', 'room-base', 4.5],
  ['room-on-tab', 'room-tab', 4.5],
  ['room-tab', 'room-base', 3],
  // the small label that reads over pictures is the window colour on the ink colour
  ['room-base', 'room-ink', 4.5],
]
// Tailwind bg-* colour utilities on the pages. Every one is either a surface text sits on,
// checked above, or a fill whose text (if any) is checked above. A new surface fails here
// until it gets its pairs.
const CHECKED_BG = new Set([
  'paper',
  'card',
  'sunk',
  ...SOFTS,
  'accent',
  'good',
  'bad',
  'ink',
  'hud',
  // fills without text: bars, dots and rules
  'line',
  'warm',
  'caution',
  'xp',
  'muted',
])
const TOKENS = new Set([...css.matchAll(/--color-([\w-]+):\s*var\(--fg-/g)].map((m) => m[1]))

describe('theme variants', () => {
  it('sets every colour again in the dark block, so no light value leaks into dark', () => {
    for (const t of ALL) {
      const base = baseOf(t.id)
      const dark = darkOf(t.id)
      const colours = Object.keys(base).filter((k) => isColour(base[k]) || k in dark)
      expect(Object.keys(dark).sort(), t.id).toEqual(colours.sort())
      // and the variants really differ where it matters
      expect(dark.paper, t.id).not.toBe(base.paper)
      expect(dark.ink, t.id).not.toBe(base.ink)
    }
  })

  it('draws light variants light and dark variants dark', () => {
    for (const t of ALL) {
      expect(lum(colour(variant(t.id, 'light'), 'paper')), t.id).toBeGreaterThan(0.6)
      expect(lum(colour(variant(t.id, 'dark'), 'paper')), t.id).toBeLessThan(0.06)
    }
  })

  it('checks every surface colour the pages use', () => {
    const files = []
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name.endsWith('.vue')) files.push(p)
      }
    }
    walk(new URL('.', WEB).pathname)
    const used = new Set()
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bbg-([a-z][\w-]*)/g)) if (TOKENS.has(m[1])) used.add(m[1])
    expect([...used].filter((u) => !CHECKED_BG.has(u))).toEqual([])
  })
})

describe('theme shapes', () => {
  // every theme sets its own shape language and room glass, so no two feel alike
  const shape = (id) => ['radius', 'btn-radius', 'room-radius', 'shadow', 'border-w'].map((k) => baseOf(id)[k])
  it('gives each theme its own radius, button radius, room radius, shadow and border', () => {
    for (const t of ALL) expect(shape(t.id).every(Boolean)).toBe(true)
    expect(new Set(ALL.map((t) => shape(t.id).join('|'))).size).toBe(ALL.length)
  })
})

describe('coin colours', () => {
  const root = decls(css.match(/:root,\s*\[data-theme-id\]\s*\{([^}]*)\}/)[1])
  it('keeps text readable on the gold chip and the new dot', () => {
    expect(contrast(rgb(root['on-coin']), rgb(root.coin))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(root['on-new']), rgb(root.new))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('theme contrast', () => {
  for (const t of ALL) {
    for (const v of ['light', 'dark']) {
      it(`${t.name} ${v} meets WCAG AA`, () => {
        const tokens = variant(t.id, v)
        const fails = PAIRS.map(([a, b, min]) => [a, b, min, contrast(colour(tokens, a), colour(tokens, b))])
          .filter(([, , min, c]) => c < min)
          .map(([a, b, min, c]) => `${a} on ${b}: ${c.toFixed(2)} < ${min}`)
        expect(fails).toEqual([])
      })
    }
  }
})
