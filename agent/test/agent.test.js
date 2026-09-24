import { describe, it, expect } from 'vitest'
import { renderHosts, managedDomains, stripManaged, MARKER_START } from '../src/hosts.js'
import { mergeLocked, lockedUntil, validateSnapshot } from '../src/lock.js'

const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime()

describe('hosts file rendering', () => {
  const original = '127.0.0.1 localhost\n::1 localhost\n# my own entry\n10.0.0.5 nas.local\n'

  it('adds a managed block with www variants and IPv6, leaving other lines alone', () => {
    const out = renderHosts(original, ['youtube.com', 'www.reddit.com'])
    expect(out.startsWith(original.trimEnd())).toBe(true)
    expect(out).toContain('0.0.0.0 youtube.com')
    expect(out).toContain('0.0.0.0 www.youtube.com')
    expect(out).toContain(':: youtube.com')
    expect(out).not.toContain('www.www.reddit.com')
    expect(managedDomains(out)).toEqual(['www.reddit.com', 'www.youtube.com', 'youtube.com'])
  })

  it('replaces the block instead of stacking, and removes it cleanly', () => {
    const once = renderHosts(original, ['a.com'])
    const twice = renderHosts(once, ['b.com'])
    expect(twice.split(MARKER_START)).toHaveLength(2)
    expect(twice).not.toContain('a.com')
    expect(renderHosts(twice, [])).toBe(original)
  })

  it('preserves CRLF files on Windows', () => {
    const win = original.replace(/\n/g, '\r\n')
    const out = renderHosts(win, ['x.com'], '\r\n')
    expect(out).toContain('\r\n0.0.0.0 x.com\r\n')
    expect(stripManaged(out).join('\r\n') + '\r\n').toBe(win)
  })
})

describe('lock merge', () => {
  const locked = { id: 'L', name: 'Night', mode: 'hard', siteIds: ['youtube'], days: [1], start: 1260, end: 1380, failsafe: false }
  const soft = { ...locked, id: 'S', failsafe: true }
  const snap = (rules) => ({ rules, tasks: [], overrides: [], customSites: [], focus: { active: null } })

  it('keeps a running no-failsafe rule that was deleted or weakened', () => {
    const prev = snap([locked, soft])
    const deleted = mergeLocked(prev, snap([]), at(21, 22))
    expect(deleted.snapshot.rules.map((r) => r.id)).toEqual(['L'])
    const weakened = mergeLocked(prev, snap([{ ...locked, end: 1300 }]), at(21, 22))
    expect(weakened.snapshot.rules[0].end).toBe(1380)
    expect(weakened.kept).toEqual(['L'])
  })

  it('accepts changes once the window is over', () => {
    const r = mergeLocked(snap([locked]), snap([]), at(21, 23, 30))
    expect(r.snapshot.rules).toEqual([])
  })

  it('reports how long the lock lasts', () => {
    expect(lockedUntil(snap([locked]), at(21, 22))).toBe(at(21, 23))
    expect(lockedUntil(snap([soft]), at(21, 22))).toBeNull()
  })

  it('validates snapshots', () => {
    expect(validateSnapshot(snap([locked]))).toBeNull()
    expect(validateSnapshot({ rules: 'x' })).toMatch(/rules/)
  })
})
