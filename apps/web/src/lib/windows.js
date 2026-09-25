import { reactive } from 'vue'
// A small window manager for the study room: every panel is a window you can drag by its
// title bar, resize from its edges and corners, minimize to the dock and maximize.
// Windows snap to the room edges and to each other, stay inside the viewport, and their
// layout is saved per device size (the width rounded to 320px), because a layout that
// fits a laptop does not fit a big monitor.
// Pure geometry helpers are exported for reuse. A rect is { x, y, w, h } in CSS pixels,
// an area is { l, t, r, b }.

export const SNAP = 12 // how close an edge has to be to snap
export const GAP = 8 // the gap left between two windows that snap together
export const bucketOf = (vw) => Math.max(320, Math.round(vw / 320) * 320)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Size within the window's min and max and the area, then position inside the area. */
export function clampRect(r, area, spec = {}) {
  const [minW, minH] = spec.min || [200, 120]
  const [maxW, maxH] = spec.max || [4000, 4000]
  const aw = area.r - area.l
  const ah = area.b - area.t
  const w = Math.round(clamp(r.w, Math.min(minW, aw), Math.min(maxW, aw)))
  const h = Math.round(clamp(r.h, Math.min(minH, ah), Math.min(maxH, ah)))
  return { x: Math.round(clamp(r.x, area.l, area.r - w)), y: Math.round(clamp(r.y, area.t, area.b - h)), w, h }
}

/**
 * Move a rect from one viewport size to another. A window in the right half keeps its
 * distance to the right edge, one in the bottom half its distance to the bottom, so a
 * layout survives the browser window being resized.
 */
export function carryRect(r, from, to) {
  const out = { ...r }
  if (from.vw && r.x + r.w / 2 > from.vw / 2) out.x = r.x + (to.vw - from.vw)
  if (from.vh && r.y + r.h / 2 > from.vh / 2) out.y = r.y + (to.vh - from.vh)
  return out
}

// the closest target to any of the values, within SNAP
function nearest(values, targets) {
  let best = null
  for (const [i, v] of values.entries())
    for (const t of targets) {
      const d = Math.abs(t - v)
      if (d <= SNAP && (!best || d < best.d)) best = { d, delta: t - v, at: t, i }
    }
  return best
}

// edges a moving window can snap to: the area and the windows next to it
function targets(r, others, area) {
  const xs = { lo: [area.l], hi: [area.r] }
  const ys = { lo: [area.t], hi: [area.b] }
  for (const o of others) {
    if (o.y < r.y + r.h + SNAP && o.y + o.h > r.y - SNAP) {
      xs.lo.push(o.x + o.w + GAP, o.x)
      xs.hi.push(o.x - GAP, o.x + o.w)
    }
    if (o.x < r.x + r.w + SNAP && o.x + o.w > r.x - SNAP) {
      ys.lo.push(o.y + o.h + GAP, o.y)
      ys.hi.push(o.y - GAP, o.y + o.h)
    }
  }
  return { xs, ys }
}

/** Snap a moved rect. Returns the rect and the guide lines it snapped to. */
export function snapMove(r, others, area) {
  const { xs, ys } = targets(r, others, area)
  const out = { ...r }
  const guides = { x: null, y: null }
  const bx = nearest([r.x], xs.lo)
  const bx2 = nearest([r.x + r.w], xs.hi)
  const sx = bx && (!bx2 || bx.d <= bx2.d) ? bx : bx2
  if (sx) {
    out.x += sx.delta
    guides.x = sx.at
  }
  const by = nearest([r.y], ys.lo)
  const by2 = nearest([r.y + r.h], ys.hi)
  const sy = by && (!by2 || by.d <= by2.d) ? by : by2
  if (sy) {
    out.y += sy.delta
    guides.y = sy.at
  }
  return { rect: out, guides }
}

/** Snap the edges being dragged in a resize (dir holds n, s, e and/or w). */
export function snapResize(r, dir, others, area) {
  const { xs, ys } = targets(r, others, area)
  const out = { ...r }
  const guides = { x: null, y: null }
  if (dir.includes('e')) {
    const s = nearest([r.x + r.w], xs.hi)
    if (s) ((out.w += s.delta), (guides.x = s.at))
  }
  if (dir.includes('w')) {
    const s = nearest([r.x], xs.lo)
    if (s) ((out.x += s.delta), (out.w -= s.delta), (guides.x = s.at))
  }
  if (dir.includes('s')) {
    const s = nearest([r.y + r.h], ys.hi)
    if (s) ((out.h += s.delta), (guides.y = s.at))
  }
  if (dir.includes('n')) {
    const s = nearest([r.y], ys.lo)
    if (s) ((out.y += s.delta), (out.h -= s.delta), (guides.y = s.at))
  }
  return { rect: out, guides }
}

