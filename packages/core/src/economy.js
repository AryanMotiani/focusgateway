// Coins and the shop.
//
// Coins are earned next to XP and spent in the shop on things for the study room (decor,
// avatar options, room styles, scenes and music). Like XP, what you earned is worked out
// from the state, and what you spent is stored: balance = earned - spent.
//
// Where coins come from, with the same anti-farming rules as XP (see progress.js):
//
//  - Focus sessions: COINS.focusPerMin (1) per focused minute. Finishing every round of a
//    session of at least 15 minutes adds a completion bonus of 25%. The first session of
//    the day that reaches 15 minutes adds COINS.firstOfDay (10). The study streak (days in a
//    row with 15+ focused minutes) multiplies the session's coins by +10% per day after the
//    first, up to +50%. All focus coins together are capped at FOCUS_COIN_DAILY_CAP (300)
//    per day. They are paid when a session ends and counted in state.stats.coins, which only
//    ever grows, so trimming the focus history never takes coins away.
//  - Tasks: derived from state.tasks like task XP: 3 / 5 / 8 by priority, +2 when done on
//    time, 1 per subtask, only for tasks that existed 10 minutes before they were done,
//    capped at TASK_COIN_DAILY_CAP (40) per day.
//  - Habits: 3 per check, capped at HABIT_COIN_DAILY_CAP (15) per day.
//  - Discipline events: from the same capped counters as XP (5 / 5 / 3 coins).
//  - The starter gift: COINS.gift (150) once, claimed from the welcome card in the room.
//
// Spending: state.shop.purchases = [{ id, price, at }]. Purchases are permanent. Items with
// no price are the free starter set and owned by everyone.
//
// Old saves: migrate() backfills state.stats.coins from the focus history (1 coin per
// minute, capped per day), so existing users start with coins from their past study (tasks,
// habits and discipline count too, they are derived anyway). A long history would buy most
// of the shop on day one, so the starting balance is capped at MIGRATION_START_CAP (1500):
// anything above it is recorded once as shop.retired. grandfatherShop() also records
// everything already placed or selected as owned (price 0), so nothing disappears.
import { dateKey, fromDateKey, addDays, DAY } from './time.js'
import { UNLOCKS } from './unlocks.js'
import { OPTION_UNLOCKS, OPTION_FIELDS } from './options.js'
import { TASK_MIN_AGE_MS, EVENT_TYPES, xpForFocus } from './progress.js'
import { focusEndsAt } from './engine.js'
import { trackById } from './tracks.js'

export const COIN_NAME = 'coins'

export const COINS = {
  focusPerMin: 1,
  completionBonus: 0.25, // share of a session's minute coins, for finishing every round
  bonusMinMinutes: 15, // shorter sessions get no completion or first of the day bonus
  firstOfDay: 10,
  streakStepPct: 10, // +10% per study streak day after the first
  streakMaxSteps: 5, // up to +50%
  task: { low: 3, medium: 5, high: 8 },
  onTimeBonus: 2,
  subtask: 1,
  habit: 3,
  events: { window_unlocked: 5, window_respected: 5, failsafe_resisted: 3 },
  gift: 150,
}
export const FOCUS_COIN_DAILY_CAP = 300
export const TASK_COIN_DAILY_CAP = 40
export const HABIT_COIN_DAILY_CAP = 15
/** Focused minutes a day needs to count for the study streak. */
export const STREAK_DAY_MIN = 15
/** The most an old save starts with when the shop arrives. */
export const MIGRATION_START_CAP = 1500
/** How many days of per-day minutes and coins are kept (enough for streaks and caps). */
const KEEP_DAYS = 60

const count = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0)
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

// ---- the catalog: everything that can be owned

const CATEGORY = { object: 'decor', scene: 'scenes', music: 'music' }
const AVATAR_FIELDS = new Set(['build', 'skin', 'hair', 'hairColor', 'top', 'topColor', 'headphonesColor', 'glassesStyle', 'earrings'])
export const SHOP_CATEGORIES = [
  { id: 'decor', label: 'Decor' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'room', label: 'Room style' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'music', label: 'Music' },
]

/** The shop id of an avatar or room style option. */
export const optionId = (field, value) => `opt:${field}:${value}`

