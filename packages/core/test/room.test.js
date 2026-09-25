import { describe, it, expect } from 'vitest'
import { createBackend } from '../src/backend.js'
import { migrate, defaultState } from '../src/state.js'
import { UNLOCKS } from '../src/unlocks.js'
import { MILESTONES } from '../src/milestones.js'
import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR,
  DEFAULT_STYLE,
  STYLE_OPTIONS,
  ROOM_MAX_ITEMS,
  defaultRoom,
  isRoomItemId,
  sanitizeRoom,
  roomLockError,
} from '../src/room.js'
import { OPTION_UNLOCKS, optionsFor, isOptionUnlocked, optionLabel } from '../src/options.js'
import { newlyUnlocked, nextUnlocks, unlockKind } from '../src/unlocks.js'
import { xpToReach } from '../src/progress.js'
import { ownsFn } from '../src/economy.js'

function memoryStorage() {
  let saved = null
  return {
    load: async () => (saved ? structuredClone(saved) : null),
    save: async (s) => {
      saved = structuredClone(s)
    },
  }
}

describe('decor catalog', () => {
  const objects = UNLOCKS.filter((u) => u.kind === 'object')
  it('keeps every older object id', () => {
    for (const id of [
      'obj-mug',
      'obj-plant',
      'obj-lamp',
      'obj-cat',
      'obj-plant-2',
      'obj-books',
      'obj-lights',
      'obj-plant-3',
      'obj-candle',
      'obj-globe',
      'obj-telescope',
      'obj-trophy',
    ])
      expect(objects.some((o) => o.id === id)).toBe(true)
  })
  it('gives every item a surface and a size, with unique ids spread over levels 1 to 50', () => {
    expect(objects.length).toBeGreaterThanOrEqual(25)
    expect(new Set(UNLOCKS.map((u) => u.id)).size).toBe(UNLOCKS.length)
    for (const o of objects) {
      expect(['wall', 'shelf', 'desk', 'floor', 'sill', 'any']).toContain(o.surface)
      expect(o.w).toBeGreaterThan(0)
      expect(o.h).toBeGreaterThan(0)
    }
    expect(Math.min(...objects.map((o) => o.level))).toBe(1)
    expect(Math.max(...objects.map((o) => o.level))).toBe(50)
  })
  it('only uses level 1 items in the starting room', () => {
    for (const it of defaultRoom().items) expect(objects.find((o) => o.id === it.id).level).toBe(1)
  })
})

