// Data for the visual stats: year heatmaps, task boxes and weekly rings.
import { addDays, dateKey, startOfDay, isoWeekday } from './time.js'
import { isHabitDue, isHabitDone } from './habits.js'

const shade = (ratio) => (ratio <= 0 ? 0 : ratio <= 0.34 ? 1 : ratio <= 0.67 ? 2 : 3)

function tasksDueOn(state, day) {
  const end = addDays(day, 1)
  return (state.tasks || []).filter((t) => !t.parentId && t.deadline >= day && t.deadline < end)
}

/** Monday of the week containing `ms` */
export function weekStart(ms) {
  const d = startOfDay(ms)
  return addDays(d, -(isoWeekday(d) - 1))
}

/**
 * GitHub-style year grid: `weeks` columns (oldest first), 7 rows Mon..Sun.
 * kind 'tasks' shades by share of tasks due that day that were finished.
 * kind 'habit' (with habit) shades done days fully.
 * Future cells are null.
 */
export function yearGrid(state, now, { kind = 'tasks', habit = null, weeks = 53 } = {}) {
  const today = startOfDay(now)
  const first = addDays(weekStart(now), -7 * (weeks - 1))
  const out = []
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const day = addDays(first, w * 7 + d)
      if (day > today) {
        col.push(null)
        continue
      }
      const cell = { date: dateKey(day), ts: day, total: 0, done: 0, ratio: 0, level: 0, due: true }
      if (kind === 'habit' && habit) {
        cell.due = isHabitDue(habit, day) && day >= startOfDay(habit.createdAt || 0)
        cell.done = isHabitDone(state.habitLogs, habit.id, day) ? 1 : 0
        cell.total = cell.due ? 1 : 0
        cell.ratio = cell.done
        cell.level = cell.done ? 3 : 0
      } else {
        const due = tasksDueOn(state, day)
        cell.total = due.length
        cell.done = due.filter((t) => t.status === 'done').length
        cell.ratio = due.length ? cell.done / due.length : 0
        cell.level = shade(cell.ratio)
      }
      col.push(cell)
    }
    out.push(col)
  }
  const months = []
  out.forEach((col, i) => {
    const c = col.find(Boolean) || { ts: addDays(first, i * 7) }
    const m = new Date(c.ts).getMonth()
    if (i === 0 || m !== new Date(out[i - 1].find(Boolean)?.ts ?? addDays(first, (i - 1) * 7)).getMonth())
      months.push({ index: i, month: m })
  })
  return { weeks: out, months }
}

/** Each task due on each of the last `days` days, as a coloured box. */
export function taskBoxes(state, now, days = 14) {
  const today = startOfDay(now)
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i)
    const boxes = tasksDueOn(state, day)
      .sort((a, b) => a.deadline - b.deadline)
      .map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        state: t.status === 'done' ? (t.completedAt <= t.deadline ? 'done' : 'late') : t.deadline < now ? 'missed' : 'open',
      }))
    out.push({ date: dateKey(day), ts: day, boxes })
  }
  return out
}

function focusMinutesBetween(state, from, to) {
  return (state.focus?.history || []).filter((h) => h.startedAt >= from && h.startedAt < to).reduce((a, h) => a + (h.focusedMin || 0), 0)
}

function habitsBetween(state, from, to, now) {
  let due = 0
  let done = 0
  for (let day = from; day < to && day <= now; day = addDays(day, 1)) {
    for (const h of state.habits || []) {
      if (h.archived || !isHabitDue(h, day) || day < startOfDay(h.createdAt || 0)) continue
      due++
      if (isHabitDone(state.habitLogs, h.id, day)) done++
    }
  }
  return { due, done }
}

/** Rings for one week: tasks due this week, focus minutes vs goal, habits. */
export function weekRings(state, now, offsetWeeks = 0) {
  const from = addDays(weekStart(now), -7 * offsetWeeks)
  const to = addDays(from, 7)
  const due = (state.tasks || []).filter((t) => !t.parentId && t.deadline >= from && t.deadline < to)
  const goal = state.settings?.weeklyFocusGoalMin || 300
  const hab = habitsBetween(state, from, to, offsetWeeks ? to : now)
  const ring = (value, g) => ({ value, goal: g, pct: g ? Math.min(1, value / g) : value > 0 ? 1 : 0 })
  const tasks = ring(due.filter((t) => t.status === 'done').length, due.length)
  const focus = ring(focusMinutesBetween(state, from, to), goal)
  const habits = ring(hab.done, hab.due)
  const perfect = (due.length > 0 || hab.due > 0) && tasks.pct >= 1 && focus.pct >= 1 && habits.pct >= 1
  return { from, tasks, focus, habits, perfect }
}
