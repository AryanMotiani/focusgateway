// The study room: avatar options, placed decor and the validation for `settings.room`.
// Positions are in room units: the room is drawn in a fixed 1600 x 900 box, and an item's
// x, y is the middle of its bottom edge (where it touches its surface).
import { UNLOCKS } from './unlocks.js'
import { MILESTONES } from './milestones.js'
import { optionsFor, optionOf } from './options.js'
import { shopItem, shopHint, optionId } from './economy.js'

export const ROOM_SIZE = { w: 1600, h: 900 }
export const ROOM_MAX_ITEMS = 60

const values = (field) => optionsFor(field).map((o) => o.value)

// Every valid value of each avatar field (the levels are in options.js)
export const AVATAR_OPTIONS = {
  build: values('build'),
  skin: values('skin'),
  hair: values('hair'),
  hairColor: values('hairColor'),
  top: values('top'),
  topColor: values('topColor'),
  headphonesColor: values('headphonesColor'),
  glassesStyle: values('glassesStyle'),
  earrings: values('earrings'),
}

export const DEFAULT_AVATAR = {
  build: 'neutral',
  skin: 's3',
  hair: 'short',
  hairColor: 'espresso',
  top: 'hoodie',
  topColor: 'green',
  headphones: false,
  headphonesColor: 'charcoal',
  glasses: false,
  glassesStyle: 'classic',
  earrings: 'none',
}

// How the room itself looks: walls, floor, curtains, wood and the light.
export const STYLE_OPTIONS = {
  wall: values('wall'),
  pattern: values('pattern'),
  floor: values('floor'),
  curtain: values('curtain'),
  wood: values('wood'),
  light: values('light'),
  fairy: values('fairy'),
}

export const DEFAULT_STYLE = {
  wall: 'cream',
  pattern: 'dots',
  floor: 'oak',
  curtain: 'teal',
  wood: 'honey',
  light: 'warm',
  brightness: 1, // lamp brightness, 0.3 to 1
  fairy: 'multi',
}
export const BRIGHTNESS_RANGE = [0.3, 1]

// A few level 1 things, placed nicely, for a brand new room. New unlocks go to the tray.
export const DEFAULT_ROOM_ITEMS = [
  { id: 'obj-rug-round', x: 830, y: 896 },
  { id: 'obj-books-row', x: 270, y: 262 },
  { id: 'obj-succulent', x: 1400, y: 302 },
  { id: 'obj-clock', x: 1300, y: 190 },
  { id: 'obj-poster-wave', x: 440, y: 500 },
  { id: 'obj-pencup', x: 610, y: 566 },
]

export function defaultRoom() {
  return { avatar: { ...DEFAULT_AVATAR }, style: { ...DEFAULT_STYLE }, items: DEFAULT_ROOM_ITEMS.map((i) => ({ ...i })) }
}

const OBJECTS = Object.fromEntries(UNLOCKS.filter((u) => u.kind === 'object').map((u) => [u.id, u]))
const OBJECT_IDS = new Set(Object.keys(OBJECTS))
const MILESTONE_IDS = new Set(MILESTONES.map((m) => m.id))
const MILESTONE_NAME = Object.fromEntries(MILESTONES.map((m) => [m.id, m.name]))

/** Catalog ids and `badge:<milestone id>` are the only things that can be placed. */
export function isRoomItemId(id) {
  if (typeof id !== 'string') return false
  if (id.startsWith('badge:')) return MILESTONE_IDS.has(id.slice(6))
  return OBJECT_IDS.has(id)
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function sanitizeAvatar(input, base = DEFAULT_AVATAR) {
  const src = input && typeof input === 'object' ? input : {}
  const out = { ...DEFAULT_AVATAR, ...base }
  for (const [k, allowed] of Object.entries(AVATAR_OPTIONS)) {
    if (allowed.includes(src[k])) out[k] = src[k]
    else if (!allowed.includes(out[k])) out[k] = DEFAULT_AVATAR[k]
  }
  for (const k of ['headphones', 'glasses']) if (k in src) out[k] = !!src[k]
  out.headphones = !!out.headphones
  out.glasses = !!out.glasses
  for (const k of Object.keys(out)) if (!(k in DEFAULT_AVATAR)) delete out[k]
  return out
}

export function sanitizeStyle(input, base = DEFAULT_STYLE) {
  const src = input && typeof input === 'object' ? input : {}
  const out = { ...DEFAULT_STYLE, ...base }
  for (const [k, allowed] of Object.entries(STYLE_OPTIONS)) {
    if (allowed.includes(src[k])) out[k] = src[k]
    else if (!allowed.includes(out[k])) out[k] = DEFAULT_STYLE[k]
  }
  const b = Number('brightness' in src ? src.brightness : out.brightness)
  out.brightness = Number.isFinite(b) ? Math.round(clamp(b, ...BRIGHTNESS_RANGE) * 100) / 100 : DEFAULT_STYLE.brightness
  for (const k of Object.keys(out)) if (!(k in DEFAULT_STYLE)) delete out[k]
  return out
}

export function sanitizeItems(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  const out = []
  for (const it of input) {
    if (out.length >= ROOM_MAX_ITEMS) break
    if (!it || !isRoomItemId(it.id) || seen.has(it.id)) continue
    const x = Number(it.x)
    const y = Number(it.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    seen.add(it.id)
    out.push({ id: it.id, x: Math.round(clamp(x, 0, ROOM_SIZE.w)), y: Math.round(clamp(y, 0, ROOM_SIZE.h)) })
  }
  return out
}

/**
 * Validates a (partial) room patch against the current room. Unknown avatar and style values
 * fall back, items are checked, deduplicated, clamped to the room and capped. Ownership is
 * checked separately by `roomLockError` (the backend runs it on every change).
 */
export function sanitizeRoom(patch, current = defaultRoom()) {
  const cur = current && typeof current === 'object' ? current : defaultRoom()
  const p = patch && typeof patch === 'object' ? patch : {}
  return {
    avatar: sanitizeAvatar(p.avatar, sanitizeAvatar(cur.avatar)),
    style: sanitizeStyle(p.style, sanitizeStyle(cur.style)),
    items: 'items' in p ? sanitizeItems(p.items) : sanitizeItems(cur.items),
  }
}

/**
 * The first thing a room change tries to use without owning it, as an error message, or null.
 * `owns(id)` says whether a shop item is owned (free ones always are, see economy.js).
 * Only changes are checked: an avatar or style value that differs from the saved one, or an
 * item that was not placed before. So what is already saved always stays.
 * `achieved` is the set of milestone ids earned so far (badges can be placed once earned).
 */
export function roomLockError(next, prev, owns, achieved = new Set()) {
  for (const [group, fields] of [
    ['avatar', AVATAR_OPTIONS],
    ['style', STYLE_OPTIONS],
  ]) {
    for (const field of Object.keys(fields)) {
      const v = next[group]?.[field]
      if (v === prev?.[group]?.[field]) continue
      if (optionOf(field, v) && !owns(optionId(field, v))) return shopHint(shopItem(optionId(field, v)))
    }
  }
  const had = new Set((prev?.items || []).map((i) => i.id))
  for (const it of next.items || []) {
    if (had.has(it.id)) continue
    if (it.id.startsWith('badge:')) {
      if (!achieved.has(it.id.slice(6))) return `Earn the ${MILESTONE_NAME[it.id.slice(6)]} badge to place it.`
      continue
    }
    if (OBJECTS[it.id] && !owns(it.id)) return shopHint(shopItem(it.id))
  }
  return null
}
