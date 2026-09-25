<script setup>
// The first visit to the room after setting up (and the first visit after the shop arrived
// for everyone else): how coins work, and a starter gift that buys one small thing, to
// teach the loop: study, earn, spend on your room.
import { computed, ref } from 'vue'
import { COINS } from '@focusgateway/core'
import { claimGift, catalog, balance } from '../../lib/shop.js'
import CoinIcon from './CoinIcon.vue'
import ItemPreview from './ItemPreview.vue'
import Icon from '../Icon.vue'

const emit = defineEmits(['shop', 'close'])
const claimed = ref(false)
const busy = ref(false)
const btn = ref(null)
const picks = computed(() =>
  catalog.value
    .filter((i) => i.affordable && i.category !== 'music')
    .sort((a, b) => b.price - a.price)
    .slice(0, 3),
)
async function claim() {
  busy.value = true
  claimed.value = await claimGift(btn.value)
  busy.value = false
}
</script>

<template>
  <section
    class="gift room-glass pop-in w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-(--fg-room-radius) bg-(--fg-room-base)"
    aria-label="Starter gift"
    data-welcome-gift
  >
    <div class="relative flex items-center gap-4 p-5">
      <div class="burst pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full" />
      <div class="relative grid h-20 w-20 shrink-0 place-items-center">
        <CoinIcon :size="64" class="float" />
        <CoinIcon :size="30" class="float absolute -right-1 bottom-0" style="animation-delay: -1s" />
        <CoinIcon :size="22" class="float absolute top-0 left-0" style="animation-delay: -2s" />
      </div>
      <div class="relative min-w-0">
        <template v-if="!claimed">
          <p class="hud-label text-[11px] text-muted">New: the shop</p>
          <p class="h-display text-xl leading-tight">Earn coins by studying, spend them on your room</p>
        </template>
        <template v-else>
          <p class="hud-label text-[11px] text-muted">Gift claimed</p>
          <p class="h-display text-xl leading-tight">
            You have <span class="coin-text num">{{ balance }}</span> coins
          </p>
        </template>
      </div>
    </div>
    <div class="relative px-5 pb-5">
      <template v-if="!claimed">
        <ul class="grid grid-cols-3 gap-2 text-center text-[11px] leading-tight text-muted">
          <li class="room-well p-2.5"><Icon name="clock" :size="16" class="coin-text mx-auto mb-1" />1 coin every focused minute</li>
          <li class="room-well p-2.5"><Icon name="flame" :size="16" class="mx-auto mb-1 text-warm" />Streaks pay up to +50%</li>
          <li class="room-well p-2.5"><Icon name="bag" :size="16" class="mx-auto mb-1 text-good" />Decor, outfits, scenes, music</li>
        </ul>
        <button ref="btn" class="claim btn mt-4 w-full" :disabled="busy" data-claim-gift @click="claim">
          <CoinIcon :size="18" /> Claim your {{ COINS.gift }} coin starter gift
        </button>
      </template>
      <template v-else>
        <p v-if="picks.length" class="text-sm text-muted">That is enough for one of these, and many more to earn:</p>
        <div v-if="picks.length" class="mt-2 grid grid-cols-3 gap-2">
          <span v-for="it in picks" :key="it.id" class="room-well flex flex-col items-center gap-1 p-2 text-center">
            <span class="relative block h-11 w-full"><ItemPreview :item="it" /></span>
            <span class="line-clamp-1 w-full text-[11px] font-bold">{{ it.name }}</span>
            <span class="coin-text num flex items-center gap-1 text-[11px]"><CoinIcon :size="11" />{{ it.price }}</span>
          </span>
        </div>
        <div class="mt-4 flex gap-2">
          <button class="claim btn flex-1" data-gift-shop @click="emit('shop')"><Icon name="bag" :size="15" /> Pick something</button>
          <button class="btn btn-ghost" @click="emit('close')">Later</button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.gift {
  background-image: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--fg-coin) 20%, transparent), transparent 55%);
}
.burst {
  background: radial-gradient(circle, color-mix(in srgb, var(--fg-coin) 35%, transparent), transparent 65%);
}
.float {
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  50% {
    transform: translateY(-5px) rotate(-6deg);
  }
}
.claim {
  border-color: var(--fg-coin);
  border-bottom-color: var(--fg-coin-deep);
  background: var(--fg-coin);
  color: var(--fg-on-coin);
}
</style>
