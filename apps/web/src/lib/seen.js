// What the person has already seen: tours, the room's first-open tips, one-time notices and
// what was new in the shop.
//
// The website (aryanmotiani.github.io) and the extension's own pages (chrome-extension:// or
// moz-extension://) are different origins, so localStorage is not shared between them. The
// saved state is: it lives in the extension when one is connected. So the seen list is kept in
// both places:
//  - state.ui (packages/core/src/ui.js), written with the 'ui.mark' command, follows the person
//    between the website, the extension and a setup handed over with setup.adopt
//  - localStorage mirrors it, for guests, for the moment before state loads and for older
//    extensions that do not know 'ui.mark' yet
// Once state exists, anything seen only in this browser is merged into it, and anything in state
// is mirrored back here (startSeenSync). Seen never becomes unseen.
import { computed, reactive, watch } from 'vue'
import { SHOP_ITEMS, UI_FLAGS } from '@regimen/core'
import { store, call } from './store.js'

const KEYS = {
  tours: 'regimen:tours-seen',
  tips: 'regimen:room-tips-seen',
  flags: 'regimen:ui-flags',
}
const KNOWN_KEY = 'regimen:shop-known'
// notices that had their own key before the seen list existed
const OLD_FLAG_KEYS = { 'no-extension-seen': 'regimen:no-extension-seen' }
const ID = /^(\*|[a-z][a-z0-9-]{0,39})$/
const MAX = 40

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    return v ?? fallback
  } catch {
    return fallback
  }
}
function write(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {}
}
function readList(kind) {
  const v = read(KEYS[kind], [])
  const list = Array.isArray(v) ? v.filter((x) => typeof x === 'string' && ID.test(x)) : []
  if (kind === 'flags') {
    for (const [flag, key] of Object.entries(OLD_FLAG_KEYS)) {
      try {
        if (localStorage.getItem(key) === '1' && !list.includes(flag)) list.push(flag)
      } catch {}
    }
    return list.filter((f) => UI_FLAGS.includes(f))
  }
  return list
}
const SHOP_IDS = new Set(SHOP_ITEMS.map((i) => i.id))
function cleanKnown(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return Object.fromEntries(Object.entries(v).filter(([id, r]) => SHOP_IDS.has(id) && (r === 1 || r === 2)))
}

/** This browser's copy. Reactive, so tours and tips update as soon as something is marked. */
const local = reactive({
  tours: readList('tours'),
  tips: readList('tips'),
  flags: readList('flags'),
  shopKnown: cleanKnown(read(KNOWN_KEY)),
})

const inState = () => store.state?.ui || null

/** Has the person seen this? kind: 'tours' | 'tips' | 'flags' */
export function isSeen(kind, id) {
  return local[kind].includes(id) || !!inState()?.[kind]?.includes(id)
}

function remember(kind, ids) {
  const fresh = ids.filter((id) => !local[kind].includes(id))
  if (!fresh.length) return
  local[kind] = [...local[kind], ...fresh].slice(-MAX)
  write(KEYS[kind], local[kind])
  if (kind === 'flags') for (const f of fresh) if (OLD_FLAG_KEYS[f]) write(OLD_FLAG_KEYS[f], 1)
}

/** Marks something as seen, here and in the saved state (when there is one). */
export function markSeen(kind, id) {
  remember(kind, [id])
  const ui = inState()
  if (ui && !store.pendingApproval && !ui[kind]?.includes(id)) call('ui.mark', { [kind]: [id] }).catch(() => {})
}

// ---- the shop's "New": known[id] is 1 when an item was seen unlocked, 2 when seen affordable
/** Both copies together. null until the shop has been looked at once, anywhere. */
export const shopKnown = computed(() => {
  const a = local.shopKnown
  const b = inState()?.shopKnown
  if (!a && !b) return null
  const out = { ...(b || {}) }
  for (const [id, r] of Object.entries(a || {})) out[id] = Math.max(out[id] || 0, r)
  return out
})
export function setShopKnown(next) {
  const clean = cleanKnown(next) || {}
  local.shopKnown = clean
  write(KNOWN_KEY, clean)
  const ui = inState()
  if (!ui || store.pendingApproval) return
  const theirs = ui.shopKnown || {}
  const patch = Object.fromEntries(Object.entries(clean).filter(([id, r]) => r > (theirs[id] || 0)))
  if (Object.keys(patch).length || !ui.shopKnown) call('ui.mark', { shopKnown: patch }).catch(() => {})
}

// ---- keeping both copies in step
const tried = new Set()
function sync() {
  const ui = inState()
  if (!store.ready || store.pendingApproval || !ui) return
  // state to this browser
  for (const kind of ['tours', 'tips', 'flags']) remember(kind, ui[kind] || [])
  if (ui.shopKnown) {
    const merged = shopKnown.value
    if (JSON.stringify(merged) !== JSON.stringify(local.shopKnown)) {
      local.shopKnown = merged
      write(KNOWN_KEY, merged)
    }
  }
  // this browser to state (a guest trial, an older version, another tab before approval)
  const patch = {}
  for (const kind of ['tours', 'tips', 'flags']) {
    const missing = local[kind].filter((id) => !(ui[kind] || []).includes(id))
    if (missing.length) patch[kind] = missing.slice(-MAX)
  }
  if (local.shopKnown) {
    const theirs = ui.shopKnown || {}
    const more = Object.fromEntries(Object.entries(local.shopKnown).filter(([id, r]) => r > (theirs[id] || 0)))
    if (Object.keys(more).length || !ui.shopKnown) patch.shopKnown = more
  }
  const key = JSON.stringify(patch)
  // once per difference, so an extension that says no is not asked again and again
  if (key === '{}' || tried.has(key)) return
  tried.add(key)
  call('ui.mark', patch).catch(() => {})
}

/** Call once from App: merges this browser's seen list into the saved state, and back. */
export function startSeenSync() {
  watch(() => [store.ready, store.pendingApproval, store.mode, inState()], sync, { immediate: true })
}
