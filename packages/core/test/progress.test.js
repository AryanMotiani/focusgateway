import { describe, it, expect } from 'vitest'
import {
  computeXp,
  levelInfo,
  xpToReach,
  xpForTask,
  progressOf,
  awardEvent,
  defaultStats,
  backfillStats,
  taskLedger,
  recordFocus,
  TASK_DAILY_CAP,
  DISCIPLINE_DAILY_CAP,
} from '../src/progress.js'
import { UNLOCKS, unlockedAt, nextUnlocks } from '../src/unlocks.js'
import { computeMilestones, bestTaskStreak, habitBestStreak } from '../src/milestones.js'
import { yearGrid, taskBoxes, weekRings } from '../src/visuals.js'
import { defaultState, migrate } from '../src/state.js'

const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime() // 21 = Monday
const task = (over) => ({
  id: String(Math.random()),
  parentId: null,
  priority: 'medium',
  deadline: at(21, 23),
  status: 'done',
  createdAt: at(1, 9),
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
    const stats = defaultStats(0)
    stats.events.window_unlocked = 1
    stats.events.failsafe_resisted = 1
    recordFocus(stats, 52)
    recordFocus(stats, 4)
    const s = {
      ...defaultState(),
      tasks: [task({ priority: 'high' }), task({ status: 'todo' })],
      habitLogs: { h: { '2026-09-20': true, '2026-09-21': true } },
      focus: { active: null, history: [] },
      stats,
    }
    const xp = computeXp(s)
    expect(xp.breakdown).toEqual({ tasks: 35, habits: 10, focus: 20, discipline: 25 })
    expect(xp.total).toBe(90)
  })
})

describe('anti-farming', () => {
  it('pays nothing for a task finished within 10 minutes of being made', () => {
    const s = { ...defaultState(), tasks: [task({ createdAt: at(21, 19, 55) }), task({ createdAt: at(21, 19, 50) })] }
    expect(taskLedger(s)).toEqual({ xp: 25, counted: 1 })
  })

  it('caps task XP per day of completion, and counts only paid tasks for badges', () => {
    const many = Array.from({ length: 40 }, (_, i) => task({ priority: 'low', completedAt: at(21, 20, i) }))
    const s = { ...defaultState(), tasks: many }
    expect(taskLedger(s)).toEqual({ xp: TASK_DAILY_CAP, counted: 20 })
    // another day has its own cap
    s.tasks.push(task({ priority: 'low', completedAt: at(22, 10), deadline: at(22, 23) }))
    expect(taskLedger(s).xp).toBe(TASK_DAILY_CAP + 15)
  })

  it('caps habit XP per day', () => {
    const habitLogs = Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['h' + i, { '2026-09-21': true }]))
    expect(computeXp({ ...defaultState(), habitLogs }).breakdown.habits).toBe(50)
  })

  it('pays each occurrence once and caps discipline XP per day', () => {
    const stats = defaultStats(0)
    expect(awardEvent(stats, 'window_unlocked', 'a', at(21, 10))).toEqual({ fresh: true, xp: 15 })
    expect(awardEvent(stats, 'window_unlocked', 'a', at(21, 11))).toEqual({ fresh: false, xp: 0 })
    let paid = 15
    for (let i = 0; i < 20; i++) paid += awardEvent(stats, 'failsafe_resisted', 'r' + i, at(21, 12)).xp
    expect(paid).toBe(95) // an event pays in full or not at all, never over the cap
    expect(paid).toBeLessThanOrEqual(DISCIPLINE_DAILY_CAP)
    expect(awardEvent(stats, 'failsafe_resisted', 'next-day', at(22, 12)).xp).toBe(10)
    // old keys are forgotten after a while so storage stays small
    awardEvent(stats, 'window_respected', 'later', at(21, 12) + 30 * 86_400_000)
    expect(Object.keys(stats.seen)).toEqual(['later'])
  })

  it('keeps what older saves earned: counters are backfilled and old tasks keep the old rules', () => {
    const quick = Array.from({ length: 40 }, (_, i) => task({ priority: 'low', createdAt: at(21, 20, i), completedAt: at(21, 20, i) }))
    const old = {
      ...defaultState(),
      tasks: quick,
      log: [{ type: 'window_unlocked' }, { type: 'failsafe_resisted' }, { type: 'failsafe_resisted' }],
      focus: { active: null, history: [{ focusedMin: 60 }] },
    }
    delete old.stats
    const before = computeXp(old).total // no stats at all: computed the old way
    const migrated = migrate(old, at(25, 9))
    expect(migrated.stats.events).toEqual({ window_unlocked: 1, window_respected: 0, failsafe_resisted: 2 })
    expect(migrated.stats.focus).toEqual({ minutes: 60, sessions: 1, xp: 24 })
    expect(computeXp(migrated).total).toBe(before)
    expect(before).toBe(40 * 15 + 15 + 20 + 24)
  })

  it('never loses XP or badges when the log and focus history are trimmed', () => {
    const s = migrate(
      { ...defaultState(), stats: undefined, log: Array.from({ length: 30 }, () => ({ type: 'window_unlocked' })) },
      at(21, 9),
    )
    for (let i = 0; i < 70; i++) recordFocus(s.stats, 60)
    const xp = progressOf(s).xp
    const badges = computeMilestones(s, at(21, 10))
      .filter((m) => m.achieved)
      .map((m) => m.id)
    s.log = []
    s.focus.history = []
    expect(progressOf(s).xp).toBe(xp)
    expect(
      computeMilestones(s, at(21, 10))
        .filter((m) => m.achieved)
        .map((m) => m.id),
    ).toEqual(badges)
    expect(badges).toEqual(expect.arrayContaining(['focus-50', 'windows-25']))
  })

  it('backfills from whatever the arrays hold', () => {
    const st = backfillStats({ log: [{ type: 'window_respected' }, { type: 'nope' }], focus: { history: [{ focusedMin: 7 }] } }, 5)
    expect(st).toMatchObject({ since: 5, events: { window_respected: 1 }, focus: { minutes: 7, sessions: 1, xp: 2 } })
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
