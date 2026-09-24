import { describe, it, expect } from 'vitest'
import { taskStreak, computeStats } from '../src/stats.js'
import { habitStreak } from '../src/habits.js'
import { defaultState } from '../src/state.js'
import { normalizeDomain, parseDomainList } from '../src/sites.js'
import { taskColor } from '../src/tasks.js'

const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime()
const t = (deadline, completedAt) => ({
  id: String(Math.random()),
  parentId: null,
  deadline,
  status: completedAt ? 'done' : 'todo',
  completedAt: completedAt || null,
  tags: [],
})

describe('task streak', () => {
  it('counts days where every due task was finished, skipping empty days', () => {
    const s = {
      ...defaultState(),
      createdAt: at(1, 0),
      tasks: [
        t(at(18, 20), at(18, 19)),
        // 19th: nothing due (skipped)
        t(at(20, 20), at(20, 10)),
        t(at(20, 21), at(20, 12)),
        t(at(21, 20)), // today, not done yet: doesn't break
      ],
    }
    expect(taskStreak(s, at(21, 9))).toBe(2)
  })
  it('breaks when a day had an unfinished task', () => {
    const s = { ...defaultState(), createdAt: at(1, 0), tasks: [t(at(19, 20), at(19, 10)), t(at(20, 20)), t(at(20, 22), at(20, 21))] }
    expect(taskStreak(s, at(21, 9))).toBe(0)
  })
})

describe('habit streak', () => {
  it('only counts scheduled days and does not break on today', () => {
    const h = { id: 'h', days: [1, 3, 5], createdAt: at(1, 0) } // Mon Wed Fri
    const logs = { h: { '2026-09-16': true, '2026-09-18': true } } // Wed, Fri
    expect(habitStreak(h, logs, at(21, 9))).toBe(2) // Monday 21st not done yet
    logs.h['2026-09-21'] = true
    expect(habitStreak(h, logs, at(21, 9))).toBe(3)
  })
})

describe('computeStats', () => {
  it('summarises today and the accountability sections', () => {
    const s = {
      ...defaultState(),
      createdAt: at(1, 0),
      tasks: [t(at(21, 20), at(21, 8))],
      log: [
        { type: 'task_forwarded', at: at(20, 10) },
        { type: 'failsafe_used', at: at(21, 7) },
      ],
    }
    const r = computeStats(s, at(21, 9))
    expect(r.today).toMatchObject({ tasksDue: 1, tasksDone: 1 })
    expect(r.sections.windows.bad['Tasks sent to a later window']).toBe(1)
    expect(r.sections.hard.bad['Failsafe overrides used']).toBe(1)
    expect(r.days).toHaveLength(14)
    expect(r.days.at(-1).completed).toBe(1)
  })
})

describe('domains', () => {
  it('normalises pasted URLs', () => {
    expect(normalizeDomain('https://www.YouTube.com/watch?v=1')).toBe('youtube.com')
    expect(normalizeDomain('m.reddit.com:443/r/x')).toBe('m.reddit.com')
    expect(normalizeDomain('localhost')).toBeNull()
    expect(normalizeDomain('192.168.0.1')).toBeNull()
    expect(normalizeDomain('not a site')).toBeNull()
    expect(parseDomainList('a.com, b.org\nhttp://c.net nope')).toEqual({ good: ['a.com', 'b.org', 'c.net'], bad: ['nope'] })
  })
})

describe('task colour', () => {
  it('follows the forward-count breakpoints', () => {
    expect(taskColor({ priority: 'high', forwardCount: 0 })).toBe('green')
    expect(taskColor({ priority: 'high', forwardCount: 1 })).toBe('red')
    expect(taskColor({ priority: 'medium', forwardCount: 2 })).toBe('yellow')
    expect(taskColor({ priority: 'medium', forwardCount: 3 })).toBe('red')
    expect(taskColor({ priority: 'low', forwardCount: 3 })).toBe('yellow')
    expect(taskColor({ priority: 'low', forwardCount: 4 })).toBe('red')
  })
})
