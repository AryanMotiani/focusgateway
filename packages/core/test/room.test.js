import { describe, it, expect } from 'vitest'
import { createBackend } from '../src/backend.js'
import { migrate, defaultState } from '../src/state.js'
import { UNLOCKS } from '../src/unlocks.js'
import { MILESTONES } from '../src/milestones.js'
import { AVATAR_OPTIONS, DEFAULT_AVATAR, ROOM_MAX_ITEMS, defaultRoom, isRoomItemId, sanitizeRoom } from '../src/room.js'

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
    const r = sanitizeRoom({ avatar: { hair: 'mohawk<script>', skin: 's6', topColor: 'teal', glasses: 1, extra: 'x' } }, cur)
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
        room: { avatar: { build: 'fem', hair: 'hijab', headphones: true }, items: [{ id: 'obj-lamp', x: 700.7, y: 566 }, { id: 'hack' }] },
      },
    })
    ;({ state } = await be.dispatch('state.get'))
    expect(state.settings.room.avatar).toMatchObject({ build: 'fem', hair: 'hijab', headphones: true, topColor: 'green' })
    expect(state.settings.room.items).toEqual([{ id: 'obj-lamp', x: 701, y: 566 }])
    await be.dispatch('settings.update', { patch: { room: { avatar: { build: 'robot' } } } })
    ;({ state } = await be.dispatch('state.get'))
    expect(state.settings.room.avatar.build).toBe('fem')
    expect(state.settings.room.items).toHaveLength(1)
  })
})
