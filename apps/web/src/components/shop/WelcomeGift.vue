<script setup>
// The first visit to the room after setting up (and the first visit after the shop arrived
// for everyone else): how coins work, and a starter gift that buys one small thing, to
// teach the loop: study, earn, spend on your room.
import { computed, ref } from 'vue'
import { COINS } from '@regimen/core'
import { claimGift, catalog, balance } from '../../lib/shop.js'
import CoinIcon from './CoinIcon.vue'
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
    class="gift room-glass pop-in w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-(--fg-room-radius) bg-(--fg-room-base) p-3"
    aria-label="Starter gift"
    data-welcome-gift
  >
    <div class="flex items-center gap-3">
      <CoinIcon :size="32" class="float shrink-0" />
      <div class="min-w-0 flex-1">
        <template v-if="!claimed">
          <p class="text-sm leading-tight font-bold">A {{ COINS.gift }} coin starter gift</p>
          <p class="text-[11px] leading-tight text-muted">Earn 1 coin per focused minute. Spend them on your room.</p>
        </template>
        <template v-else>
          <p class="text-sm leading-tight font-bold">
            You have <span class="coin-text num">{{ balance }}</span> coins
          </p>
          <p class="text-[11px] leading-tight text-muted">
            <template v-if="picks.length">Enough for {{ picks[0].name }} and more.</template>
            <template v-else>Keep studying to earn more.</template>
          </p>
        </template>
      </div>
      <button v-if="!claimed" ref="btn" class="claim btn btn-sm shrink-0" :disabled="busy" data-claim-gift @click="claim">Claim</button>
      <button v-else class="claim btn btn-sm shrink-0" data-gift-shop @click="emit('shop')"><Icon name="bag" :size="13" /> Shop</button>
      <button class="shrink-0 rounded-full p-1 text-muted hover:text-ink" aria-label="Close" @click="emit('close')">
        <Icon name="x" :size="14" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.gift {
  background-image: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--fg-coin) 20%, transparent), transparent 55%);
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
