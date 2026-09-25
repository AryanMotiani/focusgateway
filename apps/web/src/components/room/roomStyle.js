// Colours and wallpaper patterns for `settings.room.style`. The option ids, names and
// unlock levels live in packages/core/src/options.js. Patterns are small SVG <pattern>
// tiles so any wall costs only a few elements to draw.

/** Lighten (k > 0) or darken (k < 0) a #rrggbb colour. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)))
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')
}
export function luma(hex) {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

// wall, wainscot below the chair rail
export const WALLS = {
  cream: ['#e7d3bd', '#caa386'],
  sage: ['#c9d3b8', '#9fae8c'],
  dusk: ['#b9c7d6', '#8fa2b8'],
  blush: ['#eec9c3', '#d49e98'],
  lavender: ['#cfc3e0', '#a898c2'],
  butter: ['#f0dfa4', '#d4b872'],
  mint: ['#bfe0d2', '#8fbfaa'],
  terracotta: ['#d9967a', '#b36f55'],
  navy: ['#46557c', '#33405f'],
  charcoal: ['#57535e', '#403d46'],
}

/** Everything the wall needs from one wall choice. */
export function wallOf(id) {
  const [base, low] = WALLS[id] || WALLS.cream
  const dark = luma(base) < 0.45
  return {
    base,
    low,
    dark,
    trim: shade(base, -0.07),
    trim2: shade(base, -0.13),
    rail: shade(low, -0.1),
    // pattern ink: darker on light walls, lighter on dark ones
    ink: dark ? shade(base, 0.35) : shade(low, -0.3),
  }
}

// Wallpaper tiles. Each returns { w, h, svg } drawn in the wall's ink colour.
export const PATTERNS = {
  plain: null,
  dots: (ink) => ({
    w: 46,
    h: 46,
    svg: `<circle cx="11" cy="11" r="2.2" fill="${ink}" opacity=".22"/><circle cx="34" cy="34" r="2.2" fill="${ink}" opacity=".22"/>`,
  }),
  stripes: (ink) => ({
    w: 64,
    h: 64,
    svg: `<rect width="32" height="64" fill="${ink}" opacity=".07"/><rect x="31" width="2" height="64" fill="${ink}" opacity=".14"/>`,
  }),
  plaid: (ink) => ({
    w: 84,
    h: 84,
    svg:
      `<rect y="8" width="84" height="18" fill="${ink}" opacity=".08"/><rect x="8" width="18" height="84" fill="${ink}" opacity=".08"/>` +
      `<rect y="56" width="84" height="2" fill="${ink}" opacity=".16"/><rect x="56" width="2" height="84" fill="${ink}" opacity=".16"/>`,
  }),
  brick: (ink) => ({
    w: 80,
    h: 40,
    svg:
      `<rect x="1" y="1" width="38" height="18" fill="${ink}" opacity=".05"/><rect x="41" y="21" width="38" height="18" fill="${ink}" opacity=".05"/>` +
      `<path d="M0 0.5 H80 M0 20 H80 M40 0 V20 M0 20 V40 M80 20 V40" stroke="${ink}" stroke-width="2" opacity=".2" fill="none"/>`,
  }),
  panels: (ink, wood) => ({
    w: 48,
    h: 600,
    svg:
      `<rect width="48" height="600" fill="${wood.l}" opacity=".62"/><rect width="2" height="600" fill="${wood.d}" opacity=".5"/>` +
      `<path d="M14 0 C12 150 18 300 14 600 M32 0 C35 200 29 380 33 600" stroke="${wood.d}" stroke-width="1.4" opacity=".22" fill="none"/>`,
  }),
  stars: (ink) => ({
    w: 96,
    h: 96,
    svg:
      `<path d="M22 14 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" fill="${ink}" opacity=".3"/>` +
      `<path d="M70 60 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" fill="${ink}" opacity=".26"/>` +
      `<circle cx="72" cy="20" r="1.8" fill="${ink}" opacity=".3"/><circle cx="30" cy="74" r="1.6" fill="${ink}" opacity=".26"/>`,
  }),
  botanical: (ink) => {
    const sprig = (x, y, r) =>
      `<g transform="translate(${x} ${y}) rotate(${r})" fill="${ink}" opacity=".24">` +
      `<path d="M0 0 C2 -12 1 -24 0 -34" stroke="${ink}" stroke-width="1.6" fill="none"/>` +
      `<ellipse cx="-6" cy="-10" rx="6" ry="3" transform="rotate(-35 -6 -10)"/><ellipse cx="6" cy="-17" rx="6" ry="3" transform="rotate(35 6 -17)"/>` +
      `<ellipse cx="-5" cy="-25" rx="5" ry="2.6" transform="rotate(-35 -5 -25)"/><ellipse cx="1" cy="-36" rx="2.8" ry="4.5"/></g>`
    return { w: 110, h: 110, svg: sprig(28, 50, -12) + sprig(82, 104, 14) }
  },
}

