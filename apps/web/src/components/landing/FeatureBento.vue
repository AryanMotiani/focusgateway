<script setup>
// "Everything you need": an uneven bento grid. Most tiles hold a small live piece of the app
// that starts moving when it scrolls into view: the heatmap fills in, the streak counts up,
// the XP bar fills, habits tick themselves (and you can tick them too).
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import Icon from '../Icon.vue'
import Shot from './Shot.vue'
import { countTo, useInView, vReveal, vSplit } from './motion.js'

const grid = ref(null)
const seen = useInView(grid, { threshold: 0.15 })

// streak counter
const streak = ref(0)
// level bar
const xp = ref(0)
const xpPop = ref(0)
// habits
const habits = reactive([
  { name: 'Gym', emoji: '🏃', color: '#1fa971', done: false },
  { name: 'Read 10 pages', emoji: '📚', color: '#6a4df4', done: false },
  { name: 'Water', emoji: '💧', color: '#3aa0ff', done: false },
  { name: 'Sleep by 12', emoji: '🛏️', color: '#ff9a3d', done: false },
])
// scene crossfade in the room tile
const night = ref(true)

const timers = []
const later = (fn, ms) => timers.push(setTimeout(fn, ms))
let roomTimer = null
watch(seen, (v) => {
  if (!v) return
  countTo((v) => (streak.value = Math.round(v)), 0, 23, 1400)
  later(() => (xp.value = 0.62), 300)
  later(() => {
    xp.value = 0.8
    xpPop.value++
  }, 1900)
  habits.forEach((h, i) => i < 3 && later(() => (h.done = true), 700 + i * 450))
  roomTimer = setInterval(() => (night.value = !night.value), 3800)
})
onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  clearInterval(roomTimer)
})

// a year of days for the big heatmap, deterministic
const year = (() => {
  let s = 5
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 30 * 7 }, (_, i) => {
    const v = rnd()
    const ramp = i / (30 * 7)
    return v < 0.22 - ramp * 0.18 ? 0 : v < 0.5 ? 1 : v < 0.78 ? 2 : 3
  })
})()
</script>

<template>
  <section id="features" class="lp-section">
    <div class="lp-wrap">
      <div class="head">
        <span v-reveal class="lp-eyebrow">Features</span>
        <h2 v-split class="lp-h2">Everything you need to <span class="lp-italic">get it done.</span></h2>
        <p v-reveal="200" class="lp-lead">And nothing that turns productivity into another app to scroll.</p>
      </div>

      <div ref="grid" class="bento" :class="{ live: seen }">
        <!-- the study room -->
        <article v-reveal:clip class="tile t-room">
          <div class="room-pics">
            <Shot name="room-morning" alt="The study room in the morning" sizes="(max-width: 900px) 100vw, 760px" />
            <Shot
              name="room-night"
              alt="The same study room at night with rain"
              sizes="(max-width: 900px) 100vw, 760px"
              class="night"
              :class="{ show: night }"
            />
          </div>
          <div class="room-copy">
            <span class="pill"><Icon name="headphones" :size="14" /> Lofi study room</span>
            <h3 class="lp-h3">A room that feels like yours</h3>
            <p>Rain on the window or a sunny city, generative lofi and café noise. Decor unlocks as you level up.</p>
          </div>
        </article>

        <!-- streak -->
        <article v-reveal:right="120" class="tile t-streak">
          <div class="streak">
            <span class="flame-wrap"><Icon name="flame" :size="30" /></span>
            <span class="big">{{ streak }}</span>
          </div>
          <h3 class="t-title">Day streak</h3>
          <p class="t-text">Every task due, finished. A flame worth protecting.</p>
        </article>

        <!-- level -->
        <article v-reveal:right="220" class="tile t-level">
          <div class="lvl-row">
            <span class="lvl">LV 14</span>
            <span class="lvl-name">Scholar</span>
            <span :key="xpPop" class="xp-pop" :class="{ go: xpPop }">+25 XP</span>
          </div>
          <div class="xpbar"><span :style="{ transform: `scaleX(${xp})` }"></span></div>
          <p class="t-text">Tasks, habits and focus earn XP. Levels unlock scenes, music and decor.</p>
        </article>

        <!-- heatmap -->
        <article v-reveal:left class="tile t-heat">
          <div class="t-top">
            <h3 class="t-title">Habits with a year of memory</h3>
            <span class="bchip">82% this year</span>
          </div>
          <div class="year">
            <i v-for="(v, i) in year" :key="i" :class="'h' + v" :style="{ '--i': i }"></i>
          </div>
        </article>

        <!-- habit check -->
        <article v-reveal:right="100" class="tile t-habits">
          <h3 class="t-title">Tick them off</h3>
          <div class="habits">
            <button
              v-for="h in habits"
              :key="h.name"
              class="habit"
              :class="{ done: h.done }"
              :style="{ '--c': h.color }"
              :aria-pressed="h.done"
              @click="h.done = !h.done"
            >
              <span class="emoji" aria-hidden="true">{{ h.emoji }}</span>
              <span class="h-name">{{ h.name }}</span>
              <span class="h-check"><Icon name="check" :size="13" /></span>
            </button>
          </div>
        </article>

        <!-- gated windows -->
        <article v-reveal:scale class="tile t-gate">
          <span class="icon-bubble accent"><Icon name="unlock" :size="20" /></span>
          <h3 class="t-title">Task-gated windows</h3>
          <p class="t-text">Instagram from 4 to 7, once homework is ticked off. Not done? It stays shut.</p>
        </article>

        <!-- hard blocks -->
        <article v-reveal:scale="90" class="tile t-hard">
          <span class="icon-bubble night"><Icon name="moon" :size="20" /></span>
          <h3 class="t-title">Hard blocks</h3>
          <p class="t-text">Sleep, class, exam week. No tasks, no way around it. Just rest.</p>
        </article>

        <!-- music -->
        <article v-reveal:scale="180" class="tile t-music">
          <div class="eq" aria-hidden="true"><i v-for="b in 9" :key="b" :style="{ '--b': b }"></i></div>
          <h3 class="t-title">Music that never gets blocked</h3>
          <p class="t-text">Generative lofi, built in. Still playing when YouTube is off limits.</p>
        </article>

        <!-- accountability -->
        <article v-reveal class="tile t-stats">
          <h3 class="t-title">An honest mirror</h3>
          <ul class="bars">
            <li><span>Done on time</span><b style="--w: 0.86; --c: var(--lp-green)"></b></li>
            <li><span>Forwarded</span><b style="--w: 0.18; --c: var(--lp-warm)"></b></li>
            <li><span>Failsafe used</span><b style="--w: 0.04; --c: var(--lp-red)"></b></li>
          </ul>
          <p class="t-text">Every forward and override counted. Not a guilt machine.</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.head {
  text-align: center;
  max-width: 720px;
  margin-inline: auto;
}
.head .lp-h2 {
  margin-top: 14px;
}
.head .lp-lead {
  margin-top: 14px;
}

