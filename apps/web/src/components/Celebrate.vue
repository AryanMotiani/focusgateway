<script setup>
// Level-up card, the session reward card, the small "new badge" toast and the "new things
// you can afford" nudge. Driven by rewards.celebration. One big card at a time: the session
// card first (it shows a new badge itself), then the level-up.
import { computed, watch } from 'vue'
import { unlockKind } from '@focusgateway/core'
import { celebration } from '../lib/rewards.js'
import SessionReward from './shop/SessionReward.vue'
import ItemPreview from './shop/ItemPreview.vue'
import CoinIcon from './shop/CoinIcon.vue'
import Icon from './Icon.vue'
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
      class="fixed inset-0 z-[60] grid place-items-center bg-[#0b0918]/60 p-4 backdrop-blur-sm"
      @mousedown.self="celebration.levelUp = null"
    >
      <div class="card pop-in w-full max-w-sm overflow-hidden text-center shadow-2xl" role="dialog" aria-modal="true" aria-label="Level up">
        <div class="relative bg-hud px-6 pt-8 pb-6 text-hud-ink">
          <div class="absolute inset-0 opacity-40" style="background: radial-gradient(circle at 50% 30%, var(--fg-xp), transparent 60%)" />
          <p class="hud-label relative text-xs text-hud-muted">Level up</p>
          <p class="num relative mt-2 flex items-center justify-center gap-3 text-5xl">
            <span class="opacity-50">{{ celebration.levelUp.from }}</span
            ><Icon name="chevronRight" :size="28" /><span
              class="grid h-20 w-20 place-items-center rounded-3xl bg-accent text-on-accent shadow-[inset_0_-5px_0_var(--fg-accent-deep)]"
              >{{ celebration.levelUp.to }}</span
            >
          </p>
          <p class="h-display relative mt-3 text-2xl">{{ celebration.levelUp.title }}</p>
        </div>
        <div class="p-5">
          <template v-if="celebration.levelUp.unlocks.length">
            <p class="label">New in the shop</p>
            <ul class="space-y-2 text-left">
              <li v-for="u in unlocks.list" :key="u.id" class="flex items-center gap-3 rounded-xl bg-sunk px-3 py-2">
                <Icon name="sparkles" class="shrink-0 text-xp" />
                <span class="min-w-0 flex-1 text-sm"
                  ><span class="text-muted">{{ unlockKind(u) }}:</span> <b>{{ u.name }}</b></span
                >
              </li>
              <li v-if="unlocks.more" class="px-3 text-xs text-muted">and {{ unlocks.more }} more in the shop</li>
            </ul>
            <RouterLink to="/shop" class="btn btn-primary mt-4 w-full" @click="celebration.levelUp = null"
              ><Icon name="bag" :size="15" /> Open the shop</RouterLink
            >
          </template>
          <p v-else class="text-sm text-muted">Keep going. Higher levels open rarer things in the shop.</p>
          <button class="btn btn-ghost mt-2 w-full" @click="celebration.levelUp = null">Nice</button>
        </div>
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
      v-if="celebration.nudge && !celebration.badge && !celebration.session && !celebration.levelUp"
      class="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4 lg:top-20"
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
