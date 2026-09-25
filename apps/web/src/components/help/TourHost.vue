<script setup>
// Draws the coach-mark tour from lib/tour.js: a dim overlay with a spotlight cut out around
// the step's element, an arrow pointing at it and a small card (title, text, step count,
// Back, Next, Skip). On phones the card docks to the bottom. Esc skips, arrow keys move.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { tour, nextStep, prevStep, endTour, stepTarget, autoTour, pageFor } from '../../lib/tour.js'
import { store } from '../../lib/store.js'

const route = useRoute()
const card = ref(null)
const nextBtn = ref(null)
const rect = ref(null)
const vw = ref(window.innerWidth)
const vh = ref(window.innerHeight)
const cardH = ref(180)
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const step = computed(() => (tour.id ? tour.steps[tour.index] : null))
const phone = computed(() => vw.value < 640)
const PAD = 6
const GAP = 16

// ---- where things go
// sticky bars at the top (the phone header and status strip) would cover the target
const inset = ref(0)
const spot = computed(() => {
  const r = rect.value
  if (!r) return null
  const top = r.pinned ? 4 : Math.max(4, inset.value + 2)
  // a very tall target (a long task list) is lit from its top, so the rest can dim
  const bottom = phone.value ? vh.value - cardH.value - 24 : vh.value - 4
  const l = Math.max(4, r.left - PAD)
  const t = Math.max(top, r.top - PAD)
  const w = Math.min(vw.value - 4, r.right + PAD) - l
  const h = Math.min(bottom, r.bottom + PAD, t + (phone.value ? Infinity : vh.value * 0.72)) - t
  return { left: l, top: t, width: Math.max(0, w), height: Math.max(0, h) }
})
const cardW = computed(() => Math.min(340, vw.value - 24))
const place = computed(() => {
  const s = spot.value
  if (!s || phone.value) return { docked: true }
  const below = vh.value - (s.top + s.height)
  const above = s.top
  const cx = s.left + s.width / 2
  let side
  if (below >= cardH.value + GAP + 8) side = 'below'
  else if (above >= cardH.value + GAP + 8) side = 'above'
  else if (vw.value - (s.left + s.width) >= cardW.value + GAP + 8) side = 'right'
  else if (s.left >= cardW.value + GAP + 8) side = 'left'
  else return { docked: true }
  let left, top
  if (side === 'below' || side === 'above') {
    left = Math.min(Math.max(12, cx - cardW.value / 2), vw.value - cardW.value - 12)
    top = side === 'below' ? s.top + s.height + GAP : s.top - GAP - cardH.value
  } else {
    left = side === 'right' ? s.left + s.width + GAP : s.left - GAP - cardW.value
    top = Math.min(Math.max(12, s.top + s.height / 2 - cardH.value / 2), vh.value - cardH.value - 12)
  }
  // the arrow points from the card at the middle of the target
  const arrow =
    side === 'below' || side === 'above'
      ? { left: Math.min(Math.max(18, cx - left), cardW.value - 18) }
      : { top: Math.min(Math.max(18, s.top + s.height / 2 - top), cardH.value - 18) }
  return { docked: false, side, left, top, arrow }
})

// ---- follow the target (windows move, pages scroll, layouts settle)
let raf = 0
function measure() {
  if (!step.value) return
  const el = stepTarget(step.value)
  if (!el) {
    rect.value = null
  } else {
    const r = el.getBoundingClientRect()
    rect.value = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, pinned: inset.value === 0 }
  }
  if (card.value) cardH.value = card.value.offsetHeight
  raf = requestAnimationFrame(measure)
}
/** Is the element inside a fixed or sticky bar (it never scrolls away)? */
function pinned(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const p = getComputedStyle(e).position
    if (p === 'fixed' || p === 'sticky') return true
  }
  return false
}
/** Bottom edge of the fixed and sticky bars stacked at the top of the screen. */
function topInset() {
  const bars = [...document.querySelectorAll('header, .sticky, .fixed')]
    .filter((e) => !e.closest('.tour-root') && ['fixed', 'sticky'].includes(getComputedStyle(e).position))
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width > vw.value * 0.5 && r.height > 0 && r.height < vh.value * 0.4)
    .sort((a, b) => a.top - b.top)
  let bottom = 0
  for (const r of bars) if (r.top <= bottom + 4) bottom = Math.max(bottom, r.bottom)
  return bottom
}
function bringIntoView() {
  const el = stepTarget(step.value)
  if (!el) return
  if (pinned(el)) {
    inset.value = 0
    return
  }
  inset.value = topInset()
  const r = el.getBoundingClientRect()
  const top = inset.value + 12
  const bottom = vh.value - (phone.value ? cardH.value + 28 : 16)
  const room = bottom - top
  if (r.top >= top && (r.bottom <= bottom || (r.height > room && r.top < top + room * 0.25))) return
  // fits: centre it in the free space. Too tall: bring its top in.
  const want = r.height <= room && !phone.value ? r.top - (top + (room - r.height) / 2) : r.top - top
  let scroller = el.parentElement
  while (
    scroller &&
    scroller !== document.body &&
    !(scroller.scrollHeight > scroller.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(scroller).overflowY))
  )
    scroller = scroller.parentElement
  const target = !scroller || scroller === document.body ? window : scroller
  // a long way (a phone with a long task list): jump, a smooth scroll would take seconds
  target.scrollBy({ top: want, behavior: reduced || Math.abs(want) > vh.value * 1.5 ? 'auto' : 'smooth' })
}

