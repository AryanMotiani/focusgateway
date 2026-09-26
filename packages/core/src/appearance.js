// The theme catalog. Each mode (Game, Calm) has a few complete themes, each with its own
// heading and body typefaces, shape language and palette, drawn in a light and a dark
// variant. One colour mode setting (light, dark, or auto to match the device) picks the
// variant for every theme. The UI and the backend share these ids. Colours, textures and
// font stacks live in apps/web/src/style.css under [data-theme-id] and
// [data-theme-id].dark. Swatches and fonts here are for pickers.

export const APPEARANCE_MODES = ['game', 'minimal']

// weight: how headings in this font are drawn, so pickers can preview them faithfully
const font = (name, family, weight = 400) => ({ name, family, weight })
// swatch per variant: paper, card, ink, main accent, then supporting hues
const theme = (id, name, blurb, heading, body, light, dark) => ({ id, name, blurb, heading, body, swatch: { light, dark } })

const SANS = 'system-ui, sans-serif'
const SERIF = 'Georgia, serif'

export const APPEARANCE = {
  game: {
    themes: [
      theme(
        'sunny',
        'Sunny Quest',
        'Cream and sky, coral pill buttons, bubbly and round',
        font('Fredoka', `'Fredoka Variable', ${SANS}`, 600),
        font('Nunito', `'Nunito Variable', ${SANS}`),
        ['#fff8ea', '#ffffff', '#1f2a44', '#bb3a23', '#1a868c', '#f2b400', '#287634'],
        ['#182030', '#212a3d', '#fff4e0', '#ff8a6e', '#3cc4c9', '#ffb547', '#84d68e'],
      ),
      theme(
        'storybook',
        'Storybook',
        'Parchment and ink, berry and forest, wobbly hand drawn edges',
        font('Patrick Hand', `'Patrick Hand', 'Comic Sans MS', ${SANS}`),
        font('Atkinson Hyperlegible', `'Atkinson Hyperlegible Next Variable', ${SANS}`),
        ['#f6ecd6', '#fdf8ea', '#3a2a1c', '#962a49', '#2d6638', '#c98a1c', '#3f6f8f'],
        ['#2a2118', '#33291e', '#f6ead2', '#f0a3b8', '#a8d596', '#f2c46a', '#8fb8d6'],
      ),
      theme(
        'arcade',
        'Arcade',
        'Retro console, pixel type, square edges and hard shadows',
        font('Pixelify Sans', `'Pixelify Sans Variable', ui-monospace, monospace`, 600),
        font('Chakra Petch', `'Chakra Petch', ${SANS}`),
        ['#efedf8', '#ffffff', '#17162b', '#b53a24', '#8f5800', '#3f8f25', '#3f5fd0'],
        ['#17162b', '#211f3b', '#eeecf8', '#ec6a52', '#efaf48', '#78c95b', '#8199f5'],
      ),
      theme(
        'night-owl',
        'Night Owl',
        'Night sky blues, moon yellow and lilac, soft round glows',
        font('Comfortaa', `'Comfortaa Variable', ${SANS}`, 700),
        font('Figtree', `'Figtree Variable', ${SANS}`),
        ['#eef1fa', '#ffffff', '#141d38', '#5a42c6', '#f3cf63', '#12705f', '#a24d1c'],
        ['#0f1830', '#16223e', '#e9edf8', '#f3cf63', '#b8a2ff', '#62d1be', '#f4a57a'],
      ),
    ],
  },
  minimal: {
    themes: [
      theme(
        'paper',
        'Paper',
        'Notebook serifs, ink blue and rust, crisp corners and hairlines',
        font('Young Serif', `'Young Serif', ${SERIF}`),
        font('Source Serif 4', `'Source Serif 4 Variable', ${SERIF}`),
        ['#fbf8f1', '#fffefa', '#1e2432', '#1f4e8c', '#a0441d', '#3c6845', '#b08a2e'],
        ['#161a22', '#1c212b', '#ece6d8', '#8fb4ea', '#e59a74', '#93c19c', '#dcbc6a'],
      ),
      theme(
        'nordic',
        'Nordic',
        'Cool greys, fjord blue and pine, soft frosted glass',
        font('Manrope', `'Manrope Variable', ${SANS}`, 700),
        font('Inter', `'Inter Variable', ${SANS}`),
        ['#f4f6f8', '#ffffff', '#16202b', '#2a6189', '#2b6a4f', '#a3502d', '#7a8fa3'],
        ['#121820', '#19212b', '#e8eef4', '#7fb6dc', '#7cc4a2', '#e39a78', '#95a7b8'],
      ),
      theme(
        'midnight',
        'Midnight Library',
        'Library green, brass double rules, old style serifs',
        font('Cormorant Garamond', `'Cormorant Garamond Variable', ${SERIF}`, 600),
        font('Spectral', `'Spectral', ${SERIF}`),
        ['#f4efe2', '#fbf8ef', '#1a2a1f', '#235c3a', '#8e6c26', '#8a2f43', '#2f6a3f'],
        ['#0f1712', '#16211a', '#efe6d2', '#d4aa52', '#d77c8d', '#8fc39c', '#8a2f43'],
      ),
      theme(
        'studio',
        'Studio',
        'Graphite and cream, terracotta and olive, pill buttons, mono labels',
        font('Bricolage Grotesque', `'Bricolage Grotesque Variable', ${SANS}`, 700),
        font('IBM Plex Sans', `'IBM Plex Sans Variable', ${SANS}`),
        ['#f5f0e8', '#fdfaf5', '#2a2622', '#a6472a', '#52661d', '#7f5f0c', '#3f6f8a'],
        ['#2a2622', '#34302b', '#f3ecdf', '#e4885f', '#aebf6c', '#dcb65c', '#8fb4c9'],
      ),
    ],
  },
}

