// The study room sound and scene settings (`settings.lofi`): validation shared by the
// backend (settings.update, import) and migrate(). Scenes and music styles are level
// unlocks from unlocks.js.
import { UNLOCKS } from './unlocks.js'

export const LOFI_MIX_KEYS = ['rain', 'cafe', 'fire', 'noise']
/** Scene names saved before scenes became unlocks. */
export const LEGACY_SCENES = { night: 'scene-night', sunset: 'scene-sunset', morning: 'scene-morning' }

const SCENES = Object.fromEntries(UNLOCKS.filter((u) => u.kind === 'scene').map((u) => [u.id, u]))
const MUSIC = Object.fromEntries(UNLOCKS.filter((u) => u.kind === 'music').map((u) => [u.id, u]))

export const DEFAULT_LOFI = {
  volume: 0.6,
  scene: 'scene-night',
  style: 'music-classic',
  objects: true,
  mix: { rain: 0.5, cafe: 0, fire: 0, noise: 0 },
}

export const normalizeScene = (id) => LEGACY_SCENES[id] || id

const unit = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
const clampUnit = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback)

/** Forgiving clean-up for stored or imported values: anything unknown falls back to `base`. */
export function sanitizeLofi(input, base = DEFAULT_LOFI) {
  const src = input && typeof input === 'object' ? input : {}
  const b = base && typeof base === 'object' ? base : DEFAULT_LOFI
  const scene = normalizeScene(src.scene)
  const baseScene = normalizeScene(b.scene)
  const out = {
    volume: clampUnit(src.volume, clampUnit(b.volume, DEFAULT_LOFI.volume)),
    scene: SCENES[scene] ? scene : SCENES[baseScene] ? baseScene : DEFAULT_LOFI.scene,
    style: MUSIC[src.style] ? src.style : MUSIC[b.style] ? b.style : DEFAULT_LOFI.style,
    objects: typeof src.objects === 'boolean' ? src.objects : typeof b.objects === 'boolean' ? b.objects : true,
    mix: {},
  }
  for (const k of LOFI_MIX_KEYS) out.mix[k] = clampUnit(src.mix?.[k], clampUnit(b.mix?.[k], DEFAULT_LOFI.mix[k]))
  return out
}

/**
 * Strict merge of a settings.update patch into the saved lofi settings.
 * Returns { value } or { error }. A scene or music style is only checked against the
 * level when it differs from the saved one, so what is already saved always stays.
 */
export function mergeLofi(current, patch, level) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { error: 'Room sound settings must be an object.' }
  const cur = sanitizeLofi(current)
  const value = { ...cur, mix: { ...cur.mix } }
  for (const key of Object.keys(patch)) {
    if (!['volume', 'scene', 'style', 'objects', 'mix'].includes(key)) return { error: `Unknown room setting "${key}".` }
  }
  if ('volume' in patch) {
    if (!unit(patch.volume)) return { error: 'Volume must be between 0 and 1.' }
    value.volume = patch.volume
  }
  if ('objects' in patch) {
    if (typeof patch.objects !== 'boolean') return { error: 'Show objects must be on or off.' }
    value.objects = patch.objects
  }
  if ('mix' in patch) {
    const mix = patch.mix
    if (!mix || typeof mix !== 'object' || Array.isArray(mix)) return { error: 'Ambience mix must be an object.' }
    for (const [k, v] of Object.entries(mix)) {
      if (!LOFI_MIX_KEYS.includes(k)) return { error: `Unknown ambience sound "${k}".` }
      if (!unit(v)) return { error: 'Ambience levels must be between 0 and 1.' }
      value.mix[k] = v
    }
  }
  if ('scene' in patch) {
    const id = normalizeScene(patch.scene)
    const u = SCENES[id]
    if (!u) return { error: 'Unknown scene.' }
    if (id !== cur.scene && u.level > level) return { error: `${u.name} unlocks at level ${u.level}.` }
    value.scene = id
  }
  if ('style' in patch) {
    const u = MUSIC[patch.style]
    if (!u) return { error: 'Unknown music style.' }
    if (patch.style !== cur.style && u.level > level) return { error: `${u.name} unlocks at level ${u.level}.` }
    value.style = patch.style
  }
  return { value }
}
