// The study room model: where the surfaces are, how a dragged item snaps onto them, which
// items the player owns, and saving `settings.room`. Everything is in room units
// (the room is 1600 x 900), and an item's x, y is the middle of its bottom edge.
import { computed, reactive, watch } from 'vue'
import { UNLOCKS, MILESTONES, defaultRoom, sanitizeRoom, isUnlocked } from '@focusgateway/core'
import { ART, badgeArt } from '../components/room/art.js'
import { store, call } from './store.js'
import { progress, milestones } from './rewards.js'

export const ROOM_W = 1600
export const ROOM_H = 900
export const FLOOR_Y = 760
// window glass, and the block around it (frame, curtains) where wall decor can not go
export const GLASS = { x: 612, y: 122, w: 376, h: 306 }
export const WINDOW_BLOCK = { x1: 530, x2: 1070, y1: 66, y2: 520 }
export const LINES = [
  { kind: 'shelf', x1: 148, x2: 452, y: 262 },
  { kind: 'shelf', x1: 1178, x2: 1462, y: 302 },
  { kind: 'desk', x1: 520, x2: 1080, y: 566 },
  { kind: 'sill', x1: 588, x2: 1012, y: 450 },
]
export const FLOOR = { y1: 790, y2: 898 }
const SURFACES_FOR = {
  wall: ['wall'],
  shelf: ['shelf'],
  desk: ['desk'],
  sill: ['sill'],
  floor: ['floor'],
  any: ['shelf', 'desk', 'sill', 'floor'],
}

const OBJECTS = UNLOCKS.filter((u) => u.kind === 'object')
const OBJ = Object.fromEntries(OBJECTS.map((o) => [o.id, o]))
const MS = Object.fromEntries(MILESTONES.map((m) => [m.id, m]))