describe('room validation', () => {
  it('accepts catalog ids and badge ids, rejects everything else', () => {
    expect(isRoomItemId('obj-mug')).toBe(true)
    expect(isRoomItemId('badge:tasks-10')).toBe(true)
    expect(isRoomItemId('badge:tasks-11')).toBe(false)
    expect(isRoomItemId('scene-night')).toBe(false)
    expect(isRoomItemId('obj-nope')).toBe(false)
    expect(isRoomItemId(42)).toBe(false)
  })

  it('whitelists avatar options and keeps the current value for bad input', () => {
    const cur = { avatar: { ...DEFAULT_AVATAR, hair: 'bun' }, items: [] }
    const r = sanitizeRoom({ avatar: { hair: 'mullet<script>', skin: 's6', topColor: 'teal', glasses: 1, extra: 'x' } }, cur)
    expect(r.avatar.hair).toBe('bun')
    expect(r.avatar.skin).toBe('s6')
    expect(r.avatar.topColor).toBe('teal')
    expect(r.avatar.glasses).toBe(true)
    expect(r.avatar).not.toHaveProperty('extra')
    for (const [k, allowed] of Object.entries(AVATAR_OPTIONS)) expect(allowed).toContain(r.avatar[k])
  })

  it('clamps, rounds, deduplicates and caps items', () => {
    const r = sanitizeRoom({
      items: [
        { id: 'obj-mug', x: -40, y: 9999.6 },
        { id: 'obj-mug', x: 10, y: 10 },
        { id: 'obj-unknown', x: 1, y: 1 },
        { id: 'badge:streak-7', x: 100.4, y: '200' },
        { id: 'obj-cat', x: 'abc', y: 3 },
        null,
      ],
    })
    expect(r.items).toEqual([
      { id: 'obj-mug', x: 0, y: 900 },
      { id: 'badge:streak-7', x: 100, y: 200 },
    ])
    const many = UNLOCKS.filter((u) => u.kind === 'object')
      .map((u) => ({ id: u.id, x: 5, y: 5 }))
      .concat(MILESTONES.map((m) => ({ id: 'badge:' + m.id, x: 1, y: 1 })))
    expect(many.length).toBeGreaterThan(ROOM_MAX_ITEMS)
    expect(sanitizeRoom({ items: many }).items).toHaveLength(ROOM_MAX_ITEMS)
  })

  it('keeps items when only the avatar changes, and the reverse', () => {
    const cur = defaultRoom()
    expect(sanitizeRoom({ avatar: { hair: 'curly' } }, cur).items).toEqual(cur.items)
    expect(sanitizeRoom({ items: [] }, cur).avatar).toEqual(cur.avatar)
    expect(sanitizeRoom({ items: 'nope' }, cur).items).toEqual([])
  })

  it('migrates old saves to the default room and repairs broken ones', () => {
    const old = defaultState()
    delete old.settings.room
    expect(migrate(old).settings.room).toEqual(defaultRoom())
    const broken = defaultState()
    broken.settings.room = { avatar: { hair: 'nope' }, items: [{ id: 'obj-mug', x: 5000, y: 10 }] }
    const m = migrate(broken).settings.room
    expect(m.avatar.hair).toBe(DEFAULT_AVATAR.hair)
    expect(m.items).toEqual([{ id: 'obj-mug', x: 1600, y: 10 }])
  })

  it('settings.update validates the room patch', async () => {
    const be = createBackend({ storage: memoryStorage(), hashIterations: 1000 })
    await be.dispatch('setup.pin', { pin: '246810' })
    let { state } = await be.dispatch('state.get')
    expect(state.settings.room).toEqual(defaultRoom())
    await be.dispatch('settings.update', {
      patch: {
        room: {
          avatar: { build: 'fem', hair: 'hijab', headphones: true },
          items: [{ id: 'obj-succulent', x: 700.7, y: 566 }, { id: 'hack' }],
        },
      },
    })
    ;({ state } = await be.dispatch('state.get'))
    expect(state.settings.room.avatar).toMatchObject({ build: 'fem', hair: 'hijab', headphones: true, topColor: 'green' })
    expect(state.settings.room.items).toEqual([{ id: 'obj-succulent', x: 701, y: 566 }])
    await be.dispatch('settings.update', { patch: { room: { avatar: { build: 'robot' } } } })
    ;({ state } = await be.dispatch('state.get'))
    expect(state.settings.room.avatar.build).toBe('fem')
    expect(state.settings.room.items).toHaveLength(1)
  })
})

/** A state with enough finished high priority tasks to be at `level`. */
const doneTask = (i, priority) => ({ id: 't' + i, title: 'x', status: 'done', priority, createdAt: 0, completedAt: (i + 1) * 86_400_000 })
function stateAtLevel(level) {
  const s = defaultState()
  const n = Math.ceil(xpToReach(level) / 30)
  // one task a day, each made well before it was finished, so the anti-farming caps never bite
  s.tasks = Array.from({ length: n }, (_, i) => doneTask(i, 'high'))
  return s
}
function backendWith(state) {
  let saved = structuredClone(state)
  return createBackend({
    storage: { load: async () => structuredClone(saved), save: async (s) => void (saved = structuredClone(s)) },
    hashIterations: 1000,
  })
}