export const DEFAULT_APPEARANCE = {
  game: { theme: 'sunny' },
  minimal: { theme: 'paper' },
}

/** Light or dark for every theme. auto follows the device. Light is the default for everyone. */
export const COLOR_MODES = ['light', 'dark', 'auto']
export const DEFAULT_COLOR_MODE = 'light'

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

/** Before look version 3 every theme had one fixed tone. These were the dark ones. */
export const DARK_BEFORE_VARIANTS = ['arcade', 'night-owl', 'midnight', 'studio']

/**
 * Turns an old { palette, heading, body } look plus the old theme switch into { theme }.
 * The old dark switch picks the palette's dark theme (drawn dark, see migrateAppearance),
 * light and system (the old default) pick its light theme.
 */
export function legacyAppearance(old, mode, oldTheme) {
  const m = modeOf(mode)
  const table = LEGACY_PALETTES[m]
  const [light, dark] = table[old?.palette] || Object.values(table)[0]
  return { theme: oldTheme === 'dark' ? dark : light }
}

/**
 * Version of the look settings. 2 made light the default. 3 gave every theme a light and
 * a dark variant, replaced the night theme with settings.colorMode and dropped `night`.
 */
export const LOOK_VERSION = 3

/** The look for one mode, { theme }, with a missing or unknown id replaced by the default. */
export function appearanceFor(settings, mode) {
  const m = modeOf(mode)
  const saved = settings?.appearance?.[m]
  return { theme: hasTheme(m, saved?.theme) ? saved.theme : DEFAULT_APPEARANCE[m].theme }
}

/** The saved colour mode, light when it is missing or unknown. */
export const colorModeOf = (settings) => (COLOR_MODES.includes(settings?.colorMode) ? settings.colorMode : DEFAULT_COLOR_MODE)

/** 'light' or 'dark': what a colour mode draws right now. */
export const variantOf = (colorMode, systemDark) => (colorMode === 'dark' || (colorMode === 'auto' && !!systemDark) ? 'dark' : 'light')

/** The theme and variant to draw right now. */
export function activeLook(settings, mode, systemDark) {
  return { theme: findTheme(mode, appearanceFor(settings, mode).theme), variant: variantOf(colorModeOf(settings), systemDark) }
}

/**
 * Brings any saved look up to date: returns { appearance, colorMode }.
 * - Current saves are only cleaned (unknown ids back to defaults, `night` dropped).
 * - Older saves keep their theme ids. The colour mode turns dark only when the user picked
 *   a dark look themselves: a theme that used to be dark-only as the theme of the mode in
 *   use, or the old dark switch. Everything else, a night theme included, starts light.
 */
export function migrateAppearance(settings) {
  const appearance = {}
  for (const m of APPEARANCE_MODES) {
    const saved = settings?.appearance?.[m]
    const isNew = !!saved && typeof saved === 'object' && 'theme' in saved
    appearance[m] = isNew ? appearanceFor(settings, m) : legacyAppearance(saved, m, settings?.theme)
  }
  if (settings?.lookVersion >= LOOK_VERSION) return { appearance, colorMode: colorModeOf(settings) }
  const inUse = appearance[modeOf(settings?.uiMode)].theme
  const pickedDark = DARK_BEFORE_VARIANTS.includes(inUse)
  return { appearance, colorMode: pickedDark ? 'dark' : DEFAULT_COLOR_MODE }
}

/**
 * Merges a partial patch ({ game: { theme } }) into the current value. Returns { value } or
 * { error } naming the first unknown mode, key or id.
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
      if (key !== 'theme') return { error: `Unknown appearance setting "${key}".` }
      if (!hasTheme(mode, id)) return { error: `Unknown theme "${id}" for ${label}.` }
      value[mode].theme = id
    }
  }
  return { value }
}
