// Colours for the avatar options. The option ids, names and unlock levels live in
// packages/core/src/options.js.
export const SKIN = {
  s1: ['#f7dcc8', '#e8bfa6'],
  s2: ['#efc6a4', '#dba784'],
  s3: ['#dca47c', '#c38660'],
  s4: ['#bf825a', '#a26a45'],
  s5: ['#8f5d3e', '#774a2f'],
  s6: ['#5f3d2b', '#4b2f20'],
}
export const HAIR = {
  black: ['#26212b', '#3b3442'],
  espresso: ['#3f2a22', '#5a3d30'],
  brown: ['#7a4b2f', '#9a6444'],
  auburn: ['#9a4527', '#bb6038'],
  blonde: ['#d9b36a', '#ecd08f'],
  grey: ['#a9a4ab', '#c9c5cb'],
  copper: ['#b8612f', '#d6824c'],
  red: ['#b3322e', '#d24f45'],
  platinum: ['#e4d8bd', '#f5eedc'],
  pink: ['#e39bb5', '#f3bfd1'],
  blue: ['#5a78c8', '#7f9ae0'],
  purple: ['#7a55b0', '#9a7ad0'],
  teal: ['#2f8f8f', '#52b3b0'],
  green: ['#4f8f5a', '#71b27a'],
  white: ['#e9e8ee', '#ffffff'],
}
// head coverings and hats read better in fabric colours than in hair colours
export const WRAP = {
  black: ['#2f2b36', '#46404f'],
  espresso: ['#7a5c8a', '#9479a3'],
  brown: ['#b0835d', '#c79c77'],
  auburn: ['#a8503c', '#c46a54'],
  blonde: ['#e3cfa6', '#efe0c2'],
  grey: ['#8e97a8', '#aab2c1'],
  copper: ['#c0703f', '#d68a5a'],
  red: ['#b8413b', '#d05a52'],
  platinum: ['#ece4d4', '#f7f1e6'],
  pink: ['#d98ca3', '#eaaabd'],
  blue: ['#4f7fa8', '#6f9cc2'],
  purple: ['#7b5ca8', '#9679c0'],
  teal: ['#3f8c8a', '#5aa8a5'],
  green: ['#5f8f68', '#7aab82'],
  white: ['#f1eee8', '#ffffff'],
}
/** Hair styles that are fabric: the hair colour picks the fabric colour instead. */
export const HEADWEAR = new Set(['hijab', 'beanie', 'cap', 'bandana'])

export const TOP = {
  green: ['#4f8a5b', '#3e7049'],
  navy: ['#34466e', '#283757'],
  charcoal: ['#4a4652', '#39353f'],
  cream: ['#e8dcc6', '#cfc0a6'],
  black: ['#2b2830', '#1f1d23'],
  maroon: ['#8a3b4a', '#6f2e3b'],
  white: ['#f1eee8', '#d9d3c9'],
  sky: ['#7fb3dd', '#6497c2'],
  mustard: ['#d6a33e', '#b88630'],
  olive: ['#7a7f45', '#62663a'],
  red: ['#c9453f', '#a83631'],
  lavender: ['#9b8ac4', '#806fa8'],
  teal: ['#3f8f8c', '#317371'],
  pink: ['#e99ab4', '#cf7e99'],
  orange: ['#e58a3a', '#c4712b'],
  coral: ['#e07a64', '#c4624e'],
  purple: ['#7b4fa6', '#643f89'],
}
// band and cups, ear pad
export const PHONES = {
  charcoal: ['#3a3342', '#e9e1d6'],
  white: ['#efebe5', '#b7b0a9'],
  pink: ['#ec9ab5', '#fde6ee'],
  mint: ['#86ceb2', '#effaf5'],
  red: ['#d9463f', '#2e2a36'],
  gold: ['#d6ae55', '#3a3342'],
  blue: ['#3a74f0', '#e3ebff'],
}
// frame colour, width of the temple arm
export const GLASSES = {
  classic: { c: '#2e2a36', w: 3.2 },
  round: { c: '#c9a24a', w: 2.2 },
  square: { c: '#1f1c24', w: 4.4 },
  tortoise: { c: '#7a4526', w: 3.6, spots: '#c8843e' },
}
export const EARRING = { gold: '#f0c35a', pearl: '#f7f1e8' }

/** Swatch colour for a colour option of any avatar field. */
export function swatchOf(field, value, hair) {
  if (field === 'skin') return SKIN[value]?.[0]
  if (field === 'hairColor') return (HEADWEAR.has(hair) ? WRAP : HAIR)[value]?.[0]
  if (field === 'topColor') return TOP[value]?.[0]
  if (field === 'headphonesColor') return PHONES[value]?.[0]
  return null
}
