// FocusGateway background: owns the Backend (all rules + data), turns the current
// block set into declarativeNetRequest rules, redirects already-open tabs, sends
// notifications, and mirrors a snapshot to the optional lock agent.
import { createBackend, toErrorPayload, computeBlocks, hostMatches, BUNDLES } from '@focusgateway/core'

const ext = globalThis.browser ?? globalThis.chrome
const STORE_KEY = 'fg_state'
const ORIGINS_KEY = 'fg_approved_origins'
const EXT_ORIGIN = new URL(ext.runtime.getURL('/')).origin

const storage = {
  load: async () => (await ext.storage.local.get(STORE_KEY))[STORE_KEY] ?? null,
  save: (s) => ext.storage.local.set({ [STORE_KEY]: s }),
}
const backend = createBackend({ storage })

// Commands that never change what is blocked
const PASSIVE = new Set([
  'state.get',
  'data.export',
  'agent.report',
  'agent.paired',
  'habits.toggle',
  'habits.create',
  'habits.update',
  'habits.delete',
  'tasks.logTime',
  'settings.update',
])

// ---------------------------------------------------------------- blocking
let applying = Promise.resolve()
let lastBlockKeys = null

function scheduleApply() {
  applying = applying.then(apply).catch((e) => console.error('[FocusGateway] apply failed', e))
  return applying
}

async function apply() {
  const state = await backend.rawState()
  const now = Date.now()
  const { domains, blocks } = computeBlocks(state, now)

  // 1. Network rules: redirect top-level pages, block embedded frames.
  const existing = await ext.declarativeNetRequest.getDynamicRules()
  const addRules = domains.map((d, i) => ({
    id: i + 2,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: `/blocked.html?d=${encodeURIComponent(d)}` } },
    condition: { requestDomains: [d], resourceTypes: ['main_frame'] },
  }))
  if (domains.length) {
    addRules.push({ id: 1, priority: 1, action: { type: 'block' }, condition: { requestDomains: domains, resourceTypes: ['sub_frame'] } })
  }
  await ext.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map((r) => r.id), addRules })

  // 2. Tabs that are already open on a now-blocked site.
  if (domains.length) {
    const tabs = await ext.tabs.query({})
    for (const tab of tabs) {
      if (!tab.url || !/^https?:/.test(tab.url)) continue
      let host
      try {
        host = new URL(tab.url).hostname
      } catch {
        continue
      }
      const d = domains.find((x) => hostMatches(host, x))
      if (d) ext.tabs.update(tab.id, { url: ext.runtime.getURL(`blocked.html?d=${encodeURIComponent(d)}`) }).catch(() => {})
    }
  }

  // 3. Badge + transition notifications (remember across service-worker restarts).
  if (lastBlockKeys === null) lastBlockKeys = new Set((await ext.storage.session?.get('fg_keys').catch(() => ({})))?.fg_keys || [])
  const keys = new Set(blocks.map((b) => b.ruleId || b.focusId))
  ext.action.setBadgeText({ text: blocks.length ? String(blocks.length) : '' })
  ext.action.setBadgeBackgroundColor?.({ color: '#6d5dfc' })
  if (state.settings.notifications && state.onboarding.completed) {
    for (const b of blocks) if (!lastBlockKeys.has(b.ruleId || b.focusId)) notify(`${b.name} started`, describeBlock(b))
    for (const k of lastBlockKeys) {
      if (!keys.has(k)) {
        const rule = state.rules.find((r) => r.id === k)
        if (rule) notify(`${rule.name} ended`, 'Those sites are open again.')
      }
    }
  }
  lastBlockKeys = keys
  ext.storage.session?.set({ fg_keys: [...keys] }).catch?.(() => {})

  // 4. Mirror to the lock agent (if paired).
  syncAgent(state).catch(() => {})
}