let restoreFocus = null
watch(
  () => [tour.id, tour.index],
  async () => {
    cancelAnimationFrame(raf)
    if (!tour.id) {
      rect.value = null
      restoreFocus?.focus?.()
      restoreFocus = null
      return
    }
    if (!restoreFocus) restoreFocus = document.activeElement
    await nextTick()
    bringIntoView()
    measure()
    nextBtn.value?.focus({ preventScroll: true })
  },
)

function onKey(e) {
  if (!tour.id) return
  if (e.key === 'Escape') {
    e.preventDefault()
    endTour()
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    nextStep()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    prevStep()
  } else if (e.key === 'Tab') {
    // keep focus inside the card
    const f = [...(card.value?.querySelectorAll('button') || [])]
    if (!f.length) return
    const i = f.indexOf(document.activeElement)
    e.preventDefault()
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus()
  }
  // the page underneath (room hotkeys, dialogs) should not react while the tour is up
  e.stopPropagation()
}
function onResize() {
  vw.value = window.innerWidth
  vh.value = window.innerHeight
  const el = step.value && stepTarget(step.value)
  if (el) inset.value = pinned(el) ? 0 : topInset()
}

// ---- first visit of a page: show its tour once
watch(
  () => [route.path, store.ready, store.state?.onboarding?.completed, store.pendingApproval],
  ([path, ready, onboarded, pending]) => {
    if (!ready || !onboarded || pending) return
    const id = pageFor(path)
    if (id && id !== 'install') autoTour(id, { delay: id === 'room' ? 1200 : 700 })
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="step" class="tour-root" data-tour-overlay>
      <!-- clicks outside the card do nothing, so the page can not change under the tour -->
      <div class="fixed inset-0" @click.stop />
      <div
        v-if="spot"
        class="tour-spot"
        :class="phone && 'tour-pulse'"
        :style="{ left: spot.left + 'px', top: spot.top + 'px', width: spot.width + 'px', height: spot.height + 'px' }"
      />
      <div v-else class="tour-dim" />

      <div
        ref="card"
        role="dialog"
        aria-modal="true"
        data-tour-card
        :aria-labelledby="'tour-title'"
        :aria-describedby="'tour-text'"
        class="tour-card"
        :class="place.docked ? 'tour-docked' : 'tour-' + place.side"
        :style="place.docked ? {} : { left: place.left + 'px', top: place.top + 'px', width: cardW + 'px' }"
      >
        <i
          v-if="!place.docked"
          class="tour-arrow"
          aria-hidden="true"
          :style="place.arrow.left != null ? { left: place.arrow.left + 'px' } : { top: place.arrow.top + 'px' }"
        />
        <p class="tour-count">{{ tour.index + 1 }} of {{ tour.steps.length }}</p>
        <h2 id="tour-title" class="tour-title">{{ step.title }}</h2>
        <p id="tour-text" class="tour-text">{{ step.text }}</p>
        <div class="tour-actions">
          <button type="button" class="tour-skip" @click="endTour">Skip tour</button>
          <span class="flex-1" />
          <button v-if="tour.index > 0" type="button" class="btn btn-sm" @click="prevStep">Back</button>
          <button ref="nextBtn" type="button" class="btn btn-sm btn-primary" @click="nextStep">
            {{ tour.index === tour.steps.length - 1 ? 'Done' : 'Next' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 90;
}
.tour-spot {
  position: fixed;
  border-radius: 16px;
  box-shadow:
    0 0 0 3px var(--fg-accent),
    0 0 0 200vmax rgb(9 7 22 / 0.62);
  pointer-events: none;
}
.tour-dim {
  position: fixed;
  inset: 0;
  background: rgb(9 7 22 / 0.62);
  pointer-events: none;
}
.tour-pulse::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 20px;
  border: 2px solid var(--fg-accent);
  animation: tour-pulse 1.6s ease-out infinite;
}
@keyframes tour-pulse {
  from {
    opacity: 0.9;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.06);
  }
}
.tour-card {
  position: fixed;
  z-index: 1;
  background: var(--fg-card);
  color: var(--fg-ink);
  border: 1px solid var(--fg-line);
  border-radius: 18px;
  padding: 16px 16px 12px;
  box-shadow: 0 18px 50px rgb(0 0 0 / 0.35);
  animation: tour-in 0.2s ease-out;
}
@keyframes tour-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
.tour-docked {
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  max-width: 440px;
  margin: 0 auto;
}
.tour-arrow {
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--fg-card);
  border: 1px solid var(--fg-line);
  transform: rotate(45deg);
}
.tour-below .tour-arrow {
  top: -9px;
  margin-left: -8px;
  border-right: 0;
  border-bottom: 0;
}
.tour-above .tour-arrow {
  bottom: -9px;
  margin-left: -8px;
  border-left: 0;
  border-top: 0;
}
.tour-right .tour-arrow {
  left: -9px;
  margin-top: -8px;
  border-right: 0;
  border-top: 0;
}
.tour-left .tour-arrow {
  right: -9px;
  margin-top: -8px;
  border-left: 0;
  border-bottom: 0;
}
.tour-count {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-accent);
}
.tour-title {
  margin-top: 2px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
}
.tour-text {
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--fg-muted);
}
.tour-actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tour-skip {
  font-size: 13px;
  color: var(--fg-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .tour-card {
    animation: none;
  }
  .tour-pulse::after {
    animation: none;
  }
}
</style>