/** Every ownable thing: { id, kind, category, name, level, price, (field, value for options) }. */
export const SHOP_ITEMS = [
  ...UNLOCKS.map((u) => ({ ...u, price: u.price || 0, category: CATEGORY[u.kind] })),
  ...OPTION_UNLOCKS.map((o) => ({
    id: optionId(o.field, o.value),
    kind: 'option',
    category: AVATAR_FIELDS.has(o.field) ? 'avatar' : 'room',
    ...o,
    price: o.price || 0,
  })),
]
const BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]))
export const shopItem = (id) => BY_ID.get(id) || null
/** "Hairstyle: Bob", "Room object: Desk lamp" style label parts. */
export const shopKind = (item) =>
  item.kind === 'option' ? OPTION_FIELDS[item.field] : { object: 'Decor', scene: 'Scene', music: 'Music style' }[item.kind]

/** Why an item can not be used yet, for error messages: "Bob is in the shop for 130 coins." */
export function shopHint(item) {
  const name = item.kind === 'option' ? `${OPTION_FIELDS[item.field]} ${item.name}` : item.name
  if (item.level > 1) return `${name} unlocks at level ${item.level}, then it is in the shop for ${item.price} coins.`
  return `${name} is in the shop for ${item.price} coins.`
}

// ---- the shop state: purchases and the starter gift

export function defaultShop() {
  return { purchases: [], giftAt: 0, retired: 0 }
}

/** Cleans stored or imported shop data: known priced ids, once each, whole numbers. */
export function sanitizeShop(input) {
  const src = input && typeof input === 'object' ? input : {}
  const out = defaultShop()
  const seen = new Set()
  for (const p of Array.isArray(src.purchases) ? src.purchases : []) {
    const item = BY_ID.get(p?.id)
    if (!item || !item.price || seen.has(p.id)) continue
    seen.add(p.id)
    out.purchases.push({ id: p.id, price: count(p.price), at: count(p.at) })
  }
  out.giftAt = count(src.giftAt)
  out.retired = count(src.retired)
  return out
}

/**
 * For a save from before the shop: everything placed in the room and every avatar, room
 * style, scene and music choice that is now sold counts as bought for 0 coins.
 */
export function grandfatherShop(state, at = Date.now()) {
  const shop = defaultShop()
  const add = (id) => {
    const item = BY_ID.get(id)
    if (item && item.price && !shop.purchases.some((p) => p.id === id)) shop.purchases.push({ id, price: 0, at })
  }
  const room = state?.settings?.room || {}
  for (const it of Array.isArray(room.items) ? room.items : []) add(it?.id)
  for (const group of [room.avatar, room.style])
    for (const [field, value] of Object.entries(group || {})) if (typeof value === 'string') add(optionId(field, value))
  const lofi = state?.settings?.lofi || {}
  add(lofi.scene)
  add(lofi.style)
  add(trackById(lofi.track)?.style)
  // start with coins for past study, up to MIGRATION_START_CAP
  const past = coinsOf({ ...state, shop }).earned
  shop.retired = Math.max(0, past - MIGRATION_START_CAP)
  return shop
}

/** A fast "does this state own it" check for many lookups. */
export function ownsFn(state) {
  const bought = new Set((state?.shop?.purchases || []).map((p) => p.id))
  return (id) => {
    const item = BY_ID.get(id)
    return !!item && (!item.price || bought.has(id))
  }
}
export const owns = (state, id) => ownsFn(state)(id)
/** A track plays when its music style is owned. */
export const trackOwned = (id, has) => {
  const t = trackById(id)
  return !!t && has(t.style)
}

// ---- earning: focus coins are counted when a session ends

export function defaultCoinStats() {
  return { earned: 0, days: {}, paid: {} } // days: dateKey -> focused minutes, paid: dateKey -> focus coins
}

function pruneCoinStats(c, now) {
  const oldest = now - KEEP_DAYS * DAY
  for (const k of ['days', 'paid']) for (const d of Object.keys(c[k])) if (fromDateKey(d) < oldest) delete c[k][d]
}

export function sanitizeCoinStats(input, now = Date.now()) {
  const src = input && typeof input === 'object' ? input : {}
  const out = defaultCoinStats()
  out.earned = count(src.earned)
  for (const k of ['days', 'paid']) for (const [d, v] of Object.entries(src[k] || {})) if (DAY_KEY.test(d)) out[k][d] = count(v)
  pruneCoinStats(out, now)
  return out
}

