<script setup>
// One study room window: a slim title bar (drag to move, double click to maximize), minimize
// and maximize buttons, and resize handles on every edge and corner. The layout itself lives
// in lib/windows.js. On phones (stacked) windows sit in a column: no dragging, but they
// still collapse to the dock and open full screen.
// tip: a one-time tip (RoomTip.vue) shown under or over the window, or in line on phones.
import { computed } from 'vue'
import RoomIcon from './RoomIcon.vue'
import RoomTip from './RoomTip.vue'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  icon: { type: String, default: 'layout' },
  ctl: { type: Object, required: true },
  stacked: Boolean,
  pad: { type: Boolean, default: true },
  tip: String,
})
const emit = defineEmits(['tip-done'])
const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
const win = computed(() => props.ctl.wm.wins[props.id])
const rect = computed(() => props.ctl.rectOf(props.id))
const isTop = computed(() => win.value && win.value.z === props.ctl.wm.top - 1)
const moving = computed(() => props.ctl.wm.moving === props.id)
const style = computed(() => {
  if (props.stacked) return win.value?.max ? {} : null
  const r = rect.value
  return r ? { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 10 + win.value.z } : null
})
// what the content gets to lay itself out: the inner size of the window
const size = computed(() => {
  const r = rect.value
  if (props.stacked) return { w: props.ctl.wm.vw - 24, h: win.value?.max ? props.ctl.wm.vh - 44 : 0, max: !!win.value?.max }
  return { w: r.w, h: r.h - 34, max: !!win.value?.max }
})

// the tip goes where there is room: under the window, over it, or inside at the top
const TIP_H = 140
const HEADER_H = 96
const tipSide = computed(() => {
  if (props.stacked) return 'inline'
  const r = rect.value
  if (!r || win.value?.max) return 'inside'
  if (props.ctl.wm.vh - (r.y + r.h) >= TIP_H) return 'below'
  // above only when it clears the room header bar, otherwise the header buttons would cover it
  if (r.y - HEADER_H >= TIP_H) return 'above'
  return 'inside'
})

function onBarDown(e) {
  if (props.stacked || e.target.closest('button, a, input, select')) return
  props.ctl.startDrag(props.id, e)
}
function onBarKey(e) {
  if (e.target !== e.currentTarget) return
  const d = e.altKey ? 1 : 16
  const map = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }
  if (map[e.key] && !props.stacked) {
    e.preventDefault()
    props.ctl.nudge(props.id, ...map[e.key], e.shiftKey)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    props.ctl.toggleMax(props.id)
  }
}
</script>

<template>
  <section
    v-if="win"
    v-show="!win.min"
    :data-window="id"
    class="rw room-glass"
    :class="{ 'rw-free': !stacked, 'rw-stacked': stacked, 'rw-max': win.max, 'rw-top': isTop, 'rw-moving': moving }"
    :style="style"
    :aria-label="title"
    role="region"
    @pointerdown.capture="!stacked && ctl.focus(id)"
  >
    <header
      class="rw-bar"
      :tabindex="stacked ? -1 : 0"
      :title="stacked ? '' : 'Drag to move. Double click to maximize.'"
      :aria-label="stacked ? title : `${title}. Arrow keys move the window, shift and arrow keys resize it, Enter maximizes.`"
      @pointerdown="onBarDown"
      @dblclick="!$event.target.closest('button') && ctl.toggleMax(id)"
      @keydown="onBarKey"
    >
      <RoomIcon :name="icon" :size="14" class="rw-icon" />
      <span class="rw-title room-title">{{ title }}</span>
      <span class="rw-extra"><slot name="bar" v-bind="size" /></span>
      <button
        class="rw-btn"
        :aria-label="`Minimize ${title}`"
        :title="stacked ? 'Collapse to the dock' : 'Minimize'"
        @click="ctl.minimize(id)"
      >
        <RoomIcon name="minimize" :size="14" />
      </button>
      <button
        class="rw-btn"
        :aria-label="win.max ? `Restore ${title}` : `Maximize ${title}`"
        :title="win.max ? 'Restore (Esc)' : stacked ? 'Full screen' : 'Maximize'"
        @click="ctl.toggleMax(id)"
      >
        <RoomIcon :name="win.max ? 'restoreWin' : 'maximizeWin'" :size="13" />
      </button>
    </header>
    <RoomTip v-if="tip && !win.min" :text="tip" :name="title" :side="tipSide" @done="emit('tip-done')" />
    <div class="rw-body" :class="pad && 'rw-pad'"><slot v-bind="size" /></div>
    <template v-if="!stacked && !win.max">
      <div
        v-for="d in DIRS"
        :key="d"
        class="rw-h"
        :class="'rw-h-' + d"
        :data-resize="d"
        aria-hidden="true"
        @pointerdown="ctl.startResize(id, d, $event)"
      />
    </template>
  </section>
</template>