describe('option unlocks', () => {
  it('has a level for every avatar and style value, with unique entries', () => {
    const keys = OPTION_UNLOCKS.map((o) => o.field + ':' + o.value)
    expect(new Set(keys).size).toBe(keys.length)
    for (const [field, list] of Object.entries({ ...AVATAR_OPTIONS, ...STYLE_OPTIONS }))
      expect(optionsFor(field).map((o) => o.value)).toEqual(list)
  })

  it('keeps the defaults and identity options free, prices the rest and gates the rare ones up to 50', () => {
    for (const [k, v] of Object.entries({ ...DEFAULT_AVATAR, ...DEFAULT_STYLE }))
      if (typeof v === 'string') expect(isOptionUnlocked(k, v, 1), k).toBe(true)
    for (const f of ['build', 'skin']) expect(optionsFor(f).every((o) => o.level === 1)).toBe(true)
    for (const h of ['hijab', 'bald', 'afro', 'braids', 'locs']) expect(isOptionUnlocked('hair', h, 1)).toBe(true)
    expect(optionsFor('hair').length).toBeGreaterThanOrEqual(22)
    expect(optionsFor('hairColor').length).toBeGreaterThanOrEqual(14)
    expect(optionsFor('topColor').length).toBeGreaterThanOrEqual(17)
    for (const [k, v] of Object.entries({ ...DEFAULT_AVATAR, ...DEFAULT_STYLE }))
      if (typeof v === 'string') expect(optionsFor(k).find((o) => o.value === v).price, k).toBe(0)
    for (const f of ['build', 'skin']) expect(optionsFor(f).every((o) => o.price === 0)).toBe(true)
    const sold = OPTION_UNLOCKS.filter((o) => o.price > 0)
    expect(sold.length).toBeGreaterThan(80)
    // free things never need a level, and a level gate only sits on rarer things
    expect(OPTION_UNLOCKS.filter((o) => !o.price).every((o) => o.level === 1)).toBe(true)
    expect(sold.filter((o) => o.level > 1).every((o) => o.level >= 10)).toBe(true)
    expect(Math.max(...sold.map((o) => o.level))).toBe(50)
    // cheap early, dear late
    const avg = (l) => l.reduce((a, o) => a + o.price, 0) / l.length
    expect(avg(sold.filter((o) => o.level >= 20))).toBeGreaterThan(avg(sold.filter((o) => o.level === 1)) * 3)
    expect(isOptionUnlocked('hair', 'mohawk', 21)).toBe(false)
    expect(isOptionUnlocked('hair', 'mohawk', 22)).toBe(true)
    expect(isOptionUnlocked('hair', 'nope', 99)).toBe(false)
  })

  it('shows up in level-up and coming-up lists with a clear kind', () => {
    const got = newlyUnlocked(9, 10)
    expect(got.some((u) => u.kind === 'object')).toBe(true)
    const beanie = got.find((u) => u.id === 'opt:hair:beanie')
    expect(beanie).toMatchObject({ kind: 'option', field: 'hair', value: 'beanie', level: 10, name: 'Beanie', price: 225 })
    expect(unlockKind(beanie)).toBe('Hairstyle')
    expect(optionLabel(beanie)).toBe('Hairstyle: Beanie')
    expect(unlockKind({ kind: 'object' })).toBe('Room object')
    const next = nextUnlocks(1, 5)
    expect(next.every((u) => u.level === 10)).toBe(true)
    expect(newlyUnlocked(1, 50).some((u) => u.level === 1)).toBe(false)
  })
})

describe('room style', () => {
  it('fills in defaults, whitelists values and clamps the brightness', () => {
    expect(defaultRoom().style).toEqual(DEFAULT_STYLE)
    const r = sanitizeRoom({ style: { wall: 'sage', floor: 'lava', brightness: 0.05, hack: 1 } })
    expect(r.style).toEqual({ ...DEFAULT_STYLE, wall: 'sage', brightness: 0.3 })
    expect(sanitizeRoom({ style: { brightness: 'x' } }).style.brightness).toBe(1)
    expect(sanitizeRoom({ style: { brightness: 0.666 } }).style.brightness).toBe(0.67)
    const old = defaultState()
    delete old.settings.room.style
    expect(migrate(old).settings.room.style).toEqual(DEFAULT_STYLE)
  })
})

const owning = (ids) => {
  const has = ownsFn({ shop: { purchases: ids.map((id) => ({ id, price: 1, at: 1 })) } })
  return has
}