.bento {
  margin-top: 56px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: minmax(190px, auto);
  gap: 16px;
}
.tile {
  position: relative;
  border-radius: 26px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  padding: 24px;
  overflow: hidden;
  box-shadow: var(--lp-shadow-sm);
  display: flex;
  flex-direction: column;
  transition:
    box-shadow 0.3s,
    opacity 0.9s var(--lp-ease),
    transform 1.1s var(--lp-ease),
    clip-path 1.2s var(--lp-ease);
  transition-delay: 0s, var(--d, 0ms), var(--d, 0ms), var(--d, 0ms);
}
.tile.is-in:hover {
  box-shadow: var(--lp-shadow-md);
  transform: translateY(-4px);
  transition-duration: 0.3s;
  transition-delay: 0s;
}
.t-title {
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.01em;
}
.t-text {
  margin-top: 6px;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--lp-muted);
}

.t-room {
  grid-column: span 4;
  grid-row: span 2;
  padding: 0;
  background: #120f24;
  border-color: transparent;
  color: #fff;
  min-height: 420px;
}
.room-pics {
  position: absolute;
  inset: 0;
}
.room-pics img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 30%;
}
.room-pics .night {
  opacity: 0;
  transition: opacity 1.4s ease;
}
.room-pics .night.show {
  opacity: 1;
}
.room-copy {
  position: relative;
  margin-top: auto;
  padding: 28px;
  padding-top: 140px;
  background: linear-gradient(180deg, transparent, rgba(12, 9, 26, 0.75) 35%, rgba(12, 9, 26, 0.96) 70%);
}
.room-copy .lp-h3 {
  margin-top: 10px;
  font-size: 1.8rem;
}
.room-copy p {
  margin-top: 6px;
  max-width: 34rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.55;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 650;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
}

.t-streak,
.t-level {
  grid-column: span 2;
}
.streak {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: auto;
}
.flame-wrap {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: var(--lp-warm-soft);
  color: var(--lp-warm);
}
.live .flame-wrap svg {
  animation: flicker 1.6s ease-in-out infinite;
  transform-origin: 50% 90%;
}
@keyframes flicker {
  0%,
  100% {
    transform: scale(1) rotate(0);
  }
  30% {
    transform: scale(1.08, 0.95) rotate(-3deg);
  }
  60% {
    transform: scale(0.96, 1.06) rotate(2deg);
  }
}
.big {
  font-family: var(--lp-serif);
  font-size: 64px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}
