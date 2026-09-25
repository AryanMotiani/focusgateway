<script setup>
// The card after a focus session: the coins counting up with a burst, each part of the
// reward (minutes, finishing bonus, first session, streak), the XP bar filling, a new badge
// if one came with it, and what you can afford now. Driven by rewards.celebration.session.
import { computed, onMounted, ref } from 'vue'
import { levelInfo } from '@focusgateway/core'
import { celebration, progress } from '../../lib/rewards.js'
import { coinBurst } from '../../lib/shop.js'
import CoinIcon from './CoinIcon.vue'
import ItemPreview from './ItemPreview.vue'
import Icon from '../Icon.vue'

const s = computed(() => celebration.session)
const r = computed(() => s.value.reward)
const e = computed(() => s.value.entry)
const completed = computed(() => e.value.status === 'completed')
const shown = ref(0)
const coinEl = ref(null)
const before = computed(() => levelInfo(Math.max(0, s.value.xpBefore)))
const barFrom = ref(before.value.progress)
const barTo = computed(() => (progress.value.level > before.value.level ? 1 : progress.value.progress))
const bar = ref(barFrom.value)
const rows = computed(() => {
  const x = r.value
  const out = [{ icon: 'clock', label: `${e.value.focusedMin} min focused`, value: `+${x.base}` }]
  if (x.bonus) out.push({ icon: 'check', label: 'Finished every round', value: `+${x.bonus}` })
  if (x.pct > 100) out.push({ icon: 'flame', label: `${x.streak} day study streak`, value: `x${(x.pct / 100).toFixed(1)}`, hot: true })
  if (x.first) out.push({ icon: 'sun', label: 'First session today', value: `+${x.first}` })
  if (x.capped) out.push({ icon: 'info', label: 'Daily focus coin cap reached', value: '' })
  return out
})

function close() {
  celebration.session = null
  celebration.badge = null
}
onMounted(() => {
  const to = r.value.coins
  const start = performance.now()
  const dur = Math.min(1600, 500 + to * 12)
  const step = (t) => {
    const k = Math.min(1, (t - start) / dur)
    shown.value = Math.round(to * (1 - Math.pow(1 - k, 3)))
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
  setTimeout(() => coinBurst(coinEl.value, Math.min(24, 8 + Math.round(to / 6))), 200)
  setTimeout(() => (bar.value = barTo.value), 400)
})
</script>

<template>
  <div class="fixed inset-0 z-[62] grid place-items-center overflow-y-auto bg-[#0b0918]/60 p-4 backdrop-blur-sm" @mousedown.self="close">
    <div
      class="pop-in w-full max-w-sm overflow-hidden rounded-3xl bg-hud text-hud-ink shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Session reward"
      data-session-reward
    >
      <div class="relative px-6 pt-7 pb-5 text-center">
        <div class="pointer-events-none absolute top-[45%] left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2">
          <div class="rays h-full w-full" />
        </div>
        <p class="hud-label relative text-xs text-hud-muted">{{ completed ? 'Session complete' : 'Session ended early' }}</p>
        <p ref="coinEl" class="relative mt-2 flex items-center justify-center gap-3">
          <CoinIcon :size="46" class="spin" />
          <span class="num text-6xl leading-none text-[#ffc233]" data-reward-coins>+{{ shown }}</span>
        </p>
        <p class="relative mt-1 text-sm text-hud-muted">coins earned</p>
      </div>

      <div class="space-y-4 px-5 pb-5">
        <ul class="space-y-1.5 text-sm">
          <li v-for="row in rows" :key="row.label" class="flex items-center gap-2.5 rounded-xl bg-white/[.06] px-3 py-2">
            <Icon :name="row.icon" :size="15" :class="row.hot ? 'text-[#ff9d4d]' : 'text-hud-muted'" />
            <span class="flex-1">{{ row.label }}</span>
            <b class="num" :class="row.hot ? 'text-[#ff9d4d]' : 'text-[#ffc233]'">{{ row.value }}</b>
          </li>
        </ul>

        <div>
          <p class="flex justify-between text-xs">
            <span class="hud-label text-hud-muted">Level {{ progress.level }} · {{ progress.title }}</span>
            <b class="num text-[#b8f5c6]">+{{ r.xp }} XP</b>
          </p>
          <span class="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-white/10"
            ><i
              class="block h-full rounded-full bg-[var(--fg-hud-xpbar,#ffd34d)] transition-[width] duration-1000 ease-out"
              :style="{ width: Math.max(3, bar * 100) + '%' }"
          /></span>
          <p class="num mt-1 text-right text-[11px] text-hud-muted">{{ progress.into }} / {{ progress.needed }} XP</p>
        </div>

        <div v-if="celebration.badge" class="flex items-center gap-3 rounded-2xl bg-white/[.08] p-2.5">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-xp text-[#1a1830]"><Icon :name="celebration.badge.icon" /></span>
          <span>
            <span class="hud-label block text-[10px] text-hud-muted">Badge earned</span>
            <span class="text-sm font-bold">{{ celebration.badge.name }}</span>
          </span>
        </div>

        <div v-if="s.afford.length">
          <p class="hud-label mb-2 text-[11px] text-hud-muted">You can now afford</p>
          <div class="grid grid-cols-3 gap-2">
            <RouterLink
              v-for="it in s.afford"
              :key="it.id"
              to="/shop"
              class="flex flex-col items-center gap-1 rounded-2xl bg-white/[.07] p-2 text-center hover:bg-white/[.12]"
              @click="close"
            >
              <span class="relative block h-12 w-full"><ItemPreview :item="it" /></span>
              <span class="line-clamp-1 w-full text-[11px] font-bold">{{ it.name }}</span>
              <span class="num flex items-center gap-1 text-[11px] text-[#ffc233]"><CoinIcon :size="11" />{{ it.price }}</span>
            </RouterLink>
          </div>
        </div>

        <div class="flex gap-2">
          <RouterLink v-if="s.afford.length" to="/shop" class="btn btn-primary flex-1" data-reward-shop @click="close"
            ><Icon name="bag" :size="15" /> Shop</RouterLink
          >
          <button class="btn flex-1" :class="!s.afford.length && 'btn-primary'" @click="close">Nice</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rays {
  background:
    radial-gradient(circle, rgb(255 194 51 / 0.35), transparent 30%),
    repeating-conic-gradient(rgb(255 211 77 / 0.1) 0 10deg, transparent 10deg 20deg);
  mask-image: radial-gradient(circle, #000 12%, transparent 45%);
  animation: turn 18s linear infinite;
}
@keyframes turn {
  to {
    transform: rotate(360deg);
  }
}
.spin {
  animation: spin 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes spin {
  from {
    transform: rotateY(-540deg) scale(0.4);
  }
}
</style>
