<script setup>
// The card after a focus session: the coins counting up with a burst, each part of the
// reward (minutes, finishing bonus, first session, streak), the XP bar filling, a new badge
// if one came with it, and what you can afford now. Driven by rewards.celebration.session.
import { computed, onMounted, ref } from 'vue'
import { levelInfo } from '@regimen/core'
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
  <div
    class="pop-in fixed right-4 bottom-4 z-[62] w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-hud p-3.5 text-hud-ink shadow-2xl max-sm:right-3 max-sm:bottom-20"
    role="dialog"
    aria-label="Session reward"
    data-session-reward
  >
    <div class="flex items-center gap-3">
      <p ref="coinEl" class="flex items-center gap-2">
        <CoinIcon :size="30" class="spin" />
        <span class="coin-text num text-3xl leading-none" data-reward-coins>+{{ shown }}</span>
      </p>
      <div class="min-w-0 flex-1">
        <p class="text-sm leading-tight font-bold">{{ completed ? 'Session complete' : 'Session ended early' }}</p>
        <p class="truncate text-[11px] text-hud-muted">{{ rows.map((x) => x.label + (x.value ? ' ' + x.value : '')).join(' · ') }}</p>
      </div>
      <button class="shrink-0 rounded-full p-1 text-hud-muted hover:text-hud-ink" aria-label="Close" @click="close">
        <Icon name="x" :size="14" />
      </button>
    </div>
    <div class="mt-2.5 flex items-center gap-2 text-[11px]">
      <span class="hud-label text-hud-muted">LV {{ progress.level }}</span>
      <span class="block h-1.5 flex-1 overflow-hidden rounded-full bg-sunk"
        ><i
          class="block h-full rounded-full bg-(--fg-hud-xpbar) transition-[width] duration-1000 ease-out"
          :style="{ width: Math.max(3, bar * 100) + '%' }"
      /></span>
      <b class="num text-good">+{{ r.xp }} XP</b>
    </div>
    <p v-if="celebration.badge" class="mt-2 flex items-center gap-1.5 text-xs">
      <Icon :name="celebration.badge.icon" :size="13" class="text-xp" /> Badge earned: <b>{{ celebration.badge.name }}</b>
    </p>
    <div v-if="s.afford.length" class="mt-2.5 flex items-center gap-2">
      <span class="relative block h-8 w-8 shrink-0"><ItemPreview :item="s.afford[0]" /></span>
      <span class="min-w-0 flex-1 truncate text-xs"
        >You can now afford <b>{{ s.afford[0].name }}</b
        ><template v-if="s.afford.length > 1"> and {{ s.afford.length - 1 }} more</template></span
      >
      <RouterLink to="/shop" class="btn btn-sm btn-primary shrink-0" data-reward-shop @click="close"
        ><Icon name="bag" :size="13" /> Shop</RouterLink
      >
    </div>
  </div>
</template>

<style scoped>
.spin {
  animation: spin 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes spin {
  from {
    transform: rotateY(-540deg) scale(0.4);
  }
}
</style>
