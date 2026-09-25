// Milestone badges. Data-driven: add a line to MILESTONES to add a badge.
import { addDays, startOfDay, dateKey, fromDateKey } from './time.js'
import { isHabitDue } from './habits.js'
import { weekRings, weekStart } from './visuals.js'
import { taskLedger, backfillStats } from './progress.js'

function dayCleared(tasks, dayStart) {
  const dayEnd = addDays(dayStart, 1)
  const due = tasks.filter((t) => !t.parentId && t.deadline >= dayStart && t.deadline < dayEnd)
  if (!due.length) return null
  return due.every((t) => t.status === 'done' && t.completedAt < dayEnd)
}

/** Longest run of days where every task due that day was finished (empty days skipped). */
export function bestTaskStreak(state, now) {
  const tasks = state.tasks || []
  if (!tasks.length) return 0
  const first = startOfDay(Math.min(...tasks.map((t) => t.deadline)))
  let best = 0
  let run = 0
  for (let day = first; day <= startOfDay(now); day = addDays(day, 1)) {
    const c = dayCleared(tasks, day)
    if (c === null) continue
    if (c) best = Math.max(best, ++run)
    else if (day < startOfDay(now)) run = 0
  }
  return best
}

/** Longest run of scheduled days one habit was done. */
export function habitBestStreak(h, logsAll) {
  const logs = logsAll?.[h.id] || {}
  const keys = Object.keys(logs)
    .filter((k) => logs[k])
    .sort()
  let best = 0
  let run = 0
  if (!keys.length) return 0
  for (let day = fromDateKey(keys[0]); day <= fromDateKey(keys.at(-1)); day = addDays(day, 1)) {
    if (!isHabitDue(h, day)) continue
    if (logs[dateKey(day)]) best = Math.max(best, ++run)
    else run = 0
  }
  return best
}

export function bestHabitStreak(state) {
  return Math.max(0, ...(state.habits || []).map((h) => habitBestStreak(h, state.habitLogs)))
}

function perfectWeeks(state, now) {
  let n = 0
  const start = weekStart(state.createdAt || now)
  for (let w = 1; w < 104; w++) {
    const r = weekRings(state, now, w)
    if (r.from < start) break
    if (r.perfect) n++
  }
  return n
}

const tiers = (group, metric, label, unit, steps, icon) =>
  steps.map((target, i) => ({ id: `${group}-${target}`, group, metric, target, tier: i, name: label(target), unit, icon }))

export const MILESTONES = [
  ...tiers('tasks', 'tasksDone', (n) => `${n} tasks done`, 'tasks', [10, 50, 100, 250, 500, 1000], 'check'),
  ...tiers('streak', 'bestTaskStreak', (n) => `${n} day streak`, 'days', [3, 7, 14, 30, 60, 100], 'flame'),
  ...tiers('habit', 'bestHabitStreak', (n) => `Habit kept ${n} times in a row`, 'times', [7, 30, 100], 'target'),
  ...tiers('focus', 'focusHours', (n) => `${n} hours focused`, 'hours', [1, 10, 50, 100, 250], 'clock'),
  ...tiers('windows', 'windowsUnlocked', (n) => `${n} windows unlocked by finishing`, 'windows', [5, 25, 100], 'unlock'),
  ...tiers(
    'resisted',
    'failsafeResisted',
    (n) => (n === 1 ? 'Walked away from Failsafe' : `Walked away ${n} times`),
    'times',
    [1, 10, 25],
    'shield',
  ),
  ...tiers('perfect', 'perfectWeeks', (n) => (n === 1 ? 'A perfect week' : `${n} perfect weeks`), 'weeks', [1, 4, 12], 'sparkles'),
]

// Counters come from state.stats (they never shrink when the log or focus history is
// trimmed) and follow the same anti-farming rules as XP, see progress.js.
export function milestoneMetrics(state, now) {
  const stats = state.stats && typeof state.stats === 'object' ? state.stats : backfillStats(state, Infinity)
  return {
    tasksDone: taskLedger(state).counted,
    bestTaskStreak: bestTaskStreak(state, now),
    bestHabitStreak: bestHabitStreak(state),
    focusHours: Math.floor((stats.focus?.minutes || 0) / 60),
    windowsUnlocked: stats.events?.window_unlocked || 0,
    failsafeResisted: stats.events?.failsafe_resisted || 0,
    perfectWeeks: perfectWeeks(state, now),
  }
}

export function computeMilestones(state, now) {
  const m = milestoneMetrics(state, now)
  return MILESTONES.map((x) => ({
    ...x,
    value: m[x.metric],
    achieved: m[x.metric] >= x.target,
    progress: Math.min(1, m[x.metric] / x.target),
  }))
}
