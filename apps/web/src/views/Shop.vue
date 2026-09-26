<script setup>
// The shop: spend the coins you earn by studying on things for your study room.
// Prices, levels and the earning rules live in packages/core/src/economy.js.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { COINS, STREAK_DAY_MIN, studyStreak, streakPct, dateKey } from '@regimen/core'
import { store, call, toast } from '../lib/store.js'
import { wallet, balance, catalog, live } from '../lib/shop.js'
import { room, quickPlace, request } from '../lib/room.js'
import ShopGrid from '../components/shop/ShopGrid.vue'
import ItemPreview from '../components/shop/ItemPreview.vue'
import CoinIcon from '../components/shop/CoinIcon.vue'
import LiveEarnings from '../components/shop/LiveEarnings.vue'
import Icon from '../components/Icon.vue'

const router = useRouter()
const canBuy = computed(() => catalog.value.filter((i) => i.affordable).length)
const owned = computed(() => catalog.value.filter((i) => i.owned).length)
// the cheapest thing still out of reach: something to aim for
const goal = computed(
  () => catalog.value.filter((i) => !i.owned && !i.locked && !i.affordable).sort((a, b) => a.price - b.price)[0] || null,
)
// when everything unlocked is affordable: the best thing to treat yourself to
const treat = computed(() => (goal.value ? null : catalog.value.filter((i) => i.affordable).sort((a, b) => b.price - a.price)[0] || null))
const streak = computed(() => studyStreak(store.state?.stats?.coins?.days || {}, dateKey(store.minute)))
const WAYS = [
  { icon: 'clock', text: `${COINS.focusPerMin} coin per focused minute` },
  { icon: 'check', text: `+${COINS.completionBonus * 100}% for finishing every round` },
  { icon: 'sun', text: `+${COINS.firstOfDay} for your first ${STREAK_DAY_MIN} minute session each day` },
  { icon: 'flame', text: `Study streak: +${COINS.streakStepPct}% a day, up to +${COINS.streakStepPct * COINS.streakMaxSteps}%` },
  { icon: 'list', text: `Tasks ${COINS.task.low} to ${COINS.task.high + COINS.onTimeBonus}, habits ${COINS.habit}` },
]

async function use(item) {
  if (item.kind === 'object') {
    quickPlace(item.id)
    request.decorate = 'items'
    router.push('/')
  } else if (item.kind === 'option') {
    const group = item.category === 'avatar' ? 'avatar' : 'style'
    room[group][item.field] = item.value
    if (item.field === 'headphonesColor') room.avatar.headphones = true
    if (item.field === 'glassesStyle') room.avatar.glasses = true
    request.decorate = group === 'avatar' ? 'avatar' : 'room'
    router.push('/')
  } else {
    try {
      await call('settings.update', { patch: { lofi: item.kind === 'scene' ? { scene: item.id } : { style: item.id } } })
      router.push('/')
    } catch (e) {
      toast(e.message, 'error')
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-display text-4xl">Shop</h1>
        <p class="text-sm text-muted">Earn coins by studying. Spend them on your room, your avatar and the view.</p>
      </div>
      <RouterLink to="/" class="btn btn-sm"><Icon name="headphones" :size="14" /> Back to the room</RouterLink>
    </header>

    <section class="grid gap-3 md:grid-cols-[1.25fr_1fr]">
      <!-- the wallet -->
      <div class="relative overflow-hidden rounded-3xl bg-hud p-5 text-hud-ink sm:p-6" data-shop-wallet>
        <div class="glow pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full" />
        <p class="hud-label relative text-xs text-hud-muted">Your coins</p>
        <p class="relative mt-1 flex items-center gap-3">
          <CoinIcon :size="44" class="coin-spin" />
          <span class="num text-5xl leading-none" data-shop-balance>{{ balance }}</span>
        </p>
        <p class="relative mt-3 text-sm text-hud-muted">
          <template v-if="canBuy"
            ><b class="text-hud-ink">{{ canBuy }} thing{{ canBuy === 1 ? '' : 's' }}</b> you can buy right now.</template
          >
          <template v-else>Nothing in reach yet. One focus session gets you closer.</template>
        </p>
        <p class="relative mt-1 text-xs text-hud-muted">
          <span class="num">{{ wallet.earned }}</span> coins earned so far. {{ owned }} thing{{ owned === 1 ? '' : 's' }} bought.
        </p>
        <div v-if="goal" class="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/[.07] p-2.5 pr-4">
          <span class="relative block h-12 w-14 shrink-0 rounded-xl bg-black/20"><ItemPreview :item="goal" /></span>
          <span class="min-w-0 flex-1">
            <span class="flex justify-between gap-2 text-xs"
              ><span class="truncate"
                >Next up: <b>{{ goal.name }}</b></span
              ><span class="num text-hud-muted">{{ goal.price - balance }} to go</span></span
            >
            <span class="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/10"
              ><i class="block h-full rounded-full bg-[#ffc233]" :style="{ width: Math.round((balance / goal.price) * 100) + '%' }"
            /></span>
          </span>
        </div>
        <div v-else-if="treat" class="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/[.07] p-2.5 pr-4">
          <span class="relative block h-12 w-14 shrink-0 rounded-xl bg-black/20"><ItemPreview :item="treat" /></span>
          <span class="min-w-0 flex-1 text-xs"
            >Treat yourself: <b>{{ treat.name }}</b> for <span class="num">{{ treat.price }}</span> coins. Find it first in the list
            below.</span
          >
        </div>
      </div>

      <!-- how to earn, or the session that is earning right now -->
      <div class="card p-5">
        <template v-if="live">
          <p class="label">Earning right now</p>
          <LiveEarnings />
        </template>
        <template v-else>
          <p class="label">How to earn</p>
          <ul class="space-y-2 text-sm">
            <li v-for="w in WAYS" :key="w.text" class="flex items-center gap-2.5">
              <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sunk text-accent"
                ><Icon :name="w.icon" :size="15"
              /></span>
              {{ w.text }}
            </li>
          </ul>
          <p class="mt-3 flex items-center gap-2 text-xs text-muted">
            <Icon name="flame" :size="14" class="text-warm" />
            <span v-if="streak"
              >Study streak: <b class="text-ink">{{ streak }} day{{ streak === 1 ? '' : 's' }}</b
              >, next session pays <b class="text-ink">x{{ (streakPct(streak + 1) / 100).toFixed(1) }}</b
              >.</span
            >
            <span v-else>Focus {{ STREAK_DAY_MIN }} minutes today to start a study streak.</span>
          </p>
          <RouterLink to="/" class="btn btn-primary btn-sm mt-4"><Icon name="play" :size="13" /> Start a focus session</RouterLink>
        </template>
      </div>
    </section>

    <ShopGrid @use="use" />
  </div>
</template>

<style scoped>
.glow {
  background: radial-gradient(circle, rgb(255 211 77 / 0.35), transparent 65%);
}
.coin-spin {
  animation: coin-spin 4s ease-in-out infinite;
}
@keyframes coin-spin {
  0%,
  80%,
  100% {
    transform: rotateY(0);
  }
  90% {
    transform: rotateY(180deg);
  }
}
</style>
