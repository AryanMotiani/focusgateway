// Named tracks for the study room radio. The music is generative (apps/web/src/lib/lofi.js),
// so a "track" is a recipe: key, chord progression, tempo and a seed for its melody and
// groove. The same track always sounds like itself. Names are original.
// A track belongs to a music style, and music styles unlock by level (unlocks.js).
// To add a track: append a line below with a new id and seed. Keep ids stable, they are
// saved in settings.lofi.track.
import { UNLOCKS } from './unlocks.js'

/** Semitone offset of each key from C. */
export const TRACK_KEYS = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }

/** Chord qualities as intervals above the root. */
export const CHORD_QUALITIES = {
  maj7: [0, 4, 7, 11],
  maj9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  m11: [0, 3, 7, 10, 14, 17],
  m7b5: [0, 3, 6, 10],
  7: [0, 4, 7, 10],
  9: [0, 4, 10, 14],
  13: [0, 4, 10, 14, 21],
  sus: [0, 5, 7, 10, 14],
}

// progression: [semitones above the key root, chord quality] per bar
const P = {
  fall: [
    [5, 'maj7'],
    [4, 'm7'],
    [2, 'm7'],
    [0, 'maj7'],
  ],
  twoFive: [
    [2, 'm9'],
    [7, '13'],
    [0, 'maj9'],
    [9, 'm9'],
  ],
  sixTwo: [
    [9, 'm7'],
    [2, 'm9'],
    [7, '9'],
    [0, 'maj7'],
  ],
  home: [
    [0, 'maj7'],
    [9, 'm7'],
    [2, 'm7'],
    [7, 'sus'],
  ],
  minor: [
    [0, 'm9'],
    [5, 'm7'],
    [10, '9'],
    [3, 'maj7'],
  ],
  drift: [
    [5, 'maj7'],
    [4, '7'],
    [9, 'm9'],
    [7, 'm7'],
  ],
  turn: [
    [4, 'm7'],
    [9, '7'],
    [2, 'm9'],
    [7, '13'],
  ],
  blue: [
    [2, 'm7b5'],
    [7, '7'],
    [0, 'm9'],
    [0, 'm11'],
  ],
  bossa: [
    [0, 'maj7'],
    [2, '9'],
    [2, 'm7'],
    [7, '9'],
  ],
  bossaMinor: [
    [0, 'm9'],
    [5, '9'],
    [0, 'm9'],
    [7, '7'],
  ],
  float: [
    [0, 'add9'],
    [5, 'maj9'],
    [9, 'm11'],
    [5, 'maj9'],
  ],
  still: [
    [0, 'm11'],
    [8, 'maj9'],
    [3, 'maj9'],
    [10, 'sus'],
  ],
}

const T = (id, style, name, bpm, key, progression, seed, mood) => ({ id, style, name, bpm, key, progression, seed, mood })

