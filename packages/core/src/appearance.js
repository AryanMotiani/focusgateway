// The look catalog: colour palettes, heading fonts and body fonts for each mode,
// plus curated combos. The UI and the backend share these ids. The actual colours
// and font stacks live in apps/web/src/style.css under html[data-palette], [data-heading]
// and [data-body]. Swatches here are only for pickers.

export const APPEARANCE_MODES = ['game', 'minimal']

const pal = (id, name, blurb, light, dark) => ({ id, name, blurb, swatch: { light, dark } })
// weight: how headings in this font are drawn, so pickers can preview them faithfully
const font = (id, name, family, weight = 400) => ({ id, name, family, weight })

const SANS = 'system-ui, sans-serif'
const SERIF = 'Georgia, serif'

export const APPEARANCE = {
  game: {
    palettes: [
      pal('grape', 'Grape', 'Violet with orange flames', ['#fff7ec', '#7a4dff', '#ff8a00'], ['#13121c', '#9b7bff', '#ffa53a']),
      pal('arcade', 'Arcade', 'Teal and hot pink on navy', ['#eefaf8', '#0a7f74', '#e8157a'], ['#0a1024', '#2ee6d0', '#ff4fa0']),
      pal('sunset', 'Sunset', 'Coral and gold with plum', ['#fff4ec', '#c8431c', '#f29f05'], ['#1a0f17', '#ff7a50', '#ffb730']),
      pal('forest', 'Forest', 'Green and gold on cream', ['#fbf6e9', '#2b7d39', '#d99a00'], ['#0f1611', '#6fd672', '#f2c14a']),
      pal('ocean', 'Ocean', 'Deep blue and cyan', ['#f0f6ff', '#1d67d6', '#13c2e0'], ['#0b1320', '#5aa2ff', '#3ddcf5']),
      pal('candy', 'Candy', 'Pink and lilac pastels', ['#fff3f8', '#c92a74', '#b98cff'], ['#1a1220', '#ff7ab8', '#c9a2ff']),
    ],
    headings: [
      font('nunito', 'Nunito Black', `'Nunito Variable', ${SANS}`, 900),
      font('fredoka', 'Fredoka', `'Fredoka Variable', ${SANS}`, 650),
      font('baloo', 'Baloo 2', `'Baloo 2 Variable', ${SANS}`, 800),
      font('lilita', 'Lilita One', `'Lilita One', ${SANS}`),
      font('space-grotesk', 'Space Grotesk', `'Space Grotesk Variable', ${SANS}`, 700),
      font('barlow', 'Barlow Condensed', `'Barlow Condensed', 'Arial Narrow', ${SANS}`, 800),
    ],
    bodies: [
      font('nunito', 'Nunito', `'Nunito Variable', ${SANS}`),
      font('lexend', 'Lexend', `'Lexend Variable', ${SANS}`),
      font('outfit', 'Outfit', `'Outfit Variable', ${SANS}`),
      font('dm-sans', 'DM Sans', `'DM Sans Variable', ${SANS}`),
      font('space-grotesk', 'Space Grotesk', `'Space Grotesk Variable', ${SANS}`),
    ],
    combos: [
      { id: 'classic', name: 'Classic', palette: 'grape', heading: 'nunito', body: 'nunito' },
      { id: 'arcade-night', name: 'Arcade night', palette: 'arcade', heading: 'lilita', body: 'outfit' },
      { id: 'golden-hour', name: 'Golden hour', palette: 'sunset', heading: 'baloo', body: 'dm-sans' },
      { id: 'quest-log', name: 'Quest log', palette: 'forest', heading: 'fredoka', body: 'nunito' },
      { id: 'deep-dive', name: 'Deep dive', palette: 'ocean', heading: 'space-grotesk', body: 'lexend' },
      { id: 'sugar-rush', name: 'Sugar rush', palette: 'candy', heading: 'fredoka', body: 'outfit' },
    ],
  },
  minimal: {
    palettes: [
      pal('paper', 'Paper', 'Warm paper, violet ink', ['#f4efe6', '#5b4bd6', '#c47413'], ['#121019', '#a497ff', '#f0a954']),
      pal('sage', 'Sage', 'Soft muted green', ['#f1f3ec', '#3f6e4f', '#b0702a'], ['#111512', '#8fc29d', '#e0a65e']),
      pal('slate', 'Slate', 'Cool grey blue', ['#eef1f4', '#3d5a80', '#b5652b'], ['#0f1318', '#8fb0d9', '#e39a61']),
      pal('sand', 'Sand', 'Terracotta on beige', ['#f5ece0', '#a84b28', '#8a6d1f'], ['#16110d', '#e58a63', '#d6b45a']),
      pal('ink', 'Ink', 'Black and white, one red', ['#f6f6f4', '#1a1a1a', '#b3432f'], ['#0e0e0e', '#f2f2f2', '#e0805a']),
      pal('dusk', 'Dusk', 'Muted indigo and rose', ['#f3f1f6', '#4f4a8c', '#b5566e'], ['#121119', '#a9a3e6', '#e591a6']),
    ],
    headings: [
      font('instrument', 'Instrument Serif', `'Instrument Serif', ${SERIF}`),
      font('fraunces', 'Fraunces', `'Fraunces Variable', ${SERIF}`, 500),
      font('dm-serif', 'DM Serif Display', `'DM Serif Display', ${SERIF}`),
      font('newsreader', 'Newsreader', `'Newsreader Variable', ${SERIF}`, 500),
      font('geist', 'Geist', `'Geist Variable', ${SANS}`, 600),
    ],
    bodies: [
      font('geist', 'Geist', `'Geist Variable', ${SANS}`),
      font('inter', 'Inter', `'Inter Variable', ${SANS}`),
      font('plex', 'IBM Plex Sans', `'IBM Plex Sans Variable', ${SANS}`),
      font('dm-sans', 'DM Sans', `'DM Sans Variable', ${SANS}`),
      font('source-serif', 'Source Serif 4', `'Source Serif 4 Variable', ${SERIF}`),
    ],
    combos: [
      { id: 'notebook', name: 'Notebook', palette: 'paper', heading: 'instrument', body: 'geist' },
      { id: 'library', name: 'Library', palette: 'sand', heading: 'newsreader', body: 'source-serif' },
      { id: 'greenhouse', name: 'Greenhouse', palette: 'sage', heading: 'fraunces', body: 'inter' },
      { id: 'studio', name: 'Studio', palette: 'slate', heading: 'geist', body: 'geist' },
      { id: 'newsprint', name: 'Newsprint', palette: 'ink', heading: 'dm-serif', body: 'plex' },
      { id: 'evening', name: 'Evening', palette: 'dusk', heading: 'fraunces', body: 'dm-sans' },
    ],
  },
}

