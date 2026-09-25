<script setup>
// "Study. Earn. Build your room.": the reward loop, played out live in a little room. While you
// focus the XP bar climbs and coins trickle in, a finished task pays out, the streak adds a
// bonus and you level up. Then the shop opens, things get bought and appear in the room, and a
// badge pops. It plays while on screen. With reduced motion it shows the finished room.
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import Icon from '../Icon.vue'
import Coin from './Coin.vue'
import Shot from './Shot.vue'
import { useInView, useMedia, useTween, vReveal, vSplit, REDUCED } from './motion.js'

const STEPS = [
  {
    icon: 'clock',
    title: 'Focus, and watch it climb',
    text: 'Every focus minute and every finished task pays out XP and coins, live, while you work.',
  },
  { icon: 'flame', title: 'Streaks pay extra', text: 'Keep the flame alive and your rewards come with a bonus. Level up for new unlocks.' },
  {
    icon: 'sparkles',
    title: 'Spend it on your room',
    text: 'Plants, lamps, posters, wall colours, lights and whole themes in the shop. Badges for the milestones.',
  },
]
const ITEMS = [
  { id: 'lights', name: 'Fairy lights', kind: 'Lights', price: 80, color: '#ffcf6b' },
  { id: 'plant', name: 'Monstera', kind: 'Decor', price: 60, color: '#4cc27f' },
  { id: 'wall', name: 'Dusk walls', kind: 'Walls', price: 40, color: '#c7789f' },
]
const START = { coins: 162, xp: 0.64, level: 14, timer: 25 * 60 - 3 }

const coinsTarget = ref(START.coins)
const coins = useTween(() => coinsTarget.value, 650)
const xp = ref(START.xp)
const level = ref(START.level)
const timer = ref(START.timer)
const taskDone = ref(false)
const owned = reactive({ lights: false, plant: false, wall: false })
const shopOpen = ref(false)
const hot = ref('')
const badge = ref(false)
const levelUp = ref(false)
const flame = ref(0)
const floats = ref([])
const phase = ref(0)

const clock = computed(() => `${Math.floor(timer.value / 60)}:${String(timer.value % 60).padStart(2, '0')}`)

let floatId = 0
function float(text, kind = 'xp') {
  const id = ++floatId
  floats.value.push({ id, text, kind })
  setTimeout(() => (floats.value = floats.value.filter((f) => f.id !== id)), 1500)
}
function addXp(d) {
  xp.value += d
  if (xp.value >= 1) {
    xp.value -= 1
    level.value++
    levelUp.value = true
  }
}
function reset() {
  coinsTarget.value = START.coins
  xp.value = START.xp
  level.value = START.level
  timer.value = START.timer
  taskDone.value = false
  Object.assign(owned, { lights: false, plant: false, wall: false })
  shopOpen.value = false
  hot.value = ''
  badge.value = false
  levelUp.value = false
  phase.value = 0
}
function finished() {
  Object.assign(owned, { lights: true, plant: true, wall: true })
  coinsTarget.value = 30
  level.value = 15
  xp.value = 0.1
  taskDone.value = true
  badge.value = true
  phase.value = 2
}

// ------------------------------------------------ the loop
const stage = ref(null)
const visible = useInView(stage, { once: false, threshold: 0.3 })
const reduced = useMedia(REDUCED)
let gen = 0
const sleep = (ms, g) => new Promise((ok, stop) => setTimeout(() => (g === gen && !document.hidden ? ok() : stop()), ms))

