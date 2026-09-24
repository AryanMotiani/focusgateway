import { addDays, dateKey, startOfDay, DAY } from './time.js'
import { isHabitDue, isHabitDone } from './habits.js'

/** Did the user finish every top-level task due on this day (by the end of it)? null = nothing due. */
function dayCleared(tasks, dayStart) {
  const dayEnd = addDays(dayStart, 1)
  const due = tasks.filter((t) => !t.parentId && t.deadline >= dayStart && t.deadline < dayEnd)
  if (!due.length) return null
  return due.every((t) => t.status === 'done' && t.completedAt < dayEnd)
}

/** Consecutive days where ALL tasks due that day were finished. Empty days are skipped. */
export function taskStreak(state, now) {
  const today = startOfDay(now)
  let streak = 0
  const t = dayCleared(state.tasks, today)
  if (t === true) streak++
  let day = addDays(today, -1)
  const floor = startOfDay(state.createdAt || now) - DAY
  for (let i = 0; i < 400 && day >= floor; i++, day = addDays(day, -1)) {
    const c = dayCleared(state.tasks, day)
    if (c === null) continue
    if (!c) break
    streak++
  }
  return streak
}

const count = (log, types, since) => log.filter((e) => types.includes(e.type) && e.at >= since).length

export function computeStats(state, now, { range = 'week' } = {}) {
  const today = startOfDay(now)
  const since = range === 'all' ? 0 : range === 'month' ? addDays(today, -29) : addDays(today, -6)
  const log = state.log || []
  const history = state.focus?.history || []
  const focusMin = (from, to = Infinity) =>
    history.filter((h) => h.startedAt >= from && h.startedAt < to).reduce((a, h) => a + (h.focusedMin || 0), 0)

  // 14-day series for charts
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i)
    const e = addDays(d, 1)
    const habitsDue = (state.habits || []).filter((h) => !h.archived && isHabitDue(h, d) && d >= startOfDay(h.createdAt))
    days.push({
      date: dateKey(d),
      completed: state.tasks.filter((t) => t.status === 'done' && t.completedAt >= d && t.completedAt < e).length,
      focusMin: focusMin(d, e),
      habitsDone: habitsDue.filter((h) => isHabitDone(state.habitLogs, h.id, d)).length,
      habitsDue: habitsDue.length,
    })
  }

  const dueToday = state.tasks.filter((t) => !t.parentId && t.deadline >= today && t.deadline < addDays(today, 1))
  const habitsToday = (state.habits || []).filter((h) => !h.archived && isHabitDue(h, today))
  const byTag = {}
  for (const t of state.tasks) {
    if (t.status !== 'done' || t.completedAt < since) continue
    for (const tag of t.tags?.length ? t.tags : ['Untagged']) byTag[tag] = (byTag[tag] || 0) + 1
  }

  return {
    range,
    streak: taskStreak(state, now),
    today: {
      tasksDue: dueToday.length,
      tasksDone: dueToday.filter((t) => t.status === 'done').length,
      habitsDue: habitsToday.length,
      habitsDone: habitsToday.filter((h) => isHabitDone(state.habitLogs, h.id, today)).length,
      focusMin: focusMin(today),
    },
    days,
    byTag,
    sections: {
      windows: {
        good: {
          'Windows unlocked by finishing tasks': count(log, ['window_unlocked'], since),
          'Tasks finished on time': log.filter((e) => e.type === 'task_completed' && e.onTime && e.at >= since).length,
        },
        bad: {
          'Tasks sent to a later window': count(log, ['task_forwarded'], since),
          'Deadlines missed': count(log, ['missed_deadline'], since),
        },
      },
      hard: {
        good: {
          'Hard-block windows fully respected': count(log, ['window_respected'], since),
          'Times you walked away from Failsafe': count(log, ['failsafe_resisted'], since),
        },
        bad: {
          'Failsafe overrides used': count(log, ['failsafe_used'], since),
          'Active rules edited or deleted': count(log, ['rule_edited_active', 'rule_deleted'], since),
        },
      },
      tasks: {
        good: {
          'Tasks completed': count(log, ['task_completed'], since),
          'Deadlines or priorities tightened': count(log, ['deadline_tightened', 'priority_raised'], since),
          'Current streak (days)': taskStreak(state, now),
        },
        bad: {
          'Tasks or subtasks deleted': count(log, ['task_deleted', 'subtask_deleted'], since),
          'Deadlines delayed': count(log, ['deadline_delayed'], since),
          'Priorities lowered': count(log, ['priority_downgraded'], since),
        },
      },
      focus: {
        good: {
          'Minutes focused': focusMin(since),
          'Sessions completed': history.filter((h) => h.status === 'completed' && h.startedAt >= since).length,
        },
        bad: { 'Sessions stopped early': history.filter((h) => h.status === 'stopped_early' && h.startedAt >= since).length },
      },
    },
    history: log
      .filter((e) => e.at >= since)
      .slice(-200)
      .reverse(),
  }
}
