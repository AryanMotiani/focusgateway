// Pure blocking engine: given state + a moment, which domains are blocked and why.
// Shared by the extension (DNR rules), the lock agent (hosts file) and the UI.
import { windowAt, previousWindow, nextWindowStart } from './schedule.js'
import { domainsForSites } from './sites.js'

function liveOverride(state, ruleId, now) {
  return (state.overrides || []).some((o) => o.ruleId === ruleId && o.until > now)
}

/** Top-level tasks attached to a task-gated rule. */
export function tasksForRule(state, ruleId) {
  return (state.tasks || []).filter((t) => t.ruleId === ruleId && !t.parentId)
}

/**
 * Tasks that belong to the window [w.start, w.end):
 *  - not scheduled to start after the window ends (future recurrences),
 *  - not completed before the previous window ended (those belonged to it),
 *  - not forwarded past `now`.
 */
function relevantTasks(state, rule, w, prevEnd, now) {
  return tasksForRule(state, rule.id).filter((t) => {
    if (t.startAt && t.startAt >= w.end) return false
    if (t.status === 'done' && prevEnd != null && t.completedAt < prevEnd) return false
    if (t.forwardedUntil && t.forwardedUntil > now) return false
    return true
  })
}

/**
 * Status of a task-gated rule at `now`:
 *  'blocked'  window live, tasks pending (or none attached)
 *  'unlocked' window live, every task done
 *  'extended' window over, but tasks from it are still pending
 *  'inactive' otherwise
 */
export function gatedStatus(state, rule, now) {
  const w = windowAt(rule, now)
  if (w) {
    const prev = previousWindow(rule, w.start)
    const rel = relevantTasks(state, rule, w, prev ? prev.end : null, now)
    const pending = rel.filter((t) => t.status !== 'done')
    if (rel.length === 0 || pending.length > 0) {
      return { status: 'blocked', window: w, pending, relevant: rel }
    }
    return { status: 'unlocked', window: w, pending, relevant: rel }
  }
  const last = previousWindow(rule, now)
  if (last) {
    const before = previousWindow(rule, last.start)
    const rel = relevantTasks(state, rule, last, before ? before.end : null, now).filter((t) => t.createdAt < last.end)
    const pending = rel.filter((t) => t.status !== 'done')
    if (pending.length > 0) return { status: 'extended', window: last, pending, relevant: rel }
  }
  return { status: 'inactive', window: null, pending: [], relevant: [] }
}

export function focusEndsAt(f) {
  if (f.endsAt) return f.endsAt
  const cycle = (f.workMin + f.breakMin) * 60_000
  return f.startedAt + cycle * f.iterations - f.breakMin * 60_000
}

/** Current pomodoro phase of a focus session. */
export function focusPhase(f, now) {
  const work = f.workMin * 60_000
  const cycle = work + f.breakMin * 60_000
  const elapsed = Math.max(0, now - f.startedAt)
  const iteration = Math.min(f.iterations, Math.floor(elapsed / cycle) + 1)
  const into = elapsed - (iteration - 1) * cycle
  const phase = into < work ? 'work' : 'break'
  const phaseEnds = f.startedAt + (iteration - 1) * cycle + (phase === 'work' ? work : cycle)
  return { iteration, phase, phaseEnds: Math.min(phaseEnds, focusEndsAt(f)), endsAt: focusEndsAt(f) }
}

/** Is a rule currently enforcing something that the user promised to never override? */
export function isLocked(rule) {
  return rule.mode === 'hard' && rule.failsafe === false
}

/** Is the rule currently "live" (for PIN-gated edit rules)? */
export function isRuleLive(state, rule, now) {
  if (rule.mode === 'hard') return !!windowAt(rule, now)
  const s = gatedStatus(state, rule, now).status
  return s === 'blocked' || s === 'extended' || s === 'unlocked'
}

/**
 * The "Test blocking" check (Settings and Install): a one minute block on a harmless
 * reserved domain, so testers can see in one click that the extension really blocks.
 * It is not a rule and not a focus session, so it only adds to `domains`.
 */
export const TEST_DOMAIN = 'example.com'
export const TEST_BLOCK_MS = 60_000

export function blockTestActive(state, now) {
  const t = state.runtime?.blockTest
  return !!t && now < t.until
}

export function computeBlocks(state, now) {
  const blocks = []
  for (const rule of state.rules || []) {
    if (rule.mode === 'hard') {
      const w = windowAt(rule, now)
      if (!w) continue
      if (!isLocked(rule) && liveOverride(state, rule.id, now)) continue
      blocks.push({
        kind: 'hard',
        ruleId: rule.id,
        name: rule.name,
        siteIds: rule.siteIds,
        until: w.end,
        locked: isLocked(rule),
        extended: false,
        pendingTaskIds: [],
      })
    } else if (rule.mode === 'gated') {
      const g = gatedStatus(state, rule, now)
      if (g.status !== 'blocked' && g.status !== 'extended') continue
      if (liveOverride(state, rule.id, now)) continue
      blocks.push({
        kind: 'gated',
        ruleId: rule.id,
        name: rule.name,
        siteIds: rule.siteIds,
        until: g.status === 'extended' ? null : g.window.end,
        locked: false,
        extended: g.status === 'extended',
        pendingTaskIds: g.pending.map((t) => t.id),
      })
    }
  }
  const f = state.focus?.active
  if (f && now >= f.startedAt && now < focusEndsAt(f)) {
    blocks.push({
      kind: 'focus',
      focusId: f.id,
      name: 'Focus session',
      siteIds: f.siteIds,
      until: focusEndsAt(f),
      locked: false,
      extended: false,
      pendingTaskIds: [],
    })
  }
  const all = new Set()
  for (const b of blocks) {
    b.domains = domainsForSites(state, b.siteIds)
    b.domains.forEach((d) => all.add(d))
  }
  const test = blockTestActive(state, now)
  if (test) all.add(TEST_DOMAIN)
  return { domains: [...all].sort(), blocks, test }
}

/**
 * Is this rule blocking right now, and if not, why not? For the UI, so nobody has to guess
 * why a site still opens.
 *  code: 'window' | 'pending' | 'no-tasks' | 'extended'  (blocking)
 *        'outside' | 'done' | 'failsafe'                 (not blocking)
 *  until: when the current state ends (ms) or null, next: next window start (ms) or null
 */
export function explainRule(state, rule, now) {
  const blocking = computeBlocks(state, now).blocks.some((b) => b.ruleId === rule.id)
  const next = nextWindowStart(rule, now)
  const override = (state.overrides || []).find((o) => o.ruleId === rule.id && o.until > now)
  if (rule.mode === 'hard') {
    const w = windowAt(rule, now)
    if (!w) return { blocking: false, code: 'outside', until: null, next }
    if (!blocking) return { blocking: false, code: 'failsafe', until: override?.until ?? w.end, next }
    return { blocking: true, code: 'window', until: w.end, next }
  }
  const g = gatedStatus(state, rule, now)
  if (g.status === 'inactive') return { blocking: false, code: 'outside', until: null, next }
  if (g.status === 'unlocked') return { blocking: false, code: 'done', until: g.window.end, next }
  if (!blocking) return { blocking: false, code: 'failsafe', until: override?.until ?? null, next }
  if (g.status === 'extended') return { blocking: true, code: 'extended', until: null, next, pending: g.pending.length }
  return { blocking: true, code: g.pending.length ? 'pending' : 'no-tasks', until: g.window.end, next, pending: g.pending.length }
}
