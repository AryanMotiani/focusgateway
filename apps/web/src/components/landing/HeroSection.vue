<script setup>
// Hero: the headline, two buttons and the real app, nothing else. On load the words slide up
// out of their masks, the buttons follow and the pieces of the picture fly in from the sides.
// The room screenshot sits in a browser frame with three live cards over it. The task card is
// the whole idea in miniature: tick the tasks (or wait, it demos itself), the locked site opens
// and the XP and coins on the level card climb.
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Icon from '../Icon.vue'
import Arrow from './Arrow.vue'
import Coin from './Coin.vue'
import Scribble from './Scribble.vue'
import Shot from './Shot.vue'
import { useFrame, useInView, useMedia, useTween, vSplit, REDUCED, clamp } from './motion.js'

defineProps({ started: { type: Boolean, default: false } })

const tasks = reactive([
  { id: 1, title: 'Chemistry homework', meta: 'due 6 pm', xp: 25, coins: 10, done: false },
  { id: 2, title: 'Read chapter 4', meta: 'History', xp: 15, coins: 6, done: false },
  { id: 3, title: 'Physics flashcards', meta: '20 cards', xp: 10, coins: 4, done: false },
])
const left = computed(() => tasks.filter((t) => !t.done).length)
const open = computed(() => left.value === 0)
const pops = ref([])
let popId = 0

function toggle(t, byHand = true) {
  if (byHand) stopDemo()
  t.done = !t.done
  if (t.done) {
    const id = ++popId
    pops.value.push({ id, task: t.id, xp: t.xp })
    setTimeout(() => (pops.value = pops.value.filter((p) => p.id !== id)), 1100)
  }
}

// the level card: every finished task pays XP and coins, and focus time trickles XP in
const focusXp = ref(0)
const xpNow = computed(() => 262 + focusXp.value + tasks.reduce((n, t) => n + (t.done ? t.xp : 0), 0))
const coinsNow = computed(() => 148 + Math.floor(focusXp.value / 3) + tasks.reduce((n, t) => n + (t.done ? t.coins : 0), 0))
const xpShown = useTween(() => xpNow.value, 700)
const coinsShown = useTween(() => coinsNow.value, 700)

// ------------------------------------------------ the self playing demo
const stage = ref(null)
const visible = useInView(stage, { once: false, threshold: 0.35 })
const reduced = useMedia(REDUCED)
let timer = null
let demoing = true
function stopDemo() {
  demoing = false
  clearTimeout(timer)
}
function nextBeat() {
  if (!demoing) return
  const wait = open.value ? 3200 : tasks.every((t) => !t.done) ? 1800 : 1300
  timer = setTimeout(() => {
    if (!demoing) return
    if (!visible.value || document.hidden) return nextBeat()
    const next = tasks.find((t) => !t.done)
    if (next) toggle(next, false)
    else tasks.forEach((t) => (t.done = false))
    nextBeat()
  }, wait)
}
let trickle = null
onMounted(() => {
  if (reduced.value) return
  nextBeat()
  trickle = setInterval(() => {
    if (visible.value && !document.hidden && focusXp.value < 60) focusXp.value++
  }, 1400)
})
onBeforeUnmount(() => {
  stopDemo()
  clearInterval(trickle)
})

// ------------------------------------------------ parallax (mouse and scroll)
const tilt = reactive({ x: 0, y: 0 })
function onMove(e) {
  if (reduced.value || e.pointerType === 'touch') return
  const r = stage.value.getBoundingClientRect()
  tilt.x = clamp((e.clientX - r.left) / r.width, 0, 1) * 2 - 1
  tilt.y = clamp((e.clientY - r.top) / r.height, 0, 1) * 2 - 1
}
function onLeave() {
  tilt.x = 0
  tilt.y = 0
}
useFrame(() => {
  const el = stage.value
  if (!el || reduced.value) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--sy', clamp(-r.top / window.innerHeight, -1, 1.5).toFixed(3))
})
</script>

