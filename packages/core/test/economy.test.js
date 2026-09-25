import { describe, it, expect, beforeEach } from 'vitest'
import { createBackend } from '../src/backend.js'
import { migrate, defaultState } from '../src/state.js'
import { dateKey } from '../src/time.js'
import {
  COINS,
  FOCUS_COIN_DAILY_CAP,
  TASK_COIN_DAILY_CAP,
  HABIT_COIN_DAILY_CAP,
  SHOP_ITEMS,
  shopItem,
  coinsOf,
  canBuy,
  affordableItems,
  sessionReward,
  studyStreak,
  streakPct,
  focusLive,
  sanitizeShop,
  grandfatherShop,
  ownsFn,
  defaultCoinStats,
  MIGRATION_START_CAP,
} from '../src/economy.js'

const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime() // 21 = Monday
const MIN = 60_000

function memoryStorage(initial = null) {
  let saved = initial ? structuredClone(initial) : null
  return {
    load: async () => (saved ? structuredClone(saved) : null),
    save: async (s) => {
      saved = structuredClone(s)
    },
    peek: () => saved,
  }
}

let clock, be, storage
async function fresh(start = at(21, 8), initial = null) {
  clock = start
  storage = memoryStorage(initial)
  be = createBackend({ storage, now: () => clock, hashIterations: 1000 })
  await be.dispatch('setup.pin', { pin: '246810' })
}
const coins = () => coinsOf(storage.peek())
async function focus(workMin, iterations = 1, { stopAfter } = {}) {
  await be.dispatch('focus.start', { workMin, breakMin: 5, iterations, siteIds: ['youtube'] })
  if (stopAfter != null) {
    clock += stopAfter * MIN
    await be.dispatch('focus.stop', { confirmation: 'I want to stop this focus session because my family needs me right now' })
  } else {
    clock += (workMin * iterations + 5 * (iterations - 1)) * MIN
    await be.dispatch('system.tick')
  }
  return storage.peek().focus.history.at(-1)
}

describe('the catalog', () => {
  it('has unique ids, whole prices and a price on everything above level 1', () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(SHOP_ITEMS.length)
    for (const i of SHOP_ITEMS) {
      expect(Number.isInteger(i.price) && i.price >= 0, i.id).toBe(true)
      if (i.level > 1) expect(i.price, i.id).toBeGreaterThan(0)
    }
    expect(shopItem('obj-mug')).toMatchObject({ category: 'decor', price: 130, level: 1 })
    expect(shopItem('opt:hair:bob')).toMatchObject({ category: 'avatar', field: 'hair', value: 'bob' })
    expect(shopItem('opt:wall:mint')).toMatchObject({ category: 'room' })
    expect(shopItem('scene-forest')).toMatchObject({ category: 'scenes' })
    expect(shopItem('music-jazz')).toMatchObject({ category: 'music' })
    expect(shopItem('nope')).toBe(null)
  })

  it('prices small things at a day or two of study and big ones at a week or more', () => {
    const day = 100 // about an hour of focus, a few tasks and habits
    const sold = SHOP_ITEMS.filter((i) => i.price)
    expect(Math.min(...sold.map((i) => i.price))).toBeLessThanOrEqual(day)
    expect(sold.filter((i) => i.level === 1 && i.price <= 2 * day).length).toBeGreaterThan(10)
    const bigDecor = sold.filter((i) => i.category === 'decor' && i.level >= 10)
    expect(bigDecor.every((i) => i.price >= 5 * day)).toBe(true)
    expect(COINS.gift).toBeGreaterThanOrEqual(Math.min(...sold.map((i) => i.price)))
  })
})

