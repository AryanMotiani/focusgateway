// Why a site is (or is not) blocked: subdomain matching the way declarativeNetRequest's
// requestDomains does it, focus sessions with custom sites, the one minute blocking test,
// and the plain explanation the UI shows for each rule.
import { describe, it, expect } from 'vitest'
import { computeBlocks, explainRule, TEST_DOMAIN, TEST_BLOCK_MS } from '../src/engine.js'
import { hostMatches, domainsForSites, normalizeDomain } from '../src/sites.js'
import { defaultState } from '../src/state.js'
import { createBackend } from '../src/backend.js'

const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime() // Sep 2026, 21 = Monday
const MON = 21

/** A host is blocked when any blocked domain matches it (requestDomains semantics). */
const blocked = (domains, host) => domains.some((d) => hostMatches(host, d))

describe('subdomain matching', () => {
  const state = defaultState()
  const yt = domainsForSites(state, ['youtube'])
  const rd = domainsForSites(state, ['reddit'])

  it('covers www, mobile and short-link hosts of YouTube', () => {
    for (const h of ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'WWW.YOUTUBE.COM.'])
      expect(blocked(yt, h), h).toBe(true)
  })
  it('covers old, new, www reddit and redd.it', () => {
    for (const h of ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com', 'redd.it', 'i.redd.it', 'v.redd.it'])
      expect(blocked(rd, h), h).toBe(true)
  })
  it('does not match look-alike hosts', () => {
    for (const h of ['notyoutube.com', 'youtube.com.evil.net', 'myreddit.com', 'reddit.co'])
      expect(blocked([...yt, ...rd], h), h).toBe(false)
  })
  it('custom sites are normalized to a bare host, so subdomains follow', () => {
    expect(normalizeDomain('https://www.Chess.com/play')).toBe('chess.com')
    expect(blocked(['chess.com'], 'www.chess.com')).toBe(true)
    expect(blocked(['chess.com'], 'lichess.org')).toBe(false)
  })
})

describe('focus sessions', () => {
  it('block the picked bundles and custom sites for the whole session, breaks included', () => {
    const start = at(MON, 10)
    const state = {
      ...defaultState(),
      customSites: [{ id: 'c1', name: 'Chess', domains: ['chess.com'] }],
      focus: {
        active: { id: 'f', workMin: 25, breakMin: 5, iterations: 2, siteIds: ['youtube', 'reddit', 'c1'], startedAt: start },
        history: [],
      },
    }
    for (const t of [start, start + 27 * 60_000, start + 50 * 60_000]) {
      const { domains } = computeBlocks(state, t)
      expect(domains).toContain('youtube.com')
      expect(domains).toContain('reddit.com')
      expect(domains).toContain('chess.com')
    }
    expect(computeBlocks(state, start + 56 * 60_000).domains).toEqual([])
  })

  it('start through the backend and block right away', async () => {
    let saved = null
    const be = createBackend({
      storage: { load: async () => saved, save: async (s) => (saved = s) },
      now: () => at(MON, 10),
      hashIterations: 1000,
    })
    await be.dispatch('focus.start', { workMin: 25, breakMin: 5, iterations: 1, siteIds: ['youtube', 'reddit'] })
    const { domains } = be.blocks(at(MON, 10, 1))
    expect(blocked(domains, 'www.youtube.com')).toBe(true)
    expect(blocked(domains, 'old.reddit.com')).toBe(true)
  })
})

describe('blocking test', () => {
  it('blocks the test domain for a minute, and a hit from the blocked page ends it', async () => {
    let clock = at(MON, 10)
    let saved = null
    const be = createBackend({
      storage: { load: async () => saved, save: async (s) => (saved = s) },
      now: () => clock,
      hashIterations: 1000,
    })
    const { data } = await be.dispatch('blocking.test')
    expect(data.domain).toBe(TEST_DOMAIN)
    expect(be.blocks(clock).domains).toEqual([TEST_DOMAIN])
    expect(be.blocks(clock).blocks).toEqual([]) // not a rule, never shows as one
    expect(be.blocks(clock + TEST_BLOCK_MS).domains).toEqual([])
    // other domains do not count as a hit
    expect((await be.dispatch('blocking.hit', { domain: 'youtube.com' })).data.test).toBe(false)
    clock += 2000
    const hit = await be.dispatch('blocking.hit', { domain: TEST_DOMAIN })
    expect(hit.data.test).toBe(true)
    expect(hit.state.runtime.blockTest.hitAt).toBe(clock)
    expect(be.blocks(clock).domains).toEqual([])
  })
})

describe('explainRule', () => {
  const hard = {
    id: 'h',
    name: 'Mornings',
    mode: 'hard',
    siteIds: ['youtube'],
    days: [1, 2, 3, 4, 5],
    start: 540,
    end: 720,
    failsafe: true,
  }
  const gated = { id: 'g', name: 'Study', mode: 'gated', siteIds: ['reddit'], days: [1, 2, 3, 4, 5], start: 840, end: 1020, failsafe: true }
  const task = (over) => ({
    id: 't',
    parentId: null,
    ruleId: 'g',
    title: 'x',
    deadline: at(MON, 23),
    status: 'open',
    createdAt: at(MON, 8),
    ...over,
  })

  it('says a rule outside its hours is not blocking, and when it starts', () => {
    const e = explainRule({ ...defaultState(), rules: [hard] }, hard, at(MON, 8))
    expect(e).toMatchObject({ blocking: false, code: 'outside', next: at(MON, 9) })
  })
  it('says a hard block inside its window is blocking until the end', () => {
    expect(explainRule({ ...defaultState(), rules: [hard] }, hard, at(MON, 10))).toMatchObject({
      blocking: true,
      code: 'window',
      until: at(MON, 12),
    })
  })
  it('explains task-gated states', () => {
    const s = (tasks) => ({ ...defaultState(), rules: [gated], tasks })
    expect(explainRule(s([]), gated, at(MON, 15)).code).toBe('no-tasks')
    expect(explainRule(s([task()]), gated, at(MON, 15))).toMatchObject({ blocking: true, code: 'pending', pending: 1 })
    expect(explainRule(s([task({ status: 'done', completedAt: at(MON, 14, 30) })]), gated, at(MON, 15))).toMatchObject({
      blocking: false,
      code: 'done',
    })
  })
  it('says a Failsafe override is why it is open', () => {
    const state = { ...defaultState(), rules: [hard], overrides: [{ ruleId: 'h', until: at(MON, 11) }] }
    expect(explainRule(state, hard, at(MON, 10))).toMatchObject({ blocking: false, code: 'failsafe', until: at(MON, 11) })
  })
})
