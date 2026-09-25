<script setup>
// One picture of the "How it blocks" story. `on` starts its little animation: the typing,
// the confetti, and on the Failsafe a real countdown and a reason being typed.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Icon from '../Icon.vue'
import { useInView } from './motion.js'

const props = defineProps({ step: { type: Number, required: true }, on: { type: Boolean, default: false } })

const box = ref(null)
const seen = useInView(box, { once: false, threshold: 0.3 })
const REASON = 'I need the class group chat for tomorrow'
const typed = ref('')
const wait = ref(120)
let tick = null
watch(
  () => props.on && seen.value && props.step === 3,
  (run) => {
    clearInterval(tick)
    if (!run) return
    typed.value = ''
    wait.value = 120
    let n = 0
    tick = setInterval(() => {
      n++
      if (n <= REASON.length) typed.value = REASON.slice(0, n)
      // the cooldown really counts down, one second per second
      if (n % 12 === 0 && wait.value > 0) wait.value--
    }, 1000 / 12)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearInterval(tick))
const waitText = computed(() => `${Math.floor(wait.value / 60)}:${String(wait.value % 60).padStart(2, '0')}`)
</script>

<template>
  <div ref="box" class="scene-box" :class="{ on: on && seen }">
    <div v-if="step === 0" class="s s1">
      <p class="s-label">Evening homework · 4 to 7 pm</p>
      <div class="rule">
        <span class="favs"><b class="fav ig"></b><b class="fav yt"></b><b class="fav rd"></b></span>
        <span>Unlocks after these tasks</span>
      </div>
      <div class="add"><Icon name="plus" :size="16" /><span class="typing">Physics flashcards</span><span class="caret"></span></div>
      <ul class="list">
        <li v-for="(t, k) in ['Chemistry homework', 'Read chapter 4']" :key="t" :style="{ '--k': k }">
          <span class="cb"></span>{{ t }}<em>+{{ k ? 15 : 25 }} XP</em>
        </li>
      </ul>
    </div>
    <div v-else-if="step === 1" class="s s2">
      <div class="blocked">
        <span class="big-lock"><Icon name="lock" :size="30" /></span>
        <p class="b-title">YouTube is resting</p>
        <p class="b-sub">Opens when these are done</p>
        <ul class="todo">
          <li><span class="cb"></span>Chemistry homework</li>
          <li><span class="cb"></span>Read chapter 4</li>
        </ul>
        <p class="b-foot">Private window? Other browser? Blocked there too with the lock agent.</p>
      </div>
    </div>
    <div v-else-if="step === 2" class="s s3">
      <ul class="list done">
        <li>
          <span class="cb ok"><Icon name="check" :size="12" /></span>Chemistry homework<em>+25 XP</em>
        </li>
        <li>
          <span class="cb ok"><Icon name="check" :size="12" /></span>Read chapter 4<em>+15 XP</em>
        </li>
      </ul>
      <div class="opened">
        <span class="o-icon"><Icon name="unlock" :size="22" /></span>
        <span><b>Window open</b><br /><small>YouTube, Instagram and Reddit until 7 pm</small></span>
      </div>
      <div class="confetti"><i v-for="c in 14" :key="c" :style="{ '--c': c }"></i></div>
    </div>
    <div v-else class="s s4">
      <p class="s-label">Failsafe · Evening homework</p>
      <div class="pin">
        <span v-for="d in 6" :key="d" class="pd"></span>
      </div>
      <div class="cool">
        <svg viewBox="0 0 44 44" width="56" height="56">
          <circle cx="22" cy="22" r="19" fill="none" stroke="var(--lp-line)" stroke-width="4" />
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            stroke="var(--lp-warm)"
            stroke-width="4"
            stroke-linecap="round"
            pathLength="120"
            :stroke-dasharray="`${wait} 120`"
            transform="rotate(-90 22 22)"
          />
        </svg>
        <span
          ><b class="mono">{{ waitText }}</b
          ><br /><small>Cooling down. Still want it?</small></span
        >
      </div>
      <div class="reason">
        <small>Type why</small>
        <p>{{ typed }}<span class="caret"></span></p>
      </div>
      <p class="logged"><Icon name="info" :size="13" /> This goes in your history. Honest, not shaming.</p>
    </div>
  </div>
</template>

<style scoped>
.scene-box {
  width: 100%;
}
.s {
  width: 100%;
  max-width: 440px;
  margin-inline: auto;
}
.s-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lp-faint);
}
.rule {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--lp-accent-soft);
  color: var(--lp-accent);
  font-weight: 650;
  font-size: 14px;
}
.favs {
  display: flex;
}
.fav {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 2px solid var(--lp-surface);
  margin-left: -6px;
}
.fav:first-child {
  margin-left: 0;
}
.ig {
  background: linear-gradient(135deg, #ffb13b, #ff3d6e 50%, #b23bd6);
}
.yt {
  background: #ff2e2e;
}
.rd {
  background: #ff5a1f;
}
.add {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 2px solid var(--lp-accent);
  color: var(--lp-ink);
  font-weight: 550;
}
.add svg {
  color: var(--lp-accent);
}
.typing {
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  animation: type 1.6s steps(18) 0.4s forwards;
}
.scene-box:not(.on) .typing {
  animation: none;
}
@keyframes type {
  to {
    width: 18ch;
  }
}
.caret {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: var(--lp-accent);
  vertical-align: -0.15em;
  margin-left: 1px;
  animation: blink 1s steps(1) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list li,
.todo li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--lp-surface-2);
  font-weight: 600;
  font-size: 15px;
}
.list em {
  margin-left: auto;
  font-style: normal;
  font-size: 12px;
  font-weight: 750;
  color: var(--lp-warm);
}
.cb {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 7px;
  border: 2px solid var(--lp-line-strong);
  display: grid;
  place-items: center;
  color: #fff;
}
.cb.ok {
  background: var(--lp-green);
  border-color: var(--lp-green);
}
.list.done li {
  color: var(--lp-faint);
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
}