async function play(g) {
  try {
    for (;;) {
      reset()
      await sleep(700, g)
      // focusing: the bar creeps up, a coin every few ticks
      for (let i = 0; i < 30; i++) {
        timer.value--
        addXp(0.006)
        if (i % 3 === 2) coinsTarget.value++
        await sleep(105, g)
      }
      // the task gets done
      taskDone.value = true
      addXp(0.12)
      coinsTarget.value += 10
      float('+25 XP')
      setTimeout(() => float('+10', 'coin'), 180)
      await sleep(1000, g)
      // streak bonus, and that tips it over into a level up
      phase.value = 1
      flame.value++
      coinsTarget.value += 8
      float('Streak bonus +8', 'coin')
      addXp(0.1)
      await sleep(1500, g)
      levelUp.value = false
      await sleep(300, g)
      // the shop
      phase.value = 2
      shopOpen.value = true
      await sleep(900, g)
      for (const item of ITEMS) {
        hot.value = item.id
        await sleep(650, g)
        owned[item.id] = true
        coinsTarget.value -= item.price
        float(`-${item.price}`, 'spend')
        await sleep(1050, g)
      }
      hot.value = ''
      await sleep(300, g)
      shopOpen.value = false
      await sleep(450, g)
      badge.value = true
      await sleep(2600, g)
      badge.value = false
      await sleep(1600, g)
    }
  } catch {
    // stopped: scrolled away or the tab was hidden
  }
}
watch(
  [visible, reduced],
  ([v, r]) => {
    gen++
    if (r) finished()
    else if (v) play(gen)
  },
  { immediate: true },
)
// a hidden tab stops the loop: pick it up again when the tab comes back
function onVisibility() {
  if (!document.hidden && visible.value && !reduced.value) {
    gen++
    play(gen)
  }
}
document.addEventListener('visibilitychange', onVisibility)
onBeforeUnmount(() => {
  gen++
  document.removeEventListener('visibilitychange', onVisibility)
})

const hasShop = ref(true)
</script>

