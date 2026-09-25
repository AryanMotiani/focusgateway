<script setup>
// A little slice of the app in the current look. It uses the live tokens, so it changes the moment a setting does.
import { isGame } from '../../lib/rewards.js'
import Icon from '../Icon.vue'
</script>

<template>
  <div class="card overflow-hidden" aria-label="Preview">
    <div class="flex items-center justify-between gap-2 px-4 pt-3" :class="isGame && 'bg-hud pb-3 text-hud-ink'">
      <span class="hud-label" :class="isGame ? 'text-hud-muted' : 'text-muted'">Preview</span>
      <span class="num text-xs" :class="isGame ? 'text-xp' : 'text-accent'">{{ isGame ? 'LV 7 · 340 XP' : 'Level 7' }}</span>
    </div>
    <div class="space-y-3 p-4">
      <p class="h-display text-3xl leading-none">Problem set 3</p>
      <p class="text-sm text-muted">Due today at 5 pm. Finish it and Instagram opens for the evening.</p>
      <div class="flex flex-wrap items-center gap-2">
        <span class="chip">School</span>
        <span class="chip !bg-warm-soft !text-warm"><Icon name="flame" :size="12" /> 6 days</span>
        <span class="chip !bg-good-soft !text-good">Done 2/3</span>
      </div>
      <div>
        <div class="xpbar"><i style="width: 64%" /></div>
        <p class="mt-1 flex justify-between text-[11px] text-muted"><span>Level 7</span><span class="num">64%</span></p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-primary btn-sm flex-1">Start focus</button>
        <button type="button" class="btn btn-sm">Later</button>
      </div>
    </div>
  </div>
</template>