/** Coin counters for a save that has none: 1 coin per focused minute, capped per day. */
export function backfillCoinStats(state, now = Date.now()) {
  const out = defaultCoinStats()
  const perDay = {}
  for (const h of Array.isArray(state?.focus?.history) ? state.focus.history : []) {
    const m = count(h?.focusedMin)
    const day = dateKey(Number(h?.endedAt) || Number(h?.startedAt) || now)
    perDay[day] = (perDay[day] || 0) + m
  }
  for (const [day, m] of Object.entries(perDay)) {
    const coins = Math.min(m * COINS.focusPerMin, FOCUS_COIN_DAILY_CAP)
    out.earned += coins
    out.days[day] = m
    out.paid[day] = coins
  }
  pruneCoinStats(out, now)
  return out
}

const coinStatsOf = (state) => (state?.stats?.coins && typeof state.stats.coins === 'object' ? state.stats.coins : backfillCoinStats(state))

/** Days in a row with STREAK_DAY_MIN focused minutes, up to `day` (or the day before, if today has none yet). */
export function studyStreak(days, day) {
  const ok = (k) => (days[k] || 0) >= STREAK_DAY_MIN
  let t = fromDateKey(day)
  if (!ok(day)) t = addDays(t, -1)
  let n = 0
  while (ok(dateKey(t)) && n < KEEP_DAYS) {
    n++
    t = addDays(t, -1)
  }
  return n
}

/** Streak multiplier in percent: 100 on day one, +10 per day after, up to 150. */
export const streakPct = (streak) => 100 + COINS.streakStepPct * Math.min(COINS.streakMaxSteps, Math.max(0, streak - 1))

/**
 * What a focus session of `minutes` pays if it ends at `at`. Pure: used by the backend when
 * a session ends, and by the live widget (with the minutes so far) while it runs.
 * Returns { minutes, base, bonus, first, streak, pct, raw, coins, capped, xp }.
 */
export function sessionReward(coinStats, { minutes, completed = false, at = Date.now() }) {
  const c = coinStats && typeof coinStats === 'object' ? coinStats : defaultCoinStats()
  const m = Math.max(0, Number(minutes) || 0)
  const day = dateKey(at)
  const before = c.days?.[day] || 0
  const base = Math.floor(m * COINS.focusPerMin)
  const long = m >= COINS.bonusMinMinutes
  const bonus = completed && long ? Math.round(base * COINS.completionBonus) : 0
  const first = long && before < STREAK_DAY_MIN ? COINS.firstOfDay : 0
  const streak = studyStreak({ ...c.days, [day]: before + m }, day)
  const pct = streakPct(streak)
  const raw = Math.floor(((base + bonus) * pct) / 100) + first
  const left = Math.max(0, FOCUS_COIN_DAILY_CAP - (c.paid?.[day] || 0))
  const coins = Math.min(raw, left)
  return { minutes: m, base, bonus, first, streak, pct, raw, coins, capped: coins < raw, xp: xpForFocus(m) }
}

/** Records a finished session's coins in the running counters. */
export function payFocusCoins(coinStats, reward, at) {
  const day = dateKey(at)
  coinStats.days[day] = (coinStats.days[day] || 0) + Math.floor(reward.minutes)
  coinStats.paid[day] = (coinStats.paid[day] || 0) + reward.coins
  coinStats.earned += reward.coins
  pruneCoinStats(coinStats, at)
}

/** Focused (work, not break) milliseconds of a running session up to `until`. */
export function focusedMsAt(f, until) {
  const work = f.workMin * 60_000
  const cycle = work + f.breakMin * 60_000
  const elapsed = Math.max(0, Math.min(until, focusEndsAt(f)) - f.startedAt)
  const full = Math.floor(elapsed / cycle)
  const rest = elapsed - full * cycle
  return full * work + Math.min(rest, work)
}

/**
 * The running session, live: what it has earned so far and what finishing it pays.
 * Nothing is written: the final amounts come from sessionReward when the session ends.
 */