<template>
  <section id="rewards" class="lp-section rewards">
    <div class="lp-wrap">
      <div class="head">
        <span v-reveal class="lp-eyebrow">The reward loop</span>
        <h2 v-split class="lp-h2 title">Study. Earn. <span class="lp-italic hl">Build your room.</span></h2>
        <p v-reveal="200" class="lp-lead">
          Focus time and finished tasks pay out XP and coins as you go. Spend them in the shop and your room grows with you.
        </p>
      </div>

      <div class="grid">
        <ol class="steps">
          <li v-for="(s, i) in STEPS" :key="s.title" v-reveal:left="i * 110" class="step" :class="{ on: phase === i }">
            <span class="s-icon"><Icon :name="s.icon" :size="19" /></span>
            <span class="s-body">
              <b>{{ s.title }}</b>
              <span>{{ s.text }}</span>
            </span>
          </li>
        </ol>

        <div v-reveal:tilt="120" class="stage-wrap">
          <div ref="stage" class="stage" :class="{ lit: owned.lights, dusk: owned.wall }" aria-hidden="true">
            <!-- the room -->
            <svg class="room" viewBox="0 0 480 360" preserveAspectRatio="xMidYMid slice">
              <rect class="wall" x="0" y="0" width="480" height="272" />
              <rect x="0" y="266" width="480" height="8" fill="#000" opacity="0.18" />
              <rect class="floor" x="0" y="272" width="480" height="88" />
              <ellipse cx="300" cy="322" rx="150" ry="18" fill="#000" opacity="0.14" />
              <!-- window -->
              <rect x="50" y="52" width="156" height="124" rx="6" fill="#1d2552" />
              <circle cx="168" cy="86" r="13" fill="#fdf1c4" />
              <circle cx="163" cy="82" r="13" fill="#1d2552" opacity="0.35" />
              <g fill="#fff" opacity="0.8">
                <circle cx="78" cy="78" r="1.4" />
                <circle cx="112" cy="68" r="1" />
                <circle cx="96" cy="120" r="1.2" />
                <circle cx="140" cy="132" r="1" />
                <circle cx="186" cy="140" r="1.3" />
              </g>
              <path d="M50 150h156v26H50z" fill="#141a3d" />
              <path d="M58 150l16-18 14 12 18-22 22 28M130 150l20-16 18 10 16-14 22 20" fill="#141a3d" />
              <rect x="50" y="52" width="156" height="124" rx="6" fill="none" stroke="#efe2cc" stroke-width="7" />
              <path d="M128 52v124M50 114h156" stroke="#efe2cc" stroke-width="5" />
              <rect x="40" y="176" width="176" height="9" rx="3" fill="#efe2cc" />
              <!-- shelf and books -->
              <rect x="276" y="104" width="138" height="7" rx="2" fill="#7a4e36" />
              <rect x="290" y="76" width="10" height="28" rx="1.5" fill="#e36b5b" />
              <rect x="302" y="80" width="9" height="24" rx="1.5" fill="#f2c14e" />
              <rect x="313" y="72" width="11" height="32" rx="1.5" fill="#6aa7e8" />
              <rect x="330" y="83" width="26" height="21" rx="2" fill="#efe2cc" opacity="0.9" />
              <circle cx="392" cy="93" r="10" fill="#8f7bff" opacity="0.9" />
              <!-- clock -->
              <circle cx="448" cy="112" r="17" fill="#efe2cc" stroke="#7a4e36" stroke-width="3" />
              <path d="M448 112v-9M448 112l6 4" stroke="#39325e" stroke-width="2.4" stroke-linecap="round" />
              <!-- rug -->
              <ellipse cx="330" cy="318" rx="136" ry="17" class="rug" />
              <!-- desk, lamp, books, mug -->
              <rect x="252" y="200" width="196" height="12" rx="3" fill="#8a5a3c" />
              <rect x="264" y="212" width="9" height="62" fill="#6d4630" />
              <rect x="427" y="212" width="9" height="62" fill="#6d4630" />
              <ellipse class="lamp-glow" cx="292" cy="196" rx="54" ry="14" fill="#ffd98a" />
              <path d="M276 200v-34l16-18" fill="none" stroke="#39325e" stroke-width="3.5" stroke-linecap="round" />
              <path d="M280 144l28 5-10 16z" fill="#f2c14e" />
              <rect x="398" y="186" width="30" height="7" rx="1.5" fill="#6aa7e8" />
              <rect x="401" y="179" width="26" height="7" rx="1.5" fill="#e36b5b" />
              <rect x="408" y="167" width="13" height="12" rx="2.5" fill="#f0e6d6" />
              <!-- the student, from behind -->
              <path d="M312 206c0-30 12-46 38-46s38 16 38 46z" fill="#4f9b6b" />
              <path d="M326 174c6 6 42 6 48 0" fill="none" stroke="#3f8558" stroke-width="3" />
              <rect x="343" y="150" width="14" height="14" rx="4" fill="#e8b48f" />
              <circle cx="350" cy="136" r="20" fill="#5b3a29" />
              <path d="M331 132c4-14 30-18 38 0" fill="#4a2e20" />
              <!-- chair -->
              <rect x="322" y="192" width="56" height="44" rx="10" fill="#d0645a" />
              <rect x="326" y="236" width="48" height="8" rx="3" fill="#a94b43" />
              <rect x="334" y="244" width="6" height="30" fill="#39325e" />
              <rect x="360" y="244" width="6" height="30" fill="#39325e" />
              <!-- bought: dusk walls get a soft stripe -->
              <g class="item stripes" :class="{ on: owned.wall }">
                <rect x="0" y="222" width="480" height="4" fill="#fff" opacity="0.12" />
                <rect x="0" y="230" width="480" height="2" fill="#fff" opacity="0.08" />
              </g>
              <!-- bought: fairy lights -->
              <g class="item lights" :class="{ on: owned.lights }">
                <path d="M8 26C90 60 170 60 240 34S400 16 472 40" fill="none" stroke="#2a2440" stroke-width="2" />
                <circle
                  v-for="(b, k) in 11"
                  :key="k"
                  class="bulb"
                  :cx="20 + k * 44"
                  :cy="[31, 42, 49, 49, 42, 33, 29, 28, 30, 34, 38][k]"
                  r="5"
                  :style="{ '--k': k }"
                />
              </g>
              <!-- bought: a monstera -->
              <g class="item plant" :class="{ on: owned.plant }">
                <path d="M204 330h40l-6 -40h-28z" fill="#c46a4a" />
                <rect x="206" y="286" width="36" height="7" rx="2" fill="#a9553a" />
                <g fill="#3fae6a">
                  <ellipse cx="208" cy="250" rx="16" ry="30" transform="rotate(-32 208 250)" />
                  <ellipse cx="240" cy="246" rx="16" ry="30" transform="rotate(30 240 246)" />
                </g>
                <g fill="#2f8f56">
                  <ellipse cx="224" cy="238" rx="15" ry="34" />
                  <ellipse cx="198" cy="276" rx="12" ry="20" transform="rotate(-60 198 276)" />
                  <ellipse cx="252" cy="274" rx="12" ry="20" transform="rotate(60 252 274)" />
                </g>
              </g>
            </svg>
            <div class="warm"></div>

            <!-- the HUD -->
            <div class="hud">
              <span class="lv">LV {{ level }}</span>
              <span class="bar"><span :style="{ transform: `scaleX(${xp.toFixed(4)})` }"></span></span>
              <span :key="flame" class="streak" :class="{ bump: flame }"><Icon name="flame" :size="13" /> 23</span>
              <span class="coins"><Coin :size="18" /> {{ Math.round(coins) }}</span>
            </div>
            <TransitionGroup name="fl" tag="div" class="floats">
              <span v-for="f in floats" :key="f.id" class="fl" :class="f.kind"><Coin v-if="f.kind !== 'xp'" :size="14" />{{ f.text }}</span>
            </TransitionGroup>

            <div class="focus" :class="{ done: taskDone }">
              <span class="t-ring">
                <svg viewBox="0 0 20 20" width="20" height="20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="2.4" />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    pathLength="100"
                    :stroke-dasharray="`${taskDone ? 100 : ((START.timer - timer) / 30) * 100} 100`"
                    transform="rotate(-90 10 10)"
                  />
                </svg>
              </span>
              <span v-if="!taskDone" class="f-text"
                ><b class="mono">{{ clock }}</b> Chemistry homework</span
              >
              <span v-else class="f-text"><Icon name="check" :size="13" /> Chemistry homework done</span>
            </div>

            <!-- the shop -->
            <Transition name="shop">
              <div v-if="shopOpen" class="shop">
                <div class="shop-head">
                  <b>Shop</b>
                  <span class="coins sm"><Coin :size="14" /> {{ Math.round(coins) }}</span>
                </div>
                <ul>
                  <li v-for="it in ITEMS" :key="it.id" :class="{ hot: hot === it.id, owned: owned[it.id] }">
                    <span class="swatch" :style="{ '--c': it.color }"></span>
                    <span class="it-text"
                      ><b>{{ it.name }}</b
                      ><small>{{ it.kind }}</small></span
                    >
                    <span class="buy">
                      <template v-if="owned[it.id]"><Icon name="check" :size="12" /> Owned</template>
                      <template v-else><Coin :size="13" /> {{ it.price }}</template>
                    </span>
                  </li>
                </ul>
              </div>
            </Transition>

            <Transition name="pop">
              <div v-if="levelUp" class="lvup">
                <small>Level up</small>
                <b>{{ level }}</b>
              </div>
            </Transition>
            <Transition name="pop">
              <div v-if="badge" class="badge">
                <span class="medal"><Icon name="sparkles" :size="20" /></span>
                <span><small>Badge unlocked</small><b>Room maker</b></span>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div class="shots">
        <figure v-reveal:left class="shot-card">
          <div class="pic">
            <Shot name="decorate" alt="Decorating the study room: dragging decor into place" sizes="(max-width: 800px) 100vw, 560px" />
          </div>
          <figcaption><b>Decorate</b> Drag what you own into place.</figcaption>
        </figure>
        <figure v-if="hasShop" v-reveal:right="120" class="shot-card">
          <div class="pic">
            <Shot
              name="shop"
              alt="The shop: decor, lights, walls and themes to buy with coins"
              sizes="(max-width: 800px) 100vw, 560px"
              @error="hasShop = false"
            />
          </div>
          <figcaption><b>Shop</b> Spend the coins you earned.</figcaption>
        </figure>
        <figure v-else v-reveal:right="120" class="shot-card">
          <div class="pic">
            <Shot name="room-morning" alt="A decorated study room in the morning" sizes="(max-width: 800px) 100vw, 560px" />
          </div>
          <figcaption><b>Your room</b> Morning, night, rain or sun. Yours.</figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rewards {
  position: relative;
  overflow: clip;
}
.head {
  text-align: center;
  max-width: 900px;
  margin-inline: auto;
}
.title {
  margin-top: 14px;
  font-size: clamp(2.6rem, 6.4vw, 5.6rem);
  line-height: 0.98;
}
.hl {
  color: var(--lp-accent);
}
.head .lp-lead {
  margin: 20px auto 0;
  max-width: 36rem;
}

