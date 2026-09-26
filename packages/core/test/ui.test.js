import { describe, it, expect } from 'vitest'
import { createBackend } from '../src/backend.js'
import { migrate, defaultState } from '../src/state.js'
import { mergeUi, sanitizeUi, unionUi, UI_LIST_MAX } from '../src/ui.js'
import { SHOP_ITEMS } from '../src/economy.js'

const PIN = '246810'
const REASON = 'I want to break my own rule because this is only a practice run'
const item = SHOP_ITEMS.find((i) => i.price).id

function memory(initial = null) {
  let saved = initial
  return { load: async () => (saved ? structuredClone(saved) : null), save: async (s) => (saved = structuredClone(s)), peek: () => saved }
}

describe('ui: what was already seen', () => {
  it('is empty by default and filled in for older saves', () => {
    expect(defaultState().ui).toEqual({ tours: [], tips: [], flags: [], shopKnown: null })
    const old = migrate({ tasks: [], settings: {} })
    expect(old.ui).toEqual({ tours: [], tips: [], flags: [], shopKnown: null })
  })

  it('migrate drops unknown flags, odd ids, unknown shop items and caps the lists', () => {
    const ui = migrate({
      ui: {
        tours: ['room', 'room', 'BAD ID', 7, '<script>', ...Array.from({ length: 60 }, (_, i) => `t${i}`)],
        tips: 'focus',
        flags: ['blocking-intro-hidden', 'make-me-admin'],
        shopKnown: { [item]: 2, nope: 1, [SHOP_ITEMS[0].id]: 9 },
      },
    }).ui
    expect(ui.tours).toHaveLength(UI_LIST_MAX)
    expect(ui.tours).not.toContain('BAD ID')
    expect(ui.tips).toEqual([])
    expect(ui.flags).toEqual(['blocking-intro-hidden'])
    expect(ui.shopKnown).toEqual({ [item]: 2 })
    expect(sanitizeUi(null)).toEqual({ tours: [], tips: [], flags: [], shopKnown: null })
  })

  it('mergeUi only adds, keeps the highest shop rank and rejects bad input', () => {
    let v = mergeUi(null, { tours: ['room'], tips: ['focus'], shopKnown: { [item]: 2 } }).value
    v = mergeUi(v, { tours: ['welcome', 'room'], shopKnown: { [item]: 1 } }).value
    expect(v.tours.sort()).toEqual(['room', 'welcome'])
    expect(v.tips).toEqual(['focus'])
    expect(v.shopKnown[item]).toBe(2)
    expect(mergeUi(v, { flags: ['nope'] }).error).toBeTruthy()
    expect(mergeUi(v, { tours: 'room' }).error).toBeTruthy()
    expect(mergeUi(v, { tours: Array.from({ length: 41 }, (_, i) => `t${i}`) }).error).toBeTruthy()
    expect(mergeUi(v, { shopKnown: { nope: 1 } }).error).toBeTruthy()
    expect(mergeUi(v, null).error).toBeTruthy()
    expect(unionUi({ tours: ['room'] }, { tours: ['today'], flags: ['blocking-start-seen'] })).toMatchObject({
      tours: ['room', 'today'],
      flags: ['blocking-start-seen'],
    })
  })

  it('ui.mark validates and saves, without a PIN', async () => {
    const storage = memory()
    const be = createBackend({ storage, hashIterations: 1000 })
    await be.dispatch('setup.pin', { pin: PIN })
    const r = await be.dispatch('ui.mark', { tours: ['room'], flags: ['blocking-intro-hidden'] })
    expect(r.state.ui).toMatchObject({ tours: ['room'], flags: ['blocking-intro-hidden'] })
    expect(storage.peek().ui.tours).toEqual(['room'])
    await expect(be.dispatch('ui.mark', { flags: ['everything'] })).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(be.dispatch('ui.mark', { tours: [{ id: 1 }] })).rejects.toMatchObject({ code: 'VALIDATION' })
    expect((await be.dispatch('state.get')).state.ui.tours).toEqual(['room'])
  })

  it('setup.adopt carries the website seen list into the extension, joined with what the extension saw', async () => {
    let saved = null
    let clock = Date.now()
    const web = createBackend({
      storage: { load: async () => saved, save: async (s) => (saved = structuredClone(s)) },
      now: () => clock,
      hashIterations: 1000,
    })
    await web.dispatch('setup.pin', { pin: PIN })
    await web.dispatch('setup.step', { step: 'recoverySaved' })
    await web.dispatch('failsafe.start', { target: { type: 'practice' } })
    await web.dispatch('failsafe.continue')
    await web.dispatch('failsafe.pin', { pin: PIN })
    clock += 11_000
    await web.dispatch('failsafe.confirm', { confirmation: REASON })
    await web.dispatch('setup.complete')
    await web.dispatch('ui.mark', { tours: ['room'], tips: ['focus'], flags: ['blocking-start-seen'], shopKnown: { [item]: 2 } })

    const ext = createBackend({ storage: memory(), hashIterations: 1000 })
    await ext.dispatch('ui.mark', { tips: ['player'] }) // looked around the extension page first
    await ext.dispatch('setup.adopt', { state: saved })
    const { state } = await ext.dispatch('state.get')
    expect(state.onboarding.completed).toBe(true)
    expect(state.ui.tours).toContain('room')
    expect(state.ui.tips.sort()).toEqual(['focus', 'player'])
    expect(state.ui.flags).toEqual(['blocking-start-seen'])
    expect(state.ui.shopKnown).toEqual({ [item]: 2 })

    // a damaged ui section in the handed over setup is cleaned, not trusted
    const ext2 = createBackend({ storage: memory(), hashIterations: 1000 })
    await ext2.dispatch('setup.adopt', { state: { ...saved, ui: { tours: ['<b>'], flags: ['root'] } } })
    expect((await ext2.dispatch('state.get')).state.ui).toMatchObject({ tours: [], flags: [] })
  })
})
