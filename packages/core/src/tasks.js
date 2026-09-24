import { addDays, isoWeekday } from './time.js'

export const PRIORITIES = ['low', 'medium', 'high']
export const PRIORITY_RANK = { low: 0, medium: 1, high: 2 }
export const FORWARD_LIMITS = { high: 1, medium: 3, low: 5 }

/** green / yellow / red badge from priority + how often it was pushed back. */
export function taskColor(task) {
  const n = task.forwardCount || 0
  if (n === 0) return 'green'
  if (task.priority === 'high') return 'red'
  if (task.priority === 'medium') return n >= 3 ? 'red' : 'yellow'
  return n >= 4 ? 'red' : 'yellow'
}

export function forwardsLeft(task) {
  return Math.max(0, FORWARD_LIMITS[task.priority] - (task.forwardCount || 0))
}

export function validateRecurrence(rec) {
  if (rec == null) return null
  if (rec.type === 'daily') return { type: 'daily' }
  if (rec.type === 'weekly') {
    const days = [...new Set((rec.days || []).map(Number))].filter((d) => d >= 1 && d <= 7).sort()
    if (!days.length) throw new Error('Weekly repeat needs at least one day.')
    return { type: 'weekly', days }
  }
  if (rec.type === 'interval') {
    const every = Number(rec.every)
    if (!Number.isInteger(every) || every < 1 || every > 365) throw new Error('Repeat interval must be 1 to 365 days.')
    return { type: 'interval', every }
  }
  throw new Error('Unknown repeat type.')
}

/** Deadline of the next occurrence after `deadline`. */
export function nextDeadline(rec, deadline) {
  if (rec.type === 'daily') return addDays(deadline, 1)
  if (rec.type === 'interval') return addDays(deadline, rec.every)
  for (let i = 1; i <= 7; i++) {
    const d = addDays(deadline, i)
    if (rec.days.includes(isoWeekday(d))) return d
  }
  return addDays(deadline, 7)
}

/**
 * Checks a subtask against its parent: deadline can't be later, priority can't be lower.
 * Returns an error message or null.
 */
export function subtaskProblem(sub, parent) {
  if (sub.deadline > parent.deadline) return "A subtask can't be due after its parent task."
  if (PRIORITY_RANK[sub.priority] < PRIORITY_RANK[parent.priority]) {
    return "A subtask's priority can't be lower than its parent's."
  }
  return null
}

/**
 * Classifies a task edit. Easing = makes life easier now (needs typed confirmation),
 * tightening = raises the bar (gets praise).
 */
export function classifyTaskChange(task, patch) {
  const easing = []
  const tightening = []
  if (patch.deadline != null && patch.deadline !== task.deadline) {
    ;(patch.deadline > task.deadline ? easing : tightening).push('deadline')
  }
  if (patch.priority && patch.priority !== task.priority) {
    ;(PRIORITY_RANK[patch.priority] < PRIORITY_RANK[task.priority] ? easing : tightening).push('priority')
  }
  if ('ruleId' in patch && patch.ruleId !== task.ruleId) {
    if (task.ruleId) easing.push('rule')
    else tightening.push('rule')
  }
  // Pushing the start of a window-gated task later takes it out of the current window.
  if ('startAt' in patch && task.ruleId && task.status !== 'done' && (patch.startAt || 0) > (task.startAt || 0)) {
    easing.push('start')
  }
  return { easing, tightening }
}