export const TRACKS = [
  T('classic-rain-window', 'music-classic', 'Rain on the Window', 72, 'F', P.fall, 1103, 'rainy'),
  T('classic-late-library', 'music-classic', 'Late Library', 70, 'Eb', P.twoFive, 2207, 'calm'),
  T('classic-tram-stop', 'music-classic', 'Tram Stop 2 AM', 76, 'A', P.minor, 3301, 'late'),
  T('classic-matcha-break', 'music-classic', 'Matcha Break', 80, 'D', P.home, 4409, 'bright'),
  T('classic-chapter-seven', 'music-classic', 'Chapter Seven', 74, 'C', P.sixTwo, 5503, 'cozy'),
  T('classic-pencil-shavings', 'music-classic', 'Pencil Shavings', 78, 'G', P.drift, 6607, 'cozy'),
  T('classic-window-seat', 'music-classic', 'Window Seat Notes', 68, 'Bb', P.twoFive, 7709, 'dreamy'),
  T('classic-lamp-still-on', 'music-classic', 'The Lamp Is Still On', 73, 'E', P.minor, 8803, 'late'),

  T('jazz-umbrella-stand', 'music-jazz', 'Umbrella Stand', 62, 'Bb', P.twoFive, 1211, 'rainy'),
  T('jazz-wet-cobblestones', 'music-jazz', 'Wet Cobblestones', 66, 'F', P.turn, 2311, 'rainy'),
  T('jazz-corner-booth', 'music-jazz', 'Corner Booth', 60, 'Eb', P.blue, 3413, 'late'),
  T('jazz-slow-last-train', 'music-jazz', 'Slow Last Train', 64, 'Ab', P.sixTwo, 4517, 'late'),
  T('jazz-coat-check', 'music-jazz', 'Coat Check Shuffle', 70, 'C', P.turn, 5623, 'cozy'),
  T('jazz-puddle-light', 'music-jazz', 'Puddle Light', 58, 'D', P.blue, 6719, 'dreamy'),
  T('jazz-next-room-sax', 'music-jazz', 'Someone Practicing Upstairs', 63, 'G', P.twoFive, 7829, 'calm'),
  T('jazz-fogged-glasses', 'music-jazz', 'Fogged Glasses', 61, 'Db', P.minor, 8923, 'cozy'),

  T('bossa-lemon-soda', 'music-bossa', 'Lemon Soda Afternoon', 88, 'G', P.bossa, 1319, 'bright'),
  T('bossa-harbor-kiosk', 'music-bossa', 'Harbor Kiosk', 84, 'D', P.bossaMinor, 2423, 'calm'),
  T('bossa-sandals-stairs', 'music-bossa', 'Sandals on the Stairs', 90, 'A', P.bossa, 3529, 'bright'),
  T('bossa-postcard', 'music-bossa', 'Postcard from Nowhere', 82, 'E', P.bossaMinor, 4621, 'dreamy'),
  T('bossa-mango-hour', 'music-bossa', 'Mango Hour', 92, 'C', P.home, 5737, 'bright'),
  T('bossa-balcony-plants', 'music-bossa', 'Balcony Plants', 86, 'F', P.bossa, 6833, 'cozy'),
  T('bossa-tiled-courtyard', 'music-bossa', 'Tiled Courtyard', 80, 'Bb', P.bossaMinor, 7937, 'calm'),
  T('bossa-linen-sunlight', 'music-bossa', 'Linen and Sunlight', 87, 'Eb', P.sixTwo, 9041, 'dreamy'),

  T('ambient-low-tide', 'music-ambient', 'Low Tide Hum', 54, 'D', P.float, 1427, 'calm'),
  T('ambient-satellite-drift', 'music-ambient', 'Satellite Drift', 56, 'Ab', P.still, 2531, 'dreamy'),
  T('ambient-snow-antenna', 'music-ambient', 'Snow on the Antenna', 52, 'E', P.float, 3637, 'calm'),
  T('ambient-glass-observatory', 'music-ambient', 'Glass Observatory', 58, 'B', P.still, 4733, 'dreamy'),
  T('ambient-slow-aurora', 'music-ambient', 'Slow Aurora', 50, 'Gb', P.float, 5839, 'dreamy'),
  T('ambient-deep-blue', 'music-ambient', 'Deep Blue Hours', 55, 'C', P.still, 6947, 'late'),
  T('ambient-quiet-orbit', 'music-ambient', 'Quiet Orbit', 53, 'F', P.float, 7043, 'calm'),
  T('ambient-moss-stone', 'music-ambient', 'Moss and Stone', 57, 'A', P.still, 8147, 'calm'),
]

/** Track length in seconds, 2 to 4 minutes, fixed per track. */
TRACKS.forEach((t) => (t.length = 120 + (t.seed % 121)))

const BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]))
const MUSIC = Object.fromEntries(UNLOCKS.filter((u) => u.kind === 'music').map((u) => [u.id, u]))

export const trackById = (id) => BY_ID[id] || null
export const tracksForStyle = (style) => TRACKS.filter((t) => t.style === style)
/** The first track of a style, the default when a style is picked. */
export const firstTrack = (style) => TRACKS.find((t) => t.style === style) || TRACKS[0]
/** The music style unlock a track belongs to ({ id, name, level }). */
export const trackStyle = (t) => MUSIC[(typeof t === 'string' ? BY_ID[t] : t)?.style] || null
export const isTrackUnlocked = (id, level) => {
  const s = trackStyle(id)
  return !!s && s.level <= level
}

/**
 * The progression as MIDI chords, voiced around middle C with the root between A2 and G#3.
 * Pure, so the audio engine and the tests agree on what a track plays.
 */
export function voiceTrack(t) {
  const key = TRACK_KEYS[t.key] ?? 0
  return t.progression.map(([deg, q]) => {
    const pc = (key + deg) % 12
    const root = 48 + pc >= 57 ? 36 + pc : 48 + pc
    return (CHORD_QUALITIES[q] || CHORD_QUALITIES.maj7).map((i) => root + i)
  })
}

/** Minor when the first chord is minor, which picks the melody scale. */
export const trackIsMinor = (t) => /^m(?!aj)/.test(t.progression[0][1])
