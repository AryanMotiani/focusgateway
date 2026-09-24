// Three ways the UI can reach the Backend:
//  extension  the app is running inside the extension (chrome-extension:// / moz-extension://)
//  bridge     a hosted copy of the app, extension installed, origin approved by the user
//  local      no extension: the Backend runs in this page, data in localStorage
//             (tasks, habits and the study room work; blocking needs the extension)
import { createBackend, toErrorPayload } from '@focusgateway/core'

const ext = globalThis.browser ?? globalThis.chrome

export function inExtension() {
  return /^(chrome|moz)-extension:$/.test(location.protocol) && !!ext?.runtime?.id
}

export function extensionPresent() {
  return !!document.documentElement.dataset.focusgatewayExtension
}

function extensionAdapter() {
  return {
    mode: 'extension',
    call: (cmd, payload) => ext.runtime.sendMessage({ type: 'fg', cmd, payload }),
    meta: (action, extra) => ext.runtime.sendMessage({ type: 'fg-meta', action, ...extra }),
  }
}

function bridgeAdapter() {
  let seq = 0
  const waiting = new Map()
  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.__fg !== 'res') return
    const w = waiting.get(e.data.id)
    if (w) {
      waiting.delete(e.data.id)
      w(e.data.res)
    }
  })
  const call = (cmd, payload) =>
    new Promise((resolve) => {
      const id = ++seq
      waiting.set(id, resolve)
      window.postMessage({ __fg: 'req', id, cmd, payload }, location.origin)
      setTimeout(() => {
        if (waiting.delete(id)) resolve({ ok: false, error: { code: 'TIMEOUT', message: 'The extension did not answer.' } })
      }, 15000)
    })
  return { mode: 'bridge', call, meta: async () => ({ ok: false }) }
}

const LOCAL_KEY = 'focusgateway:v1'
function localAdapter() {
  const storage = {
    load: async () => {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')
      } catch {
        return null
      }
    },
    save: async (s) => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(s))
      } catch (e) {
        console.warn('Could not save to localStorage', e)
      }
    },
  }
  const backend = createBackend({ storage })
  return {
    mode: 'local',
    call: async (cmd, payload) => {
      try {
        const r = await backend.dispatch(cmd, payload)
        return { ok: true, data: r.data, state: r.state, now: Date.now() }
      } catch (e) {
        return { ok: false, error: toErrorPayload(e) }
      }
    },
    meta: async () => ({ ok: false }),
  }
}

export function hasLocalData() {
  try {
    const s = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')
    return !!s && (s.tasks?.length || s.rules?.length || s.habits?.length)
  } catch {
    return false
  }
}
export function clearLocalData() {
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {}
}
export const createLocalAdapter = localAdapter

/** Picks the best adapter. For bridge mode it also performs the approval handshake. */
export async function connect() {
  if (inExtension()) return extensionAdapter()
  // give the content script a moment (it runs at document_start, so this is usually instant)
  for (let i = 0; i < 10 && !extensionPresent(); i++) await new Promise((r) => setTimeout(r, 50))
  if (extensionPresent()) {
    const bridge = bridgeAdapter()
    const hello = await bridge.call('hello')
    if (hello?.ok) return { ...bridge, approved: hello.data.approved }
  }
  return localAdapter()
}