.blocked {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.big-lock {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: var(--lp-red-soft);
  color: var(--lp-red);
  animation: nudge 2.4s ease-in-out infinite;
}
@keyframes nudge {
  0%,
  80%,
  100% {
    transform: rotate(0);
  }
  85% {
    transform: rotate(-8deg);
  }
  90% {
    transform: rotate(7deg);
  }
  95% {
    transform: rotate(-4deg);
  }
}
.b-title {
  margin-top: 16px;
  font-family: var(--lp-serif);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.b-sub {
  margin-top: 4px;
  color: var(--lp-muted);
}
.todo {
  margin-top: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}
.b-foot {
  margin-top: 16px;
  font-size: 12.5px;
  color: var(--lp-faint);
}

.s3 {
  position: relative;
}
.opened {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--lp-green-soft);
  color: var(--lp-green);
  line-height: 1.35;
}
.opened b {
  font-size: 17px;
}
.opened small {
  color: var(--lp-ink-2);
  font-size: 13.5px;
}
.o-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: var(--lp-green);
  color: #fff;
}
.scene-box.on .opened {
  animation: pop-in 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) 0.2s both;
}
@keyframes pop-in {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
}
.confetti {
  position: absolute;
  inset: -20px 0 auto 0;
  height: 0;
  pointer-events: none;
}
.confetti i {
  position: absolute;
  left: calc(var(--c) * 7%);
  top: 0;
  width: 8px;
  height: 12px;
  border-radius: 2px;
  background: var(--lp-accent);
  opacity: 0;
}
.confetti i:nth-child(3n) {
  background: var(--lp-warm);
}
.confetti i:nth-child(3n + 1) {
  background: var(--lp-green);
}
.scene-box.on .confetti i {
  animation: fall 1.4s cubic-bezier(0.2, 0.6, 0.4, 1) calc(0.25s + var(--c) * 30ms) both;
}
@keyframes fall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translateY(260px) rotate(calc(var(--c) * 60deg));
  }
}

.pin {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}
.pd {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--lp-ink);
}
.cool {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--lp-warm-soft);
  line-height: 1.3;
}
.cool small {
  color: var(--lp-muted);
}
.mono {
  font-family: var(--lp-mono);
  font-size: 20px;
}
.reason {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--lp-line-strong);
}
.reason small {
  color: var(--lp-faint);
  font-size: 12px;
}
.reason p {
  min-height: 1.5em;
  font-weight: 550;
}
.logged {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--lp-muted);
}
</style>
