import { describe, it, expect } from 'vitest'
import { computeBlocks, gatedStatus } from '../src/engine.js'
import { defaultState } from '../src/state.js'

const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime() // Sep 2026, 21 = Monday
const MON = 21

function stateWith(partial) {
  return { ...defaultState(), ...partial }
}

const hard = { id: 'r1', name: 'Mornings', mode: 'hard', siteIds: ['youtube'], days: [1, 2, 3, 4, 5], start: 540, end: 720, failsafe: true, createdAt: at(1, 0) }
const gated = { id: 'r2', name: 'Study', mode: 'gated', siteIds: ['instagram'], days: [1, 2, 3, 4, 5], start: 840, end: 1020, failsafe: true, createdAt: at(1, 0) }
const task = (over) => ({ id: 't' + Math.random(), parentId: null, ruleId: 'r2', title: 'x', priority: 'medium', deadline: at(MON, 23), startAt: null, status: 'todo', completedAt: null, createdAt: at(MON, 8), forwardCount: 0, forwardedUntil: null, ...over })

describe('hard blocks', () => {
  it('blocks all bundle domains inside the window, not outside', () => {
    const s = stateWith({ rules: [hard] })
    const inside = computeBlocks(s, at(MON, 10))
    expect(inside.domains).toContain('youtube.com')
    expect(inside.domains).toContain('googlevideo.com')
    expect(inside.blocks[0]).toMatchObject({ kind: 'hard', ruleId: 'r1', until: at(MON, 12), locked: false })
    expect(computeBlocks(s, at(MON, 13)).domains).toEqual([])
  })

  it('marks a hard block without failsafe as locked', () => {
    const s = stateWith({ rules: [{ ...hard, failsafe: false }] })
    expect(computeBlocks(s, at(MON, 10)).blocks[0].locked).toBe(true)
  })

  it('a live failsafe override lifts the block for the rest of the window', () => {
    const s = stateWith({ rules: [hard], overrides: [{ ruleId: 'r1', until: at(MON, 12) }] })
    expect(computeBlocks(s, at(MON, 10)).domains).toEqual([])
  })

  it('ignores overrides on locked rules', () => {
    const s = stateWith({ rules: [{ ...hard, failsafe: false }], overrides: [{ ruleId: 'r1', until: at(MON, 12) }] })
    expect(computeBlocks(s, at(MON, 10)).domains).toContain('youtube.com')
  })
})

describe('task-gated windows', () => {
  it('blocks while any attached task is pending', () => {
    const s = stateWith({ rules: [gated], tasks: [task({ status: 'done', completedAt: at(MON, 14, 30) }), task()] })
    expect(computeBlocks(s, at(MON, 15)).domains).toContain('instagram.com')
  })

  it('unlocks for the rest of the window when every task is done', () => {
    const s = stateWith({ rules: [gated], tasks: [task({ status: 'done', completedAt: at(MON, 14, 30) })] })
    expect(computeBlocks(s, at(MON, 15)).domains).toEqual([])
    expect(gatedStatus(s, gated, at(MON, 15)).status).toBe('unlocked')
  })

  it('counts tasks finished before the window started (early completion)', () => {
    const s = stateWith({ rules: [gated], tasks: [task({ status: 'done', completedAt: at(MON, 9) })] })
    expect(computeBlocks(s, at(MON, 15)).domains).toEqual([])
  })

  it('stays blocked with zero tasks (empty-window loophole closed)', () => {
    const s = stateWith({ rules: [gated], tasks: [] })
    expect(computeBlocks(s, at(MON, 15)).domains).toContain('instagram.com')
  })

  it('does not count tasks completed in an earlier window', () => {
    const s = stateWith({ rules: [gated], tasks: [task({ status: 'done', completedAt: at(MON, 15), createdAt: at(MON, 8) })] })
    // Tuesday's window: Monday's completion is before Monday's window end, so it belongs to Monday
    expect(computeBlocks(s, at(22, 15)).domains).toContain('instagram.com')
  })

  it('extends past the window end while tasks stay incomplete', () => {
    const s = stateWith({ rules: [gated], tasks: [task()] })
    const after = computeBlocks(s, at(MON, 19))
    expect(after.domains).toContain('instagram.com')
    expect(after.blocks[0]).toMatchObject({ kind: 'gated', extended: true })
  })

  it('does not extend for tasks added after the window ended', () => {
    const s = stateWith({ rules: [gated], tasks: [task({ createdAt: at(MON, 18) })] })
    expect(computeBlocks(s, at(MON, 19)).domains).toEqual([])
  })

  it('ignores tasks whose start time is after the window (next recurrence)', () => {
    const s = stateWith({ rules: [gated], tasks: [task({ status: 'done', completedAt: at(MON, 14, 10) }), task({ startAt: at(MON, 23) })] })
    expect(computeBlocks(s, at(MON, 15)).domains).toEqual([])
  })

  it('forwarded tasks are excluded until the next window', () => {
    const s = stateWith({ rules: [gated], tasks: [task({ status: 'done', completedAt: at(MON, 14, 10) }), task({ forwardedUntil: at(22, 14) })] })
    expect(computeBlocks(s, at(MON, 15)).domains).toEqual([])
    expect(computeBlocks(s, at(22, 15)).domains).toContain('instagram.com')
  })
})

describe('focus sessions', () => {
  it('blocks target sites for the whole session including breaks', () => {
    const s = stateWith({ focus: { active: { id: 'f1', siteIds: ['reddit'], startedAt: at(MON, 20), endsAt: at(MON, 21) }, history: [] } })
    expect(computeBlocks(s, at(MON, 20, 40)).domains).toContain('reddit.com')
    expect(computeBlocks(s, at(MON, 21, 1)).domains).toEqual([])
  })

  it('unions with rule blocks without duplicates', () => {
    const s = stateWith({ rules: [hard], focus: { active: { id: 'f1', siteIds: ['youtube', 'reddit'], startedAt: at(MON, 9), endsAt: at(MON, 11) }, history: [] } })
    const r = computeBlocks(s, at(MON, 10))
    expect(r.domains.filter((d) => d === 'youtube.com')).toHaveLength(1)
    expect(r.domains).toContain('reddit.com')
    expect(r.blocks).toHaveLength(2)
  })
})