describe('focus coins', () => {
  beforeEach(() => fresh())

  it('pays a coin a minute, a completion bonus, the first session bonus, and stores them on the session', async () => {
    const h = await focus(25)
    // 25 minutes + 25% for finishing (6) + 10 first of the day, day one of the streak (x1)
    expect(h.reward).toMatchObject({ coins: 41, base: 25, bonus: 6, first: 10, streak: 1, pct: 100, xp: 10 })
    expect(coins().breakdown.focus).toBe(41)
    // the second session today has no first of the day bonus
    const h2 = await focus(25)
    expect(h2.reward).toMatchObject({ coins: 31, first: 0 })
    expect(coins().breakdown.focus).toBe(72)
  })

  it('pays no completion bonus when stopped early, and nothing extra for tiny sessions', async () => {
    const early = await focus(50, 1, { stopAfter: 20 })
    expect(early.reward).toMatchObject({ base: 20, bonus: 0, first: 10, coins: 30 })
    await fresh()
    // many one minute "sessions" pay one coin each and never a bonus
    for (let i = 0; i < 10; i++) await focus(1)
    expect(coins().breakdown.focus).toBe(10)
  })

  it('multiplies by the study streak, +10% a day after the first, up to +50%', async () => {
    const pays = []
    for (let d = 21; d <= 28; d++) {
      clock = at(d, 9)
      pays.push((await focus(40)).reward)
    }
    expect(pays.map((r) => r.streak)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(pays.map((r) => r.pct)).toEqual([100, 110, 120, 130, 140, 150, 150, 150])
    // 40 + 10 bonus = 50, times the streak, plus 10 for the first session
    expect(pays.map((r) => r.coins)).toEqual([60, 65, 70, 75, 80, 85, 85, 85])
    // a missed day resets it
    clock = at(30, 9)
    expect((await focus(40)).reward.streak).toBe(1)
  })

  it('caps focus coins per day', async () => {
    for (let i = 0; i < 4; i++) await focus(120)
    expect(coins().breakdown.focus).toBe(FOCUS_COIN_DAILY_CAP)
    const last = storage.peek().focus.history.at(-1)
    expect(last.reward).toMatchObject({ coins: 0, capped: true })
    // the next day pays again
    clock = at(22, 9)
    expect((await focus(25)).reward.coins).toBeGreaterThan(0)
  })

  it('keeps earned coins when the focus history is trimmed', async () => {
    await focus(25)
    const s = storage.peek()
    s.focus.history = []
    expect(coinsOf(s).breakdown.focus).toBe(41)
  })
})

describe('the live preview', () => {
  beforeEach(() => fresh())

  it('grows with the focused time, never pays for breaks, and ends where the backend does', async () => {
    const start = clock
    await be.dispatch('focus.start', { workMin: 25, breakMin: 5, iterations: 2, siteIds: ['youtube'] })
    const s = storage.peek()
    expect(focusLive(s, start).now.coins).toBe(0)
    const ten = focusLive(s, start + 10 * MIN + 30_000)
    expect(ten.now).toMatchObject({ base: 10, first: 0, coins: 10 })
    expect(ten.toNext).toBeCloseTo(0.5)
    // past 15 minutes the first session of the day bonus shows up
    expect(focusLive(s, start + 16 * MIN).now).toMatchObject({ first: 10, coins: 26 })
    // the break pays nothing
    expect(focusLive(s, start + 28 * MIN).now.base).toBe(25)
    const preview = focusLive(s, start + 28 * MIN).done
    expect(preview).toMatchObject({ base: 50, bonus: 13, first: 10, coins: 73 })
    clock = start + 55 * MIN
    await be.dispatch('system.tick')
    expect(storage.peek().focus.history.at(-1).reward.coins).toBe(preview.coins)
    expect(focusLive(storage.peek(), clock)).toBe(null)
  })

  it('knows the streak and the daily cap', () => {
    const c = defaultCoinStats()
    c.days = { [dateKey(at(19, 9))]: 30, [dateKey(at(20, 9))]: 20, [dateKey(at(18, 9))]: 5 }
    expect(studyStreak(c.days, dateKey(at(21, 9)))).toBe(2) // today has nothing yet, still alive
    expect(sessionReward(c, { minutes: 20, completed: true, at: at(21, 9) }).streak).toBe(3)
    expect(streakPct(1)).toBe(100)
    expect(streakPct(99)).toBe(150)
    c.paid[dateKey(at(21, 9))] = FOCUS_COIN_DAILY_CAP - 5
    expect(sessionReward(c, { minutes: 60, at: at(21, 9) })).toMatchObject({ coins: 5, capped: true })
  })
})

describe('task, habit and discipline coins', () => {
  it('follows the XP anti-farming rules: minimum age, daily caps, derived from state', () => {
    const s = migrate(defaultState(), at(1, 0))
    const task = (i, extra) => ({
      id: 't' + i,
      title: 'x',
      status: 'done',
      priority: 'medium',
      createdAt: at(21, 8),
      completedAt: at(21, 9),
      ...extra,
    })
    s.tasks = [task(1), task(2, { deadline: at(21, 10) }), task(3, { createdAt: at(21, 8, 55) }), task(4, { parentId: 't1' })]
    // 5 + (5 + 2 on time) + 0 (made 5 minutes before) + 1 subtask
    expect(coinsOf(s).breakdown.tasks).toBe(13)
    s.tasks = Array.from({ length: 30 }, (_, i) => task(i, { priority: 'high' }))
    expect(coinsOf(s).breakdown.tasks).toBe(TASK_COIN_DAILY_CAP)
    s.tasks = []
    expect(coinsOf(s).breakdown.tasks).toBe(0)
    s.habitLogs = { a: { '2026-09-21': true, '2026-09-22': true }, b: { '2026-09-21': true } }
    expect(coinsOf(s).breakdown.habits).toBe(3 * COINS.habit)
    s.habitLogs = Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['h' + i, { '2026-09-21': true }]))
    expect(coinsOf(s).breakdown.habits).toBe(HABIT_COIN_DAILY_CAP)
    s.stats.events = { window_unlocked: 2, window_respected: 1, failsafe_resisted: 1 }
    expect(coinsOf(s).breakdown.discipline).toBe(2 * 5 + 5 + 3)
  })
})

