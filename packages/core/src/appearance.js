// The theme catalog. Each mode (Game, Calm) has a few complete themes: a fixed light or
// dark tone, its own heading and body typefaces and its own palette and surfaces. The UI
// and the backend share these ids. Colours, textures and font stacks live in
// apps/web/src/style.css under [data-theme-id]. Swatches and fonts here are for pickers.

export const APPEARANCE_MODES = ['game', 'minimal']

// weight: how headings in this font are drawn, so pickers can preview them faithfully
const font = (name, family, weight = 400) => ({ name, family, weight })
// swatch: paper, card, ink, main accent, then supporting hues
const theme = (id, name, tone, blurb, heading, body, swatch) => ({ id, name, tone, blurb, heading, body, swatch })

const SANS = 'system-ui, sans-serif'
const SERIF = 'Georgia, serif'

export const APPEARANCE = {
  game: {
    themes: [
      theme(
        'sunny',
        'Sunny Quest',
        'light',
        'Fresh cream and sky, coral pill buttons, bubbly and round',
        font('Fredoka', `'Fredoka Variable', ${SANS}`, 600),
        font('Nunito', `'Nunito Variable', ${SANS}`),
        ['#fff8ea', '#ffffff', '#1f2a44', '#c9432c', '#1a7f86', '#f2b400', '#2f8a3b'],
      ),
      theme(
        'storybook',
        'Storybook',
        'light',
        'Parchment and ink, berry and forest, wobbly hand drawn edges',
        font('Patrick Hand', `'Patrick Hand', 'Comic Sans MS', ${SANS}`),
        font('Atkinson Hyperlegible', `'Atkinson Hyperlegible Next Variable', ${SANS}`),
        ['#f6ecd6', '#fdf8ea', '#3a2a1c', '#9a2c4b', '#2f6b3a', '#c98a1c', '#3f6f8f'],
      ),
      theme(
        'arcade',
        'Arcade',
        'dark',
        'Retro console, pixel type, square edges and hard shadows',
        font('Pixelify Sans', `'Pixelify Sans Variable', ui-monospace, monospace`, 600),
        font('Chakra Petch', `'Chakra Petch', ${SANS}`),
        ['#17162b', '#211f3b', '#eeecf8', '#e25a45', '#eaa93a', '#6cbf4a', '#6d8cf2'],
      ),
      theme(
        'night-owl',
        'Night Owl',
        'dark',
        'Deep navy sky, moon yellow and lilac, soft round glows',
        font('Comfortaa', `'Comfortaa Variable', ${SANS}`, 700),
        font('Figtree', `'Figtree Variable', ${SANS}`),
        ['#0f1830', '#16223e', '#e9edf8', '#f3cf63', '#b8a2ff', '#5fd0bd', '#f4a57a'],
      ),
    ],
  },
  minimal: {
    themes: [
      theme(
        'paper',
        'Paper',
        'light',
        'Ivory notebook, ink blue and rust, crisp corners and hairlines',
        font('Young Serif', `'Young Serif', ${SERIF}`),
        font('Source Serif 4', `'Source Serif 4 Variable', ${SERIF}`),
        ['#fbf8f1', '#fffefa', '#1e2432', '#1f4e8c', '#a4461e', '#4f7c58', '#b08a2e'],
      ),
      theme(
        'nordic',
        'Nordic',
        'light',
        'Cool grey white, fjord blue and pine, soft frosted glass',
        font('Manrope', `'Manrope Variable', ${SANS}`, 700),
        font('Inter', `'Inter Variable', ${SANS}`),
        ['#f4f6f8', '#ffffff', '#16202b', '#2d6690', '#2b6a4f', '#b25a3a', '#7a8fa3'],
      ),
      theme(
        'midnight',
        'Midnight Library',
        'dark',
        'Green black study, brass double rules, parchment text',
        font('Cormorant Garamond', `'Cormorant Garamond Variable', ${SERIF}`, 600),
        font('Spectral', `'Spectral', ${SERIF}`),
        ['#0f1712', '#16211a', '#efe6d2', '#d4aa52', '#d77c8d', '#8fc39c', '#8a2f43'],
      ),
      theme(
        'studio',
        'Studio',
        'dark',
        'Warm graphite, terracotta and olive, pill buttons, mono labels',
        font('Bricolage Grotesque', `'Bricolage Grotesque Variable', ${SANS}`, 700),
        font('IBM Plex Sans', `'IBM Plex Sans Variable', ${SANS}`),
        ['#2a2622', '#342f2a', '#f3ecdf', '#e4885f', '#aebf6c', '#dcb65c', '#8fb4c9'],
      ),
    ],
  },
}