export const DEFAULT_APPEARANCE = {
  game: { palette: 'grape', heading: 'nunito', body: 'nunito' },
  minimal: { palette: 'paper', heading: 'instrument', body: 'geist' },
}

const LISTS = { palette: 'palettes', heading: 'headings', body: 'bodies' }

/** The look for one mode, with any missing or unknown ids replaced by defaults. */
export function appearanceFor(settings, mode) {
  const m = mode === 'minimal' ? 'minimal' : 'game'
  const saved = settings?.appearance?.[m] || {}
  const out = { ...DEFAULT_APPEARANCE[m] }
  for (const [key, list] of Object.entries(LISTS)) {
    if (APPEARANCE[m][list].some((x) => x.id === saved[key])) out[key] = saved[key]
  }
  return out
}

/**
 * Merges a partial appearance patch ({ game: { palette } }) into the current value.
 * Returns { value } or { error } naming the first unknown mode, key or id.
 */
export function mergeAppearance(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { error: 'Appearance must be an object.' }
  const value = {
    game: { ...DEFAULT_APPEARANCE.game, ...(current?.game || {}) },
    minimal: { ...DEFAULT_APPEARANCE.minimal, ...(current?.minimal || {}) },
  }
  for (const [mode, part] of Object.entries(patch)) {
    if (!APPEARANCE_MODES.includes(mode)) return { error: `Unknown style "${mode}".` }
    if (!part || typeof part !== 'object' || Array.isArray(part)) return { error: `Appearance for ${mode} must be an object.` }
    for (const [key, id] of Object.entries(part)) {
      const list = LISTS[key]
      if (!list) return { error: `Unknown appearance setting "${key}".` }
      if (!APPEARANCE[mode][list].some((x) => x.id === id))
        return { error: `Unknown ${key} "${id}" for ${mode === 'game' ? 'Game' : 'Calm'}.` }
      value[mode][key] = id
    }
  }
  return { value }
}
