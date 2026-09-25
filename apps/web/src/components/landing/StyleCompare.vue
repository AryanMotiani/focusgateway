<script setup>
// Game or Calm: the same Today screen in both styles, one on top of the other. Drag the
// handle (or use the buttons, or the arrow keys) to wipe between them.
import { ref } from 'vue'
import Icon from '../Icon.vue'
import Shot from './Shot.vue'
import { vReveal } from './motion.js'

const split = ref(50)
const box = ref(null)
const dragging = ref(false)

function setFrom(e) {
  const r = box.value.getBoundingClientRect()
  split.value = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))
}
function down(e) {
  dragging.value = true
  box.value.setPointerCapture?.(e.pointerId)
  setFrom(e)
}
function move(e) {
  if (dragging.value) setFrom(e)
}
function up() {
  dragging.value = false
}
</script>

<template>
  <section class="lp-section">
    <div class="lp-wrap grid">
      <div v-reveal class="copy">
        <span class="lp-eyebrow">Two moods</span>
        <h2 class="lp-h2">Game or Calm. <span class="lp-italic">Same app.</span></h2>
        <p class="lp-lead">
          Some nights you want XP, levels and a streak flame. Some nights you want quiet. Switch any time in Settings, nothing is lost.
        </p>
        <div class="modes">
          <button class="mode" :class="{ on: split >= 60 }" @click="split = 100">
            <span class="m-icon game"><Icon name="sparkles" :size="18" /></span>
            <span><b>Game</b><small>XP, levels, badges, bold and bouncy</small></span>
          </button>
          <button class="mode" :class="{ on: split <= 40 }" @click="split = 0">
            <span class="m-icon calm"><Icon name="wave" :size="18" /></span>
            <span><b>Calm</b><small>Soft colours, serif type, no numbers shouting</small></span>
          </button>
        </div>
      </div>

      <div v-reveal="120" class="compare-wrap">
        <div
          ref="box"
          class="compare"
          :class="{ dragging }"
          :style="{ '--s': split + '%' }"
          @pointerdown="down"
          @pointermove="move"
          @pointerup="up"
          @pointercancel="up"
        >
          <Shot name="calm-today" alt="Today in the Calm style" sizes="(max-width: 900px) 100vw, 680px" class="calm" />
          <Shot name="today" alt="Today in the Game style" sizes="(max-width: 900px) 100vw, 680px" class="game" />
          <span class="wlabel l-game">Game</span>
          <span class="wlabel l-calm">Calm</span>
          <input
            v-model.number="split"
            class="range"
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label="Wipe between the Game and Calm styles"
          />
          <span class="handle" aria-hidden="true"><Icon name="chevronLeft" :size="14" /><Icon name="chevronRight" :size="14" /></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 64px;
  align-items: center;
}
.copy .lp-h2 {
  margin-top: 14px;
}
.copy .lp-lead {
  margin-top: 16px;
}
.modes {
  margin-top: 28px;
  display: grid;
  gap: 10px;
}
.mode {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--lp-line);
  background: var(--lp-surface);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}
.mode.on {
  border-color: var(--lp-accent);
  box-shadow: 0 0 0 3px var(--lp-accent-soft);
}
.mode b {
  display: block;
  font-size: 16px;
}
.mode small {
  color: var(--lp-muted);
  font-size: 13.5px;
}
.m-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 13px;
}
.m-icon.game {
  background: var(--lp-accent);
  color: var(--lp-on-accent);
}
.m-icon.calm {
  background: #efe6d8;
  color: #6b5a3e;
}

.compare {
  position: relative;
  aspect-ratio: 1280 / 800;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-lg);
  touch-action: pan-y;
  cursor: ew-resize;
  user-select: none;
  background: var(--lp-surface-2);
}
.compare img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.compare .game {
  clip-path: inset(0 calc(100% - var(--s)) 0 0);
}
@property --s {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 50%;
}
.compare {
  transition: --s 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.compare.dragging {
  transition: none;
}
.compare::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--s);
  width: 2px;
  margin-left: -1px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.handle {
  position: absolute;
  top: 50%;
  left: var(--s);
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
  color: #16122b;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  z-index: 2;
  pointer-events: none;
}
.range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}
.range:focus-visible ~ .handle {
  outline: 3px solid var(--lp-accent);
  outline-offset: 3px;
}
.wlabel {
  position: absolute;
  bottom: 14px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  background: rgba(18, 15, 36, 0.72);
  color: #fff;
  backdrop-filter: blur(8px);
  z-index: 1;
}
.l-game {
  left: 14px;
}
.l-calm {
  right: 14px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
  }
}
</style>
