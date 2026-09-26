// What the person has already seen in the app: tours, the study room's first-open tips,
// one-time notices and what was new in the shop. It lives in the saved state (not only in the
// browser's localStorage) so it follows the person between the website and the extension's own
// pages, which are different origins with separate localStorage. See apps/web/src/lib/seen.js.
import { SHOP_ITEMS } from './economy.js'

/** One-time notices the app can remember. Anything else is rejected. */
export const UI_FLAGS = ['blocking-intro-hidden', 'blocking-start-seen', 'no-extension-seen']
export const UI_LIST_MAX = 40
// tour and tip ids are app-side names ("room", "focus", ...). "*" means every tour (tests use it).
const ID = /^(\*|[a-z][a-z0-9-]{0,39})$/

export function defaultUi() {
  return { tours: [], tips: [], flags: [], shopKnown: null }
}

function cleanList(v, ok = (x) => ID.test(x)) {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((x) => typeof x === 'string' && ok(x)))].slice(-UI_LIST_MAX)
}
const SHOP_IDS = new Set(SHOP_ITEMS.map((i) => i.id))
function cleanKnown(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out = {}
  for (const [id, rank] of Object.entries(v)) if (SHOP_IDS.has(id) && (rank === 1 || rank === 2)) out[id] = rank
  return out
}

/** A saved or imported ui section, cleaned: unknown ids and flags dropped, lists capped. */
export function sanitizeUi(v) {
  const src = v && typeof v === 'object' ? v : {}
  return {
    tours: cleanList(src.tours),
    tips: cleanList(src.tips),
    flags: cleanList(src.flags, (x) => UI_FLAGS.includes(x)),
    shopKnown: cleanKnown(src.shopKnown),
  }
}

/**
 * Adds what `patch` marks as seen to `ui`. Seen never becomes unseen: lists are unions, and a
 * shop item keeps its highest rank. Returns { value } or { error } for a malformed patch.
 */
export function mergeUi(ui, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { error: 'Nothing to remember.' }
  const base = sanitizeUi(ui)
  for (const k of ['tours', 'tips', 'flags']) {
    if (!(k in patch)) continue
    if (!Array.isArray(patch[k]) || patch[k].length > UI_LIST_MAX) return { error: `${k} must be a short list.` }
    const clean = cleanList(patch[k], k === 'flags' ? (x) => UI_FLAGS.includes(x) : undefined)
    if (clean.length !== patch[k].length) return { error: `Unknown ${k === 'flags' ? 'notice' : 'name'} in ${k}.` }
    // keep the newest ones when the cap is reached
    base[k] = [...new Set([...base[k].filter((x) => !clean.includes(x)), ...clean])].slice(-UI_LIST_MAX)
  }
  if ('shopKnown' in patch) {
    const known = cleanKnown(patch.shopKnown)
    if (!known || Object.keys(known).length !== Object.keys(patch.shopKnown).length) return { error: 'Unknown shop item.' }
    const next = { ...(base.shopKnown || {}) }
    for (const [id, rank] of Object.entries(known)) next[id] = Math.max(next[id] || 0, rank)
    base.shopKnown = next
  }
  return { value: base }
}

/** Both sides together, for handing a setup from the website to the extension. */
export function unionUi(a, b) {
  const x = sanitizeUi(a)
  const y = sanitizeUi(b)
  const patch = { tours: y.tours, tips: y.tips, flags: y.flags }
  if (y.shopKnown) patch.shopKnown = y.shopKnown
  return mergeUi(x, patch).value
}
