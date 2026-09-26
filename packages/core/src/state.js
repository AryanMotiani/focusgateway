import { DEFAULT_APPEARANCE, DEFAULT_COLOR_MODE, LOOK_VERSION, migrateAppearance } from './appearance.js'
import { defaultRoom, sanitizeRoom } from './room.js'
import { DEFAULT_LOFI, sanitizeLofi } from './lofi.js'
import { defaultStats, backfillStats, sanitizeStats } from './progress.js'
import { defaultShop, sanitizeShop, grandfatherShop, defaultCoinStats, sanitizeCoinStats, backfillCoinStats } from './economy.js'

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
      weekStartsOn: 1,
      notifications: true,
      uiMode: 'game', // 'game' | 'minimal'
      sounds: true,
      weeklyFocusGoalMin: 300,
      appearance: structuredClone(DEFAULT_APPEARANCE), // the theme, per mode
      colorMode: DEFAULT_COLOR_MODE, // 'light' | 'dark' | 'auto', the variant of every theme
      lookVersion: LOOK_VERSION, // see migrateAppearance
      lofi: structuredClone(DEFAULT_LOFI), // study room scene, music and ambience, see lofi.js
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
    stats: { ...defaultStats(0), coins: defaultCoinStats() }, // running XP, coin and badge counters, see progress.js
    shop: defaultShop(), // purchases and the starter gift, see economy.js
    runtime: { ruleStatus: {} },
    agent: { url: 'http://127.0.0.1:47621', token: null, pairCode: null, lastSyncAt: 0, lastError: null },
  }
}

const SETTING_CHOICES = { uiMode: ['game', 'minimal'] }
const inRange = (v, lo, hi, fallback) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/**
 * Fills in any keys missing from older saved states so upgrades never crash, and cleans
 * settings so stored or imported data never carries unknown ids or out of range values.
 * `now` marks when a save without XP counters was upgraded (see progress.js).
 */
export function migrate(saved, now = Date.now()) {
  const base = defaultState()
  if (!saved || typeof saved !== 'object') return base
  const out = { ...base, ...saved }
  for (const k of ['onboarding', 'security', 'settings', 'focus', 'runtime', 'agent']) {
    out[k] = { ...base[k], ...(saved[k] || {}) }
  }
  out.settings.lofi = sanitizeLofi(saved.settings?.lofi)
  // The old palette picker became themes, the old switch and night theme the colour mode, see appearance.js
  const look = migrateAppearance(saved.settings)
  out.settings.appearance = look.appearance
  out.settings.colorMode = look.colorMode
  out.settings.lookVersion = LOOK_VERSION
  delete out.settings.theme
  for (const [k, list] of Object.entries(SETTING_CHOICES)) if (!list.includes(out.settings[k])) out.settings[k] = base.settings[k]
  for (const k of ['notifications', 'sounds']) out.settings[k] = out.settings[k] !== false
  out.settings.weekStartsOn = [0, 1, 6, 7].includes(out.settings.weekStartsOn) ? out.settings.weekStartsOn : base.settings.weekStartsOn
  out.settings.failsafeWaitSeconds = inRange(out.settings.failsafeWaitSeconds, 30, 300, base.settings.failsafeWaitSeconds)
  out.settings.weeklyFocusGoalMin = inRange(out.settings.weeklyFocusGoalMin, 30, 5000, base.settings.weeklyFocusGoalMin)
  out.settings.room = saved.settings?.room ? sanitizeRoom(saved.settings.room, base.settings.room) : base.settings.room
  for (const k of ['customSites', 'rules', 'tasks', 'tags', 'habits', 'overrides', 'log']) {
    if (!Array.isArray(out[k])) out[k] = base[k]
  }
  if (!out.habitLogs || typeof out.habitLogs !== 'object') out.habitLogs = {}
  if (!Array.isArray(out.focus.history)) out.focus.history = []
  // Old saves have no counters yet: start them from what the log and focus history still hold
  out.stats = saved.stats && typeof saved.stats === 'object' ? sanitizeStats(saved.stats, now) : backfillStats(out, now)
  // Coins: saves from before the shop start with coins for their past focus time, and keep
  // everything they placed or picked (see economy.js)
  const coins = saved.stats?.coins
  out.stats.coins = coins && typeof coins === 'object' ? sanitizeCoinStats(coins, now) : backfillCoinStats(out, now)
  out.shop = saved.shop && typeof saved.shop === 'object' ? sanitizeShop(saved.shop) : grandfatherShop(out, now)
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