.grid {
  margin-top: 64px;
  display: grid;
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
  gap: 56px;
  align-items: center;
}
.steps {
  display: grid;
  gap: 12px;
}
.step {
  display: flex;
  gap: 16px;
  padding: 18px 18px;
  border-radius: 18px;
  border: 1px solid transparent;
  transition:
    background-color 0.5s,
    border-color 0.5s,
    box-shadow 0.5s,
    opacity 0.9s var(--lp-ease),
    transform 1.1s var(--lp-ease);
  transition-delay: 0s, 0s, 0s, var(--d, 0ms), var(--d, 0ms);
}
.step.on {
  background: var(--lp-surface);
  border-color: var(--lp-line);
  box-shadow: var(--lp-shadow-md);
}
.s-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--lp-accent-soft);
  color: var(--lp-accent);
  transition:
    background-color 0.5s,
    color 0.5s;
}
.step.on .s-icon {
  background: var(--lp-accent);
  color: var(--lp-on-accent);
}
.s-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.s-body b {
  font-size: 17.5px;
  letter-spacing: -0.01em;
}
.s-body span {
  font-size: 15px;
  line-height: 1.55;
  color: var(--lp-muted);
}

/* ------------------------------------------------ the live room */
.stage-wrap {
  position: relative;
}
.stage-wrap::before {
  content: '';
  position: absolute;
  inset: -8% -6%;
  z-index: -1;
  background:
    radial-gradient(50% 50% at 70% 30%, var(--lp-glow-1), transparent 70%),
    radial-gradient(40% 40% at 20% 80%, var(--lp-glow-2), transparent 70%);
}
.stage {
  --wall: #3a3372;
  --floor: #251d44;
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 24px;
  overflow: hidden;
  background: #1a1533;
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-lg);
  isolation: isolate;
  font-size: 14px;
  color: var(--lp-ink);
}
.stage.dusk {
  --wall: #7a4468;
  --floor: #3a2140;
}
.room {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.wall {
  fill: var(--wall);
  transition: fill 1.2s ease;
}
.floor {
  fill: var(--floor);
  transition: fill 1.2s ease;
}
.screen {
  fill: #6a4df4;
  opacity: 0.85;
}
.lamp-glow {
  opacity: 0.2;
}
.rug {
  fill: #4b3f86;
  transition: fill 1.2s ease;
}
.dusk .rug {
  fill: #8c4f6e;
}
.warm {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(70% 45% at 50% 8%, rgba(255, 200, 110, 0.35), transparent 70%);
  opacity: 0;
  transition: opacity 1.2s ease;
}
.lit .warm {
  opacity: 1;
}
.item {
  opacity: 0;
  transform: translateY(18px) scale(0.6);
  transform-box: fill-box;
  transform-origin: 50% 100%;
  transition:
    opacity 0.4s ease,
    transform 0.8s var(--lp-spring);
}
.item.on {
  opacity: 1;
  transform: none;
}
.lights {
  transform-origin: 50% 0;
  transform: translateY(-20px) scale(1, 0.4);
}
.bulb {
  fill: #ffcf6b;
  animation: twinkle 1.6s ease-in-out infinite alternate;
  animation-delay: calc(var(--k) * -230ms);
}
.bulb:nth-child(3n) {
  fill: #ff9fb8;
}
.bulb:nth-child(3n + 1) {
  fill: #a8e6ff;
}
@keyframes twinkle {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

/* HUD over the room */
.hud {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 8px 8px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--lp-surface) 92%, transparent);
  box-shadow: var(--lp-shadow-md);
  backdrop-filter: blur(10px);
}
.lv {
  padding: 5px 8px;
  border-radius: 7px;
  background: var(--lp-accent);
  color: var(--lp-on-accent);
  font-weight: 800;
  font-size: 12px;
  white-space: nowrap;
}
.bar {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: var(--lp-surface-2);
  border: 1px solid var(--lp-line);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2), var(--lp-warm));
  transform-origin: left;
  transition: transform 0.3s ease;
}
.streak {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--lp-warm-soft);
  color: var(--lp-warm);
  font-weight: 750;
  font-size: 12px;
}
.streak.bump {
  animation: bump 0.6s var(--lp-spring);
}
@keyframes bump {
  40% {
    transform: scale(1.35);
  }
}
.coins {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  min-width: 4.2ch;
}
.coins.sm {
  font-size: 13px;
  min-width: 0;
}
.floats {
  position: absolute;
  top: 66px;
  left: 50%;
  translate: -50% 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}
