// Everything a level can unlock. To add more over time, append entries here: the UI,
// level-up screen and room pick them up automatically. Keep levels spread out so the
// catalog lasts (level 10 takes about a month of steady use, level 40 about a year).
export const UNLOCKS = [
  // Study room scenes
  { id: 'scene-night', kind: 'scene', level: 1, name: 'Night city' },
  { id: 'scene-sunset', kind: 'scene', level: 1, name: 'Sunset' },
  { id: 'scene-morning', kind: 'scene', level: 1, name: 'Morning' },
  { id: 'scene-forest', kind: 'scene', level: 4, name: 'Forest cabin' },
  { id: 'scene-snow', kind: 'scene', level: 8, name: 'Snowy peaks' },
  { id: 'scene-sea', kind: 'scene', level: 12, name: 'Seaside dawn' },
  { id: 'scene-neon', kind: 'scene', level: 16, name: 'Neon rain' },
  { id: 'scene-aurora', kind: 'scene', level: 22, name: 'Aurora' },
  { id: 'scene-space', kind: 'scene', level: 30, name: 'Orbit station' },
  { id: 'scene-blossom', kind: 'scene', level: 40, name: 'Cherry blossom' },

  // Things that appear in your room
  { id: 'obj-mug', kind: 'object', level: 2, name: 'Warm mug' },
  { id: 'obj-plant', kind: 'object', level: 3, name: 'Little plant' },
  { id: 'obj-lamp', kind: 'object', level: 5, name: 'Desk lamp' },
  { id: 'obj-cat', kind: 'object', level: 7, name: 'Sleepy cat' },
  { id: 'obj-plant-2', kind: 'object', level: 9, name: 'The plant grows' },
  { id: 'obj-books', kind: 'object', level: 11, name: 'Book stack' },
  { id: 'obj-lights', kind: 'object', level: 14, name: 'Fairy lights' },
  { id: 'obj-plant-3', kind: 'object', level: 18, name: 'The plant blooms' },
  { id: 'obj-candle', kind: 'object', level: 20, name: 'Candle' },
  { id: 'obj-globe', kind: 'object', level: 26, name: 'Globe' },
  { id: 'obj-telescope', kind: 'object', level: 35, name: 'Telescope' },
  { id: 'obj-trophy', kind: 'object', level: 50, name: 'Golden trophy' },

  // Music styles for the study room
  { id: 'music-classic', kind: 'music', level: 1, name: 'Classic lofi' },
  { id: 'music-jazz', kind: 'music', level: 6, name: 'Rainy jazz' },
  { id: 'music-bossa', kind: 'music', level: 13, name: 'Sunny bossa' },
  { id: 'music-ambient', kind: 'music', level: 24, name: 'Deep ambient' },
]

export const unlockedAt = (level) => UNLOCKS.filter((u) => u.level <= level)
export const isUnlocked = (id, level) => UNLOCKS.some((u) => u.id === id && u.level <= level)
export const nextUnlocks = (level, n = 3) =>
  UNLOCKS.filter((u) => u.level > level)
    .sort((a, b) => a.level - b.level)
    .slice(0, n)
/** Items that became available when going from `from` to `to`. */
export const newlyUnlocked = (from, to) => UNLOCKS.filter((u) => u.level > from && u.level <= to)
