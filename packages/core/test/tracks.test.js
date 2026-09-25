import { describe, it, expect, beforeEach } from 'vitest'
import { createBackend } from '../src/backend.js'
import { migrate } from '../src/state.js'
import { UNLOCKS } from '../src/unlocks.js'
import { sanitizeLofi, mergeLofi } from '../src/lofi.js'
import {
  TRACKS,
  TRACK_KEYS,
  CHORD_QUALITIES,
  trackById,
  tracksForStyle,
  firstTrack,
  isTrackUnlocked,
  voiceTrack,
  trackIsMinor,
} from '../src/tracks.js'

function memoryStorage(initial = null) {
  let saved = initial ? structuredClone(initial) : null
  return {
    load: async () => (saved ? structuredClone(saved) : null),
    save: async (s) => {
      saved = structuredClone(s)
    },
  }
}

describe('track catalog', () => {
  const styles = UNLOCKS.filter((u) => u.kind === 'music')

  it('has 6 to 10 named tracks for every music style', () => {
    for (const s of styles) {
      const list = tracksForStyle(s.id)
      expect(list.length).toBeGreaterThanOrEqual(6)
      expect(list.length).toBeLessThanOrEqual(10)
      expect(firstTrack(s.id).style).toBe(s.id)
    }
  })

  it('uses unique ids, names and seeds, known keys and chord qualities', () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length)
    expect(new Set(TRACKS.map((t) => t.name)).size).toBe(TRACKS.length)
    expect(new Set(TRACKS.map((t) => t.seed)).size).toBe(TRACKS.length)
    for (const t of TRACKS) {
      expect(t.name).not.toMatch(/[\u2014;]/)
      expect(TRACK_KEYS[t.key]).toBeTypeOf('number')
      expect(t.bpm).toBeGreaterThanOrEqual(48)
      expect(t.bpm).toBeLessThanOrEqual(96)
      expect(t.length).toBeGreaterThanOrEqual(120)
      expect(t.length).toBeLessThanOrEqual(240)
      expect(t.mood).toBeTruthy()
      for (const [deg, q] of t.progression) {
        expect(deg).toBeGreaterThanOrEqual(0)
        expect(deg).toBeLessThan(12)
        expect(CHORD_QUALITIES[q]).toBeDefined()
      }
    }
  })

  it('voices every chord in a comfortable range', () => {
    for (const t of TRACKS) {
      const chords = voiceTrack(t)
      expect(chords).toHaveLength(t.progression.length)
      for (const c of chords) {
        expect(c[0]).toBeGreaterThanOrEqual(45)
        expect(c[0]).toBeLessThan(57)
        expect(Math.max(...c)).toBeLessThanOrEqual(80)
      }
    }
    expect(voiceTrack(trackById('classic-rain-window'))[0]).toEqual([46, 50, 53, 57])
  })

  it('knows minor tracks and locked styles', () => {
    expect(trackIsMinor(trackById('classic-tram-stop'))).toBe(true)
    expect(trackIsMinor(trackById('classic-rain-window'))).toBe(false)
    expect(isTrackUnlocked('classic-late-library', 1)).toBe(true)
    expect(isTrackUnlocked('jazz-corner-booth', 5)).toBe(false)
    expect(isTrackUnlocked('jazz-corner-booth', 6)).toBe(true)
    expect(isTrackUnlocked('nope', 99)).toBe(false)
  })
})

describe('settings.lofi.track', () => {
  let be
  beforeEach(async () => {
    be = createBackend({ storage: memoryStorage(), hashIterations: 1000 })
    await be.dispatch('setup.pin', { pin: '246810' })
  })
  const lofi = (patch) => be.dispatch('settings.update', { patch: { lofi: patch } })

  it('saves a known track of an unlocked style', async () => {
    const r = await lofi({ style: 'music-classic', track: 'classic-matcha-break' })
    expect(r.state.settings.lofi).toMatchObject({ style: 'music-classic', track: 'classic-matcha-break' })
    const back = await lofi({ track: null })
    expect(back.state.settings.lofi.track).toBeUndefined()
  })

  it('rejects unknown tracks, locked styles and tracks of another style', async () => {
    await expect(lofi({ track: 'made-up' })).rejects.toMatchObject({ code: 'VALIDATION', message: 'Unknown track.' })
    await expect(lofi({ style: 'music-jazz', track: 'jazz-corner-booth' })).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(lofi({ track: 'jazz-corner-booth' })).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Corner Booth is part of Rainy jazz, which unlocks at level 6.',
    })
    await expect(lofi({ track: 42 })).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('keeps a saved locked track and clears a track when the style changes', () => {
    const cur = { ...migrate(null).settings.lofi, style: 'music-ambient', track: 'ambient-quiet-orbit' }
    expect(mergeLofi(cur, { volume: 0.2 }, 1).value.track).toBe('ambient-quiet-orbit')
    expect(mergeLofi(cur, { track: 'ambient-quiet-orbit' }, 1).value.track).toBe('ambient-quiet-orbit')
    expect(mergeLofi(cur, { style: 'music-classic' }, 1).value.track).toBeUndefined()
  })

  it('sanitizes stored and imported tracks', () => {
    expect(sanitizeLofi({ style: 'music-classic', track: 'classic-late-library' }).track).toBe('classic-late-library')
    expect(sanitizeLofi({ style: 'music-classic', track: 'jazz-corner-booth' }).track).toBeUndefined()
    expect(sanitizeLofi({ style: 'music-classic', track: 'nope' }).track).toBeUndefined()
    expect(sanitizeLofi({}).track).toBeUndefined()
    expect(migrate(null).settings.lofi.track).toBeUndefined()
  })
})
