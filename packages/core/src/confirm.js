// Type-to-confirm friction for "easing" actions. The user must type the exact
// phrase followed by a real reason. The UI blocks paste; the backend checks the text.
export const MIN_REASON_LENGTH = 8

const PHRASES = {
  delete_task: (s) => `I want to delete "${s}" because`,
  ease_task: (s) => `I want to make "${s}" easier because`,
  stop_focus: () => 'I want to stop this focus session because',
  failsafe: () => 'I want to break my own rule because',
  reset_data: () => 'I want to permanently delete all my data because',
  delete_habit: (s) => `I want to delete the habit "${s}" because`,
}

export function requiredPhrase(action, subject = '') {
  const f = PHRASES[action]
  if (!f) throw new Error('Unknown confirmation action: ' + action)
  return f(String(subject).slice(0, 80))
}

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim()

/** Returns the typed reason, or throws a user-facing error. */
export function checkConfirmation(action, subject, typed) {
  const phrase = squash(requiredPhrase(action, subject))
  const text = squash(typed)
  if (!text.toLowerCase().startsWith(phrase.toLowerCase())) {
    const err = new Error(`Type the sentence exactly: ${phrase} ...`)
    err.code = 'CONFIRMATION_REQUIRED'
    err.details = { phrase }
    throw err
  }
  const reason = text.slice(phrase.length).trim()
  if (reason.length < MIN_REASON_LENGTH) {
    const err = new Error('Finish the sentence with a real reason.')
    err.code = 'CONFIRMATION_REQUIRED'
    err.details = { phrase }
    throw err
  }
  return reason
}
