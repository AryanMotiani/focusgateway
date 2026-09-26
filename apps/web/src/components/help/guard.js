// The "Blocking is off" dialog. Starting a focus session or saving a rule while blocking can not
// work here (no extension, site not approved, no host access) stops and explains it first,
// with a one-click way to fix it, instead of a small hint nobody reads.
import { reactive } from 'vue'
import { blockingIssue } from '../../lib/store.js'

export const guard = reactive({ open: false, issue: null, context: 'focus', resolve: null, status: false })

/** The "Blocking status" checklist in a dialog, opened by the red "Blocking is off" chips. */
export function showBlockingStatus() {
  guard.status = true
}
export function closeBlockingStatus() {
  guard.status = false
}

/**
 * Resolves true when the action should go ahead: blocking works, or the person chose to
 * continue without it. `context` is 'focus' | 'rule' | 'test' and only changes the wording.
 */
export function ensureBlocking(context = 'focus') {
  const issue = blockingIssue.value
  if (!issue) return Promise.resolve(true)
  return showBlockingOff(issue, context)
}

export function showBlockingOff(issue = blockingIssue.value, context = 'info') {
  return new Promise((resolve) => {
    guard.resolve?.(false)
    Object.assign(guard, { open: true, issue: issue || 'no-extension', context, resolve })
  })
}

export function closeGuard(result) {
  const r = guard.resolve
  Object.assign(guard, { open: false, resolve: null })
  r?.(result)
}