.fl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 13px;
  background: var(--lp-surface);
  box-shadow: var(--lp-shadow-md);
  color: var(--lp-accent);
  animation: float-up 1.5s ease-out forwards;
}
.fl.coin {
  color: #c07a00;
}
.lp[data-theme='dark'] .fl.coin {
  color: #ffc94a;
}
.fl.spend {
  color: var(--lp-muted);
}
@keyframes float-up {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: none;
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-24px);
  }
}
.fl-leave-active {
  display: none;
}

.focus {
  position: absolute;
  left: 14px;
  bottom: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px 7px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lp-surface) 92%, transparent);
  box-shadow: var(--lp-shadow-md);
  font-size: 13px;
  color: var(--lp-ink-2);
  transition: background-color 0.4s;
}
.t-ring {
  display: grid;
  color: var(--lp-accent);
}
.focus.done .t-ring {
  color: var(--lp-green);
}
.f-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.focus.done .f-text {
  color: var(--lp-green);
  font-weight: 650;
}
.mono {
  font-family: var(--lp-mono);
  font-weight: 600;
  color: var(--lp-ink);
}

.shop {
  position: absolute;
  top: 70px;
  right: 14px;
  width: min(250px, 48%);
  padding: 12px;
  border-radius: 16px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-lg);
}
.shop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 8px;
  font-size: 14px;
}
.shop ul {
  display: grid;
  gap: 6px;
}
.shop li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px;
  border-radius: 11px;
  border: 1.5px solid transparent;
  transition:
    border-color 0.25s,
    background-color 0.25s,
    transform 0.25s var(--lp-spring);
}
.shop li.hot {
  border-color: var(--lp-accent);
  background: var(--lp-accent-soft);
  transform: scale(1.03);
}
.swatch {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 8px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.55), transparent 55%), var(--c);
}
.it-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.it-text b {
  font-size: 13px;
}
.it-text small {
  font-size: 11px;
  color: var(--lp-faint);
}
.buy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--lp-surface-2);
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}
.shop li.owned .buy {
  background: var(--lp-green-soft);
  color: var(--lp-green);
  animation: bump 0.5s var(--lp-spring);
}
.shop-enter-active,
.shop-leave-active {
  transition:
    opacity 0.45s var(--lp-ease),
    transform 0.6s var(--lp-spring);
}
.shop-enter-from,
.shop-leave-to {
  opacity: 0;
  transform: translate3d(40px, 0, 0) scale(0.94);
}

