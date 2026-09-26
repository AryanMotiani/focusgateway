// Plain sentences for explainRule() (packages/core/src/engine.js): is a rule blocking now, and why not.
import { explainRule } from '@regimen/core'

const time = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
function when(ms, now) {
  const d = new Date(ms)
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days === 0) return `today at ${time(ms)}`
  if (days === 1) return `tomorrow at ${time(ms)}`
  return `${d.toLocaleDateString([], { weekday: 'long' })} at ${time(ms)}`
}

/** { blocking, text } for one rule at `now`. */
export function ruleWhy(state, rule, now) {
  const e = explainRule(state, rule, now)
  const next = e.next ? `Next window starts ${when(e.next, now)}.` : 'It has no days picked, so it never runs.'
  const text = {
    window: `Blocking now, until ${time(e.until)}.`,
    pending: `Blocking now: ${e.pending} task${e.pending === 1 ? '' : 's'} left before the sites open.`,
    'no-tasks': 'Blocking now. No tasks are attached, so it stays blocked for the whole window.',
    extended: `The window ended, but ${e.pending} task${e.pending === 1 ? ' is' : 's are'} still open, so it keeps blocking.`,
    outside: `Not blocking right now: outside its time window. ${next}`,
    done: `Not blocking right now: every task for this window is done, so the sites are open until ${time(e.until)}.`,
    failsafe: `Not blocking right now: unlocked with Failsafe${e.until ? ` until ${time(e.until)}` : ''}.`,
  }[e.code]
  return { ...e, text }
}
