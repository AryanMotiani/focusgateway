import { call, toast } from './store.js'
import { askPin, askConfirm, praise } from './dialogs.js'

/**
 * Runs a command; if the backend says a PIN is needed, asks for it and retries.
 * Returns the command's data, or undefined if the user cancelled.
 */
export async function withPin(cmd, payload, { title = 'Enter your PIN', message = '', always = false } = {}) {
  let pin = always ? await askPin(title, message) : undefined
  if (always && pin == null) return undefined
  for (;;) {
    try {
      return await call(cmd, pin ? { ...payload, pin } : payload)
    } catch (e) {
      if (e.code === 'PIN_REQUIRED' || e.code === 'PIN_INCORRECT') {
        if (e.code === 'PIN_INCORRECT') toast(`Incorrect PIN. ${e.details?.attemptsLeft ?? ''} attempts left.`, 'error')
        pin = await askPin(title, message)
        if (pin == null) return undefined
        continue
      }
      toast(e.message, 'error')
      throw e
    }
  }
}

/** Runs a command; if the backend asks for a typed confirmation, collects it and retries. */
export async function withConfirm(cmd, payload, action, subject, opts = {}) {
  try {
    return await call(cmd, payload)
  } catch (e) {
    if (e.code !== 'CONFIRMATION_REQUIRED') {
      toast(e.message, 'error')
      throw e
    }
  }
  const confirmation = await askConfirm(action, subject, opts)
  if (confirmation == null) return undefined
  try {
    return await call(cmd, { ...payload, confirmation })
  } catch (e) {
    toast(e.message, 'error')
    throw e
  }
}

/** Task update that handles friction for easing and praise for tightening. */
export async function updateTask(task, patch) {
  const r = await withConfirm('tasks.update', { id: task.id, patch }, 'ease_task', task.title, {
    title: 'Making it easier?',
    message:
      'Pushing a deadline back, lowering priority or detaching a task from a study window makes today easier. That is allowed, but you have to own it.',
  })
  if (r?.praise) praise('Tighter deadline or higher priority. Future you says thanks.')
  return r
}

export async function deleteTask(task) {
  return withConfirm('tasks.delete', { id: task.id }, 'delete_task', task.title, {
    title: 'Delete this task?',
    message: 'Deleted tasks are counted in your accountability history.',
  })
}
