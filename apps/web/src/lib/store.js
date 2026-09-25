import { reactive, computed } from 'vue'
import { computeBlocks, allSites } from '@focusgateway/core'
import { connect, createLocalAdapter, readLocalState, clearLocalData } from './api.js'

export const store = reactive({
  ready: false,
  mode: 'local', // 'extension' | 'bridge' | 'local'
  pendingApproval: false,
  state: null,
  now: Date.now(),
  // the same clock at minute resolution, for day-level data (streaks, grids, badges) that
  // should not recompute every second
  minute: Math.floor(Date.now() / 60_000) * 60_000,
  clockOffset: 0,
  toasts: [],
})

let adapter = null

export class ApiError extends Error {
  constructor(e) {
    super(e?.message || 'Something went wrong.')
    this.code = e?.code
    this.details = e?.details
  }
}

export async function call(cmd, payload) {
  const res = await adapter.call(cmd, payload)
  if (!res || !res.ok) throw new ApiError(res?.error)
  if (res.state) store.state = res.state
  if (res.now) store.clockOffset = res.now - Date.now()
  return res.data
}

export async function refresh() {
  if (!adapter) return
  try {
    await call('state.get')
  } catch (e) {
    console.warn(e)
  }
}

export async function init() {
  adapter = await connect()
  store.mode = adapter.mode
  if (adapter.mode === 'bridge' && !adapter.approved) {
    store.pendingApproval = true
    pollApproval()
  }
  await refresh()
  await adoptLocalSetup()
  store.ready = true
  setInterval(() => {
    store.now = Date.now() + store.clockOffset
    const minute = Math.floor(store.now / 60_000) * 60_000
    if (minute !== store.minute) store.minute = minute
  }, 1000)
  // Local mode has no background worker, so run housekeeping from the page.
  setInterval(() => (adapter.mode === 'local' ? call('system.tick').catch(() => {}) : refresh()), 30_000)
  setInterval(() => adapter.mode !== 'local' && store.state && !store.state.onboarding.completed && refresh(), 3000)
  if (adapter.mode === 'local') call('system.tick').catch(() => {})
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refresh())
  window.addEventListener('focus', refresh)
}

const wantedHash = location.hash
async function pollApproval() {
  while (store.pendingApproval) {
    await new Promise((r) => setTimeout(r, 2000))
    const hello = await adapter.call('hello')
    if (hello?.ok && hello.data.approved) {
      store.pendingApproval = false
      await refresh()
      await adoptLocalSetup()
      location.hash = wantedHash && wantedHash !== '#/home' ? wantedHash : '#/'
    }
  }
}

/**
 * Someone set up FocusGateway on the website first (PIN, tutorial, maybe rules),
 * then installed the extension. Hand that setup to the extension once, so the
 * tutorial never runs twice. Only happens while the extension is still empty.
 */
async function adoptLocalSetup() {
  if (store.mode === 'local' || !store.state) return
  const local = readLocalState()
  if (!local?.security?.pin) return
  const ext = store.state
  const fresh = !ext.security.hasPin && !ext.onboarding.completed && !ext.rules.length && !ext.tasks.length
  if (!fresh) return // Settings offers "Move my data" for this case
  try {
    await call('setup.adopt', { state: local })
    clearLocalData()
    toast('Your setup moved into the extension. Blocking is on.', 'success')
  } catch (e) {
    console.warn('Could not move the local setup', e)
  }
}

export function useLocalInstead() {
  store.pendingApproval = false
  adapter = createLocalAdapter()
  store.mode = 'local'
  return refresh()
}

export function meta(action, extra) {
  return adapter?.meta?.(action, extra)
}

export function toast(message, kind = 'info') {
  const id = Math.random()
  store.toasts.push({ id, message, kind })
  setTimeout(() => (store.toasts = store.toasts.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500)
}

/** Runs an action and shows its error as a toast. Returns the result or undefined. */
export async function attempt(fn, success) {
  try {
    const r = await fn()
    if (success) toast(success, 'success')
    return r
  } catch (e) {
    toast(e.message, 'error')
    throw e
  }
}

export const blocks = computed(() => (store.state ? computeBlocks(store.state, store.now) : { domains: [], blocks: [] }))
export const sites = computed(() => (store.state ? allSites(store.state) : []))
export const canBlock = computed(() => store.mode !== 'local')
