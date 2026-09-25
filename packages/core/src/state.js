import { DEFAULT_APPEARANCE } from './appearance.js'
import { defaultRoom, sanitizeRoom } from './room.js'

export const SCHEMA_VERSION = 1

export const DEFAULT_TAGS = ['School', 'Work', 'Personal', 'Fitness', 'Reading']

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: null,
    onboarding: { completed: false, steps: {} },
    security: { pin: null, recovery: null, recoveryUsed: false, failedAttempts: 0, lockedUntil: 0 },
    settings: {
      failsafeWaitSeconds: 60,
      theme: 'system',
      weekStartsOn: 1,
      notifications: true,
      uiMode: 'game', // 'game' | 'minimal'
      sounds: true,
      weeklyFocusGoalMin: 300,
      appearance: structuredClone(DEFAULT_APPEARANCE), // palette + heading font + body font, per mode
      lofi: { volume: 0.6, scene: 'night', style: 'music-classic', objects: true, mix: { rain: 0.5, cafe: 0, fire: 0, noise: 0 } },
      room: defaultRoom(), // avatar + placed decor, see room.js
    },
    customSites: [],
    rules: [],
    tasks: [],
    tags: [...DEFAULT_TAGS],
    habits: [],
    habitLogs: {},
    focus: { active: null, history: [] },
    overrides: [],
    failsafe: null,
    log: [],
    runtime: { ruleStatus: {} },
    agent: { url: 'http://127.0.0.1:47621', token: null, pairCode: null, lastSyncAt: 0, lastError: null },
  }
}

/** Fills in any keys missing from older saved states so upgrades never crash. */
export function migrate(saved) {
  const base = defaultState()
  if (!saved || typeof saved !== 'object') return base
  const out = { ...base, ...saved }
  for (const k of ['onboarding', 'security', 'settings', 'focus', 'runtime', 'agent']) {
    out[k] = { ...base[k], ...(saved[k] || {}) }
  }
  out.settings.lofi = { ...base.settings.lofi, ...(saved.settings?.lofi || {}) }
  out.settings.lofi.mix = { ...base.settings.lofi.mix, ...(saved.settings?.lofi?.mix || {}) }
  const look = saved.settings?.appearance || {}
  out.settings.appearance = {
    game: { ...base.settings.appearance.game, ...(look.game || {}) },
    minimal: { ...base.settings.appearance.minimal, ...(look.minimal || {}) },
  }
  out.settings.room = saved.settings?.room ? sanitizeRoom(saved.settings.room, base.settings.room) : base.settings.room
  for (const k of ['customSites', 'rules', 'tasks', 'tags', 'habits', 'overrides', 'log']) {
    if (!Array.isArray(out[k])) out[k] = base[k]
  }
  if (!out.habitLogs || typeof out.habitLogs !== 'object') out.habitLogs = {}
  out.schemaVersion = SCHEMA_VERSION
  return out
}

/** State safe to hand to a UI: secrets removed. */
export function publicState(state) {
  const { security, agent, ...rest } = state
  return {
    ...rest,
    security: {
      hasPin: !!security.pin,
      recoveryUsed: security.recoveryUsed,
      lockedUntil: security.lockedUntil,
    },
    agent: { url: agent.url, paired: !!agent.token, pairing: !!agent.pairCode, lastSyncAt: agent.lastSyncAt, lastError: agent.lastError },
  }
}
