// XP and levels.
//
// Where XP comes from, and the rules that stop it from being farmed:
//
//  - Tasks: derived from state.tasks every time, so deleting or reopening a finished task
//    takes its XP back. A task only pays if it existed for TASK_MIN_AGE_MS (10 minutes)
//    before it was completed, so "create, tick, delete, repeat" earns nothing. Task XP is
//    capped at TASK_DAILY_CAP (300) per calendar day of completion, so 1000 tiny tasks
//    can not buy levels. Reopening and completing again pays at most once, since XP
//    belongs to the task and not to the completion event.
//  - Habits: derived from state.habitLogs, capped at HABIT_DAILY_CAP (50) per day.
//  - Focus: counted in state.stats.focus when a session ends (focusedMin can only grow as
//    fast as real time passes), so the capped focus history never takes XP away.
//  - Discipline events (window_unlocked, window_respected, failsafe_resisted): counted in
//    state.stats.events when they happen, through awardEvent(), which applies:
//      * window_unlocked pays once per rule per window occurrence (the day it started),
//        so reopening and finishing a task again in the same window pays nothing.
//      * window_respected pays once per rule per day.
//      * failsafe_resisted pays only when the user walked away at the cooldown step (after
//        entering the PIN), and only once per failsafe target per day.
//      * all discipline XP together is capped at DISCIPLINE_DAILY_CAP (100) per day.
//    Counters live in state.stats so they survive the capped s.log (5000) and focus
//    history (1000). They are only ever incremented, never recomputed from the arrays.
//
// Old saves: migrate() backfills state.stats from the existing log and focus history, and
// sets stats.since to the moment of the upgrade. Tasks completed and habit days checked
// before stats.since keep the old uncapped rules, so nobody loses a level by upgrading.
//
// XP only goes up through doing things. There are no penalties.
import { dateKey, fromDateKey, DAY } from './time.js'

export const XP = {
  task: { low: 10, medium: 20, high: 30 },
  onTimeBonus: 5,
  subtask: 5,
  habit: 5,
  focusPer5Min: 2,
  events: { window_unlocked: 15, window_respected: 15, failsafe_resisted: 10 },
}

export const TASK_MIN_AGE_MS = 10 * 60_000
export const TASK_DAILY_CAP = 300
export const HABIT_DAILY_CAP = 50
export const DISCIPLINE_DAILY_CAP = 100
/** How long the per-day tallies and "already paid" keys are kept. */
const STATS_KEEP_MS = 9 * DAY

export const EVENT_TYPES = Object.keys(XP.events)

export function xpForTask(task) {
  if (!task || task.status !== 'done') return 0
  if (task.parentId) return XP.subtask
  const base = XP.task[task.priority] ?? XP.task.medium
  const onTime = task.completedAt != null && task.deadline != null && task.completedAt <= task.deadline
  return base + (onTime ? XP.onTimeBonus : 0)
}

export function xpForFocus(minutes) {
  return Math.floor((minutes || 0) / 5) * XP.focusPer5Min
}

// ---- stats: running counters that never go backwards ----

export function defaultStats(since = 0) {
  return {
    since, // tasks and habits before this moment use the old, uncapped rules
    events: Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])),
    focus: { minutes: 0, sessions: 0, xp: 0 },
    daily: {}, // dateKey -> discipline XP earned that day (recent days only)
    seen: {}, // occurrence key -> when it was first seen (recent only, for once-only rules)
  }
}

const count = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0)

/** Counters for a save that has none yet, from whatever its log and focus history still hold. */
export function backfillStats(state, since = Date.now()) {
  const stats = defaultStats(since)
  for (const e of Array.isArray(state?.log) ? state.log : []) if (e && e.type in stats.events) stats.events[e.type]++
  for (const h of Array.isArray(state?.focus?.history) ? state.focus.history : []) recordFocus(stats, h?.focusedMin)
  return stats
}