export function focusLive(state, at = Date.now()) {
  const f = state?.focus?.active
  if (!f) return null
  const stats = coinStatsOf(state)
  const minutes = focusedMsAt(f, at) / 60_000
  const total = f.workMin * f.iterations
  const end = focusEndsAt(f)
  const now = sessionReward(stats, { minutes, completed: false, at: Math.min(at, end) })
  const done = sessionReward(stats, { minutes: total, completed: true, at: end })
  // how far the next coin is, 0 to 1, for the ring that fills up
  const exact = (minutes * COINS.focusPerMin * now.pct) / 100
  return { minutes, total, now, done, toNext: now.capped ? 1 : exact - Math.floor(exact), capLeft: done.coins - now.coins }
}

// ---- earning: tasks, habits and discipline, derived like XP

function coinForTask(t) {
  if (!t || t.status !== 'done') return 0
  if (t.parentId) return COINS.subtask
  const base = COINS.task[t.priority] ?? COINS.task.medium
  const onTime = t.completedAt != null && t.deadline != null && t.completedAt <= t.deadline
  return base + (onTime ? COINS.onTimeBonus : 0)
}

function taskCoins(state) {
  const s = Number(state?.stats?.since)
  const since = Number.isFinite(s) ? s : Infinity
  const done = (state.tasks || []).filter((t) => t && t.status === 'done').sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0))
  const perDay = {}
  let coins = 0
  for (const t of done) {
    const value = coinForTask(t)
    if (!value) continue
    // before the anti-farming rules existed, a task made and finished at once still paid
    if (t.completedAt != null && t.completedAt >= since && t.completedAt - (Number(t.createdAt) || 0) < TASK_MIN_AGE_MS) continue
    const day = dateKey(t.completedAt || 0)
    const gain = Math.min(value, TASK_COIN_DAILY_CAP - (perDay[day] || 0))
    if (gain <= 0) continue
    perDay[day] = (perDay[day] || 0) + gain
    coins += gain
  }
  return coins
}

function habitCoins(state) {
  const perDay = {}
  for (const days of Object.values(state.habitLogs || {}))
    for (const [day, done] of Object.entries(days || {})) if (done) perDay[day] = (perDay[day] || 0) + COINS.habit
  return Object.values(perDay).reduce((a, v) => a + Math.min(v, HABIT_COIN_DAILY_CAP), 0)
}

/**
 * Earned, spent and the balance, with where the coins came from. `retired` is what an old
 * save earned above the starting cap when the shop arrived (see the top of this file).
 */
export function coinsOf(state) {
  if (!state) return { earned: 0, spent: 0, retired: 0, balance: 0, breakdown: {} }
  const events = state.stats?.events || {}
  const breakdown = {
    focus: coinStatsOf(state).earned,
    tasks: taskCoins(state),
    habits: habitCoins(state),
    discipline: EVENT_TYPES.reduce((a, t) => a + count(events[t]) * (COINS.events[t] || 0), 0),
    gift: state.shop?.giftAt ? COINS.gift : 0,
  }
  const earned = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const spent = (state.shop?.purchases || []).reduce((a, p) => a + count(p.price), 0)
  const retired = count(state.shop?.retired)
  return { earned, spent, retired, balance: earned - spent - retired, breakdown }
}

/**
 * Whether `id` can be bought now at `level`. Returns { ok: true, item } or
 * { ok: false, code, reason, item }. code: UNKNOWN | FREE | OWNED | LEVEL | FUNDS.
 */
export function canBuy(state, id, level, balance = coinsOf(state).balance) {
  const item = BY_ID.get(id)
  if (!item) return { ok: false, code: 'UNKNOWN', reason: 'That is not in the shop.', item: null }
  if (!item.price) return { ok: false, code: 'FREE', reason: `${item.name} is free and already yours.`, item }
  if (ownsFn(state)(id)) return { ok: false, code: 'OWNED', reason: `You already own ${item.name}.`, item }
  if (level < item.level) return { ok: false, code: 'LEVEL', reason: `${item.name} unlocks at level ${item.level}.`, item }
  if (balance < item.price)
    return { ok: false, code: 'FUNDS', reason: `You need ${item.price - Math.max(0, balance)} more coins for ${item.name}.`, item }
  return { ok: true, item }
}

/** Everything that can be bought right now, cheapest first. */
export function affordableItems(state, level, balance = coinsOf(state).balance) {
  const has = ownsFn(state)
  return SHOP_ITEMS.filter((i) => i.price && !has(i.id) && i.level <= level && i.price <= balance).sort((a, b) => a.price - b.price)
}
