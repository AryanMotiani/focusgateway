<script setup>
// The coin counter in the status strip: your balance, what the running session has earned
// so far, and a dot when something new is affordable. Opens the shop.
import { computed, ref, watch } from 'vue'
import { balance, freshAffordable, live } from '../../lib/shop.js'
import CoinIcon from './CoinIcon.vue'

defineProps({ sub: { type: String, default: '' } })
const earning = computed(() => live.value?.now.coins || 0)
const fresh = computed(() => freshAffordable.value.length)
const title = computed(
  () =>
    `${balance.value} coins` +
    (earning.value ? `, +${earning.value} from this session so far` : '') +
    (fresh.value ? `. ${fresh.value} new thing${fresh.value === 1 ? '' : 's'} you can buy` : '. Open the shop'),
)
// a little bump when the balance goes up
const bump = ref(false)
watch(balance, (to, from) => {
  if (to > from) {
    bump.value = false
    requestAnimationFrame(() => (bump.value = true))
  }
})
</script>

<template>
  <RouterLink to="/shop" class="relative flex items-center gap-1.5 text-sm font-bold" :title="title" :aria-label="title" data-coin-counter>
    <CoinIcon :size="18" :class="bump && 'bump'" @animationend="bump = false" />
    <span class="num" data-coin-balance>{{ balance }}</span>
    <span
      v-if="earning"
      class="coin-text num rounded-full bg-[color-mix(in_srgb,var(--fg-coin)_22%,transparent)] px-1.5 text-xs"
      data-coin-live
      >+{{ earning }}</span
    >
    <span v-else class="hud-label hidden sm:inline" :class="sub">coins</span>
    <span
      v-if="fresh"
      class="dot new-dot absolute -top-2 -right-3 grid h-3.5 min-w-3.5 place-items-center rounded-full px-0.5 text-[9px] leading-none"
      data-shop-dot
      >{{ fresh }}</span
    >
  </RouterLink>
</template>

<style scoped>
.bump {
  animation: bump 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes bump {
  40% {
    transform: scale(1.35) rotate(-12deg);
  }
}
.dot {
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    transform: scale(1.18);
  }
}
</style>