<style>
/* while dragging or resizing, the cursor stays put and text is not selected */
html.fg-wm-busy,
html.fg-wm-busy * {
  user-select: none !important;
}
html[data-wm-cursor] * {
  cursor: grabbing !important;
}
html[data-wm-cursor='n-resize'] *,
html[data-wm-cursor='s-resize'] * {
  cursor: ns-resize !important;
}
html[data-wm-cursor='e-resize'] *,
html[data-wm-cursor='w-resize'] * {
  cursor: ew-resize !important;
}
html[data-wm-cursor='ne-resize'] *,
html[data-wm-cursor='sw-resize'] * {
  cursor: nesw-resize !important;
}
html[data-wm-cursor='nw-resize'] *,
html[data-wm-cursor='se-resize'] * {
  cursor: nwse-resize !important;
}
</style>

<style scoped>
/* The glass: each theme draws it its own way through the --fg-room-* tokens in style.css.
   Always opaque enough to read over any scene. */
.rw {
  display: flex;
  flex-direction: column;
  border-radius: var(--fg-room-radius);
  border-bottom-width: calc(var(--fg-room-border-w) + var(--fg-room-edge));
  border-bottom-color: var(--fg-room-edge-color);
}
.rw-free {
  position: absolute;
  pointer-events: auto;
  transition:
    left 0.18s ease,
    top 0.18s ease,
    width 0.18s ease,
    height 0.18s ease,
    border-color 0.15s;
}
.rw-free.rw-moving {
  transition: none;
  outline: 2px solid color-mix(in srgb, var(--fg-accent) 55%, transparent);
  outline-offset: 2px;
}
.rw-stacked {
  position: relative;
}
.rw-stacked.rw-max {
  position: fixed;
  inset: 0;
  z-index: 60;
  border-radius: 0;
  border: 0;
  background-color: var(--fg-room-base);
  padding-bottom: env(safe-area-inset-bottom);
}
.rw-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  flex: none;
  padding: 0 5px 0 12px;
  background: var(--fg-room-bar);
  border-bottom: var(--fg-room-bar-w) var(--fg-room-bar-style) var(--fg-room-bar-line);
  /* the inner corner (a wobbly Storybook radius makes this invalid, then the bar is square
     and see-through anyway) */
  border-radius: calc(var(--fg-room-radius) - var(--fg-room-border-w)) calc(var(--fg-room-radius) - var(--fg-room-border-w)) 0 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
.rw-stacked.rw-max .rw-bar {
  border-radius: 0;
}
.rw-stacked .rw-bar {
  cursor: default;
}
.rw-bar:focus-visible {
  box-shadow: inset 0 0 0 2px var(--fg-accent);
}
.rw-icon {
  color: var(--fg-room-muted);
}
.rw-title {
  line-height: 1;
  color: var(--fg-room-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rw-top .rw-title {
  color: var(--fg-room-ink);
}
.rw-top .rw-icon {
  color: var(--fg-accent);
}
.rw-extra {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
.rw-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--fg-room-btn-radius);
  color: var(--fg-room-muted);
  cursor: pointer;
}
.rw-btn:hover {
  color: var(--fg-room-ink);
  background: var(--fg-room-hover);
}
.rw-btn:focus-visible,
.rw :deep(:focus-visible) {
  outline: 2px solid var(--fg-accent);
  outline-offset: 1px;
}
.rw-body {
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--fg-room-ink) 25%, transparent) transparent;
}
.rw-pad {
  padding: 12px 14px 14px;
}
.rw-stacked.rw-max .rw-body {
  overflow: auto;
}
/* resize handles sit on the border, a little outside, so they are easy to grab */
.rw-h {
  position: absolute;
  z-index: 2;
  touch-action: none;
}
.rw-h-n,
.rw-h-s {
  left: 10px;
  right: 10px;
  height: 8px;
  cursor: ns-resize;
}
.rw-h-n {
  top: -4px;
}
.rw-h-s {
  bottom: -4px;
}
.rw-h-e,
.rw-h-w {
  top: 10px;
  bottom: 10px;
  width: 8px;
  cursor: ew-resize;
}
.rw-h-e {
  right: -4px;
}
.rw-h-w {
  left: -4px;
}
.rw-h-ne,
.rw-h-nw,
.rw-h-se,
.rw-h-sw {
  width: 16px;
  height: 16px;
}
.rw-h-ne {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}
.rw-h-sw {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}
.rw-h-nw {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}
.rw-h-se {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}
/* a small grip in the bottom right corner shows the window can be resized */
.rw-h-se::after {
  content: '';
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid color-mix(in srgb, var(--fg-room-ink) 30%, transparent);
  border-bottom: 1.5px solid color-mix(in srgb, var(--fg-room-ink) 30%, transparent);
  border-bottom-right-radius: 3px;
}
.rw-h:hover::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--fg-accent) 55%, transparent);
}
.rw-h-se:hover::before,
.rw-h-ne:hover::before,
.rw-h-nw:hover::before,
.rw-h-sw:hover::before {
  inset: 5px;
  border-radius: 50%;
}
@media (prefers-reduced-motion: reduce) {
  .rw-free {
    transition: none;
  }
}
</style>
