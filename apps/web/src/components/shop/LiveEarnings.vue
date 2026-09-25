<script setup>
// While a focus session runs: a coin jar that fills up as you study (like a tree growing in
// Forest), coins and XP counting up, +1s floating out, the study streak multiplier and
// what finishing pays. Nothing is saved per tick: it is all worked out from the focused time
// (core focusLive), and the real amounts are paid by the backend when the session ends.
// compact: one line, for the status strip.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { live, playCoin } from '../../lib/shop.js'
import { progress } from '../../lib/rewards.js'
import CoinIcon from './CoinIcon.vue'
import Icon from '../Icon.vue'

// medium: a smaller jar and no footer, for a focus window of normal height
defineProps({ compact: Boolean, medium: Boolean })
const uid = 'jar' + Math.random().toString(36).slice(2, 8)
const l = computed(() => live.value)
const coins = computed(() => l.value?.now.coins || 0)
const xp = computed(() => l.value?.now.xp || 0)
const fill = computed(() => (l.value ? Math.min(1, l.value.minutes / Math.max(1, l.value.total)) : 0))
const mult = computed(() => ((l.value?.now.pct || 100) / 100).toFixed(1))

// the number rolls up to its new value
const shown = ref(coins.value)
let raf = 0
watch(coins, (to, from) => {
  cancelAnimationFrame(raf)
  const start = performance.now()
  const a = shown.value
  const step = (t) => {
    const k = Math.min(1, (t - start) / 700)
    shown.value = Math.round(a + (to - a) * (1 - Math.pow(1 - k, 3)))
    if (k < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  if (from != null && to > from) float(to - from, to - from >= 5)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))

// +1 particles
const bits = ref([])
let seq = 0
function float(n, big) {
  const id = ++seq
  bits.value.push({ id, n, x: 20 + Math.random() * 60, big })
  if (big) playCoin()
  setTimeout(() => (bits.value = bits.value.filter((b) => b.id !== id)), 1400)
}
const firstPending = computed(() => l.value && !l.value.now.first && l.value.done.first)
</script>

<template>
  <div
    v-if="l && compact"
    class="flex items-center gap-2 text-sm"
    data-live-earnings="compact"
    :title="`This session so far: ${coins} coins and ${xp} XP`"
  >
    <span class="relative grid h-7 w-7 place-items-center">
      <svg viewBox="0 0 36 36" class="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="var(--fg-coin)"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="97.4"
          :stroke-dashoffset="97.4 * (1 - l.toNext)"
          class="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <CoinIcon :size="16" />
      <span v-for="b in bits" :key="b.id" class="bit num" :style="{ left: '50%' }">+{{ b.n }}</span>
    </span>
    <span class="coin-text num font-bold">+{{ shown }}</span>
    <span class="num text-xs opacity-70">+{{ xp }} XP</span>
  </div>

  <div v-else-if="l" class="live" data-live-earnings>
    <div class="flex items-center gap-4">
      <!-- the jar fills with gold as the session goes on -->
      <div class="relative shrink-0" :class="medium ? 'h-[52px] w-[43px]' : 'h-[78px] w-[64px]'">
        <svg viewBox="0 0 64 78" class="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <clipPath :id="uid + '-in'"><path d="M12 20 Q6 26 6 38 V64 Q6 74 16 74 H48 Q58 74 58 64 V38 Q58 26 52 20Z" /></clipPath>
            <linearGradient :id="uid + '-gold'" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ffe27a" />
              <stop offset="1" stop-color="#e0a31a" />
            </linearGradient>
          </defs>
          <g :clip-path="`url(#${uid}-in)`">
            <rect x="0" y="0" width="64" height="78" fill="currentColor" fill-opacity=".08" />
            <g class="gold" :style="{ transform: `translateY(${74 - 56 * fill}px)` }">
              <path class="wave" d="M-64 4 Q-48 0 -32 4 T0 4 T32 4 T64 4 T96 4 T128 4 V80 H-64Z" :fill="`url(#${uid}-gold)`" />
              <circle
                v-for="k in Math.min(9, Math.floor(fill * 10))"
                :key="k"
                :cx="10 + ((k * 17) % 46)"
                :cy="10 + ((k * 7) % 30)"
                r="4.5"
                fill="#ffd34d"
                stroke="#e0a31a"
                stroke-width="1.2"
              />
            </g>
          </g>
          <path
            d="M12 20 Q6 26 6 38 V64 Q6 74 16 74 H48 Q58 74 58 64 V38 Q58 26 52 20Z"
            fill="none"
            stroke="currentColor"
            stroke-opacity=".45"
            stroke-width="2.5"
          />
          <rect x="14" y="10" width="36" height="10" rx="3" fill="currentColor" fill-opacity=".35" />
          <path d="M16 30 Q13 40 14 56" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round" />
        </svg>
        <span v-for="b in bits" :key="b.id" class="bit num" :class="b.big && 'bit-big'" :style="{ left: b.x + '%' }">+{{ b.n }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <p class="flex items-baseline gap-2">
          <CoinIcon :size="22" class="self-center" />
          <span class="coin-text num leading-none" :class="medium ? 'text-2xl' : 'text-3xl'" data-live-coins>+{{ shown }}</span>
          <span class="text-xs opacity-60">coins</span>
          <span class="num ml-auto text-sm font-bold" data-live-xp>+{{ xp }} XP</span>
        </p>
        <!-- the next coin -->
        <p class="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk" :title="l.now.capped ? 'Daily focus coin cap reached' : 'Next coin'">
          <i
            class="coin-bar block h-full rounded-full transition-[width] duration-1000 ease-linear"
            :style="{ width: l.toNext * 100 + '%' }"
          />
        </p>
        <p class="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span
            class="chip-l"
            :class="l.now.pct > 100 ? 'hot' : ''"
            :title="`Study streak: ${l.now.streak} day${l.now.streak === 1 ? '' : 's'} in a row`"
            ><Icon name="flame" :size="12" /> {{ l.now.streak }} day streak x{{ mult }}</span
          >
          <span v-if="l.now.first" class="chip-l hot"><Icon name="sun" :size="12" /> First session +{{ l.now.first }}</span>
          <span v-else-if="firstPending" class="chip-l"><Icon name="sun" :size="12" /> +{{ l.done.first }} at 15 min</span>
          <span v-if="l.now.capped" class="chip-l">Daily cap reached</span>
        </p>
      </div>
    </div>
    <p v-if="!medium" class="mt-3 flex items-center gap-2 rounded-xl bg-sunk px-3 py-2 text-xs">
      <Icon name="target" :size="14" class="shrink-0 opacity-70" />
      <span class="min-w-0 flex-1"
        >Finish all rounds: <b class="num">+{{ l.done.coins }}</b> coins<template v-if="l.done.bonus">
          (bonus <b class="num">+{{ Math.floor((l.done.bonus * l.done.pct) / 100) }}</b
          >)</template
        >, <b class="num">+{{ l.done.xp }}</b> XP</span
      >
      <span v-if="progress" class="num shrink-0 opacity-60">LV {{ progress.level }}</span>
    </p>
  </div>
</template>

<style scoped>
.gold {
  transition: transform 1s linear;
}
.wave {
  animation: wave 3s linear infinite;
}
@keyframes wave {
  to {
    transform: translateX(64px);
  }
}
.bit {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: 800;
  color: var(--fg-coin-ink);
  text-shadow: 0 1px 0 color-mix(in srgb, var(--fg-paper) 70%, transparent);
  pointer-events: none;
  animation: bit 1.3s ease-out forwards;
}
.bit-big {
  font-size: 16px;
}
@keyframes bit {
  0% {
    opacity: 0;
    transform: translate(-50%, 6px) scale(0.7);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -6px) scale(1.15);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -34px) scale(1);
  }
}
.chip-l {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  padding: 2px 8px;
  background: color-mix(in srgb, currentColor 10%, transparent);
}
.chip-l.hot {
  background: var(--fg-coin);
  color: var(--fg-on-coin);
}
</style>