// top and bottom of the floor gradient, joint lines, and what the floor is made of
export const FLOORS = {
  oak: { top: '#7c533b', bottom: '#946449', line: '#6d4832', kind: 'boards' },
  birch: { top: '#b48c66', bottom: '#c9a37b', line: '#957150', kind: 'boards' },
  walnut: { top: '#553628', bottom: '#6b4634', line: '#3c261b', kind: 'boards' },
  tiles: { top: '#cfc7b8', bottom: '#ddd6c9', line: '#aaa092', alt: '#bdb4a4', kind: 'tiles' },
  carpet: { top: '#6f5f80', bottom: '#85759a', line: '#5c4d6c', kind: 'carpet' },
  concrete: { top: '#86837f', bottom: '#98958f', line: '#6f6c68', kind: 'concrete' },
}

// main, light fold, fold lines
export const CURTAINS = {
  teal: ['#4f7d7a', '#6a9b97', '#3f6663'],
  mustard: ['#c9963a', '#dcae57', '#a47a2c'],
  rose: ['#c9707e', '#dc8b97', '#a85a67'],
  navy: ['#34466e', '#4a5d88', '#283757'],
  sage: ['#7f9a74', '#9ab58e', '#66805d'],
  plum: ['#7a4a6e', '#946386', '#5f3857'],
  cream: ['#e2d5bd', '#f1e8d6', '#c4b59b'],
  charcoal: ['#44414a', '#5a5661', '#333038'],
}

// base colour, desk top, lit edge
export const WOODS = {
  honey: ['#a8754f', '#b98460', '#c99670'],
  walnut: ['#7a5238', '#8c6043', '#a0724f'],
  pale: ['#d2b48c', '#dcc19a', '#e8d2ae'],
  cherry: ['#a4533a', '#b56244', '#c47552'],
  ebony: ['#4b3a35', '#5a4640', '#6e5850'],
  white: ['#e6e0d6', '#f2ede5', '#fbf8f3'],
}
/** Shades of one wood for the desk, shelves and chair, darkest to lightest. */
export function woodOf(id) {
  const [b, top, hi] = WOODS[id] || WOODS.honey
  // pale woods keep lighter shadows, or they would look grey
  const k = luma(b) > 0.8 ? 0.45 : 1
  return {
    xd: shade(b, -0.5 * k),
    dd: shade(b, -0.45 * k),
    d: shade(b, -0.37 * k),
    m: shade(b, -0.26 * k),
    n: shade(b, -0.22 * k),
    b: shade(b, -0.18 * k),
    l: b,
    top,
    hi,
  }
}

// lamp light: pool inner and outer, bulb glow inner and outer, the lit rim of the shade.
// gain tones down pale light, which would otherwise wash the room out.
export const LAMPS = {
  warm: { pool: ['#ffb35c', '#ff9a52'], bulb: ['#fff1c9', '#ffc977'], rim: '#f6dcaa', core: '#fff4d6' },
  soft: { gain: 0.8, pool: ['#ffe0b8', '#ffd2a0'], bulb: ['#fffaf0', '#ffe6c4'], rim: '#f8eedb', core: '#fffaf0' },
  cool: { gain: 0.85, pool: ['#a9d4ff', '#86bcff'], bulb: ['#f2f8ff', '#b8dcff'], rim: '#e3f0ff', core: '#f4f9ff' },
  pink: { pool: ['#ff8fc4', '#ff6fa8'], bulb: ['#ffe6f1', '#ff9fc8'], rim: '#ffd0e4', core: '#fff0f6' },
  violet: { pool: ['#b48cff', '#9466ff'], bulb: ['#efe6ff', '#c3a6ff'], rim: '#dccbff', core: '#f5efff' },
  green: { pool: ['#8dffb4', '#5ee39a'], bulb: ['#eafff1', '#a6f5c4'], rim: '#c9f7da', core: '#f0fff5' },
  rgb: { pool: ['#ff8fb0', '#ff8fb0'], bulb: ['#fff1f6', '#ffb0c8'], rim: '#ffe0ea', core: '#fff6f9', cycle: true },
}

export const FAIRY = {
  multi: ['#ffd27a', '#ff9fb3', '#9fd6ff', '#b8ffb0', '#ffcf8a'],
  warm: ['#ffe0a0', '#ffd27a', '#fff0c8'],
  pink: ['#ff9fc0', '#ffc2d6', '#ff7fae'],
  blue: ['#a8dcff', '#d6f0ff', '#86c6ff'],
  green: ['#a6ffb8', '#d0ffd9', '#7ef09a'],
  purple: ['#c7a6ff', '#e0ccff', '#a982ff'],
  rainbow: ['#ff8fa3', '#ffd27a', '#b8ffb0', '#9fd6ff', '#c7a6ff'],
}

/** Swatch colour for a room style option. */
export function styleSwatch(field, value) {
  if (field === 'wall') return (WALLS[value] || WALLS.cream)[0]
  if (field === 'floor') return (FLOORS[value] || FLOORS.oak).bottom
  if (field === 'curtain') return (CURTAINS[value] || CURTAINS.teal)[0]
  if (field === 'wood') return (WOODS[value] || WOODS.honey)[0]
  if (field === 'light') return (LAMPS[value] || LAMPS.warm).pool[0]
  return null
}
