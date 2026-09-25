// Study room scenes: what the window shows and how the room is lit. The ids match the
// scene unlocks in packages/core/src/unlocks.js. `light` picks the room lighting
// (see LIGHTS below): night = dim room and a warm lamp, day = bright, sunset = warm cast.
export const SCENES = {
  'scene-night': {
    land: 'city',
    sky: ['#0d0b24', '#231a4d', '#3b2a6b'],
    glow: '#f6b25e',
    far: '#1b163d',
    near: '#120f2b',
    win: '#f6c67a',
    orb: '#f5efe6',
    stars: true,
  },
  'scene-sunset': {
    land: 'city',
    sky: ['#2b1d4a', '#b0506b', '#f2a65a'],
    glow: '#ffcf8a',
    far: '#4a2640',
    near: '#2a1830',
    win: '#ffd79a',
    orb: '#ffd3a1',
    orbY: 330,
  },
  'scene-morning': {
    land: 'city',
    sky: ['#8ec5e8', '#c8e0ef', '#f4e2c8'],
    glow: '#fff1d0',
    far: '#8397b1',
    near: '#5d6f8a',
    win: '#fef3d7',
    orb: '#fff6de',
    winDim: 0.35,
  },
  'scene-forest': {
    land: 'forest',
    sky: ['#0f2027', '#2c5364', '#e0a96d'],
    glow: '#ffcf8a',
    far: '#20404a',
    near: '#0d1f22',
    orb: '#fbe3b8',
    orbY: 300,
    weather: 'fireflies',
  },
  'scene-snow': {
    land: 'mountains',
    sky: ['#3a4a6b', '#7f93b6', '#d7e1ee'],
    glow: '#fff4dc',
    far: '#6c7fa3',
    near: '#3b4968',
    cap: '#f4f7ff',
    orb: '#f7f7ff',
    weather: 'snow',
  },
  'scene-sea': {
    land: 'sea',
    sky: ['#243b6b', '#e38b8b', '#f7c59f'],
    glow: '#ffd6a0',
    far: '#5a6ea3',
    near: '#2d3f6e',
    orb: '#ffe2b0',
    orbY: 520,
  },
  'scene-neon': {
    land: 'city',
    sky: ['#07030f', '#1d0633', '#3c0b4f'],
    glow: '#ff4fd8',
    far: '#1a0b2e',
    near: '#0b0616',
    win: '#43f0ff',
    win2: '#ff4fd8',
    orb: null,
    neon: true,
  },
  'scene-aurora': {
    land: 'mountains',
    sky: ['#020814', '#06243a', '#0c3b4a'],
    glow: '#7dffcf',
    far: '#0a2233',
    near: '#04121c',
    cap: '#cfe8f0',
    orb: null,
    stars: true,
    aurora: true,
  },
  'scene-space': { land: 'space', sky: ['#000005', '#070a1c', '#0e1433'], glow: '#8fb4ff', stars: true, orb: null },
  'scene-blossom': {
    land: 'forest',
    blossom: true,
    sky: ['#f6c7d6', '#fbe3e8', '#fff3e6'],
    glow: '#fff0f3',
    far: '#c98ba2',
    near: '#8a4f67',
    orb: '#fff8f2',
    weather: 'petals',
  },
}

const LIGHT_OF = {
  'scene-night': 'night',
  'scene-sunset': 'sunset',
  'scene-morning': 'day',
  'scene-forest': 'dusk',
  'scene-snow': 'day',
  'scene-sea': 'sunset',
  'scene-neon': 'neon',
  'scene-aurora': 'aurora',
  'scene-space': 'night',
  'scene-blossom': 'day',
}
for (const [id, l] of Object.entries(LIGHT_OF)) SCENES[id].light = l

// filter: CSS filter on the room interior (GPU composited). tint: a wash over everything.
// lamp: how bright the ceiling lamp glows (0 to 1). sun: colour of the light shaft from the window.
export const LIGHTS = {
  night: { filter: 'brightness(.52) saturate(1.1) contrast(1.06)', tint: 'rgba(46,38,140,.55)', lamp: 1, sun: null },
  aurora: { filter: 'brightness(.6) saturate(.9)', tint: 'rgba(30,110,120,.45)', lamp: 0.9, sun: null },
  neon: { filter: 'brightness(.6) saturate(.95)', tint: 'rgba(120,40,150,.45)', lamp: 0.85, sun: null },
  dusk: { filter: 'brightness(.72) saturate(.9)', tint: 'rgba(60,90,110,.35)', lamp: 0.8, sun: null },
  sunset: { filter: 'brightness(.9) saturate(1.05)', tint: 'rgba(255,140,90,.35)', lamp: 0.45, sun: '#ffb070' },
  day: { filter: 'none', tint: 'rgba(255,250,240,0)', lamp: 0, sun: '#fff4d6' },
}

export const LEGACY_SCENES = { night: 'scene-night', sunset: 'scene-sunset', morning: 'scene-morning' }
export const sceneOf = (id) => SCENES[LEGACY_SCENES[id] || id] || SCENES['scene-night']
export const lightOf = (id) => LIGHTS[sceneOf(id).light] || LIGHTS.night
