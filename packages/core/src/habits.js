import { addDays, dateKey, isoWeekday, startOfDay } from './time.js'

export function isHabitDue(habit, dayMs) {
  return habit.days.includes(isoWeekday(dayMs))
}

export function isHabitDone(logs, habitId, dayMs) {
  return !!logs?.[habitId]?.[dateKey(dayMs)]
}

/**
 * Consecutive scheduled days completed, counting back from today.
 * Today only adds to the streak once done; not doing it yet never breaks it.
 */
export function habitStreak(habit, logs, now) {
  let day = startOfDay(now)
  let streak = 0
  const created = startOfDay(habit.createdAt || 0)
  if (isHabitDue(habit, day) && isHabitDone(logs, habit.id, day)) streak++
  day = addDays(day, -1)
  for (let i = 0; i < 730 && day >= created; i++, day = addDays(day, -1)) {
    if (!isHabitDue(habit, day)) continue
    if (!isHabitDone(logs, habit.id, day)) break
    streak++
  }
  return streak
}

/** Share of scheduled days completed in the last `days` days (0..1), or null. */
export function habitRate(habit, logs, now, days = 30) {
  let due = 0
  let done = 0
  const created = startOfDay(habit.createdAt || 0)
  for (let i = 0; i < days; i++) {
    const day = addDays(startOfDay(now), -i)
    if (day < created) break
    if (!isHabitDue(habit, day)) continue
    due++
    if (isHabitDone(logs, habit.id, day)) done++
  }
  return due ? done / due : null
}