.t-streak .t-title {
  margin-top: 14px;
}

.lvl-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}
.lvl {
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--lp-accent);
  color: var(--lp-on-accent);
  font-weight: 800;
  font-size: 14px;
}
.lvl-name {
  font-family: var(--lp-serif);
  font-size: 26px;
  font-weight: 600;
}
.xp-pop {
  position: absolute;
  right: 0;
  top: 4px;
  font-weight: 800;
  font-size: 14px;
  color: var(--lp-warm);
  opacity: 0;
}
.xp-pop.go {
  animation: xp 1.3s ease-out;
}
@keyframes xp {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  20% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}
.xpbar {
  margin-top: 18px;
  margin-bottom: auto;
  height: 14px;
  border-radius: 999px;
  background: var(--lp-surface-2);
  border: 1px solid var(--lp-line);
  overflow: hidden;
}
.xpbar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2));
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.t-level .t-text {
  margin-top: 14px;
}

.t-heat {
  grid-column: span 4;
}
.t-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bchip {
  font-size: 12.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--lp-accent-soft);
  color: var(--lp-accent);
  white-space: nowrap;
}
.year {
  margin-top: 18px;
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 4px;
}
.year i {
  aspect-ratio: 1;
  border-radius: 4px;
  background: var(--lp-heat-0);
  transition:
    background-color 0.4s ease,
    transform 0.4s ease;
  transition-delay: calc(var(--i) * 5ms);
  transform: scale(0.7);
}
.live .year i {
  transform: none;
}
.live .year .h1 {
  background: var(--lp-heat-1);
}
.live .year .h2 {
  background: var(--lp-heat-2);
}
.live .year .h3 {
  background: var(--lp-heat-3);
}

.t-habits {
  grid-column: span 2;
}
.habits {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}
.habit {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 14px;
  border: 2px solid var(--lp-line);
  text-align: left;
  font-weight: 650;
  font-size: 14px;
  cursor: pointer;
  transition:
    background 0.3s,
    border-color 0.3s,
    color 0.3s,
    transform 0.2s;
}
.habit:active {
  transform: scale(0.97);
}
.habit.done {
  background: var(--c);
  border-color: var(--c);
  color: #fff;
}
.h-name {
  flex: 1;
}
.h-check {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid var(--lp-line-strong);
  color: transparent;
  transition: all 0.3s;
}
.habit.done .h-check {
  border-color: #fff;
  background: #fff;
  color: var(--c);
}

.t-gate,
.t-hard,
.t-music {
  grid-column: span 2;
}
.icon-bubble {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  margin-bottom: auto;
}
.icon-bubble.accent {
  background: var(--lp-accent-soft);
  color: var(--lp-accent);
}
.icon-bubble.night {
  background: #1d1840;
  color: #ffd98a;
}
.t-gate .t-title,
.t-hard .t-title,
.t-music .t-title {
  margin-top: 18px;
}
.eq {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 46px;
  margin-bottom: auto;
}
.eq i {
  width: 7px;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--lp-accent-2), var(--lp-accent));
  transform-origin: bottom;
  transform: scaleY(0.3);
}
.live .eq i {
  animation: eq 1.1s ease-in-out infinite alternate;
  animation-delay: calc(var(--b) * -170ms);
}
@keyframes eq {
  0% {
    transform: scaleY(0.25);
  }
  50% {
    transform: scaleY(0.9);
  }
  100% {
    transform: scaleY(0.45);
  }
}

.t-stats {
  grid-column: span 6;
  display: grid;
  grid-template-columns: 1fr 1.4fr 1.2fr;
  align-items: center;
  gap: 24px;
  min-height: 0;
}
.t-stats .t-text {
  margin: 0;
}
.bars {
  display: grid;
  gap: 10px;
}
.bars li {
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  gap: 12px;
  font-size: 13.5px;
  color: var(--lp-muted);
}
.bars b {
  height: 10px;
  border-radius: 999px;
  background: var(--c);
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s;
  max-width: 100%;
}
.live .bars b {
  transform: scaleX(var(--w));
}

@media (max-width: 1000px) {
  .bento {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .t-room,
  .t-heat,
  .t-stats {
    grid-column: span 2;
  }
  .t-room {
    grid-row: auto;
    min-height: 380px;
  }
  .t-streak,
  .t-level,
  .t-habits,
  .t-gate,
  .t-hard,
  .t-music {
    grid-column: span 1;
  }
  .t-stats {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
@media (max-width: 600px) {
  .bento {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .tile {
    grid-column: span 1 !important;
  }
  .t-room {
    min-height: 340px;
  }
  .year {
    gap: 2px;
  }
  .year i {
    border-radius: 2px;
  }
  .year i:nth-child(-n + 70) {
    display: none;
  }
}
</style>