describe('buying', () => {
  beforeEach(async () => {
    const s = defaultState()
    s.tasks = Array.from({ length: 40 }, (_, i) => ({
      id: 't' + i,
      title: 'x',
      status: 'done',
      priority: 'high',
      createdAt: 0,
      completedAt: (i + 1) * 86_400_000,
    }))
    await fresh(at(21, 8), s) // 40 x 8 = 320 coins, level 4
  })

  it('checks the item, the level, what is owned and the balance', async () => {
    const buy = (id) => be.dispatch('shop.buy', { id })
    await expect(buy('obj-unicorn')).rejects.toMatchObject({ code: 'VALIDATION', message: 'That is not in the shop.' })
    await expect(buy('obj-clock')).rejects.toMatchObject({ code: 'VALIDATION', message: 'Wall clock is free and already yours.' })
    await expect(buy('obj-beanbag')).rejects.toMatchObject({ code: 'VALIDATION', message: 'Beanbag unlocks at level 10.' })
    await expect(buy('scene-snow')).rejects.toMatchObject({ code: 'NOT_ENOUGH_COINS', message: 'You need 255 more coins for Snowy peaks.' })
    const r = await buy('obj-lamp')
    expect(r.data).toEqual({ id: 'obj-lamp', price: 275, balance: 45 })
    expect(r.state.shop.purchases).toEqual([{ id: 'obj-lamp', price: 275, at: clock }])
    await expect(buy('obj-lamp')).rejects.toMatchObject({ message: 'You already own Desk lamp.' })
    expect(coinsOf(r.state)).toMatchObject({ earned: 320, spent: 275, balance: 45 })
    expect(r.state.log.at(-1)).toMatchObject({ type: 'shop_purchase', itemId: 'obj-lamp', price: 275 })
  })

  it('lists what is affordable now, cheapest first', () => {
    const s = storage.peek()
    const list = affordableItems(s, 4)
    expect(list.length).toBeGreaterThan(5)
    expect(list.every((i) => i.price <= 320 && i.level <= 4)).toBe(true)
    expect(list[0].price).toBeLessThanOrEqual(list.at(-1).price)
    expect(canBuy(s, 'obj-lamp', 4).ok).toBe(true)
  })

  it('gives the starter gift once', async () => {
    const r = await be.dispatch('shop.gift')
    expect(r.data).toEqual({ coins: COINS.gift, balance: 320 + COINS.gift })
    await expect(be.dispatch('shop.gift')).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('makes bought scenes and music usable, and keeps purchases through export and import', async () => {
    const lofi = (patch) => be.dispatch('settings.update', { patch: { lofi: patch } })
    await expect(lofi({ scene: 'scene-forest' })).rejects.toMatchObject({ code: 'VALIDATION' })
    await be.dispatch('shop.gift')
    await be.dispatch('shop.buy', { id: 'scene-forest' })
    expect((await lofi({ scene: 'scene-forest' })).state.settings.lofi.scene).toBe('scene-forest')
    const exported = (await be.dispatch('data.export')).data
    await be.dispatch('data.import', { data: exported, pin: '246810' })
    expect(storage.peek().shop.purchases.map((p) => p.id)).toEqual(['scene-forest'])
  })
})

describe('migration', () => {
  it('grandfathers what an old save placed and picked, and starts it with coins for past focus', async () => {
    const old = defaultState()
    delete old.shop
    delete old.stats
    old.settings.room.avatar.hair = 'mohawk'
    old.settings.room.style.light = 'rgb'
    old.settings.room.items.push({ id: 'obj-cat', x: 700, y: 566 }, { id: 'badge:streak-7', x: 10, y: 10 })
    old.settings.lofi.scene = 'scene-aurora'
    old.settings.lofi.style = 'music-jazz'
    old.focus.history = [
      { focusedMin: 50, startedAt: at(10, 9), endedAt: at(10, 10) },
      { focusedMin: 400, startedAt: at(11, 9), endedAt: at(11, 17) }, // capped at 300 that day
    ]
    const s = migrate(old, at(21, 8))
    const ids = s.shop.purchases.map((p) => p.id).sort()
    expect(ids).toEqual(['music-jazz', 'obj-cat', 'opt:hair:mohawk', 'opt:light:rgb', 'scene-aurora'])
    expect(s.shop.purchases.every((p) => p.price === 0)).toBe(true)
    expect(coinsOf(s)).toMatchObject({ spent: 0, retired: 0, balance: 350, breakdown: { focus: 350 } })
    // and the backend accepts keeping all of it
    await fresh(at(21, 8), old)
    const r = await be.dispatch('settings.update', { patch: { room: { avatar: { skin: 's2' } }, lofi: { volume: 0.4 } } })
    expect(r.state.settings.room.avatar.hair).toBe('mohawk')
    expect(r.state.settings.room.items.map((i) => i.id)).toContain('obj-cat')
    expect(coinsOf(r.state).balance).toBe(350)
  })

  it('caps the starting balance of a long history', () => {
    const old = defaultState()
    delete old.shop
    delete old.stats
    old.focus.history = Array.from({ length: 30 }, (_, i) => ({ focusedMin: 100, endedAt: at(1, 10) + i * 86_400_000 }))
    const s = migrate(old, at(21, 8))
    expect(coinsOf(s)).toMatchObject({ earned: 3000, retired: 3000 - MIGRATION_START_CAP, balance: MIGRATION_START_CAP })
    // what is earned after that counts in full
    s.shop.giftAt = 1
    expect(coinsOf(s).balance).toBe(MIGRATION_START_CAP + COINS.gift)
    expect(migrate(s).shop.retired).toBe(1500)
  })

  it('leaves new and already migrated saves alone', () => {
    expect(migrate(null).shop).toEqual({ purchases: [], giftAt: 0, retired: 0 })
    expect(grandfatherShop(defaultState()).purchases).toEqual([]) // the starter room is all free
    const s = migrate(defaultState())
    s.shop.purchases.push({ id: 'obj-mug', price: 130, at: 5 })
    s.stats.coins.earned = 500
    const again = migrate(s)
    expect(again.shop.purchases).toEqual([{ id: 'obj-mug', price: 130, at: 5 }])
    expect(again.stats.coins.earned).toBe(500)
  })

  it('cleans stored purchases', () => {
    const shop = sanitizeShop({
      purchases: [
        { id: 'obj-mug', price: 130, at: 5 },
        { id: 'obj-mug', price: 130, at: 6 },
        { id: 'obj-clock', price: 0, at: 1 },
        { id: 'nope', price: 5, at: 1 },
        { id: 'opt:hair:bob', price: -4, at: 'x' },
        null,
      ],
      giftAt: 'soon',
    })
    expect(shop).toEqual({
      purchases: [
        { id: 'obj-mug', price: 130, at: 5 },
        { id: 'opt:hair:bob', price: 0, at: 0 },
      ],
      giftAt: 0,
      retired: 0,
    })
    const has = ownsFn({ shop })
    expect(has('obj-mug')).toBe(true)
    expect(has('obj-clock')).toBe(true) // free
    expect(has('obj-lamp')).toBe(false)
    expect(has('nope')).toBe(false)
  })
})
