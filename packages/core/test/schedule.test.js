import { describe, it, expect } from 'vitest'
import { windowAt, previousWindow, nextWindowStart, rulesOverlap } from '../src/schedule.js'

// 2026-09-21 is a Monday
const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).getTime()
const weekdays = [1, 2, 3, 4, 5]

describe('windowAt', () => {
  const rule = { days: weekdays, start: 9 * 60, end: 12 * 60 }

  it('returns the window when inside it on a scheduled day', () => {
    const w = windowAt(rule, at(21, 10, 30))
    expect(w).toEqual({ start: at(21, 9), end: at(21, 12) })
  })

  it('treats the end minute as exclusive', () => {
    expect(windowAt(rule, at(21, 12))).toBeNull()
    expect(windowAt(rule, at(21, 9))).not.toBeNull()
  })

  it('returns null on unscheduled days', () => {
    expect(windowAt(rule, at(26, 10))).toBeNull() // Saturday
  })

  it('handles windows that cross midnight using the start day', () => {
    const night = { days: [5], start: 22 * 60, end: 2 * 60 } // Friday 22:00 -> Sat 02:00
    expect(windowAt(night, at(25, 23))).toEqual({ start: at(25, 22), end: at(26, 2) })
    expect(windowAt(night, at(26, 1, 30))).toEqual({ start: at(25, 22), end: at(26, 2) })
    expect(windowAt(night, at(27, 1))).toBeNull() // Sunday 01:00, Saturday not scheduled
  })

  it('treats start == end as a full 24h window', () => {
    const allDay = { days: [1], start: 0, end: 0 }
    expect(windowAt(allDay, at(21, 15))).toEqual({ start: at(21, 0), end: at(22, 0) })
  })
})

describe('previousWindow / nextWindowStart', () => {
  const rule = { days: [1, 3], start: 9 * 60, end: 12 * 60 }

  it('finds the most recent finished window', () => {
    expect(previousWindow(rule, at(22, 8))).toEqual({ start: at(21, 9), end: at(21, 12) })
    expect(previousWindow(rule, at(23, 13))).toEqual({ start: at(23, 9), end: at(23, 12) })
  })

  it('finds the next window start strictly after now', () => {
    expect(nextWindowStart(rule, at(21, 10))).toBe(at(23, 9))
    expect(nextWindowStart(rule, at(24, 10))).toBe(at(28, 9))
  })
})

describe('rulesOverlap', () => {
  it('detects overlap on shared days', () => {
    expect(rulesOverlap({ days: [1], start: 540, end: 720 }, { days: [1, 2], start: 700, end: 800 })).toBe(true)
  })
  it('no overlap when days differ', () => {
    expect(rulesOverlap({ days: [1], start: 540, end: 720 }, { days: [2], start: 540, end: 720 })).toBe(false)
  })
  it('touching edges do not overlap', () => {
    expect(rulesOverlap({ days: [1], start: 540, end: 720 }, { days: [1], start: 720, end: 800 })).toBe(false)
  })
  it('detects spill-over from a midnight-crossing window into the next day', () => {
    const night = { days: [1], start: 23 * 60, end: 3 * 60 } // Mon 23:00 -> Tue 03:00
    expect(rulesOverlap(night, { days: [2], start: 60, end: 120 })).toBe(true)
    expect(rulesOverlap(night, { days: [2], start: 4 * 60, end: 5 * 60 })).toBe(false)
  })
  it('wraps Sunday night into Monday morning', () => {
    const sun = { days: [7], start: 23 * 60, end: 2 * 60 }
    expect(rulesOverlap(sun, { days: [1], start: 60, end: 90 })).toBe(true)
  })
})