/** Resize from an edge or corner, keeping the opposite edge still and the size in bounds. */
export function resizeRect(start, dir, dx, dy, spec = {}, area) {
  const [minW, minH] = spec.min || [200, 120]
  const [maxW, maxH] = spec.max || [4000, 4000]
  let { x, y, w, h } = start
  if (dir.includes('e')) w = clamp(start.w + dx, minW, Math.min(maxW, area.r - start.x))
  if (dir.includes('s')) h = clamp(start.h + dy, minH, Math.min(maxH, area.b - start.y))
  if (dir.includes('w')) {
    w = clamp(start.w - dx, minW, Math.min(maxW, start.x + start.w - area.l))
    x = start.x + start.w - w
  }
  if (dir.includes('n')) {
    h = clamp(start.h - dy, minH, Math.min(maxH, start.y + start.h - area.t))
    y = start.y + start.h - h
  }
  return { x, y, w, h }
}

function readJSON(key) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}
function writeJSON(key, v) {
  try {
    if (v === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(v))
  } catch {}
}

/**
 * specs: { [id]: { min: [w, h], max: [w, h] } }
 * layout(vw, vh): the default layout, { [id]: { x, y, w, h, min? } }
 * area(vw, vh): where windows may go. maxArea(vw, vh): what a maximized window fills.
 */
