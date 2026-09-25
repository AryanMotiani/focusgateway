// The study room: avatar options, placed decor and the validation for `settings.room`.
// Positions are in room units: the room is drawn in a fixed 1600 x 900 box, and an item's
// x, y is the middle of its bottom edge (where it touches its surface).
import { UNLOCKS } from './unlocks.js'
import { MILESTONES } from './milestones.js'

export const ROOM_SIZE = { w: 1600, h: 900 }
export const ROOM_MAX_ITEMS = 60

export const AVATAR_OPTIONS = {
  build: ['neutral', 'masc', 'fem'],
  skin: ['s1', 's2', 's3', 's4', 's5', 's6'],
  hair: ['short', 'long', 'ponytail', 'bun', 'curly', 'buzz', 'bob', 'hijab'],
  hairColor: ['black', 'espresso', 'brown', 'auburn', 'blonde', 'grey', 'pink', 'blue'],
  top: ['hoodie', 'sweater', 'tshirt'],
  topColor: ['green', 'navy', 'maroon', 'mustard', 'lavender', 'charcoal', 'cream', 'teal', 'coral'],
}

export const DEFAULT_AVATAR = {
  build: 'neutral',
  skin: 's3',
  hair: 'short',
  hairColor: 'espresso',
  top: 'hoodie',
  topColor: 'green',
  headphones: false,
  glasses: false,
}

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
  return { avatar: { ...DEFAULT_AVATAR }, items: DEFAULT_ROOM_ITEMS.map((i) => ({ ...i })) }
}

const OBJECT_IDS = new Set(UNLOCKS.filter((u) => u.kind === 'object').map((u) => u.id))
const MILESTONE_IDS = new Set(MILESTONES.map((m) => m.id))

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
 * Validates a (partial) room patch against the current room. Unknown avatar values fall
 * back, items are checked, deduplicated, clamped to the room and capped. Levels are not
 * rechecked here: the UI only offers what is unlocked, and a locked item is simply not drawn.
 */
export function sanitizeRoom(patch, current = defaultRoom()) {
  const cur = current && typeof current === 'object' ? current : defaultRoom()
  const p = patch && typeof patch === 'object' ? patch : {}
  return {
    avatar: sanitizeAvatar(p.avatar, sanitizeAvatar(cur.avatar)),
    items: 'items' in p ? sanitizeItems(p.items) : sanitizeItems(cur.items),
  }
}
