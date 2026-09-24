import { reactive } from 'vue'
import { requiredPhrase } from '@focusgateway/core'

// Promise-based prompts rendered by <DialogHost/>.
export const dialogs = reactive({ current: null })

function open(d) {
  return new Promise((resolve) => {
    dialogs.current = {
      ...d,
      resolve: (v) => {
        dialogs.current = null
        resolve(v)
      },
    }
  })
}

/** Asks for the PIN. Resolves to the PIN string, or null if cancelled. */
export const askPin = (title = 'Enter your PIN', message = '') => open({ kind: 'pin', title, message })

/** Type-to-confirm. Resolves to the full typed sentence, or null. */
export const askConfirm = (action, subject, { title, message } = {}) =>
  open({ kind: 'confirm', title: title || 'Are you sure?', message, phrase: requiredPhrase(action, subject) })

/** Simple yes/no. */
export const askYesNo = (title, message, { yes = 'Yes', no = 'Cancel', danger = false } = {}) =>
  open({ kind: 'yesno', title, message, yes, no, danger })

export const praise = (message) => open({ kind: 'praise', title: 'Raising the bar', message })
