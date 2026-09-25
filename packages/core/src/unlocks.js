import { OPTION_UNLOCKS, OPTION_FIELDS } from './options.js'

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

  // Decor for the study room. Each item is placed by the player on a surface of the room
  // (see packages/core/src/room.js). w and h are its size in room units (the room is 1600 x 900).
  // surface: 'wall' | 'shelf' | 'desk' | 'floor' | 'sill' | 'any' (any = shelf, desk, sill or floor).
  // To add an item: add one line here and its drawing in apps/web/src/components/room/art.js.
  { id: 'obj-clock', kind: 'object', level: 1, name: 'Wall clock', surface: 'wall', w: 74, h: 74 },
  { id: 'obj-poster-wave', kind: 'object', level: 1, name: 'Wave poster', surface: 'wall', w: 120, h: 160 },
  { id: 'obj-books-row', kind: 'object', level: 1, name: 'Row of books', surface: 'shelf', w: 120, h: 84 },
  { id: 'obj-pencup', kind: 'object', level: 1, name: 'Pen cup', surface: 'desk', w: 36, h: 58 },
  { id: 'obj-succulent', kind: 'object', level: 1, name: 'Succulent', surface: 'any', w: 46, h: 48 },
  { id: 'obj-rug-round', kind: 'object', level: 1, name: 'Round rug', surface: 'floor', w: 460, h: 64 },
  { id: 'obj-mug', kind: 'object', level: 2, name: 'Warm mug', surface: 'any', w: 44, h: 50 },
  { id: 'obj-plant', kind: 'object', level: 3, name: 'Little plant', surface: 'any', w: 52, h: 76 },
  { id: 'obj-corkboard', kind: 'object', level: 3, name: 'Cork board', surface: 'wall', w: 160, h: 110 },
  { id: 'obj-photo', kind: 'object', level: 4, name: 'Framed photo', surface: 'wall', w: 74, h: 90 },
  { id: 'obj-lamp', kind: 'object', level: 5, name: 'Desk lamp', surface: 'desk', w: 84, h: 132 },
  { id: 'obj-poster-moon', kind: 'object', level: 6, name: 'Moon poster', surface: 'wall', w: 120, h: 160 },
  { id: 'obj-cat', kind: 'object', level: 7, name: 'Sleepy cat', surface: 'any', w: 112, h: 56 },
  { id: 'obj-laptop', kind: 'object', level: 8, name: 'Laptop', surface: 'desk', w: 150, h: 92 },
  { id: 'obj-plant-2', kind: 'object', level: 9, name: 'Tall plant', surface: 'floor', w: 120, h: 230 },
  { id: 'obj-beanbag', kind: 'object', level: 10, name: 'Beanbag', surface: 'floor', w: 200, h: 120 },
  { id: 'obj-books', kind: 'object', level: 11, name: 'Book stack', surface: 'any', w: 76, h: 64 },
  { id: 'obj-record', kind: 'object', level: 12, name: 'Record player', surface: 'any', w: 124, h: 70 },
  { id: 'obj-poster-peaks', kind: 'object', level: 13, name: 'Mountain poster', surface: 'wall', w: 120, h: 160 },
  { id: 'obj-lights', kind: 'object', level: 14, name: 'Fairy lights', surface: 'wall', w: 380, h: 70 },
  { id: 'obj-rug-stripe', kind: 'object', level: 15, name: 'Striped rug', surface: 'floor', w: 500, h: 64 },
  { id: 'obj-guitar', kind: 'object', level: 16, name: 'Guitar', surface: 'floor', w: 96, h: 250 },
  { id: 'obj-hanging-plant', kind: 'object', level: 17, name: 'Hanging plant', surface: 'wall', w: 100, h: 180 },
  { id: 'obj-plant-3', kind: 'object', level: 18, name: 'Flowering plant', surface: 'any', w: 64, h: 92 },
  { id: 'obj-candle', kind: 'object', level: 20, name: 'Candle', surface: 'any', w: 34, h: 64 },
  { id: 'obj-dog', kind: 'object', level: 22, name: 'Dog in its bed', surface: 'floor', w: 180, h: 84 },
  { id: 'obj-fishbowl', kind: 'object', level: 24, name: 'Fish bowl', surface: 'any', w: 72, h: 72 },
  { id: 'obj-globe', kind: 'object', level: 26, name: 'Globe', surface: 'any', w: 64, h: 86 },
  { id: 'obj-neon', kind: 'object', level: 28, name: 'Neon moon sign', surface: 'wall', w: 150, h: 100 },
  { id: 'obj-bookcase', kind: 'object', level: 30, name: 'Bookcase', surface: 'floor', w: 170, h: 320 },
  { id: 'obj-armchair', kind: 'object', level: 32, name: 'Armchair', surface: 'floor', w: 210, h: 180 },
  { id: 'obj-telescope', kind: 'object', level: 35, name: 'Telescope', surface: 'floor', w: 130, h: 210 },
  { id: 'obj-bonsai', kind: 'object', level: 38, name: 'Bonsai', surface: 'any', w: 96, h: 84 },
  { id: 'obj-lava', kind: 'object', level: 43, name: 'Lava lamp', surface: 'any', w: 40, h: 96 },
  { id: 'obj-trophy', kind: 'object', level: 50, name: 'Golden trophy', surface: 'any', w: 64, h: 86 },

  // Music styles for the study room
  { id: 'music-classic', kind: 'music', level: 1, name: 'Classic lofi' },
  { id: 'music-jazz', kind: 'music', level: 6, name: 'Rainy jazz' },
  { id: 'music-bossa', kind: 'music', level: 13, name: 'Sunny bossa' },
  { id: 'music-ambient', kind: 'music', level: 24, name: 'Deep ambient' },
]

// Avatar and room style options unlock by level too (see options.js). They join the list
// here as { id: 'opt:<field>:<value>', kind: 'option', field, value, level, name }.
export const OPTION_ENTRIES = OPTION_UNLOCKS.filter((o) => o.level > 1).map((o) => ({
  id: `opt:${o.field}:${o.value}`,
  kind: 'option',
  ...o,
}))
/** Everything with a level: scenes, decor, music and style options. */
export const ALL_UNLOCKS = [...UNLOCKS, ...OPTION_ENTRIES]

const KIND = { scene: 'Room scene', object: 'Room object', music: 'Music style' }
/** What kind of reward this is, for labels like "Hairstyle" or "Room object". */
export const unlockKind = (u) => (u.kind === 'option' ? OPTION_FIELDS[u.field] : KIND[u.kind]) || ''

export const unlockedAt = (level) => ALL_UNLOCKS.filter((u) => u.level <= level)
export const isUnlocked = (id, level) => UNLOCKS.some((u) => u.id === id && u.level <= level)
export const nextUnlocks = (level, n = 3) =>
  ALL_UNLOCKS.filter((u) => u.level > level)
    .sort((a, b) => a.level - b.level)
    .slice(0, n)
/** Things that became available when going from `from` to `to`. */
export const newlyUnlocked = (from, to) => ALL_UNLOCKS.filter((u) => u.level > from && u.level <= to)