/** Cleans stats from storage or an import: known keys, whole non-negative numbers. */
export function sanitizeStats(input, now = Date.now()) {
  const src = input && typeof input === 'object' ? input : {}
  const out = defaultStats(Math.min(count(src.since), now))
  for (const t of EVENT_TYPES) out.events[t] = count(src.events?.[t])
  for (const k of ['minutes', 'sessions', 'xp']) out.focus[k] = count(src.focus?.[k])
  for (const [k, v] of Object.entries(src.daily || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) out.daily[k] = count(v)
  for (const [k, v] of Object.entries(src.seen || {})) if (typeof k === 'string' && k.length <= 200) out.seen[k] = count(v)
  pruneStats(out, now)
  return out
}

function pruneStats(stats, now) {
  for (const k of Object.keys(stats.daily)) if (fromDateKey(k) < now - STATS_KEEP_MS) delete stats.daily[k]
  for (const [k, at] of Object.entries(stats.seen)) if (at < now - STATS_KEEP_MS) delete stats.seen[k]
}

export function recordFocus(stats, minutes) {
  const m = count(minutes)
  stats.focus.sessions += 1
  stats.focus.minutes += m
  stats.focus.xp += xpForFocus(m)
}

/**
 * Pays a discipline event, if the anti-farming rules allow it. `key` names the occurrence
 * (for example a rule's window on a given day): the same key is only ever paid once.
 * Returns { fresh, xp }: fresh is false when this occurrence was seen before, xp is what
 * was actually paid (0 when the daily cap is reached).
 */
export function awardEvent(stats, type, key, at) {
  const value = XP.events[type]
  if (!value) return { fresh: false, xp: 0 }
  pruneStats(stats, at)
  if (key != null) {
    if (stats.seen[key]) return { fresh: false, xp: 0 }
    stats.seen[key] = at
  }
  const day = dateKey(at)
  const today = stats.daily[day] || 0
  if (today + value > DISCIPLINE_DAILY_CAP) return { fresh: true, xp: 0 }
  stats.daily[day] = today + value
  stats.events[type] += 1
  return { fresh: true, xp: value }
}

const statsOf = (state) => (state?.stats && typeof state.stats === 'object' ? state.stats : backfillStats(state, Infinity))

/**
 * Task XP under the rules above, plus how many top-level tasks earned some of it
 * (used by the "tasks done" badges, so farmed tasks do not count there either).
 */
export function taskLedger(state) {
  const { since: s } = statsOf(state)
  const since = Number.isFinite(s) ? s : Infinity
  const done = (state.tasks || []).filter((t) => t && t.status === 'done').sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0))
  const perDay = {}
  let xp = 0
  let counted = 0
  for (const t of done) {
    const value = xpForTask(t)
    if (!value) continue
    let gain = value
    if (t.completedAt == null || t.completedAt < since) {
      // earned before the anti-farming rules existed: kept as it was
    } else {
      if (t.completedAt - (Number(t.createdAt) || 0) < TASK_MIN_AGE_MS) continue
      const day = dateKey(t.completedAt)
      gain = Math.min(value, TASK_DAILY_CAP - (perDay[day] || 0))
      if (gain <= 0) continue
      perDay[day] = (perDay[day] || 0) + gain
    }
    xp += gain
    if (!t.parentId) counted++
  }
  return { xp, counted }
}

function habitXp(state) {
  const since = statsOf(state).since
  const sinceDay = Number.isFinite(since) ? dateKey(since) : '9999-12-31'
  const perDay = {}
  for (const days of Object.values(state.habitLogs || {})) {
    for (const [day, done] of Object.entries(days || {})) if (done) perDay[day] = (perDay[day] || 0) + XP.habit
  }
  let xp = 0
  for (const [day, v] of Object.entries(perDay)) xp += day < sinceDay ? v : Math.min(v, HABIT_DAILY_CAP)
  return xp
}

export function computeXp(state) {
  const stats = statsOf(state)
  const tasks = taskLedger(state).xp
  const habits = habitXp(state)
  const focus = stats.focus.xp
  const discipline = EVENT_TYPES.reduce((a, t) => a + stats.events[t] * XP.events[t], 0)
  return { total: tasks + habits + focus + discipline, breakdown: { tasks, habits, focus, discipline } }
}

/** Total XP needed to reach `level` (level 1 = 0). Each level costs 100 more than the last. */
export function xpToReach(level) {
  return 50 * level * (level - 1)
}

const TITLES = [
  [1, 'Novice'],
  [5, 'Apprentice'],
  [10, 'Scholar'],
  [15, 'Focused'],
  [20, 'Disciplined'],
  [25, 'Sage'],
  [30, 'Master'],
  [40, 'Legend'],
]

export function titleFor(level) {
  let t = TITLES[0][1]
  for (const [l, name] of TITLES) if (level >= l) t = name
  return t
}

export function levelInfo(totalXp) {
  let level = 1
  while (xpToReach(level + 1) <= totalXp) level++
  const floor = xpToReach(level)
  const needed = xpToReach(level + 1) - floor
  const into = totalXp - floor
  return { level, xp: totalXp, into, needed, progress: into / needed, title: titleFor(level) }
}

export function progressOf(state) {
  const xp = computeXp(state)
  return { ...levelInfo(xp.total), breakdown: xp.breakdown }
}
