<script setup>
// Level-up card, the session reward card, the small "new badge" toast and the "new things
// you can afford" nudge. Driven by rewards.celebration. One big card at a time: the session
// card first (it shows a new badge itself), then the level-up.
import { computed, watch } from 'vue'
import { celebration } from '../lib/rewards.js'
import { store } from '../lib/store.js'
import SessionReward from './shop/SessionReward.vue'
import ItemPreview from './shop/ItemPreview.vue'
import CoinIcon from './shop/CoinIcon.vue'
import Icon from './Icon.vue'
// the starter gift card teaches the shop first, the affordable nudge waits until it is claimed
const giftDone = computed(() => !!store.state?.shop?.giftAt)
// room things first, then avatar and room style options. A big jump shows the first few
const SHOW = 6
const unlocks = computed(() => {
  const all = celebration.levelUp?.unlocks || []
  const sorted = [...all.filter((u) => u.kind !== 'option'), ...all.filter((u) => u.kind === 'option')]
  return { list: sorted.slice(0, SHOW), more: Math.max(0, sorted.length - SHOW) }
})
let t = null
watch(
  () => celebration.badge,
  (b) => {
    clearTimeout(t)
    if (b && !celebration.session) t = setTimeout(() => (celebration.badge = null), 5000)
  },
)
let nt = null
watch(
  () => celebration.nudge,
  (n) => {
    clearTimeout(nt)
    if (n) nt = setTimeout(() => (celebration.nudge = null), 9000)
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="celebration.levelUp && !celebration.session"
      class="pop-in fixed right-4 bottom-4 z-[60] w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-hud p-3.5 text-hud-ink shadow-2xl max-sm:right-3 max-sm:bottom-20"
      role="dialog"
      aria-label="Level up"
    >
      <div class="flex items-center gap-3">
        <span
          class="num grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-lg text-on-accent shadow-[inset_0_-3px_0_var(--fg-accent-deep)]"
          >{{ celebration.levelUp.to }}</span
        >
        <div class="min-w-0 flex-1">
          <p class="hud-label text-[10px] text-hud-muted">Level up</p>
          <p class="truncate text-sm font-bold">{{ celebration.levelUp.title }}</p>
        </div>
        <button class="shrink-0 rounded-full p-1 text-hud-muted hover:text-hud-ink" aria-label="Close" @click="celebration.levelUp = null">
          <Icon name="x" :size="14" />
        </button>
      </div>
      <div v-if="celebration.levelUp.unlocks.length" class="mt-2.5 flex items-center gap-2">
        <Icon name="sparkles" :size="14" class="shrink-0 text-xp" />
        <span class="min-w-0 flex-1 truncate text-xs"
          >New in the shop: <b>{{ unlocks.list[0].name }}</b
          ><template v-if="unlocks.list.length + unlocks.more > 1"> and {{ unlocks.list.length + unlocks.more - 1 }} more</template></span
        >
        <RouterLink to="/shop" class="btn btn-sm btn-primary shrink-0" @click="celebration.levelUp = null"
          ><Icon name="bag" :size="13" /> Shop</RouterLink
        >
      </div>
    </div>

    <SessionReward v-if="celebration.session" :key="celebration.session.entry.id" />

    <div v-if="celebration.badge && !celebration.session" class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        class="pop-in pointer-events-auto flex items-center gap-3 rounded-2xl bg-hud py-2.5 pr-4 pl-2.5 text-hud-ink shadow-2xl"
        role="status"
      >
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-xp text-[#1a1830]"><Icon :name="celebration.badge.icon" /></span>
        <span>
          <span class="hud-label block text-[10px] text-hud-muted">Badge earned</span>
          <span class="text-sm font-bold">{{ celebration.badge.name }}</span>
        </span>
        <button class="ml-2 text-hud-muted hover:text-hud-ink" aria-label="Dismiss" @click="celebration.badge = null">
          <Icon name="x" :size="16" />
        </button>
      </div>
    </div>
    <div
      v-if="celebration.nudge && giftDone && !celebration.badge && !celebration.session && !celebration.levelUp"
      class="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4 max-sm:top-auto max-sm:bottom-24 lg:top-20"
    >
      <div
        class="pop-in pointer-events-auto flex items-center gap-3 rounded-2xl bg-hud py-2 pr-2 pl-2.5 text-hud-ink shadow-2xl"
        role="status"
        data-shop-nudge
      >
        <span class="flex -space-x-3">
          <span
            v-for="it in celebration.nudge.items"
            :key="it.id"
            class="relative block h-10 w-10 rounded-xl border-2 border-hud bg-white/10 p-1"
            ><ItemPreview :item="it"
          /></span>
        </span>
        <span class="min-w-0">
          <span class="hud-label flex items-center gap-1 text-[10px] text-hud-muted"><CoinIcon :size="11" /> Shop</span>
          <span class="block text-sm font-bold">
            {{ celebration.nudge.count }} new thing{{ celebration.nudge.count === 1 ? '' : 's' }} you can afford</span
          >
        </span>
        <RouterLink to="/shop" class="btn btn-primary btn-sm ml-1" @click="celebration.nudge = null">Look</RouterLink>
        <button class="text-hud-muted hover:text-hud-ink" aria-label="Dismiss" @click="celebration.nudge = null">
          <Icon name="x" :size="16" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
