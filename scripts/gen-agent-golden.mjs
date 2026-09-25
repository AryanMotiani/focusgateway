// Generates agent/internal/core/testdata/golden.json: random snapshots run through
// the JavaScript engine (packages/core), so the Go tests can check that the lock
// agent's port gives exactly the same answers. Run it again after changing the
// engine rules in packages/core:
//
//   TZ=America/New_York node scripts/gen-agent-golden.mjs
//
// The Go test loads the same time zone, and the dates cover both DST switches.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeBlocks, windowAt, isLocked, BUNDLES } from '../packages/core/src/index.js'

if (process.env.TZ !== 'America/New_York') {
  console.error('Run with TZ=America/New_York so the Go test can use the same zone.')
  process.exit(1)
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'agent/internal/core/testdata/golden.json')

// Reference copy of the former agent/src/lock.js (the Node.js agent), kept here so
// the Go port of these rules stays checked against the original behaviour.
const SAME = (a, b) =>
  JSON.stringify([a.days, a.start, a.end, [...a.siteIds].sort(), a.failsafe, a.mode]) ===
  JSON.stringify([b.days, b.start, b.end, [...b.siteIds].sort(), b.failsafe, b.mode])
function validateSnapshot(s) {
  if (!s || typeof s !== 'object') return 'Snapshot must be an object.'
  for (const k of ['rules', 'tasks', 'overrides', 'customSites']) if (!Array.isArray(s[k])) return `Snapshot.${k} must be an array.`
  for (const r of s.rules) {
    if (!r.id || !['hard', 'gated'].includes(r.mode) || !Array.isArray(r.days) || !Array.isArray(r.siteIds))
      return 'Invalid rule in snapshot.'
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) return 'Invalid rule times.'
  }
  return null
}
function mergeLocked(previous, incoming, now) {
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
function lockedUntil(snapshot, now) {
  let until = null
  for (const r of snapshot?.rules || []) {
    if (!isLocked(r)) continue
    const w = windowAt(r, now)
    if (w && (!until || w.end > until)) until = w.end
  }
  return until
}

// Small deterministic PRNG so the file is stable between runs.
let seed = 20260925
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))
const maybe = (p) => rnd() < p

const HOUR = 3_600_000
// around both DST switches in New York and a quiet week in between
const bases = [new Date(2026, 2, 6).getTime(), new Date(2026, 5, 15).getTime(), new Date(2026, 9, 30).getTime()]
const bundleIds = BUNDLES.map((b) => b.id)

function randomSnapshot(now) {
  const customSites = Array.from({ length: int(0, 3) }, (_, i) => ({
    id: 'c' + i,
    name: 'Custom ' + i,
    domains: Array.from({ length: int(1, 3) }, (_, j) => `site${i}-${j}.example`),
  }))
  const siteIds = () => Array.from({ length: int(0, 3) }, () => (customSites.length && maybe(0.3) ? pick(customSites).id : pick(bundleIds)))
  const rules = Array.from({ length: int(0, 4) }, (_, i) => {
    const r = {
      id: 'r' + i,
      name: 'Rule ' + i,
      mode: pick(['hard', 'hard', 'gated']),
      siteIds: siteIds(),
      days: [1, 2, 3, 4, 5, 6, 7].filter(() => maybe(0.5)),
      start: int(0, 95) * 15,
      end: int(0, 95) * 15,
    }
    const fs = rnd()
    if (fs < 0.45) r.failsafe = false
    else if (fs < 0.9) r.failsafe = true
    return r
  })
  const gated = rules.filter((r) => r.mode === 'gated')
  const tasks = Array.from({ length: int(0, 6) }, (_, i) => {
    const done = maybe(0.5)
    const t = {
      id: 't' + i,
      ruleId: gated.length && maybe(0.8) ? pick(gated).id : null,
      parentId: maybe(0.15) ? 't0' : null,
      status: done ? 'done' : 'todo',
      completedAt: done ? now - int(0, 5 * 24) * HOUR : null,
      createdAt: now - int(0, 8 * 24) * HOUR,
      startAt: maybe(0.3) ? now + int(-48, 48) * HOUR : null,
      forwardedUntil: maybe(0.2) ? now + int(-24, 72) * HOUR : null,
      deadline: now + int(-48, 48) * HOUR,
    }
    if (maybe(0.1)) delete t.completedAt
    return t
  })
  const overrides = rules.filter(() => maybe(0.25)).map((r) => ({ ruleId: r.id, until: now + int(-3, 3) * HOUR }))
  let active = null
  if (maybe(0.3)) {
    active = {
      id: 'f1',
      siteIds: siteIds(),
      startedAt: now - int(0, 180) * 60_000,
      workMin: pick([25, 50]),
      breakMin: pick([5, 10]),
      iterations: int(1, 4),
    }
    if (maybe(0.3)) active.endsAt = now + int(-60, 60) * 60_000
  }
  return { sentAt: now, rules, tasks, overrides, focus: { active }, customSites }
}

function mutate(prev) {
  const next = structuredClone(prev)
  next.sentAt = prev.sentAt + 1000
  for (const r of next.rules) {
    const k = rnd()
    if (k < 0.2) r.end = (r.end + 60) % 1440
    else if (k < 0.3) r.failsafe = true
    else if (k < 0.4) r.siteIds = []
    else if (k < 0.45) r.siteIds = [...r.siteIds].reverse()
  }
  next.rules = next.rules.filter(() => maybe(0.7))
  next.customSites = next.customSites.filter(() => maybe(0.5))
  return next
}

const blocks = []
const merges = []
for (let i = 0; i < 400; i++) {
  const now = pick(bases) + int(0, 7 * 24 * 60) * 60_000
  const state = randomSnapshot(now)
  blocks.push({ now, state, domains: computeBlocks(state, now).domains, lockedUntil: lockedUntil(state, now) })
  if (i % 3 === 0) {
    const incoming = mutate(state)
    const later = now + int(0, 180) * 60_000
    const r = mergeLocked(state, incoming, later)
    merges.push({ now: later, previous: state, incoming, merged: r.snapshot, kept: r.kept })
  }
}

const invalid = [
  null,
  'text',
  [],
  { rules: 'x' },
  { rules: [], tasks: [], overrides: [] },
  { rules: [{ id: '', mode: 'hard', days: [], siteIds: [], start: 1, end: 2 }], tasks: [], overrides: [], customSites: [] },
  { rules: [{ id: 'a', mode: 'soft', days: [], siteIds: [], start: 1, end: 2 }], tasks: [], overrides: [], customSites: [] },
  { rules: [{ id: 'a', mode: 'hard', days: 1, siteIds: [], start: 1, end: 2 }], tasks: [], overrides: [], customSites: [] },
  { rules: [{ id: 'a', mode: 'gated', days: [], siteIds: [], start: 1.5, end: 2 }], tasks: [], overrides: [], customSites: [] },
  { rules: [{ id: 'a', mode: 'gated', days: [], siteIds: [], start: 1, end: '2' }], tasks: [], overrides: [], customSites: [] },
  { rules: [{ id: 7, mode: 'gated', days: [], siteIds: [], start: 1, end: 2 }], tasks: [], overrides: [], customSites: [] },
]
const validation = invalid.map((s) => ({ snapshot: s, problem: validateSnapshot(s) }))

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ tz: process.env.TZ, blocks, merges, validation }) + '\n')
console.log(
  `wrote ${path.relative(root, out)}: ${blocks.length} block cases, ${merges.length} merge cases, ${validation.length} validation cases`,
)
