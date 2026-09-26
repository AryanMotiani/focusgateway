<script setup>
// The study room: an illustrated room drawn in a fixed 1600 x 900 box, with a window onto
// the chosen scene, a student at the desk and the player's own decor.
// Layers, bottom to top, all sharing one viewBox:
//   1. the view out of the window, with rain and weather (only this layer animates weather)
//   2. the room itself, lit by a CSS filter that follows the scene (night, day, sunset)
//   3. a colour wash for the scene, 4. light: lamp pool, sun shaft, glowing items
//   5. decorate mode handles
// Nothing here depends on the clock, so the room does not re-render every second.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import SceneSky from '../SceneSky.vue'
import RoomAvatar from './RoomAvatar.vue'
import { lightOf, sceneOf } from '../../lib/scenes.js'
import { lofi } from '../../lib/lofi.js'
import { C } from './palette.js'
import { DEFAULT_STYLE } from '@regimen/core'
import { luma, wallOf, woodOf, PATTERNS, FLOORS, CURTAINS, LAMPS } from './roomStyle.js'
import { GLASS, room, placedItems, drag, removeItem, snap, itemMeta, placeItem, selection, nudge, canNudgeUpDown } from '../../lib/room.js'
import Icon from '../Icon.vue'

const props = defineProps({
  scene: { type: String, default: 'scene-night' },
  rain: { type: Number, default: 0.5 },
  // cover: fill the box, cropping around the desk. contain: show the whole room.
  fit: { type: String, default: 'cover' },
  editable: Boolean,
})
const emit = defineEmits(['drop-outside'])

const box = ref(null)
const handles = ref(null)
const avatarG = ref(null)
const size = reactive({ w: 1600, h: 900 })
const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const vb = computed(() => {
  if (props.fit === 'contain' || !size.w || !size.h) return '0 0 1600 900'
  const ar = size.w / size.h
  if (ar < 16 / 9) {
    const w = 900 * ar
    const x = Math.min(1600 - w, Math.max(0, 820 - w / 2))
    return `${x.toFixed(1)} 0 ${w.toFixed(1)} 900`
  }
  const h = 1600 / ar
  return `0 ${((900 - h) * 0.62).toFixed(1)} 1600 ${h.toFixed(1)}`
})

const light = computed(() => lightOf(props.scene))
// the player's room style: walls, floor, curtains, wood and the lamp
const style = computed(() => ({ ...DEFAULT_STYLE, ...room.style }))
const wall = computed(() => wallOf(style.value.wall))
const wood = computed(() => woodOf(style.value.wood))
const paper = computed(() => PATTERNS[style.value.pattern]?.(wall.value.ink, wood.value) || null)
const floor = computed(() => FLOORS[style.value.floor] || FLOORS.oak)
const curtain = computed(() => CURTAINS[style.value.curtain] || CURTAINS.teal)
const lamp = computed(() => LAMPS[style.value.light] || LAMPS.warm)
const lampOn = computed(() => light.value.lamp * style.value.brightness * (lamp.value.gain || 1))
// a dimmer lamp makes the whole room a little darker, only when the lamp is what lights it
const roomFilter = computed(() => {
  const k = 1 - (1 - style.value.brightness) * 0.25 * light.value.lamp
  const base = light.value.filter === 'none' ? '' : light.value.filter
  return k < 0.999 ? `${base} brightness(${k.toFixed(3)})`.trim() : light.value.filter
})
const weather = computed(() => sceneOf(props.scene).weather)
// how much lamp colour to wash over a dark wall: more the darker the wall and the room
const wallLift = computed(() => {
  if (!wall.value.dark || !light.value.lamp) return 0
  return +(0.1 + (0.45 - luma(wall.value.base)) * 0.5).toFixed(3) * light.value.lamp * (0.6 + 0.4 * style.value.brightness)
})

// ---- weather in the window (CSS animated, clipped to the glass)
function rng(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}
const drops = (() => {
  const r = rng(11)
  return Array.from({ length: 46 }, () => ({
    x: GLASS.x + r() * (GLASS.w + 60),
    y: GLASS.y + r() * GLASS.h,
    l: 12 + r() * 16,
    d: 0.45 + r() * 0.35,
    delay: -r() * 2,
    o: 0.25 + r() * 0.4,
  }))
})()
const beads = (() => {
  const r = rng(23)
  return Array.from({ length: 16 }, () => ({
    x: GLASS.x + 10 + r() * (GLASS.w - 20),
    y: GLASS.y + 10 + r() * (GLASS.h - 20),
    r: 1.5 + r() * 2.5,
  }))
})()
const flakes = (() => {
  const r = rng(5)
  return Array.from({ length: 34 }, () => ({
    x: GLASS.x + r() * GLASS.w,
    y: GLASS.y + r() * GLASS.h,
    r: 1.5 + r() * 2.5,
    d: 5 + r() * 6,
    delay: -r() * 10,
  }))
})()
const rainCount = computed(() => Math.round(props.rain * drops.length))