describe('room locks', () => {
  it('reports the first locked change and ignores what is already saved', () => {
    const free = owning([])
    const prev = defaultRoom()
    const next = sanitizeRoom({ avatar: { hair: 'afro', topColor: 'lavender' } }, prev)
    expect(roomLockError(next, prev, free)).toBe('Top colour Lavender unlocks at level 12, then it is in the shop for 275 coins.')
    expect(roomLockError(next, prev, owning(['opt:topColor:lavender']))).toBe(null)
    // saved before (grandfathered): keeping it is fine, other edits too
    const saved = sanitizeRoom({ avatar: { hair: 'mohawk' }, style: { light: 'rgb' }, items: [{ id: 'obj-trophy', x: 1, y: 1 }] })
    expect(roomLockError(sanitizeRoom({ avatar: { skin: 's5' } }, saved), saved, free)).toBe(null)
    expect(roomLockError(sanitizeRoom({ style: { floor: 'tiles' } }, saved), saved, free)).toBe(
      'Floor Tiles unlocks at level 13, then it is in the shop for 300 coins.',
    )
    const items = sanitizeRoom({ items: [...saved.items, { id: 'obj-lamp', x: 700, y: 566 }] }, saved)
    expect(roomLockError(items, saved, free)).toBe('Desk lamp is in the shop for 275 coins.')
    expect(roomLockError(items, saved, owning(['obj-lamp']))).toBe(null)
    const badge = sanitizeRoom({ items: [{ id: 'badge:streak-7', x: 1, y: 1 }] }, saved)
    expect(roomLockError(badge, saved, free)).toMatch(/badge to place it/)
    expect(roomLockError(badge, saved, free, new Set(['streak-7']))).toBe(null)
  })

  it('settings.update only accepts owned options and items, and shop.buy makes them owned', async () => {
    const state = stateAtLevel(4) // 20 high priority tasks: 160 coins
    state.shop.giftAt = 1 // plus the 150 coin starter gift
    const be = backendWith(state)
    await be.dispatch('setup.pin', { pin: '246810' })
    const update = (room) => be.dispatch('settings.update', { patch: { room } })
    await expect(update({ avatar: { hair: 'bob' } })).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Hairstyle Bob is in the shop for 130 coins.',
    })
    await expect(update({ style: { wall: 'charcoal' } })).rejects.toThrow(
      'Wall colour Charcoal unlocks at level 32, then it is in the shop for 675 coins.',
    )
    await expect(update({ items: [{ id: 'obj-cat', x: 700, y: 566 }] })).rejects.toThrow('Sleepy cat is in the shop for 375 coins.')
    await expect(update({ items: [{ id: 'badge:streak-7', x: 300, y: 300 }] })).rejects.toThrow(/badge/)
    // free starter options, identity options and brightness are fine
    await update({
      avatar: { hair: 'afro', hairColor: 'auburn', top: 'tshirt', skin: 's6', build: 'masc' },
      style: { pattern: 'plain', brightness: 0.5 },
    })
    // bought things are fine too
    expect((await be.dispatch('shop.buy', { id: 'opt:hair:bob' })).data).toMatchObject({ price: 130, balance: 180 })
    await update({ avatar: { hair: 'bob' } })
    expect((await be.dispatch('shop.buy', { id: 'obj-corkboard' })).data.balance).toBe(0)
    await expect(be.dispatch('shop.buy', { id: 'obj-mug' })).rejects.toMatchObject({
      code: 'NOT_ENOUGH_COINS',
      message: 'You need 130 more coins for Warm mug.',
    })
    await update({ items: [{ id: 'obj-corkboard', x: 300, y: 400 }] })
    const { state: after } = await be.dispatch('state.get')
    expect(after.settings.room.avatar).toMatchObject({ hair: 'bob', hairColor: 'auburn', top: 'tshirt', skin: 's6', build: 'masc' })
    expect(after.settings.room.style).toMatchObject({ pattern: 'plain', brightness: 0.5, wall: 'cream' })
    expect(after.settings.room.items.map((i) => i.id)).toEqual(['obj-corkboard'])
    expect(after.shop.purchases.map((p) => p.id)).toEqual(['opt:hair:bob', 'obj-corkboard'])
  })

  it('keeps values saved at a higher level after the level drops', async () => {
    const s = stateAtLevel(1)
    s.settings.room = sanitizeRoom({ avatar: { hair: 'mohawk' }, style: { light: 'rgb' }, items: [{ id: 'obj-trophy', x: 700, y: 566 }] })
    const be = backendWith(s)
    await be.dispatch('setup.pin', { pin: '246810' })
    await be.dispatch('settings.update', { patch: { room: { ...s.settings.room, avatar: { ...s.settings.room.avatar, skin: 's2' } } } })
    const { state } = await be.dispatch('state.get')
    expect(state.settings.room.avatar).toMatchObject({ hair: 'mohawk', skin: 's2' })
    expect(state.settings.room.style.light).toBe('rgb')
    expect(state.settings.room.items).toHaveLength(1)
  })

  it('lets earned badges be placed', async () => {
    const s = stateAtLevel(1)
    s.tasks = Array.from({ length: 10 }, (_, i) => doneTask(i, 'low'))
    const be = backendWith(s)
    await be.dispatch('setup.pin', { pin: '246810' })
    await be.dispatch('settings.update', { patch: { room: { items: [{ id: 'badge:tasks-10', x: 300, y: 300 }] } } })
    const { state } = await be.dispatch('state.get')
    expect(state.settings.room.items.map((i) => i.id)).toEqual(['badge:tasks-10'])
  })
})