<template>
  <section class="hero">
    <div class="glow" aria-hidden="true"></div>
    <div class="lp-wrap hero-copy">
      <h1 v-split.now="60" class="lp-h1 title">
        Your tasks <span class="mark">first.<Scribble :delay="1050" /></span>
        <br />
        <span class="lp-italic then">Then the internet.</span>
      </h1>
      <div class="ctas">
        <RouterLink :to="started ? '/' : '/welcome'" class="lp-btn lp-btn-primary">
          {{ started ? 'Open your study room' : 'Start free, no account' }} <Arrow />
        </RouterLink>
        <RouterLink to="/room" class="lp-btn lp-btn-ghost"><Icon name="headphones" :size="18" /> Try the study room</RouterLink>
      </div>
    </div>

    <div
      ref="stage"
      class="lp-wrap stage"
      :style="{ '--mx': tilt.x.toFixed(3), '--my': tilt.y.toFixed(3) }"
      @pointermove="onMove"
      @pointerleave="onLeave"
    >
      <div class="frame-in">
        <div class="frame">
          <div class="chrome" aria-hidden="true">
            <i></i><i></i><i></i>
            <span class="url"><Icon name="lock" :size="11" /> focusgateway / study room</span>
          </div>
          <RouterLink to="/room" class="shot" aria-label="Open the study room">
            <Shot
              name="room-night"
              alt="The FocusGateway study room at night: a student at a desk, rain on the window, a lamp and a clock"
              eager
              sizes="(max-width: 1200px) 100vw, 1100px"
            />
          </RouterLink>
        </div>
      </div>

      <!-- live task card -->
      <div class="float f-tasks">
        <div class="enter e-left">
          <div class="lp-card fcard tasks-card">
            <div class="card-head">
              <span class="card-title">Tonight</span>
              <span class="count" :class="{ ok: open }">{{ open ? 'All done' : `${left} left` }}</span>
            </div>
            <ul>
              <li v-for="t in tasks" :key="t.id">
                <button class="task" :class="{ done: t.done }" :aria-pressed="t.done" @click="toggle(t)">
                  <span class="box"><Icon v-if="t.done" name="check" :size="13" /></span>
                  <span class="t-text">
                    <span class="t-title">{{ t.title }}</span>
                    <span class="t-meta">{{ t.meta }}</span>
                  </span>
                  <span class="xp">+{{ t.xp }} XP</span>
                  <TransitionGroup name="pop">
                    <span v-for="p in pops.filter((x) => x.task === t.id)" :key="p.id" class="pop">+{{ p.xp }} XP</span>
                  </TransitionGroup>
                </button>
              </li>
            </ul>
            <p class="hint">Tap a task</p>
          </div>
        </div>
      </div>

      <!-- the site it unlocks -->
      <div class="float f-lock">
        <div class="enter e-right">
          <div class="lp-card fcard lock-card" :class="{ open }" role="status" aria-live="polite">
            <span class="site" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="currentColor" stroke-width="2" />
                <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2" />
                <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
              </svg>
            </span>
            <span class="lock-text">
              <span class="lock-site">instagram.com</span>
              <Transition name="swap" mode="out-in">
                <span v-if="open" key="o" class="lock-state good">Open until 9 pm. Enjoy.</span>
                <span v-else key="c" class="lock-state">Opens after {{ left }} more {{ left === 1 ? 'task' : 'tasks' }}</span>
              </Transition>
            </span>
            <span class="padlock" aria-hidden="true"><Icon :name="open ? 'unlock' : 'lock'" :size="18" /></span>
          </div>
        </div>
      </div>

      <!-- level, XP and coins, climbing as the tasks get done -->
      <div class="float f-xp" aria-hidden="true">
        <div class="enter e-top">
          <div class="lp-card fcard xp-card">
            <div class="xp-top">
              <span class="lv">LV 14</span>
              <span class="lv-name">Scholar</span>
              <span class="coins"><Coin :size="17" /> {{ Math.round(coinsShown) }}</span>
            </div>
            <div class="xp-bar"><span :style="{ transform: `scaleX(${(xpShown / 400).toFixed(4)})` }"></span></div>
            <div class="xp-foot">
              <span class="xp-num">{{ Math.round(xpShown) }} / 400 XP</span>
              <span class="flame"><Icon name="flame" :size="12" /> 23</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding-top: 56px;
  padding-bottom: 40px;
  isolation: isolate;
}
.glow {
  position: absolute;
  inset: -120px 0 auto 0;
  height: 900px;
  z-index: -1;
  background:
    radial-gradient(40% 50% at 18% 30%, var(--lp-glow-1) 0%, transparent 70%),
    radial-gradient(35% 45% at 85% 20%, var(--lp-glow-2) 0%, transparent 70%),
    radial-gradient(40% 40% at 60% 70%, var(--lp-glow-3) 0%, transparent 70%);
  filter: saturate(1.1);
  opacity: 0.95;
}
.hero-copy {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.title {
  margin-top: 18px;
  max-width: 13ch;
  font-size: clamp(3rem, 8.2vw, 6.9rem);
}
/* the second line drops in from above while the first rises from below */
.then :deep(.lp-wi) {
  transform: translate3d(0, -108%, 0) rotate(-4deg);
  transform-origin: 100% 0;
}
.title.is-in .then :deep(.lp-wi) {
  transform: none;
}
.mark {
  position: relative;
  display: inline-block;
  z-index: 0;
}
.then {
  color: var(--lp-accent);
}
.ctas {
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
.ctas > * {
  animation: cta-in 0.9s var(--lp-ease) both;
  animation-delay: 560ms;
}
.ctas > * + * {
  animation-delay: 660ms;
}
@keyframes cta-in {
  from {
    opacity: 0;
    transform: translate3d(0, 26px, 0);
  }
}
/* ------------------------------------------------ stage */
.stage {
  --mx: 0;
  --my: 0;
  --sy: 0;
  position: relative;
  margin-top: 72px;
  max-width: 1160px;
}

/* ------------------------------------------------ entrance: the pieces fly in and settle */
.frame-in {
  perspective: 1400px;
  animation: frame-in 1.15s var(--lp-ease) 220ms both;
}
@keyframes frame-in {
  from {
    opacity: 0;
    transform: translate3d(0, 90px, 0) scale(0.94);
  }
}
.enter {
  animation: 0.95s var(--lp-spring) both;
}
.e-left {
  animation-name: from-left;
  animation-delay: 480ms;
}
.e-right {
  animation-name: from-right;
  animation-delay: 600ms;
}
.e-top {
  animation-name: from-top;
  animation-delay: 720ms;
}
@keyframes from-left {
  from {
    opacity: 0;
    transform: translate3d(-160px, 40px, 0) rotate(-9deg);
  }
  30% {
    opacity: 1;
  }
}
@keyframes from-right {
  from {
    opacity: 0;
    transform: translate3d(160px, 30px, 0) rotate(9deg);
  }
  30% {
    opacity: 1;
  }
}
@keyframes from-top {
  from {
    opacity: 0;
    transform: translate3d(60px, -80px, 0) rotate(8deg);
  }
  30% {
    opacity: 1;
  }
}
.frame {
  position: relative;
  border-radius: 22px;
  padding: 0;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-lg);
  overflow: hidden;
  transform: translate3d(calc(var(--mx) * -6px), calc(var(--sy) * -30px), 0) rotateX(calc(4deg - var(--sy) * 6deg));
  transform-origin: 50% 0%;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.chrome {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  padding: 0 16px;
  background: var(--lp-surface-2);
  border-bottom: 1px solid var(--lp-line);
}
.chrome i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--lp-line-strong);
}
.chrome i:first-child {
  background: #ff6b5f;
}
.chrome i:nth-child(2) {
  background: #ffbd2e;
}
.chrome i:nth-child(3) {
  background: #28c840;
}
.url {
  margin-inline: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 8px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  font-size: 12px;
  color: var(--lp-muted);
  transform: translateX(-20px);
}
.shot {
  display: block;
  aspect-ratio: 1280 / 800;
  background: #1a1530;
}
.shot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.float {
  position: absolute;
  z-index: 2;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.fcard {
  border-radius: 20px;
  box-shadow: var(--lp-shadow-lg);
  backdrop-filter: blur(12px);
}
.f-tasks {
  left: -28px;
  top: 118px;
  width: 300px;
  transform: translate3d(calc(var(--mx) * 14px), calc(var(--my) * 10px + var(--sy) * -70px), 0) rotate(-3deg);
}
.f-lock {
  right: -30px;
  top: 150px;
  width: 290px;
  transform: translate3d(calc(var(--mx) * 20px), calc(var(--my) * 14px + var(--sy) * -120px), 0) rotate(2deg);
}
.f-xp {
  right: 36px;
  top: -40px;
  width: 262px;
  transform: translate3d(calc(var(--mx) * 26px), calc(var(--my) * 18px + var(--sy) * -40px), 0) rotate(3.5deg);
}

.tasks-card {
  padding: 16px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.card-title {
  font-weight: 700;
  font-size: 14px;
}
.count {
  font-size: 12px;
  font-weight: 650;
  color: var(--lp-muted);
  background: var(--lp-surface-2);
  padding: 3px 9px;
  border-radius: 999px;
  transition:
    background 0.3s,
    color 0.3s;
}
.count.ok {
  background: var(--lp-green-soft);
  color: var(--lp-green);
}
.task {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 8px;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}
.task:hover {
  background: var(--lp-surface-2);
}
.box {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 7px;
  border: 2px solid var(--lp-line-strong);
  color: #fff;
  transition:
    background 0.25s,
    border-color 0.25s,
    transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.task.done .box {
  background: var(--lp-green);
  border-color: var(--lp-green);
  transform: scale(1.08);
}
.t-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.t-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--lp-ink);
  position: relative;
  width: fit-content;
  transition: color 0.3s;
}
.t-title::after {
  content: '';
  position: absolute;
  left: 0;
  top: 52%;
  height: 1.5px;
  width: 100%;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s ease;
}
.task.done .t-title {
  color: var(--lp-faint);
}
.task.done .t-title::after {
  transform: scaleX(1);
}
.t-meta {
  font-size: 12px;
  color: var(--lp-faint);
}
.xp {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--lp-warm);
}
.pop {
  position: absolute;
  right: 8px;
  top: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--lp-warm);
  pointer-events: none;
  animation: rise 1s ease-out forwards;
}
@keyframes rise {
  from {
    opacity: 1;
    transform: translateY(0) scale(0.9);
  }
  to {
    opacity: 0;
    transform: translateY(-34px) scale(1.15);
  }
}
.hint {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--lp-faint);
  text-align: center;
}