export const DEFAULT_APPEARANCE = {
  game: { theme: 'sunny', night: null },
  minimal: { theme: 'paper', night: null },
}

const modeOf = (mode) => (mode === 'minimal' ? 'minimal' : 'game')
const hasTheme = (mode, id) => APPEARANCE[modeOf(mode)].themes.some((t) => t.id === id)

export const findTheme = (mode, id) => APPEARANCE[modeOf(mode)].themes.find((t) => t.id === id)

/**
 * Themes that replaced the old palette picker. The old look had a palette plus a
 * system/light/dark switch, so each palette names its closest light and dark theme.
 */
export const LEGACY_PALETTES = {
  game: {
    grape: ['sunny', 'night-owl'],
    arcade: ['sunny', 'arcade'],
    sunset: ['storybook', 'arcade'],
    forest: ['storybook', 'night-owl'],
    ocean: ['sunny', 'night-owl'],
    candy: ['sunny', 'night-owl'],
  },
  minimal: {
    paper: ['paper', 'midnight'],
    sage: ['nordic', 'midnight'],
    slate: ['nordic', 'studio'],
    sand: ['paper', 'studio'],
    ink: ['paper', 'studio'],
    dusk: ['nordic', 'midnight'],
  },
}

/**
 * Turns an old { palette, heading, body } look plus the old theme switch into
 * { theme, night }. Dark keeps the dark theme. Light and system (the old default) get
 * the light theme and no night theme, because light is the default look now.
 */
export function legacyAppearance(old, mode, oldTheme) {
  const m = modeOf(mode)
  const table = LEGACY_PALETTES[m]
  const [light, dark] = table[old?.palette] || Object.values(table)[0]
  if (oldTheme === 'dark') return { theme: dark, night: null }
  return { theme: light, night: null }
}

/**
 * Version of the look defaults. Version 2 made light the default: saves from before it
 * drop the night theme that the old system setting turned on by itself.
 */
export const LOOK_VERSION = 2

/** The look for one mode, with missing or unknown ids replaced by defaults. */
export function appearanceFor(settings, mode) {
  const m = modeOf(mode)
  const saved = settings?.appearance?.[m]
  const out = { ...DEFAULT_APPEARANCE[m] }
  if (hasTheme(m, saved?.theme)) out.theme = saved.theme
  if (hasTheme(m, saved?.night) && saved.night !== out.theme) out.night = saved.night
  return out
}

/**
 * Old saves have no appearance at all or the palette shape. Those carry the old
 * system/light/dark switch into a theme (dark stays dark, the rest turns light).
 */
export function migrateAppearance(settings) {
  const out = {}
  const before = !(settings?.lookVersion >= LOOK_VERSION)
  for (const m of APPEARANCE_MODES) {
    const saved = settings?.appearance?.[m]
    const isNew = !!saved && typeof saved === 'object' && 'theme' in saved
    out[m] = isNew ? appearanceFor(settings, m) : legacyAppearance(saved, m, settings?.theme)
    if (isNew && before) out[m].night = null
  }
  return out
}

/** The theme to draw right now: the night theme when the device is dark and one is set. */
export function activeTheme(settings, mode, systemDark) {
  const a = appearanceFor(settings, mode)
  return findTheme(mode, systemDark && a.night ? a.night : a.theme)
}

/**
 * Merges a partial patch ({ game: { theme } } or { minimal: { night: null } }) into the
 * current value. Returns { value } or { error } naming the first unknown mode, key or id.
 */
export function mergeAppearance(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { error: 'Appearance must be an object.' }
  const value = {
    game: appearanceFor({ appearance: current }, 'game'),
    minimal: appearanceFor({ appearance: current }, 'minimal'),
  }
  for (const [mode, part] of Object.entries(patch)) {
    if (!APPEARANCE_MODES.includes(mode)) return { error: `Unknown style "${mode}".` }
    if (!part || typeof part !== 'object' || Array.isArray(part)) return { error: `Appearance for ${mode} must be an object.` }
    const label = mode === 'game' ? 'Game' : 'Calm'
    for (const [key, id] of Object.entries(part)) {
      if (key !== 'theme' && key !== 'night') return { error: `Unknown appearance setting "${key}".` }
      if (key === 'night' && id === null) {
        value[mode].night = null
        continue
      }
      if (!hasTheme(mode, id)) return { error: `Unknown theme "${id}" for ${label}.` }
      value[mode][key] = id
    }
    if (value[mode].night === value[mode].theme) value[mode].night = null
  }
  return { value }
}
