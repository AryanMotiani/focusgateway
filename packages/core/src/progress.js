// XP and levels. XP is derived from what you actually did, never stored, so it can't
// drift or be farmed: deleting or reopening a finished task takes its XP back with it.
// XP only goes up through doing things. There are no penalties.

export const XP = {
  task: { low: 10, medium: 20, high: 30 },
  onTimeBonus: 5,
  subtask: 5,
  habit: 5,
  focusPer5Min: 2,
  events: { window_unlocked: 15, window_respected: 15, failsafe_resisted: 10 },
}

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

export function computeXp(state) {
  const tasks = (state.tasks || []).reduce((a, t) => a + xpForTask(t), 0)
  let habitChecks = 0
  for (const days of Object.values(state.habitLogs || {})) habitChecks += Object.values(days).filter(Boolean).length
  const habits = habitChecks * XP.habit
  const focus = (state.focus?.history || []).reduce((a, h) => a + xpForFocus(h.focusedMin), 0)
  const discipline = (state.log || []).reduce((a, e) => a + (XP.events[e.type] || 0), 0)
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