// ---- items by drawing layer
const byLayer = computed(() => {
  const out = { rug: [], back: [], floorBack: [], desk: [], floorMid: [], floorFront: [] }
  for (const it of placedItems.value) if (it.id !== drag.id) out[it.layer].push(it)
  out.back.sort((p, q) => p.y - q.y)
  for (const k of ['floorBack', 'floorMid', 'floorFront']) out[k].sort((p, q) => p.y - q.y)
  return out
})
const glowing = computed(() => placedItems.value.filter((it) => it.meta.glow && it.id !== drag.id))
const ghost = computed(() => (drag.id && drag.spot && !drag.overTray ? { ...drag.spot, meta: drag.meta } : null))
const tx = (it) => `translate(${it.x - it.meta.w / 2} ${it.y - it.meta.h})`

// ---- pointer helpers
function toRoom(clientX, clientY) {
  const svg = handles.value
  if (!svg) return null
  const m = svg.getScreenCTM()
  if (!m) return null
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse())
  return { x: p.x, y: p.y }
}
function insideBox(clientX, clientY) {
  const r = box.value?.getBoundingClientRect()
  return !!r && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
}

// ---- dragging (from the tray, see DecoratePanel, or from the room)
function updateDrag(e) {
  drag.clientX = e.clientX
  drag.clientY = e.clientY
  const el = document.elementFromPoint(e.clientX, e.clientY)
  drag.overTray = !!el?.closest('[data-room-tray]')
  const p = !drag.overTray && insideBox(e.clientX, e.clientY) ? toRoom(e.clientX, e.clientY) : null
  drag.spot = p ? snap(drag.meta, p.x - drag.grab.x, p.y - drag.grab.y) : null
  // on phones the room scrolls sideways: follow the item near the edges
  const scroller = box.value?.closest('[data-room-scroll]')
  if (scroller) {
    const r = scroller.getBoundingClientRect()
    if (e.clientX < r.left + 36) scroller.scrollLeft -= 10
    if (e.clientX > r.right - 36) scroller.scrollLeft += 10
  }
}
function endDrag() {
  window.removeEventListener('pointermove', updateDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', cancelDrag)
  const moved = Math.hypot(drag.clientX - drag.startX, drag.clientY - drag.startY) > 6
  if (drag.overTray) removeItem(drag.id)
  else if (drag.fromRoom && !moved)
    selection.id = drag.id // a tap on a placed item picks it
  else if (drag.spot) {
    placeItem(drag.id, drag.spot.x, drag.spot.y)
    selection.id = drag.id
  } else emit('drop-outside', drag.id)
  Object.assign(drag, { id: null, meta: null, spot: null, overTray: false })
}
function cancelDrag() {
  window.removeEventListener('pointermove', updateDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', cancelDrag)
  Object.assign(drag, { id: null, meta: null, spot: null, overTray: false })
}
/** Start dragging `id`. `grab` is where the pointer holds the item, relative to its bottom middle. */
function startDrag(id, e, grab, fromRoom = false) {
  const meta = itemMeta(id)
  if (!meta) return
  Object.assign(drag, {
    id,
    meta,
    grab: grab || { x: 0, y: -meta.h / 2 },
    spot: null,
    overTray: false,
    fromRoom,
    startX: e.clientX,
    startY: e.clientY,
  })
  updateDrag(e)
  window.addEventListener('pointermove', updateDrag)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', cancelDrag)
}
function grabPlaced(it, e) {
  if (!props.editable) return showTip(it, e)
  e.preventDefault()
  const p = toRoom(e.clientX, e.clientY)
  startDrag(it.id, e, p ? { x: p.x - it.x, y: p.y - it.y } : null, true)
}

// ---- decorate mode on the room itself: a drag on an empty spot pans the room on phones
// (the room has touch-action: none while decorating, so a finger never scrolls the page),
// and a tap on an empty spot drops the selection
let pan = null
function panStart(e) {
  if (!props.editable || drag.id || e.target.closest?.('.sr-hit, .sr-tools')) return
  const scroller = box.value?.closest('[data-room-scroll]')
  pan = { x: e.clientX, y: e.clientY, left: scroller?.scrollLeft || 0, scroller, moved: false }
  window.addEventListener('pointermove', panMove)
  window.addEventListener('pointerup', panEnd, { once: true })
  window.addEventListener('pointercancel', panEnd, { once: true })
}
function panMove(e) {
  if (!pan) return
  if (Math.hypot(e.clientX - pan.x, e.clientY - pan.y) > 6) pan.moved = true
  if (pan.scroller) pan.scroller.scrollLeft = pan.left - (e.clientX - pan.x)
}
function panEnd() {
  window.removeEventListener('pointermove', panMove)
  if (pan && !pan.moved) selection.id = null
  pan = null
}

// ---- the selected item: its toolbar (move, put away), arrow keys, and keeping it in view
const picked = computed(() => (props.editable && !drag.id && placedItems.value.find((it) => it.id === selection.id)) || null)
const view = computed(() => {
  const [x, y, w, h] = vb.value.split(' ').map(Number)
  const k = Math.min(size.w / w, size.h / h)
  return { x, y, k, ox: (size.w - w * k) / 2, oy: (size.h - h * k) / 2 }
})
const toPx = (x, y) => ({ left: view.value.ox + (x - view.value.x) * view.value.k, top: view.value.oy + (y - view.value.y) * view.value.k })
// the part of the room that is on screen (on phones the room scrolls sideways)
const seen = reactive({ left: 0, width: 0 })
function onScroll() {
  const scroller = box.value?.closest('[data-room-scroll]')
  seen.left = scroller ? scroller.scrollLeft : 0
  seen.width = scroller ? scroller.clientWidth : size.w
}
const tools = computed(() => {
  const it = picked.value
  if (!it) return null
  const top = toPx(it.x, it.y - it.meta.h)
  const bottom = toPx(it.x, it.y)
  const above = top.top > 60
  const upDown = canNudgeUpDown(it.meta)
  const half = upDown ? 128 : 92
  const lo = seen.left + half + 6
  const hi = seen.left + (seen.width || size.w) - half - 6
  return {
    left: hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, top.left)),
    top: above ? top.top - 10 : Math.min(size.h - 8, bottom.top + 10),
    above,
    upDown,
  }
})
// touch targets: at least 44 px on screen, however small the item is drawn
const hitPad = (it) => ({
  x: Math.max(0, (44 / (view.value.k || 1) - it.meta.w) / 2),
  y: Math.max(0, (44 / (view.value.k || 1) - it.meta.h) / 2),
})
const STEP = 20
const move = (dx, dy) => picked.value && nudge(picked.value.id, dx, dy)
function onKey(e) {
  if (!picked.value || e.target.closest?.('input, textarea, select, [contenteditable]')) return
  const k = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[e.key]
  if (k) {
    e.preventDefault()
    if (k[1] && !tools.value.upDown) return
    move(k[0], k[1])
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    removeItem(picked.value.id)
  }
}
// on phones the room scrolls sideways: bring a newly picked item into view
watch(
  () => selection.id,
  async () => {
    await nextTick()
    const it = picked.value
    const scroller = box.value?.closest('[data-room-scroll]')
    if (!it || !scroller) return
    const x = toPx(it.x, it.y).left
    if (x < scroller.scrollLeft + 40 || x > scroller.scrollLeft + scroller.clientWidth - 40)
      scroller.scrollTo({ left: x - scroller.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' })
  },
)
defineExpose({ startDrag })

// tap on a badge (or any item) outside decorate mode: show its name for a moment
const tip = ref(null)
let tipT = 0
function showTip(it, e) {
  const r = box.value.getBoundingClientRect()
  tip.value = { name: it.meta.name, x: e.clientX - r.left, y: e.clientY - r.top }
  clearTimeout(tipT)
  tipT = setTimeout(() => (tip.value = null), 2200)
}

// ---- nod on the music beat, set straight on the element so nothing re-renders
let offBeat = null
let nodT = 0
onMounted(() => {
  const ro = new ResizeObserver(([e]) => {
    size.w = e.contentRect.width
    size.h = e.contentRect.height
    onScroll()
  })
  ro.observe(box.value)
  onBeforeUnmount(() => ro.disconnect())
  const scroller = box.value.closest('[data-room-scroll]')
  scroller?.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => scroller?.removeEventListener('scroll', onScroll))
  document.addEventListener('keydown', onKey)
  if (!reduce)
    offBeat = lofi().onBeat(({ step }) => {
      const el = avatarG.value
      if (!el) return
      el.style.setProperty('--nod', step === 0 ? '1' : '0.45')
      clearTimeout(nodT)
      nodT = setTimeout(() => el.style.setProperty('--nod', '0'), 170)
    })
})
onBeforeUnmount(() => {
  offBeat?.()
  cancelDrag()
  panEnd()
  document.removeEventListener('keydown', onKey)
})
watch(
  () => props.editable,
  (v) => {
    if (v) return
    cancelDrag()
    selection.id = null
  },
)

const avatar = computed(() => room.avatar)
</script>

<template>
  <div
    ref="box"
    class="sr-room overflow-hidden select-none"
    :class="{ 'sr-contain': fit === 'contain', 'sr-editing': editable }"
    @pointerdown="panStart"
  >
    <!-- 1. the view out of the window -->
    <svg class="sr-layer" :viewBox="vb" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="sr-glass"><rect :x="GLASS.x" :y="GLASS.y" :width="GLASS.w" :height="GLASS.h" /></clipPath>
      </defs>
      <SceneSky :scene="scene" view-box="330 102 980 798" id-prefix="srw-" :x="GLASS.x" :y="GLASS.y" :width="GLASS.w" :height="GLASS.h" />
      <g clip-path="url(#sr-glass)">
        <g v-if="rainCount" stroke="#dfe6ff" stroke-linecap="round" stroke-width="1.6">
          <line
            v-for="(d, i) in drops.slice(0, rainCount)"
            :key="i"
            class="sr-rain"
            :x1="d.x"
            :y1="d.y"
            :x2="d.x - d.l * 0.2"
            :y2="d.y + d.l"
            :opacity="d.o"
            :style="{ animationDuration: d.d + 's', animationDelay: d.delay + 's' }"
          />
        </g>
        <g v-if="rain > 0.15" fill="#e8eeff" opacity=".35">
          <circle v-for="(b, i) in beads" :key="'b' + i" :cx="b.x" :cy="b.y" :r="b.r" />
        </g>
        <g v-if="weather">
          <circle
            v-for="(f, i) in flakes"
            :key="'w' + i"
            :class="`sr-${weather}`"
            :cx="f.x"
            :cy="f.y"
            :r="weather === 'petals' ? f.r * 1.3 : f.r"
            :fill="weather === 'snow' ? '#fff' : weather === 'petals' ? '#ffb3c8' : '#ffeb99'"
            :style="{ animationDuration: f.d + 's', animationDelay: f.delay + 's' }"
          />
        </g>
      </g>
    </svg>

    <!-- 2. the room -->
    <svg class="sr-layer sr-lit" :viewBox="vb" preserveAspectRatio="xMidYMid meet" :style="{ filter: roomFilter }" aria-hidden="true">
      <defs>
        <pattern v-if="paper" id="sr-paper" :width="paper.w" :height="paper.h" patternUnits="userSpaceOnUse" v-html="paper.svg" />
        <pattern id="sr-tiles" width="92" height="92" y="762" patternUnits="userSpaceOnUse">
          <rect width="46" height="46" :fill="floor.alt || floor.top" />
          <rect x="46" y="46" width="46" height="46" :fill="floor.alt || floor.top" />
          <path d="M0 1 H92 M0 47 H92 M1 0 V92 M47 0 V92" :stroke="floor.line" stroke-width="2" opacity=".7" />
        </pattern>
        <pattern id="sr-speck" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="7" r="1.2" fill="#000" opacity=".12" />
          <circle cx="18" cy="16" r="1" fill="#fff" opacity=".1" />
          <circle cx="12" cy="23" r="1.1" fill="#000" opacity=".08" />
        </pattern>
        <linearGradient id="sr-wallshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity=".1" />
          <stop offset=".25" stop-color="#000" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="sr-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" :stop-color="floor.top" />
          <stop offset="1" :stop-color="floor.bottom" />
        </linearGradient>
        <linearGradient id="sr-curtain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" :stop-color="curtain[0]" />
          <stop offset=".45" :stop-color="curtain[1]" />
          <stop offset="1" :stop-color="curtain[0]" />
        </linearGradient>
      </defs>

      <!-- wall with the window cut out -->
      <path :d="`M0 0 H1600 V760 H0Z M${GLASS.x} ${GLASS.y} v${GLASS.h} h${GLASS.w} v-${GLASS.h}z`" fill-rule="evenodd" :fill="wall.base" />
      <path
        v-if="paper"
        :d="`M0 0 H1600 V600 H0Z M${GLASS.x} ${GLASS.y} v${GLASS.h} h${GLASS.w} v-${GLASS.h}z`"
        fill-rule="evenodd"
        fill="url(#sr-paper)"
      />
      <rect width="1600" height="760" fill="url(#sr-wallshade)" pointer-events="none" />
      <!-- dark walls catch a little lamp light at night, so they read as a room and not a black box -->
      <path
        v-if="wallLift"
        :d="`M0 0 H1600 V746 H0Z M${GLASS.x} ${GLASS.y} v${GLASS.h} h${GLASS.w} v-${GLASS.h}z`"
        fill-rule="evenodd"
        :fill="lamp.lift || lamp.pool[0]"
        :opacity="wallLift"
        :class="lamp.cycle && 'sr-rgb-fill'"
        pointer-events="none"
      />
      <rect y="0" width="1600" height="16" :fill="wall.trim" />
      <rect y="16" width="1600" height="4" :fill="wall.trim2" />
      <!-- wainscot -->
      <rect y="600" width="1600" height="146" :fill="wall.low" />
      <rect y="594" width="1600" height="10" :fill="wall.rail" />
      <g fill="none" :stroke="wall.rail" stroke-width="3" opacity=".7">
        <rect v-for="i in 8" :key="i" :x="(i - 1) * 200 + 24" y="624" width="152" height="100" rx="3" />
      </g>
      <!-- floor -->
      <rect y="746" width="1600" height="14" fill="#efe2d1" />
      <rect y="758" width="1600" height="4" fill="#cdb9a2" />
      <rect y="762" width="1600" height="138" fill="url(#sr-floor)" />
      <rect v-if="floor.kind === 'tiles'" y="762" width="1600" height="138" fill="url(#sr-tiles)" />
      <rect v-if="floor.kind === 'carpet' || floor.kind === 'concrete'" y="762" width="1600" height="138" fill="url(#sr-speck)" />
      <g v-if="floor.kind === 'concrete'" :stroke="floor.line" stroke-width="2" opacity=".5">
        <line x1="0" y1="826" x2="1600" y2="826" />
        <line v-for="i in 4" :key="'c' + i" :x1="i * 400 - 220" y1="762" :x2="i * 400 - 250" y2="900" />
      </g>
      <g v-if="floor.kind === 'boards'" :stroke="floor.line" stroke-width="2" opacity=".45">
        <line x1="0" y1="790" x2="1600" y2="790" />
        <line x1="0" y1="826" x2="1600" y2="826" />
        <line x1="0" y1="870" x2="1600" y2="870" />
        <line v-for="i in 9" :key="'j1' + i" :x1="i * 180 - 60" y1="762" :x2="i * 180 - 60" y2="790" />
        <line v-for="i in 8" :key="'j2' + i" :x1="i * 210 - 10" y1="790" :x2="i * 210 - 10" y2="826" />
        <line v-for="i in 7" :key="'j3' + i" :x1="i * 240 - 130" y1="826" :x2="i * 240 - 130" y2="870" />
      </g>

      <!-- window frame, sill and curtains -->
      <path
        :d="`M594 104 H1006 V446 H594Z M${GLASS.x} ${GLASS.y} v${GLASS.h} h${GLASS.w} v-${GLASS.h}z`"
        fill-rule="evenodd"
        fill="#f3ebdf"
      />
      <path :d="`M${GLASS.x} ${GLASS.y} h${GLASS.w} l-6 6 h-${GLASS.w - 12} v${GLASS.h - 12} l-6 6z`" fill="#d8ccbb" />
      <rect x="795" :y="GLASS.y" width="10" :height="GLASS.h" fill="#f3ebdf" />
      <rect :x="GLASS.x" y="268" :width="GLASS.w" height="10" fill="#f3ebdf" />
      <g fill="#fff" opacity=".07">
        <path d="M640 428 L760 122 H800 L680 428Z" />
        <path d="M842 428 L930 122 H950 L862 428Z" />
      </g>
      <rect x="576" y="444" width="448" height="8" rx="3" fill="#faf4ea" />
      <rect x="580" y="452" width="440" height="14" rx="2" fill="#e2d6c4" />
      <rect x="590" y="466" width="420" height="6" fill="#000" opacity=".08" />
      <!-- curtain rod and curtains -->
      <path
        d="M538 88 H606 C602 170 590 250 596 330 C600 420 588 470 574 520 H532 C544 470 548 420 548 330 C550 250 540 170 538 88Z"
        fill="url(#sr-curtain)"
      />
      <path
        d="M1062 88 H994 C998 170 1010 250 1004 330 C1000 420 1012 470 1026 520 H1068 C1056 470 1052 420 1052 330 C1050 250 1060 170 1062 88Z"
        fill="url(#sr-curtain)"
      />
      <g :stroke="curtain[2]" stroke-width="3" fill="none" opacity=".5">
        <path d="M560 96 C556 200 566 260 562 330 C560 420 556 470 552 516" />
        <path d="M584 96 C582 200 576 260 578 330 C580 420 572 470 562 516" />
        <path d="M1040 96 C1044 200 1034 260 1038 330 C1040 420 1044 470 1048 516" />
        <path d="M1016 96 C1018 200 1024 260 1022 330 C1020 420 1028 470 1038 516" />
      </g>
      <rect x="548" y="322" width="54" height="12" rx="6" fill="#d9a54a" />
      <rect x="998" y="322" width="54" height="12" rx="6" fill="#d9a54a" />
      <rect x="520" y="80" width="560" height="9" rx="4.5" fill="#6b4b3a" />
      <circle cx="518" cy="84.5" r="9" fill="#6b4b3a" />
      <circle cx="1082" cy="84.5" r="9" fill="#6b4b3a" />

      <!-- wall shelves -->
      <g
        v-for="(s, i) in [
          { x1: 140, x2: 460, y: 262 },
          { x1: 1170, x2: 1470, y: 302 },
        ]"
        :key="'sh' + i"
      >
        <path :d="`M${s.x1 + 40} ${s.y + 14} v24 l24 -24z M${s.x2 - 40} ${s.y + 14} v24 l-24 -24z`" :fill="wood.d" />
        <rect :x="s.x1" :y="s.y + 2" :width="s.x2 - s.x1" height="14" rx="2" :fill="wood.n" />
        <rect :x="s.x1" :y="s.y - 7" :width="s.x2 - s.x1" height="10" rx="2" :fill="wood.l" />
        <rect :x="s.x1 + 6" :y="s.y + 16" :width="s.x2 - s.x1 - 12" height="6" fill="#000" opacity=".08" />
      </g>

      <!-- ceiling lamp -->
      <line x1="1116" y1="18" x2="1116" y2="198" stroke="#3a2e3c" stroke-width="3" />
      <rect x="1106" y="190" width="20" height="12" rx="3" fill="#3a2e3c" />
      <path d="M1098 200 H1134 L1166 248 H1066Z" fill="#2f5c58" />
      <path d="M1116 200 H1134 L1166 248 H1130Z" fill="#000" opacity=".15" />
      <ellipse cx="1116" cy="248" rx="50" ry="7" :fill="lamp.rim" :class="lamp.cycle && 'sr-rgb-fill'" />

      <!-- items: rugs, then the wall, shelves and sill, then things on the floor behind the desk -->
      <g v-for="it in byLayer.rug" :key="it.id" :transform="tx(it)" v-html="it.meta.svg" />
      <g v-for="it in byLayer.back" :key="it.id" :transform="tx(it)">
        <ellipse
          v-if="it.meta.surface !== 'wall' && it.y < 700"
          :cx="it.meta.w / 2"
          :cy="it.meta.h - 1"
          :rx="it.meta.w * 0.42"
          ry="3.5"
          :fill="C.shadow"
          opacity=".22"
        />
        <g v-html="it.meta.svg" />
      </g>
      <g v-for="it in byLayer.floorBack" :key="it.id" :transform="tx(it)">
        <ellipse :cx="it.meta.w / 2" :cy="it.meta.h - 2" :rx="it.meta.w * 0.46" ry="7" :fill="C.shadow" opacity=".25" />
        <g v-html="it.meta.svg" />
      </g>

      <!-- desk -->
      <ellipse cx="800" cy="806" rx="310" ry="14" fill="#000" opacity=".16" />
      <rect x="548" y="590" width="12" height="172" :fill="wood.dd" />
      <rect x="1040" y="590" width="12" height="172" :fill="wood.dd" />
      <path d="M540 538 H1060 L1084 590 H516Z" :fill="wood.top" />
      <path d="M540 538 H1060 L1062 542 H538Z" fill="#000" opacity=".1" />
      <rect x="516" y="588" width="568" height="28" rx="3" :fill="wood.b" />
      <rect x="516" y="588" width="568" height="5" :fill="wood.hi" />
      <rect x="892" y="616" width="176" height="70" rx="3" :fill="wood.m" />
      <rect x="900" y="624" width="160" height="54" rx="3" :fill="wood.b" />
      <rect x="960" y="646" width="40" height="8" rx="4" fill="#e3c089" />
      <rect x="520" y="614" width="20" height="200" rx="3" :fill="wood.m" />
      <rect x="1060" y="614" width="20" height="200" rx="3" :fill="wood.d" />

      <g v-for="it in byLayer.desk" :key="it.id" :transform="tx(it)">
        <ellipse :cx="it.meta.w / 2" :cy="it.meta.h - 1" :rx="it.meta.w * 0.42" ry="3.5" :fill="C.shadow" opacity=".22" />
        <g v-html="it.meta.svg" />
      </g>
      <g v-for="it in byLayer.floorMid" :key="it.id" :transform="tx(it)">
        <ellipse :cx="it.meta.w / 2" :cy="it.meta.h - 2" :rx="it.meta.w * 0.46" ry="7" :fill="C.shadow" opacity=".25" />
        <g v-html="it.meta.svg" />
      </g>

      <!-- the student -->
      <ellipse cx="846" cy="866" rx="96" ry="9" fill="#000" opacity=".18" />
      <g ref="avatarG" transform="translate(840 692)">
        <RoomAvatar :avatar="avatar" :wood="style.wood" uid="sr-av" />
      </g>

      <g v-for="it in byLayer.floorFront" :key="it.id" :transform="tx(it)">
        <ellipse :cx="it.meta.w / 2" :cy="it.meta.h - 2" :rx="it.meta.w * 0.46" ry="7" :fill="C.shadow" opacity=".25" />
        <g v-html="it.meta.svg" />
      </g>

      <!-- the item being dragged, where it would land -->
      <g v-if="ghost" :transform="tx(ghost)" opacity=".92">
        <g v-if="!ghost.meta.flat && ghost.meta.surface !== 'wall'">
          <ellipse :cx="ghost.meta.w / 2" :cy="ghost.meta.h - 1" :rx="ghost.meta.w * 0.42" ry="4" :fill="C.shadow" opacity=".25" />
        </g>
        <g v-html="ghost.meta.svg" />
      </g>
    </svg>

    <!-- 3. colour of the light for this scene, and a soft vignette -->
    <div class="sr-layer sr-tint" :style="{ background: light.tint }" />

    <!-- 4. light. First the lamp lighting up what it falls on (colour dodge keeps shadows dark,
         so pale light looks crisp instead of foggy), then the pool, window light and glowing things -->
    <svg v-if="lampOn > 0" class="sr-layer sr-dodge" :viewBox="vb" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="sr-lit" cx="930" cy="470" r="440" gradientUnits="userSpaceOnUse">
          <stop offset="0" :stop-color="lamp.dodge || lamp.pool[0]" stop-opacity=".55" :class="lamp.cycle && 'sr-rgb-stop'" />
          <stop offset=".5" :stop-color="lamp.dodge || lamp.pool[1]" stop-opacity=".25" :class="lamp.cycle && 'sr-rgb-stop'" />
          <stop offset="1" :stop-color="lamp.dodge || lamp.pool[1]" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sr-lit)" :opacity="Math.min(1, lampOn) * (lamp.dodgeK ?? 1)" />
    </svg>
    <!-- 4. light: lamp pool, light from the window, glowing things -->
    <svg class="sr-layer sr-glow" :viewBox="vb" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="sr-pool" cx="900" cy="500" r="500" gradientUnits="userSpaceOnUse">
          <stop offset="0" :stop-color="lamp.pool[0]" :stop-opacity="lamp.haze ?? 0.42" :class="lamp.cycle && 'sr-rgb-stop'" />
          <stop offset=".45" :stop-color="lamp.pool[1]" :stop-opacity="(lamp.haze ?? 0.42) * 0.36" :class="lamp.cycle && 'sr-rgb-stop'" />
          <stop offset="1" :stop-color="lamp.pool[1]" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="sr-bulb">
          <stop offset="0" :stop-color="lamp.bulb[0]" stop-opacity=".9" />
          <stop offset="1" :stop-color="lamp.bulb[1]" stop-opacity="0" :class="lamp.cycle && 'sr-rgb-stop'" />
        </radialGradient>
        <linearGradient id="sr-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" :stop-color="light.sun || '#9fb4ff'" stop-opacity=".5" />
          <stop offset="1" :stop-color="light.sun || '#9fb4ff'" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g :opacity="lampOn">
        <rect x="0" y="0" width="1600" height="900" fill="url(#sr-pool)" />
        <ellipse cx="1116" cy="252" rx="120" ry="60" fill="url(#sr-bulb)" />
        <ellipse cx="1116" cy="248" rx="46" ry="6" :fill="lamp.core" />
      </g>
      <path :d="`M${GLASS.x} ${GLASS.y + 20} H${GLASS.x + GLASS.w} L1120 900 H700Z`" fill="url(#sr-shaft)" :opacity="light.sun ? 0.3 : 0" />
      <g v-for="it in glowing" :key="'g' + it.id" :transform="tx(it)" v-html="it.meta.glow" />
      <g v-if="ghost && ghost.meta.glow" :transform="tx(ghost)" v-html="ghost.meta.glow" />
    </svg>

    <!-- 5. handles: tap for a badge's name, drag in decorate mode -->
    <svg ref="handles" class="sr-layer" :viewBox="vb" preserveAspectRatio="xMidYMid meet">
      <g v-for="it in placedItems" :key="'h' + it.id" :class="editable ? 'sr-handle' : ''">
        <rect
          v-if="editable || it.meta.badge"
          :x="it.x - it.meta.w / 2 - (editable ? hitPad(it).x : 0)"
          :y="it.y - it.meta.h - (editable ? hitPad(it).y : 0)"
          :width="it.meta.w + (editable ? hitPad(it).x * 2 : 0)"
          :height="it.meta.h + (editable ? hitPad(it).y * 2 : 0)"
          :rx="8"
          fill="transparent"
          :stroke="editable ? '#fff' : 'none'"
          stroke-width="2"
          stroke-dasharray="6 5"
          :opacity="drag.id === it.id ? 0 : 1"
          class="sr-hit"
          :style="{ cursor: editable ? 'grab' : 'help' }"
          @pointerdown="grabPlaced(it, $event)"
        >
          <title>{{ it.meta.name }}</title>
        </rect>
        <g
          v-if="editable && drag.id !== it.id"
          class="sr-hit"
          style="cursor: pointer"
          role="button"
          :aria-label="`Put ${it.meta.name} back in the tray`"
          @pointerdown.stop.prevent="removeItem(it.id)"
        >
          <circle :cx="it.x + it.meta.w / 2" :cy="it.y - it.meta.h" r="13" fill="#1d1830" stroke="#fff" stroke-width="2" />
          <path
            :d="`M${it.x + it.meta.w / 2 - 5} ${it.y - it.meta.h - 5} l10 10 m0 -10 l-10 10`"
            stroke="#fff"
            stroke-width="2.4"
            stroke-linecap="round"
          />
        </g>
      </g>
      <rect
        v-if="picked"
        :x="picked.x - picked.meta.w / 2 - 5"
        :y="picked.y - picked.meta.h - 5"
        :width="picked.meta.w + 10"
        :height="picked.meta.h + 10"
        rx="10"
        fill="none"
        stroke="#ffe08a"
        stroke-width="3"
        pointer-events="none"
      />
      <rect
        v-if="ghost"
        :x="ghost.x - ghost.meta.w / 2 - 4"
        :y="ghost.y - ghost.meta.h - 4"
        :width="ghost.meta.w + 8"
        :height="ghost.meta.h + 8"
        rx="10"
        fill="none"
        stroke="#ffe08a"
        stroke-width="2.5"
        stroke-dasharray="7 5"
      />
    </svg>

    <!-- move and put away buttons for the selected item -->
    <div
      v-if="tools"
      class="sr-tools absolute z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/15 bg-[#1d1830]/95 p-1 text-white shadow-lg"
      :class="tools.above ? '-translate-y-full' : ''"
      :style="{ left: tools.left + 'px', top: tools.top + 'px' }"
      role="toolbar"
      :aria-label="`Move ${picked.meta.name}`"
    >
      <button class="sr-tool" aria-label="Move left" title="Move left (arrow key)" @click="move(-STEP, 0)">
        <Icon name="chevronLeft" :size="18" />
      </button>
      <template v-if="tools.upDown">
        <button class="sr-tool" aria-label="Move up" title="Move up (arrow key)" @click="move(0, -STEP)">
          <Icon name="chevronUp" :size="18" />
        </button>
        <button class="sr-tool" aria-label="Move down" title="Move down (arrow key)" @click="move(0, STEP)">
          <Icon name="chevronDown" :size="18" />
        </button>
      </template>
      <button class="sr-tool" aria-label="Move right" title="Move right (arrow key)" @click="move(STEP, 0)">
        <Icon name="chevronRight" :size="18" />
      </button>
      <span class="mx-0.5 h-5 w-px bg-white/20" />
      <button
        class="sr-tool"
        :aria-label="`Put ${picked.meta.name} back in the tray`"
        title="Put away (Delete)"
        @click="removeItem(picked.id)"
      >
        <Icon name="trash" :size="16" />
      </button>
      <button class="sr-tool" aria-label="Done moving" title="Done" @click="selection.id = null"><Icon name="check" :size="17" /></button>
    </div>

    <div
      v-if="tip"
      class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-full bg-[#1d1830]/90 px-3 py-1 text-xs font-bold whitespace-nowrap text-white shadow-lg"
      :style="{ left: tip.x + 'px', top: tip.y - 10 + 'px' }"
    >
      {{ tip.name }}
    </div>
  </div>
</template>

<style>
/* Shared by the room drawings in art.js (inserted as markup, so these are not scoped). */
@layer base {
  /* in a layer so a position utility passed by the parent wins */
  .sr-room {
    position: relative;
  }
}
.sr-room .sr-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.sr-room .sr-hit {
  pointer-events: all;
  touch-action: none;
}
/* while decorating a finger drags items (or pans the room, see panStart), never the page */
.sr-room.sr-editing {
  touch-action: none;
}
.sr-room .sr-tool {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
}
.sr-room .sr-tool:hover {
  background: rgb(255 255 255 / 0.12);
}
.sr-room .sr-lit {
  transition: filter 1.2s ease;
}
.sr-room .sr-tint {
  transition: background 1.2s ease;
  mix-blend-mode: multiply;
}
.sr-room .sr-tint::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 52% 55%, transparent 55%, rgba(10, 6, 20, 0.35) 100%);
}
.sr-room .sr-glow {
  mix-blend-mode: screen;
}
.sr-room .sr-dodge {
  mix-blend-mode: color-dodge;
}
.sr-room.sr-contain .sr-tint::after {
  display: none;
}
.sr-handle .sr-hit:hover rect,
.sr-handle rect.sr-hit:hover {
  stroke: #ffe08a;
}
.sr-rain {
  animation: sr-rain 0.6s linear infinite;
}
@keyframes sr-rain {
  from {
    transform: translate(40px, -330px);
  }
  to {
    transform: translate(-30px, 330px);
  }
}
.sr-snow,
.sr-petals {
  animation: sr-fall 8s linear infinite;
}
@keyframes sr-fall {
  from {
    transform: translate(-20px, -320px);
  }
  50% {
    transform: translate(20px, 0);
  }
  to {
    transform: translate(-20px, 320px);
  }
}
.sr-fireflies {
  animation: sr-blink 3s ease-in-out infinite;
}
@keyframes sr-blink {
  50% {
    opacity: 0.15;
    transform: translate(8px, -6px);
  }
}
.sr-clock {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: sr-spin 3600s linear infinite;
}
@keyframes sr-spin {
  to {
    transform: rotate(360deg);
  }
}
.sr-steam {
  animation: sr-steam 3s ease-in-out infinite;
}
@keyframes sr-steam {
  0%,
  100% {
    opacity: 0.15;
    transform: translateY(2px);
  }
  50% {
    opacity: 0.6;
    transform: translateY(-2px);
  }
}
.sr-breathe {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: sr-breathe 4s ease-in-out infinite;
}
@keyframes sr-breathe {
  50% {
    transform: scaleY(1.035);
  }
}
.sr-twinkle {
  animation: sr-twinkle 3.5s ease-in-out infinite;
}
@keyframes sr-twinkle {
  50% {
    opacity: 0.45;
  }
}
.sr-flame {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: sr-flame 1.6s ease-in-out infinite;
}
@keyframes sr-flame {
  50% {
    transform: scale(0.9, 1.08) rotate(3deg);
  }
}
.sr-fish {
  animation: sr-fish 6s ease-in-out infinite;
}
@keyframes sr-fish {
  50% {
    transform: translate(-16px, 3px);
  }
}
.sr-lava {
  animation: sr-lava 9s ease-in-out infinite;
}
.sr-lava2 {
  animation: sr-lava 11s ease-in-out infinite reverse;
}
@keyframes sr-lava {
  50% {
    transform: translateY(-18px);
  }
}
/* the slow RGB lamp and rainbow fairy lights */
.sr-rgb-stop {
  animation: sr-rgb-stop 30s linear infinite;
}
.sr-rgb-fill {
  animation: sr-rgb-fill 30s linear infinite;
}
@keyframes sr-rgb-stop {
  0%,
  100% {
    stop-color: #ff7aa8;
  }
  20% {
    stop-color: #ffb35c;
  }
  40% {
    stop-color: #7cf0a4;
  }
  60% {
    stop-color: #6fb0ff;
  }
  80% {
    stop-color: #b48cff;
  }
}
@keyframes sr-rgb-fill {
  0%,
  100% {
    fill: #ff9fc0;
  }
  20% {
    fill: #ffd08a;
  }
  40% {
    fill: #a6ffc2;
  }
  60% {
    fill: #9fd0ff;
  }
  80% {
    fill: #cdb2ff;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sr-rgb-stop,
  .sr-rgb-fill,
  .sr-rain,
  .sr-snow,
  .sr-petals,
  .sr-fireflies,
  .sr-clock,
  .sr-steam,
  .sr-breathe,
  .sr-twinkle,
  .sr-flame,
  .sr-fish,
  .sr-lava,
  .sr-lava2 {
    animation: none;
  }
}
</style>
