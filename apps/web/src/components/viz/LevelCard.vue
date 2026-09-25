<script setup>
// Level, title, XP bar, where the XP came from, and the next rewards on the road.
import { computed } from 'vue'
import { nextUnlocks, unlockKind } from '@focusgateway/core'
import { progress, isGame } from '../../lib/rewards.js'
import Icon from '../Icon.vue'
const p = computed(() => progress.value)
const next = computed(() => nextUnlocks(p.value.level, 4))
const SRC = [
  ['tasks', 'Tasks', 'var(--fg-accent)'],
  ['habits', 'Habits', 'var(--fg-good)'],
  ['focus', 'Focus', 'var(--fg-warm)'],
  ['discipline', 'Discipline', 'var(--fg-xp)'],
]
</script>
<template>
  <section v-if="p" class="card overflow-hidden" :class="isGame && '!bg-hud !text-hud-ink !border-hud-line'">
    <div class="flex flex-wrap items-center gap-4 p-5">
      <div
        class="num grid h-20 w-20 shrink-0 place-items-center rounded-3xl text-3xl"
        :class="isGame ? 'bg-accent text-on-accent shadow-[inset_0_-5px_0_var(--fg-accent-deep)]' : 'bg-accent-soft text-accent'"
      >
        {{ p.level }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="hud-label text-xs" :class="isGame ? 'text-hud-muted' : 'text-muted'">Level {{ p.level }}</p>
        <p class="h-display text-3xl">{{ p.title }}</p>
        <div class="xpbar mt-2" :class="isGame && '!bg-white/10'"><i :style="{ width: Math.max(2, p.progress * 100) + '%' }" /></div>
        <p class="mt-1 text-xs" :class="isGame ? 'text-hud-muted' : 'text-muted'">
          <span class="num">{{ p.into }} / {{ p.needed }}</span> XP to level {{ p.level + 1 }} · <span class="num">{{ p.xp }}</span> XP
          total
        </p>
      </div>
    </div>
    <div class="grid gap-4 border-t p-5 sm:grid-cols-2" :class="isGame ? 'border-hud-line' : 'border-line'">
      <div>
        <p class="hud-label mb-2 text-xs" :class="isGame ? 'text-hud-muted' : 'text-muted'">Where your XP came from</p>
        <div class="flex h-3 overflow-hidden rounded-full" :class="isGame ? 'bg-white/10' : 'bg-sunk'">
          <span v-for="[k, , c] in SRC" :key="k" :style="{ width: (p.breakdown[k] / Math.max(1, p.xp)) * 100 + '%', background: c }" />
        </div>
        <div class="mt-2 grid grid-cols-2 gap-1 text-xs">
          <span v-for="[k, l, c] in SRC" :key="k" class="flex items-center gap-1.5"
            ><span class="h-2 w-2 rounded-full" :style="{ background: c }" />{{ l }} <b class="num ml-auto">{{ p.breakdown[k] }}</b></span
          >
        </div>
      </div>
      <div>
        <p class="hud-label mb-2 text-xs" :class="isGame ? 'text-hud-muted' : 'text-muted'">Coming up</p>
        <ul class="space-y-1.5 text-sm">
          <li v-for="u in next" :key="u.id" class="flex items-center gap-2">
            <Icon name="lock" :size="14" class="opacity-60" />
            <span class="min-w-0 flex-1 truncate"
              ><span class="text-xs opacity-60">{{ unlockKind(u) }}:</span> {{ u.name }}</span
            >
            <span class="num text-xs opacity-70">LV {{ u.level }}</span>
          </li>
          <li v-if="!next.length" class="opacity-70">Everything unlocked. Legend.</li>
        </ul>
      </div>
    </div>
  </section>
</template>