/** Everything needed to draw and place an item: size, surface, name and drawing. */
export function itemMeta(id) {
  if (id.startsWith('badge:')) {
    const m = MS[id.slice(6)]
    if (!m) return null
    const a = badgeArt(m)
    return { id, name: m.name, surface: a.surface, w: a.w, h: a.h, svg: a.svg, badge: m }
  }
  const o = OBJ[id]
  const a = ART[id]
  if (!o || !a) return null
  return { id, name: o.name, level: o.level, surface: o.surface, w: o.w, h: o.h, svg: a.svg, glow: a.glow, flat: a.flat }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const overlapsBlock = (x, y, w, h) =>
  x + w / 2 > WINDOW_BLOCK.x1 && x - w / 2 < WINDOW_BLOCK.x2 && y > WINDOW_BLOCK.y1 && y - h < WINDOW_BLOCK.y2

/**
 * Where an item lands if dropped with its bottom middle at (px, py): the closest spot on a
 * surface it is allowed on. Wall items are kept off the window.
 */
export function snap(meta, px, py) {
  const kinds = SURFACES_FOR[meta.surface] || SURFACES_FOR.any
  let best = null
  const consider = (x, y, kind) => {
    const d = Math.hypot(x - px, (y - py) * 1.4)
    if (!best || d < best.d) best = { x: Math.round(x), y: Math.round(y), d, kind }
  }
  for (const l of LINES) {
    if (!kinds.includes(l.kind)) continue
    const half = Math.min(meta.w / 2, (l.x2 - l.x1) / 2)
    consider(clamp(px, l.x1 + half, l.x2 - half), l.y, l.kind)
  }
  if (kinds.includes('floor')) consider(clamp(px, meta.w / 2, ROOM_W - meta.w / 2), clamp(py, FLOOR.y1, FLOOR.y2), 'floor')
  if (kinds.includes('wall')) {
    const x = clamp(px, meta.w / 2 + 6, ROOM_W - meta.w / 2 - 6)
    const y = clamp(py, meta.h + 24, FLOOR_Y - 14)
    if (!overlapsBlock(x, y, meta.w, meta.h)) consider(x, y, 'wall')
    else {
      // push it out of the window area: left, right or below, whichever is closest
      const left = WINDOW_BLOCK.x1 - meta.w / 2
      const right = WINDOW_BLOCK.x2 + meta.w / 2
      if (left >= meta.w / 2) consider(left, y, 'wall')
      if (right <= ROOM_W - meta.w / 2) consider(right, y, 'wall')
      const below = WINDOW_BLOCK.y2 + meta.h
      if (below <= FLOOR_Y - 14) consider(x, below, 'wall')
    }
  }
  return best
}

/** Drawing layer for a placed item: back (wall, shelf, sill), desk, or floor depth. */
export function layerOf(meta, y) {
  if (meta.flat) return 'rug'
  if (y >= FLOOR_Y + 4) return y < 812 ? 'floorBack' : y < 866 ? 'floorMid' : 'floorFront'
  if (Math.abs(y - 566) < 2 && meta.surface !== 'wall') return 'desk'
  return 'back'
}

// ---- the player's room
const clone = (r) => JSON.parse(JSON.stringify(sanitizeRoom(r)))
export const room = reactive(clone(store.state?.settings?.room || defaultRoom()))
let synced = JSON.stringify(room)
let saveT = null
let pending = false
// take the saved room when it changes elsewhere (first load, another tab, an import),
// unless there are local edits still waiting to be saved
watch(
  () => store.state?.settings?.room,
  (r) => {
    if (!r || pending) return
    const json = JSON.stringify(clone(r))
    if (json === synced) return
    synced = json
    Object.assign(room, JSON.parse(json))
  },
)
watch(
  () => JSON.stringify(room),
  (json) => {
    if (!store.state || json === synced) return
    pending = true
    clearTimeout(saveT)
    saveT = setTimeout(async () => {
      synced = JSON.stringify(room)
      try {
        await call('settings.update', { patch: { room: JSON.parse(synced) } })
      } catch {}
      pending = false
    }, 700)
  },
)

export const level = computed(() => progress.value?.level || 1)
const achieved = computed(() => new Set(milestones.value.filter((m) => m.achieved).map((m) => m.id)))

/** Can this item be shown right now: an unlocked object, or an earned badge. */
export function owns(id) {
  if (id.startsWith('badge:')) return achieved.value.has(id.slice(6))
  return isUnlocked(id, level.value)
}

/** The tray: every object (locked ones too) and every badge, with their state. */
export const inventory = computed(() => {
  const placed = new Set(room.items.map((i) => i.id))
  const objects = OBJECTS.map((o) => ({ ...itemMeta(o.id), owned: isUnlocked(o.id, level.value), placed: placed.has(o.id) }))
  const badges = milestones.value.map((m) => ({
    ...itemMeta('badge:' + m.id),
    owned: m.achieved,
    placed: placed.has('badge:' + m.id),
    progress: m,
  }))
  return { objects, badges }
})

export const placedItems = computed(() =>
  room.items
    .map((it) => {
      const meta = itemMeta(it.id)
      return meta && owns(it.id) ? { ...it, meta, layer: layerOf(meta, it.y) } : null
    })
    .filter(Boolean),
)

export function placeItem(id, x, y) {
  const i = room.items.findIndex((it) => it.id === id)
  if (i >= 0) room.items.splice(i, 1, { id, x, y })
  else if (room.items.length < 60) room.items.push({ id, x, y })
}
export function removeItem(id) {
  const i = room.items.findIndex((it) => it.id === id)
  if (i >= 0) room.items.splice(i, 1)
}

// a sensible first spot when an item is tapped in the tray instead of dragged
const START = { wall: [300, 520], shelf: [1320, 302], desk: [700, 566], sill: [700, 450], floor: [1250, 870], any: [700, 566] }
export function quickPlace(id) {
  const meta = itemMeta(id)
  if (!meta) return
  const [sx, sy] = START[meta.surface] || START.any
  // step sideways until it does not sit on top of something already there
  for (let k = 0; k < 14; k++) {
    const dx = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 70
    const p = snap(meta, sx + dx, sy)
    const clash = placedItems.value.some(
      (o) => o.id !== id && Math.abs(o.y - p.y) < 30 && Math.abs(o.x - p.x) < (o.meta.w + meta.w) / 2 - 6,
    )
    if (!clash) return placeItem(id, p.x, p.y)
  }
  const p = snap(meta, sx, sy)
  placeItem(id, p.x, p.y)
}

// ---- dragging, shared by the tray and the room
export const drag = reactive({ id: null, meta: null, clientX: 0, clientY: 0, spot: null, overTray: false, grab: { x: 0, y: 0 } })
