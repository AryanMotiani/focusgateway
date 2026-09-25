import { describe, it, expect } from 'vitest'
import { computeXp, levelInfo, xpToReach, xpForTask } from '../src/progress.js'
import { UNLOCKS, unlockedAt, nextUnlocks } from '../src/unlocks.js'
import { computeMilestones, bestTaskStreak, habitBestStreak } from '../src/milestones.js'
import { yearGrid, taskBoxes, weekRings } from '../src/visuals.js'
import { defaultState } from '../src/state.js'

const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime() // 21 = Monday
const task = (over) => ({
  id: String(Math.random()),
  parentId: null,
  priority: 'medium',
  deadline: at(21, 23),
  status: 'done',
  completedAt: at(21, 20),
  tags: [],
  ...over,
})

describe('XP', () => {
  it('rewards finished tasks by priority, with an on-time bonus', () => {
    expect(xpForTask(task({ priority: 'low' }))).toBe(15)
    expect(xpForTask(task({ priority: 'high', completedAt: at(22, 1) }))).toBe(30) // late: no bonus
    expect(xpForTask(task({ parentId: 'p' }))).toBe(5)
    expect(xpForTask(task({ status: 'todo' }))).toBe(0)
  })

  it('adds habits, focus and good-behaviour events; open or deleted tasks give nothing', () => {
    const s = {
      ...defaultState(),
      tasks: [task({ priority: 'high' }), task({ status: 'todo' })],
      habitLogs: { h: { '2026-09-20': true, '2026-09-21': true } },
      focus: { active: null, history: [{ focusedMin: 52 }, { focusedMin: 4 }] },
      log: [{ type: 'window_unlocked' }, { type: 'failsafe_resisted' }, { type: 'failsafe_used' }],
    }
    const xp = computeXp(s)
    expect(xp.breakdown).toEqual({ tasks: 35, habits: 10, focus: 20, discipline: 25 })
    expect(xp.total).toBe(90)
  })
})

describe('levels', () => {
  it('uses a growing curve so the late game takes months', () => {
    expect(xpToReach(1)).toBe(0)
    expect(xpToReach(2)).toBe(100)
    expect(xpToReach(10)).toBe(4500)
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, needed: 100 })
    expect(levelInfo(350)).toMatchObject({ level: 3, into: 50, needed: 300 })
    expect(levelInfo(4500).title).toBe('Scholar')
  })
})

describe('unlocks', () => {
  it('is spread out so nothing near the end unlocks in the first months', () => {
    const levels = UNLOCKS.map((u) => u.level)
    expect(Math.max(...levels)).toBeGreaterThanOrEqual(40)
    expect(unlockedAt(1).every((u) => u.level === 1)).toBe(true)
    expect(unlockedAt(10).length).toBeGreaterThan(unlockedAt(1).length)
    expect(new Set(UNLOCKS.map((u) => u.id)).size).toBe(UNLOCKS.length) // unique ids
    expect(nextUnlocks(1, 2).every((u) => u.level > 1)).toBe(true)
  })
})

describe('milestones', () => {
  it('computes best-ever task streak and badge progress', () => {
    const s = {
      ...defaultState(),
      createdAt: at(1, 0),
      tasks: [18, 19, 20].map((d) => task({ deadline: at(d, 22), completedAt: at(d, 12) })),
    }
    expect(bestTaskStreak(s, at(24, 9))).toBe(3)
    const m = computeMilestones(s, at(24, 9))
    const first = m.find((x) => x.id === 'tasks-10')
    expect(first).toMatchObject({ achieved: false, value: 3, target: 10 })
    expect(m.find((x) => x.id === 'streak-3').achieved).toBe(true)
  })
})

describe('habit best streak', () => {
  it('counts the longest run of scheduled days for one habit', () => {
    const h = { id: 'h', days: [1, 2, 3, 4, 5, 6, 7], createdAt: at(1, 0) }
    const logs = { h: { '2026-09-01': true, '2026-09-02': true, '2026-09-03': true, '2026-09-05': true } }
    expect(habitBestStreak(h, logs)).toBe(3)
    expect(habitBestStreak(h, {})).toBe(0)
  })
})

describe('visuals', () => {
  it('builds a year grid of weeks with shade levels', () => {
    const s = {
      ...defaultState(),
      tasks: [task({ deadline: at(21, 22), completedAt: at(21, 12) }), task({ deadline: at(21, 23), status: 'todo' })],
    }
    const g = yearGrid(s, at(21, 23, 30), { kind: 'tasks' })
    expect(g.weeks.length).toBe(53)
    const today = g.weeks.at(-1).find((c) => c && c.date === '2026-09-21')
    expect(today).toMatchObject({ ratio: 0.5, level: 2, total: 2 })
  })

  it('lists task boxes per day with on-time / late / missed / open', () => {
    const s = {
      ...defaultState(),
      tasks: [
        task({ deadline: at(20, 20), completedAt: at(20, 10) }),
        task({ deadline: at(20, 20), completedAt: at(21, 10) }),
        task({ deadline: at(20, 21), status: 'todo' }),
        task({ deadline: at(21, 22), status: 'todo' }),
      ],
    }
    const days = taskBoxes(s, at(21, 12), 2)
    expect(days.map((d) => d.boxes.map((b) => b.state))).toEqual([['done', 'late', 'missed'], ['open']])
  })

  it('closes weekly rings against goals', () => {
    const s = {
      ...defaultState(),
      tasks: [task({ deadline: at(21, 22), completedAt: at(21, 12) })],
      settings: { ...defaultState().settings, weeklyFocusGoalMin: 300 },
    }
    const r = weekRings(s, at(23, 12))
    expect(r.tasks).toMatchObject({ value: 1, goal: 1 })
    expect(r.focus.goal).toBe(300)
  })
})
