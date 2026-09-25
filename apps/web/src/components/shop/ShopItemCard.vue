<script setup>
// One thing in the shop: its picture, name, price and state (new, affordable, how far off,
// locked by level, owned). The whole card is a button that opens the buy dialog.
import { computed } from 'vue'
import { shopKind } from '@focusgateway/core'
import { balance } from '../../lib/shop.js'
import ItemPreview from './ItemPreview.vue'
import CoinIcon from './CoinIcon.vue'
import Icon from '../Icon.vue'

const props = defineProps({ item: { type: Object, required: true }, dark: Boolean, compact: Boolean, isNew: Boolean })
const emit = defineEmits(['open'])
const pct = computed(() => Math.min(100, Math.round((balance.value / props.item.price) * 100)))
const label = computed(() => {
  const i = props.item
  if (i.owned) return `${i.name}, owned`
  if (i.locked) return `${i.name}, unlocks at level ${i.level}, then ${i.price} coins`
  return `${i.name}, ${i.price} coins${i.affordable ? '' : `, ${i.price - balance.value} more to go`}`
})
</script>

<template>
  <button
    class="card-btn group relative flex flex-col overflow-hidden text-left transition"
    :class="[
      dark ? 'rounded-2xl border' : 'card',
      dark
        ? item.affordable
          ? 'border-[#ffd34d]/45 bg-white/[.09] hover:border-[#ffd34d]/80 hover:bg-white/[.14]'
          : item.owned
            ? 'border-white/10 bg-white/[.04]'
            : 'border-white/10 bg-white/[.05] hover:border-white/25'
        : item.affordable && 'afford',
      compact ? 'w-[138px] shrink-0' : '',
    ]"
    :aria-label="label"
    :data-shop-item="item.id"
    @click="emit('open', item)"
  >
    <span
      class="relative grid place-items-center"
      :class="[compact ? 'h-[100px] p-1.5' : 'h-28 p-3', dark ? 'bg-black/20' : 'bg-sunk', (item.locked || item.owned) && 'dim']"
    >
      <ItemPreview :item="item" :big="!compact" />
      <span
        v-if="isNew"
        class="new-tag num absolute top-1.5 left-1.5 rounded-full bg-[#ff5d8f] px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white uppercase"
        >New</span
      >
      <span
        v-if="item.owned"
        class="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#7cd992] text-[#0e2a16]"
        title="Owned"
        ><Icon name="check" :size="12"
      /></span>
      <span
        v-else-if="item.locked"
        class="num absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white/85"
        ><Icon name="lock" :size="10" />LV {{ item.level }}</span
      >
    </span>
    <span class="flex flex-1 flex-col gap-1" :class="compact ? 'px-2 pt-1.5 pb-2' : 'px-3 pt-2.5 pb-3'">
      <span class="min-w-0">
        <span class="block truncate font-bold" :class="compact ? 'text-[11px]' : 'text-sm'">{{ item.name }}</span>
        <span v-if="!compact" class="block truncate text-[11px]" :class="dark ? 'text-white/50' : 'text-muted'">{{ shopKind(item) }}</span>
      </span>
      <span class="mt-auto flex items-center gap-1.5" :class="compact ? 'text-xs' : 'text-sm'">
        <template v-if="item.owned">
          <span class="font-bold" :class="dark ? 'text-[#7cd992]' : 'text-good'">Owned</span>
        </template>
        <template v-else>
          <CoinIcon :size="compact ? 13 : 16" :class="!item.affordable && 'opacity-60 grayscale-[.4]'" />
          <span class="num font-bold" :class="!item.affordable && (dark ? 'text-white/55' : 'text-muted')">{{ item.price }}</span>
          <span
            v-if="item.affordable"
            class="ml-auto rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
            :class="dark ? 'bg-[#ffd34d] text-[#2a1d00]' : 'bg-accent text-on-accent'"
            >Buy</span
          >
          <span v-else-if="item.locked" class="ml-auto text-[10px] font-semibold" :class="dark ? 'text-white/45' : 'text-muted'"
            >Level {{ item.level }}</span
          >
        </template>
      </span>
      <!-- how close you are: fills up as coins come in -->
      <span v-if="!item.owned && !item.locked && !item.affordable" class="flex items-center gap-1.5">
        <span class="h-1.5 flex-1 overflow-hidden rounded-full" :class="dark ? 'bg-white/10' : 'bg-sunk'"
          ><i class="block h-full rounded-full bg-[#ffc233]" :style="{ width: pct + '%' }"
        /></span>
        <span class="num text-[10px]" :class="dark ? 'text-white/45' : 'text-muted'">{{ pct }}%</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.dim {
  filter: saturate(0.55);
  opacity: 0.7;
}
.afford {
  box-shadow:
    0 0 0 2px color-mix(in srgb, #ffc233 55%, transparent),
    var(--fg-card-shadow);
}
.card-btn:hover {
  transform: translateY(-2px);
}
.card-btn:active {
  transform: translateY(0) scale(0.98);
}
.new-tag {
  animation: wiggle 2.4s ease-in-out infinite;
}
@keyframes wiggle {
  0%,
  86%,
  100% {
    transform: rotate(0);
  }
  90% {
    transform: rotate(-8deg) scale(1.08);
  }
  95% {
    transform: rotate(6deg) scale(1.08);
  }
}
</style>