export function createWindows({ specs, layout, area, maxArea, storageKey }) {
  const wm = reactive({
    vw: window.innerWidth,
    vh: window.innerHeight,
    wins: {},
    top: 1,
    guides: { x: null, y: null },
    moving: null, // id of the window being dragged or resized
  })
  const keyFor = (vw) => `${storageKey}:${bucketOf(vw)}`
  const areaNow = () => area(wm.vw, wm.vh)

  function fromDefaults() {
    const d = layout(wm.vw, wm.vh)
    const out = {}
    let z = 1
    for (const id of Object.keys(specs)) {
      const r = d[id] || { x: 20, y: 80, w: 320, h: 240 }
      out[id] = { ...clampRect(r, areaNow(), specs[id]), min: !!r.min, max: false, z: z++ }
    }
    wm.top = z
    return out
  }

  function load() {
    const base = fromDefaults()
    const saved = readJSON(keyFor(wm.vw))
    if (saved?.wins) {
      const from = { vw: saved.vw, vh: saved.vh }
      for (const id of Object.keys(base)) {
        const s = saved.wins[id]
        if (!s || ![s.x, s.y, s.w, s.h].every(Number.isFinite)) continue
        base[id] = {
          ...clampRect(carryRect(s, from, wm), areaNow(), specs[id]),
          min: !!s.min,
          max: !!s.max,
          z: Number.isFinite(s.z) ? s.z : base[id].z,
        }
      }
      wm.top = Math.max(...Object.values(base).map((w) => w.z)) + 1
    }
    wm.wins = base
  }

  let saveT = null
  function save() {
    clearTimeout(saveT)
    saveT = setTimeout(() => writeJSON(keyFor(wm.vw), { vw: wm.vw, vh: wm.vh, wins: wm.wins }), 150)
  }

  /** The rect a window shows at: its own, or the whole room when maximized. */
  function rectOf(id) {
    const w = wm.wins[id]
    if (!w) return null
    if (w.max) {
      const a = maxArea(wm.vw, wm.vh)
      return { x: a.l, y: a.t, w: a.r - a.l, h: a.b - a.t }
    }
    return { x: w.x, y: w.y, w: w.w, h: w.h }
  }

  function focus(id) {
    const w = wm.wins[id]
    if (!w || w.z === wm.top - 1) return
    w.z = wm.top++
    // keep the numbers small
    if (wm.top > 900) {
      const order = Object.entries(wm.wins).sort((a, b) => a[1].z - b[1].z)
      order.forEach(([, x], i) => (x.z = i + 1))
      wm.top = order.length + 1
    }
    save()
  }
  function minimize(id) {
    if (!wm.wins[id]) return
    wm.wins[id].min = true
    save()
  }
  function restore(id) {
    const w = wm.wins[id]
    if (!w) return
    w.min = false
    focus(id)
    save()
  }
  function toggleMin(id) {
    const w = wm.wins[id]
    if (!w) return
    // a window hidden behind others comes to the front first
    if (!w.min && w.z !== wm.top - 1) return focus(id)
    return w.min ? restore(id) : minimize(id)
  }
  function toggleMax(id) {
    const w = wm.wins[id]
    if (!w) return
    w.max = !w.max
    w.min = false
    focus(id)
    save()
  }
  /** Escape: restore the maximized window on top. Returns true when it did something. */
  function unmaximizeTop() {
    const list = Object.entries(wm.wins).filter(([, w]) => w.max && !w.min)
    if (!list.length) return false
    list.sort((a, b) => b[1].z - a[1].z)
    list[0][1].max = false
    save()
    return true
  }

  const others = (id) =>
    Object.entries(wm.wins)
      .filter(([k, w]) => k !== id && !w.min && !w.max)
      .map(([, w]) => w)

  // --- pointer: drag by the title bar, resize from edges and corners ---
  let op = null
  function onMove(e) {
    if (!op) return
    const w = wm.wins[op.id]
    const dx = e.clientX - op.px
    const dy = e.clientY - op.py
    if (!op.live && Math.abs(dx) + Math.abs(dy) < 4) return
    if (!op.live) {
      op.live = true
      wm.moving = op.id
      document.documentElement.classList.add('fg-wm-busy')
      document.documentElement.dataset.wmCursor = op.cursor
      // dragging a maximized window takes it out, under the pointer
      if (op.kind === 'move' && w.max) {
        const full = rectOf(op.id)
        const fx = (op.px - full.x) / full.w
        w.max = false
        op.start = { x: op.px - w.w * fx, y: op.py - 14, w: w.w, h: w.h }
      }
    }
    const a = areaNow()
    const spec = specs[op.id]
    let res
    if (op.kind === 'move') {
      const r = clampRect({ ...op.start, x: op.start.x + dx, y: op.start.y + dy }, a, spec)
      res = e.altKey ? { rect: r, guides: { x: null, y: null } } : snapMove(r, others(op.id), a)
      res.rect = clampRect(res.rect, a, spec)
    } else {
      const r = resizeRect(op.start, op.dir, dx, dy, spec, a)
      res = e.altKey ? { rect: r, guides: { x: null, y: null } } : snapResize(r, op.dir, others(op.id), a)
      const s = res.rect
      const [minW, minH] = spec.min || [200, 120]
      if (s.w < minW || s.h < minH) res = { rect: r, guides: { x: null, y: null } }
    }
    Object.assign(w, res.rect)
    wm.guides = res.guides
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    document.documentElement.classList.remove('fg-wm-busy')
    delete document.documentElement.dataset.wmCursor
    if (op?.live) save()
    op = null
    wm.moving = null
    wm.guides = { x: null, y: null }
  }
  function begin(id, e, kind, dir = '', cursor = 'grabbing') {
    if (e.button !== 0 || !wm.wins[id]) return
    focus(id)
    const w = wm.wins[id]
    if (kind === 'resize' && w.max) return
    op = { id, kind, dir, cursor, px: e.clientX, py: e.clientY, start: { x: w.x, y: w.y, w: w.w, h: w.h }, live: false }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }
  const startDrag = (id, e) => begin(id, e, 'move')
  const startResize = (id, dir, e) => {
    e.preventDefault()
    begin(id, e, 'resize', dir, `${dir}-resize`)
  }

  /** Keyboard: arrow keys move, shift + arrows resize. */
  function nudge(id, dx, dy, resize = false) {
    const w = wm.wins[id]
    if (!w || w.max) return
    const r = resize ? { x: w.x, y: w.y, w: w.w + dx, h: w.h + dy } : { x: w.x + dx, y: w.y + dy, w: w.w, h: w.h }
    Object.assign(w, clampRect(r, areaNow(), specs[id]))
    save()
  }

  /** The browser window changed size: carry the layout over, or load the one saved for that size. */
  function setViewport(vw, vh) {
    if (vw === wm.vw && vh === wm.vh) return
    const from = { vw: wm.vw, vh: wm.vh }
    const bucketChanged = bucketOf(vw) !== bucketOf(wm.vw)
    if (bucketChanged) writeJSON(keyFor(wm.vw), { vw: wm.vw, vh: wm.vh, wins: wm.wins })
    wm.vw = vw
    wm.vh = vh
    // another device size: its own saved layout, or the default layout for that size
    if (bucketChanged) return load()
    const a = areaNow()
    for (const [id, w] of Object.entries(wm.wins)) Object.assign(w, clampRect(carryRect(w, from, wm), a, specs[id]))
  }

  function reset() {
    writeJSON(keyFor(wm.vw), null)
    wm.wins = fromDefaults()
  }

  load()
  return {
    wm,
    rectOf,
    focus,
    minimize,
    restore,
    toggleMin,
    toggleMax,
    unmaximizeTop,
    startDrag,
    startResize,
    nudge,
    setViewport,
    reset,
    save,
  }
}