.lvup,
.badge {
  position: absolute;
  left: 50%;
  top: 44%;
  translate: -50% -50%;
  border-radius: 18px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-lg);
}
.lvup {
  padding: 14px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.lvup small {
  font-size: 11.5px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lp-accent);
}
.lvup b {
  font-family: var(--lp-serif);
  font-size: 44px;
  line-height: 1;
  letter-spacing: -0.03em;
}
.badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px 12px 12px;
  white-space: nowrap;
}
.badge small {
  display: block;
  font-size: 11.5px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lp-warm);
}
.badge b {
  font-size: 17px;
}
.medal {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #ffcf6b, #ff9a3d 50%, #e0567a);
  box-shadow: 0 6px 16px -6px #ff9a3d;
}
.pop-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.7s var(--lp-spring);
}
.pop-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.pop-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

/* ------------------------------------------------ screenshots */
.shots {
  margin-top: 72px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.pic {
  border-radius: 20px;
  overflow: hidden;
  aspect-ratio: 1280 / 800;
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-md);
  background: var(--lp-surface-2);
}
.pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.8s var(--lp-ease);
}
.shot-card:hover .pic img {
  transform: scale(1.03);
}
figcaption {
  margin-top: 14px;
  font-size: 15px;
  color: var(--lp-muted);
}
figcaption b {
  color: var(--lp-ink);
  margin-right: 6px;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
  }
}
@media (max-width: 640px) {
  .grid {
    margin-top: 44px;
  }
  .step {
    padding: 14px 12px;
  }
  .stage {
    aspect-ratio: 4 / 3.6;
    border-radius: 18px;
    font-size: 12px;
  }
  .hud {
    top: 10px;
    left: 10px;
    right: 10px;
    gap: 7px;
    padding: 6px 8px 6px 6px;
  }
  .streak {
    display: none;
  }
  .shop {
    top: 58px;
    right: 10px;
    width: 56%;
    padding: 8px;
  }
  .shop li {
    gap: 7px;
    padding: 5px;
  }
  .swatch {
    width: 24px;
    height: 24px;
  }
  .it-text small {
    display: none;
  }
  .focus {
    left: 10px;
    bottom: 10px;
    font-size: 12px;
  }
  .shots {
    margin-top: 48px;
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