.lock-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  transition:
    border-color 0.4s,
    background 0.4s;
}
.site {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(135deg, #ffb13b, #ff3d6e 45%, #b23bd6);
  filter: grayscale(1) opacity(0.55);
  transition: filter 0.5s;
}
.lock-card.open .site {
  filter: none;
}
.lock-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.lock-site {
  font-weight: 700;
  font-size: 14px;
}
.lock-state {
  font-size: 12.5px;
  color: var(--lp-muted);
}
.lock-state.good {
  color: var(--lp-green);
  font-weight: 600;
}
.padlock {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--lp-red-soft);
  color: var(--lp-red);
  transition:
    background 0.4s,
    color 0.4s,
    transform 0.5s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.lock-card.open .padlock {
  background: var(--lp-green-soft);
  color: var(--lp-green);
  transform: rotate(-12deg) scale(1.1);
}
.lock-card.open {
  border-color: color-mix(in srgb, var(--lp-green) 45%, var(--lp-line));
}

.xp-card {
  padding: 14px 16px 12px;
}
.xp-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lv {
  padding: 4px 7px;
  border-radius: 6px;
  background: var(--lp-accent);
  color: var(--lp-on-accent);
  font-weight: 800;
  font-size: 11.5px;
  letter-spacing: 0.02em;
}
.lv-name {
  font-family: var(--lp-serif);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: -0.01em;
}
.coins {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 750;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.xp-bar {
  margin-top: 12px;
  height: 10px;
  border-radius: 999px;
  background: var(--lp-surface-2);
  border: 1px solid var(--lp-line);
  overflow: hidden;
}
.xp-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2), var(--lp-warm));
  transform-origin: left;
}
.xp-foot {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--lp-muted);
  font-variant-numeric: tabular-nums;
}
.flame {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 750;
  color: var(--lp-warm);
  background: var(--lp-warm-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.pop-leave-active {
  display: none;
}
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1000px) {
  .f-xp {
    right: 12px;
    top: -30px;
    width: 236px;
  }
  .f-lock {
    right: 8px;
    top: auto;
    bottom: -40px;
    width: 270px;
  }
  .f-tasks {
    left: 8px;
    top: auto;
    bottom: -90px;
    width: 280px;
  }
  .stage {
    margin-bottom: 70px;
  }
}
@media (max-width: 640px) {
  .hero {
    padding-top: 32px;
  }
  .title {
    margin-top: 20px;
  }
  .ctas {
    margin-top: 32px;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    max-width: 340px;
  }
  .stage {
    margin-top: 64px;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .frame {
    width: 100%;
    border-radius: 16px;
    transform: none;
  }
  .chrome {
    height: 30px;
    gap: 5px;
    padding: 0 10px;
  }
  .chrome i {
    width: 8px;
    height: 8px;
  }
  .url {
    display: none;
  }
  .float {
    position: relative;
    inset: auto;
    transform: none;
  }
  .f-xp {
    position: absolute;
    top: -34px;
    right: 14px;
    width: 206px;
    transform: rotate(2deg);
  }
  .xp-card {
    padding: 10px 12px;
  }
  .lv-name {
    font-size: 15px;
  }
  .f-tasks {
    width: min(100%, 330px);
    margin-top: -36px;
    transform: rotate(-1.5deg);
  }
  .f-lock {
    width: min(100%, 330px);
    margin-top: 14px;
    transform: rotate(1deg);
  }
}
</style>