function describeBlock(b) {
  if (b.kind === 'gated') return `Finish ${b.pendingTaskIds.length || 'your'} task${b.pendingTaskIds.length === 1 ? '' : 's'} to unlock.`
  if (b.kind === 'focus') return 'Focus session running. You got this.'
  return 'Hard block until ' + new Date(b.until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function notify(title, message) {
  ext.notifications
    ?.create({ type: 'basic', iconUrl: ext.runtime.getURL('icons/icon-128.png'), title: 'FocusGateway: ' + title, message })
    .catch?.(() => {})
}

// ---------------------------------------------------------------- lock agent
let lastAgentOk = null
let lastAgentSentAt = 0

function agentSnapshot(state, empty = false) {
  // strictly increasing so the agent can drop out-of-order requests
  lastAgentSentAt = Math.max(Date.now(), lastAgentSentAt + 1)
  if (empty) return { sentAt: lastAgentSentAt, rules: [], tasks: [], overrides: [], focus: { active: null }, customSites: [] }
  return {
    sentAt: lastAgentSentAt,
    rules: state.rules,
    tasks: state.tasks.map(({ id, ruleId, parentId, status, completedAt, createdAt, startAt, forwardedUntil, deadline }) => ({
      id,
      ruleId,
      parentId,
      status,
      completedAt,
      createdAt,
      startAt,
      forwardedUntil,
      deadline,
    })),
    overrides: state.overrides,
    focus: { active: state.focus.active },
    customSites: state.customSites,
  }
}

async function postAgent(url, path, body, token) {
  const res = await fetch(url + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function syncAgent(state) {
  const { token, url, pairCode } = state.agent
  if (!token && pairCode) {
    try {
      const r = await postAgent(url, '/v1/pair', { code: pairCode })
      if (r.ok) {
        await backend.dispatch('agent.paired', { token: r.data.secret })
        return syncAgent(await backend.rawState())
      }
      await backend.dispatch('agent.report', {
        ok: false,
        error: r.data.error || `HTTP ${r.status}`,
        dropPairCode: r.status === 401 || r.status === 409,
      })
    } catch {
      if (state.agent.lastError !== 'Agent not reachable')
        await backend.dispatch('agent.report', { ok: false, error: 'Agent not reachable' })
    }
    return
  }
  if (!token) return
  let ok = false
  let error = null
  try {
    const r = await postAgent(url, '/v1/sync', agentSnapshot(state), token)
    ok = r.ok
    if (!ok) error = r.data.error || `HTTP ${r.status}`
  } catch {
    error = 'Agent not reachable'
  }
  const stale = Date.now() - (state.agent.lastSyncAt || 0) > 10 * 60_000
  if (ok !== lastAgentOk || (ok && stale) || (!ok && state.agent.lastError !== error)) {
    lastAgentOk = ok
    await backend.dispatch('agent.report', { ok, error })
  }
}

// ---------------------------------------------------------------- messaging
async function approvedOrigins() {
  return (await ext.storage.local.get(ORIGINS_KEY))[ORIGINS_KEY] || []
}

// A hosted copy of the app asked to connect. We never pop up a window for it (any site
// could do that); the request waits in the toolbar popup until the user allows it.
async function requestApproval(origin) {
  const list = new Set((await ext.storage.session.get('fg_pending_origins')).fg_pending_origins || [])
  if (list.has(origin)) return
  list.add(origin)
  await ext.storage.session.set({ fg_pending_origins: [...list].slice(-5) })
  ext.action.setBadgeText({ text: '?' })
}

async function runCommand(cmd, payload) {
  try {
    if (cmd === 'agent.unpair' || cmd === 'data.reset') {
      // verify first (throws on wrong PIN), then release the agent, then apply
      const state = await backend.rawState()
      const saved = { url: state.agent.url, token: state.agent.token }
      const res = await backend.dispatch(cmd, payload)
      if (saved.token) postAgent(saved.url, '/v1/sync', agentSnapshot(null, true), saved.token).catch(() => {})
      await scheduleApply()
      return { ok: true, data: res.data, state: res.state, now: Date.now() }
    }
    const res = await backend.dispatch(cmd, payload)
    if (!PASSIVE.has(cmd)) await scheduleApply()
    return { ok: true, data: res.data, state: res.state, now: Date.now() }
  } catch (e) {
    return { ok: false, error: toErrorPayload(e) }
  }
}

ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  ;(async () => {
    const fromExtensionPage = sender.id === ext.runtime.id && sender.url && new URL(sender.url).origin === EXT_ORIGIN
    if (msg?.type === 'fg' && fromExtensionPage) return runCommand(msg.cmd, msg.payload)
    if (msg?.type === 'fg-meta' && fromExtensionPage) {
      if (msg.action === 'approve') {
        const list = new Set(await approvedOrigins())
        if (msg.allow) list.add(msg.origin)
        else list.delete(msg.origin)
        await ext.storage.local.set({ [ORIGINS_KEY]: [...list] })
        const pending = ((await ext.storage.session.get('fg_pending_origins')).fg_pending_origins || []).filter((o) => o !== msg.origin)
        await ext.storage.session.set({ fg_pending_origins: pending })
        scheduleApply()
        return { ok: true }
      }
      if (msg.action === 'origins') return { ok: true, data: await approvedOrigins() }
      if (msg.action === 'pending')
        return { ok: true, data: (await ext.storage.session.get('fg_pending_origins')).fg_pending_origins || [] }
      if (msg.action === 'bundles') return { ok: true, data: BUNDLES }
      if (msg.action === 'permissions') {
        const has = await ext.permissions.contains({ origins: ['<all_urls>'] })
        return { ok: true, data: { hostAccess: has, incognito: await ext.extension.isAllowedIncognitoAccess?.() } }
      }
    }
    if (msg?.type === 'fg-bridge' && sender.id === ext.runtime.id && sender.url) {
      const origin = new URL(sender.url).origin
      const approved = (await approvedOrigins()).includes(origin)
      if (msg.cmd === 'hello') {
        if (!approved) await requestApproval(origin)
        return { ok: true, data: { approved, version: ext.runtime.getManifest().version } }
      }
      if (!approved)
        return { ok: false, error: { code: 'NOT_APPROVED', message: 'Approve this site in the FocusGateway extension first.' } }
      return runCommand(msg.cmd, msg.payload)
    }
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Unknown sender.' } }
  })().then(sendResponse)
  return true // async response
})

// ---------------------------------------------------------------- lifecycle
async function tick() {
  try {
    await backend.dispatch('system.tick')
  } catch (e) {
    console.error(e)
  }
  await scheduleApply()
}

ext.alarms.create('fg-tick', { periodInMinutes: 0.5 })
ext.alarms.onAlarm.addListener((a) => a.name === 'fg-tick' && tick())
ext.runtime.onStartup.addListener(tick)
ext.runtime.onInstalled.addListener(async (details) => {
  await tick()
  if (details.reason === 'install') {
    // Came from a FocusGateway website tab? Reload it (content scripts are not injected
    // into pages that were open before install) and send the user back there, so a setup
    // done on the website carries over instead of starting the tutorial again.
    const tabs = await ext.tabs.query({ url: ['http://*/*', 'https://*/*'] }).catch(() => [])
    const appTab = tabs.find(
      (t) => /(^| · )FocusGateway($|:)/.test(t.title || '') || /FocusGateway: study without the scroll/.test(t.title || ''),
    )
    if (appTab) {
      await ext.tabs.reload(appTab.id).catch(() => {})
      await ext.tabs.update(appTab.id, { active: true }).catch(() => {})
      if (appTab.windowId != null) ext.windows?.update(appTab.windowId, { focused: true }).catch(() => {})
    } else {
      ext.tabs.create({ url: ext.runtime.getURL('app/index.html#/welcome') })
    }
  }
})
ext.action.onClicked?.addListener?.(() => {})
tick()
