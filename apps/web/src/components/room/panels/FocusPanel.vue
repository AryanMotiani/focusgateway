<script setup>
// The focus window: the clock (or the round countdown) and the focus timer. The clock grows
// with the window, a short window folds the timer to one line, a big one centres it all.
import { computed } from 'vue'
import { store } from '../../../lib/store.js'
import RoomClock from '../RoomClock.vue'
import FocusCard from '../../FocusCard.vue'

const props = defineProps({ w: { type: Number, default: 360 }, h: { type: Number, default: 0 }, max: Boolean })
// h is 0 in the phone column, where the window takes the height it needs
const natural = computed(() => !props.h)
const compact = computed(() => !natural.value && props.h < 290)
const big = computed(() => !natural.value && props.h >= 520 && props.w >= 520)
const clockPx = computed(() => {
  if (natural.value) return 56
  const room = props.h - 28 - (compact.value ? 80 : 254)
  return Math.round(Math.max(40, Math.min(props.w * (big.value ? 0.16 : 0.19), room * 0.9, big.value ? 200 : 132)))
})
// the message sits next to the clock when there is room, under it when not
const side = computed(() => props.w >= clockPx.value * 3.7 + 150)
const message = computed(() => (store.state?.focus?.active ? 'Deep in it. Keep going.' : 'Put on some beats.'))
</script>

<template>
  <div class="flex min-h-full flex-col" :class="big && 'items-center justify-center gap-4 text-center'">
    <div class="flex gap-x-3 gap-y-1" :class="big ? 'flex-col items-center' : side ? 'items-end justify-between' : 'flex-col'">
      <RoomClock :size="clockPx" />
      <p class="text-xs whitespace-nowrap text-muted" :class="big ? 'text-sm' : side ? 'pb-1 text-right' : ''">{{ message }}</p>
    </div>
    <div v-if="store.state" class="mt-3 border-t border-line pt-3" :class="big && 'w-full max-w-md text-left'">
      <FocusCard :compact="compact" />
    </div>
  </div>
</template>
