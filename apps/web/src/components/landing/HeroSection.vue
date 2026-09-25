<script setup>
// Hero: the headline, two buttons and the real app. The room screenshot sits in a browser frame
// with three live cards floating over it. The task card is the whole idea in miniature: tick the
// tasks (or wait, it demos itself) and the locked site on the right opens.
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Icon from '../Icon.vue'
import Arrow from './Arrow.vue'
import Scribble from './Scribble.vue'
import Shot from './Shot.vue'
import { useFrame, useInView, useMedia, REDUCED, clamp } from './motion.js'

defineProps({ started: { type: Boolean, default: false } })

const tasks = reactive([
  { id: 1, title: 'Chemistry homework', meta: 'due 6 pm', xp: 25, done: false },
  { id: 2, title: 'Read chapter 4', meta: 'History', xp: 15, done: false },
  { id: 3, title: 'Physics flashcards', meta: '20 cards', xp: 10, done: false },
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
onMounted(() => {
  if (!reduced.value) nextBeat()
})
onBeforeUnmount(stopDemo)

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

// a year of habit check ins for the little heatmap card, deterministic so it never flickers
const heat = (() => {
  let s = 11
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 18 * 7 }, (_, i) => {
    const recent = i > 18 * 7 - 26
    const v = rnd()
    return recent ? (v < 0.1 ? 1 : v < 0.45 ? 2 : 3) : v < 0.28 ? 0 : v < 0.55 ? 1 : v < 0.8 ? 2 : 3
  })
})()
</script>

<template>
  <section class="hero">
    <div class="glow" aria-hidden="true"></div>
    <div class="lp-wrap hero-copy">
      <a class="news" href="#/room">
        <span class="news-tag">New</span>
        <span>Decor you unlock by levelling up</span>
        <Icon name="chevronRight" :size="14" />
      </a>
      <h1 class="lp-h1 title">
        Your tasks
        <span class="mark">first.<Scribble :delay="500" /></span>
        <br />
        <span class="lp-italic then">Then the internet.</span>
      </h1>
      <p class="lp-lead sub">
        FocusGateway keeps distracting sites locked until today's work is done. You get a cozy lofi study room to do it in.
      </p>
      <div class="ctas">
        <RouterLink :to="started ? '/' : '/welcome'" class="lp-btn lp-btn-primary">
          {{ started ? 'Open your study room' : 'Start free, no account' }} <Arrow />
        </RouterLink>
        <RouterLink to="/room" class="lp-btn lp-btn-ghost"><Icon name="headphones" :size="18" /> Try the study room</RouterLink>
      </div>
      <p class="quiet">
        <span><Icon name="heart" :size="14" /> Free and open source</span>
        <span class="dot" aria-hidden="true"></span>
        <span><Icon name="globe" :size="14" /> Works in every browser</span>
        <span class="dot" aria-hidden="true"></span>
        <span><Icon name="shield" :size="14" /> Your data stays on your device</span>
      </p>
    </div>

    <div
      ref="stage"
      class="lp-wrap stage"
      :style="{ '--mx': tilt.x.toFixed(3), '--my': tilt.y.toFixed(3) }"
      @pointermove="onMove"
      @pointerleave="onLeave"
    >
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

      <!-- live task card -->
      <div class="float f-tasks">
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

      <!-- the site it unlocks -->
      <div class="float f-lock">
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

      <!-- a habit heatmap -->
      <div class="float f-heat" aria-hidden="true">
        <div class="lp-card fcard heat-card">
          <div class="card-head">
            <span class="card-title">📚 Read 10 pages</span>
            <span class="flame"><Icon name="flame" :size="13" /> 23</span>
          </div>
          <div class="heat">
            <i v-for="(v, i) in heat" :key="i" :class="'h' + v" :style="{ '--i': i }"></i>
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
.news {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px 5px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lp-surface) 80%, transparent);
  border: 1px solid var(--lp-line);
  font-size: 13.5px;
  font-weight: 550;
  color: var(--lp-ink-2);
  box-shadow: var(--lp-shadow-sm);
  backdrop-filter: blur(8px);
  transition: border-color 0.2s;
}
.news:hover {
  border-color: var(--lp-line-strong);
}
.news-tag {
  background: var(--lp-accent);
  color: var(--lp-on-accent);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12px;
  font-weight: 700;
}
.title {
  margin-top: 26px;
  max-width: 13ch;
}
.mark {
  position: relative;
  display: inline-block;
  z-index: 0;
}
.then {
  color: var(--lp-accent);
}
.sub {
  margin-top: 22px;
  max-width: 36rem;
}
.ctas {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
.quiet {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px 14px;
  font-size: 13.5px;
  color: var(--lp-muted);
}
.quiet > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.quiet .dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--lp-faint);
}

/* ------------------------------------------------ stage */
.stage {
  --mx: 0;
  --my: 0;
  --sy: 0;
  position: relative;
  margin-top: 64px;
  max-width: 1160px;
  perspective: 1400px;
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
  left: -8px;
  bottom: -48px;
  width: 300px;
  transform: translate3d(calc(var(--mx) * 14px), calc(var(--my) * 10px + var(--sy) * -70px), 0) rotate(-3deg);
}
.f-lock {
  right: -18px;
  bottom: 70px;
  width: 290px;
  transform: translate3d(calc(var(--mx) * 20px), calc(var(--my) * 14px + var(--sy) * -120px), 0) rotate(2deg);
}
.f-heat {
  right: 36px;
  top: -44px;
  width: 250px;
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

.heat-card {
  padding: 14px;
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
.heat {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 3px;
}
.heat i {
  aspect-ratio: 1;
  border-radius: 3px;
  background: var(--lp-heat-0);
  animation: cell 0.4s ease both;
  animation-delay: calc(600ms + var(--i) * 6ms);
}
.heat .h1 {
  background: var(--lp-heat-1);
}
.heat .h2 {
  background: var(--lp-heat-2);
}
.heat .h3 {
  background: var(--lp-heat-3);
}
@keyframes cell {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
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
  .f-heat {
    right: 12px;
    top: -30px;
    width: 210px;
  }
  .f-lock {
    right: 8px;
    bottom: -40px;
    width: 270px;
  }
  .f-tasks {
    left: 8px;
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
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    max-width: 340px;
  }
  .quiet .dot {
    display: none;
  }
  .quiet {
    flex-direction: column;
    gap: 6px;
  }
  .stage {
    margin-top: 44px;
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
  .f-heat {
    display: none;
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
