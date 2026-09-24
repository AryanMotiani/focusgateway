// Weekly schedule windows. A rule = { days: [1..7], start: minutes, end: minutes }.
// `days` are the days a window STARTS on. end <= start means the window crosses
// midnight (end === start means a full 24 hours).
import { addDays, atMinutes, isoWeekday, startOfDay } from './time.js'

function durationMinutes(rule) {
  const d = rule.end - rule.start
  return d > 0 ? d : d + 1440
}

/** Window instance that starts on the local day `dayMs`, or null if not scheduled. */
function windowStartingOn(rule, dayMs) {
  if (!rule.days.includes(isoWeekday(dayMs))) return null
  const start = atMinutes(dayMs, rule.start)
  const endDay = rule.end > rule.start ? dayMs : addDays(startOfDay(dayMs), 1)
  const end = atMinutes(endDay, rule.end)
  return { start, end }
}

/** The window containing `now`, or null. */
export function windowAt(rule, now) {
  const today = startOfDay(now)
  for (const day of [today, addDays(today, -1)]) {
    const w = windowStartingOn(rule, day)
    if (w && now >= w.start && now < w.end) return w
  }
  return null
}

/** Most recent window whose end is <= now. */
export function previousWindow(rule, now) {
  const today = startOfDay(now)
  for (let i = 0; i <= 8; i++) {
    const w = windowStartingOn(rule, addDays(today, -i))
    if (w && w.end <= now) return w
  }
  return null
}

/** Start of the next window strictly after now, or null if the rule has no days. */
export function nextWindowStart(rule, now) {
  const today = startOfDay(now)
  for (let i = 0; i <= 8; i++) {
    const w = windowStartingOn(rule, addDays(today, i))
    if (w && w.start > now) return w.start
  }
  return null
}

const WEEK = 7 * 1440

/** Intervals in "minutes since Monday 00:00", wrapped into [0, WEEK). */
function weekIntervals(rule) {
  const out = []
  for (const day of rule.days) {
    const s = (day - 1) * 1440 + rule.start
    const e = s + durationMinutes(rule)
    if (e <= WEEK) out.push([s, e])
    else {
      out.push([s, WEEK])
      out.push([0, e - WEEK])
    }
  }
  return out
}

/** True if the two weekly schedules share any minute. */
export function rulesOverlap(a, b) {
  const ia = weekIntervals(a)
  const ib = weekIntervals(b)
  return ia.some(([s1, e1]) => ib.some(([s2, e2]) => s1 < e2 && s2 < e1))
}

export function validateSchedule(rule) {
  const errors = []
  if (!Array.isArray(rule.days) || rule.days.length === 0) errors.push('Pick at least one day.')
  else if (!rule.days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) errors.push('Invalid day.')
  for (const k of ['start', 'end']) {
    if (!Number.isInteger(rule[k]) || rule[k] < 0 || rule[k] > 1439) errors.push(`Invalid ${k} time.`)
  }
  return errors
}
