// Snapshot handling for the agent. The extension sends its rules; the agent enforces
// them. A no-failsafe rule that is running right now can't be weakened by a sync:
// if it disappears or changes, the agent keeps enforcing the version it already had
// until that window ends.
import { windowAt, isLocked } from '../../packages/core/src/index.js'

const SAME = (a, b) =>
  JSON.stringify([a.days, a.start, a.end, [...a.siteIds].sort(), a.failsafe, a.mode]) ===
  JSON.stringify([b.days, b.start, b.end, [...b.siteIds].sort(), b.failsafe, b.mode])

export function validateSnapshot(s) {
  if (!s || typeof s !== 'object') return 'Snapshot must be an object.'
  for (const k of ['rules', 'tasks', 'overrides', 'customSites']) if (!Array.isArray(s[k])) return `Snapshot.${k} must be an array.`
  for (const r of s.rules) {
    if (!r.id || !['hard', 'gated'].includes(r.mode) || !Array.isArray(r.days) || !Array.isArray(r.siteIds))
      return 'Invalid rule in snapshot.'
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) return 'Invalid rule times.'
  }
  return null
}

export function mergeLocked(previous, incoming, now) {
  if (!previous) return { snapshot: incoming, kept: [] }
  const rules = [...incoming.rules]
  const customSites = [...incoming.customSites]
  const kept = []
  for (const old of previous.rules || []) {
    if (!isLocked(old) || !windowAt(old, now)) continue
    const idx = rules.findIndex((r) => r.id === old.id)
    if (idx === -1) rules.push(old)
    else if (SAME(rules[idx], old)) continue
    else rules[idx] = old
    kept.push(old.id)
    for (const id of old.siteIds) {
      if (!customSites.some((s) => s.id === id)) {
        const site = (previous.customSites || []).find((s) => s.id === id)
        if (site) customSites.push(site)
      }
    }
  }
  return { snapshot: { ...incoming, rules, customSites }, kept }
}

/** Is any no-failsafe rule running right now? Returns the latest end time or null. */
export function lockedUntil(snapshot, now) {
  let until = null
  for (const r of snapshot?.rules || []) {
    if (!isLocked(r)) continue
    const w = windowAt(r, now)
    if (w && (!until || w.end > until)) until = w.end
  }
  return until
}
