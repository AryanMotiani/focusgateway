<script setup>
// The shop's shelves: category tabs and the item cards, what you can afford first. Used by
// the shop page (a grid) and the room's decorate panel (one scrolling row, `compact`).
// "New" marks what became affordable or unlocked since the last look; it is remembered as
// seen when the shelves close.
import { computed, onBeforeUnmount, ref } from 'vue'
import { SHOP_CATEGORIES } from '@regimen/core'
import { catalog, markSeen } from '../../lib/shop.js'
import ShopItemCard from './ShopItemCard.vue'
import BuyDialog from './BuyDialog.vue'

const props = defineProps({ compact: Boolean, hideOwned: Boolean })
const emit = defineEmits(['use'])
const TABS = [{ id: 'all', label: 'All' }, ...SHOP_CATEGORIES]
const tab = ref('all')
// what was new when the shelves opened keeps its tag while you look around
const newIds = new Set(catalog.value.filter((i) => i.fresh).map((i) => i.id))
onBeforeUnmount(markSeen)

const order = (i) => (i.affordable ? 0 : i.owned ? 3 : i.locked ? 2 : 1)
const items = computed(() =>
  catalog.value
    .filter((i) => (tab.value === 'all' || i.category === tab.value) && !(props.hideOwned && i.owned))
    // the best you can afford first, then what is closest, then level locked, then owned
    .sort((a, b) => order(a) - order(b) || (order(a) === 2 ? a.level - b.level : 0) || (order(a) ? a.price - b.price : b.price - a.price)),
)
const counts = computed(() => {
  const out = { all: 0 }
  for (const i of catalog.value)
    if (i.affordable) {
      out.all++
      out[i.category] = (out[i.category] || 0) + 1
    }
  return out
})
const open = ref(null)
function scroll(e) {
  if (props.compact && Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY
}
function use(item) {
  open.value = null
  emit('use', item)
}
</script>

<template>
  <div class="flex min-h-0 flex-col" :class="compact ? 'gap-2' : 'gap-4'">
    <div class="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Shop categories">
      <button
        v-for="t in TABS"
        :key="t.id"
        role="tab"
        :aria-selected="tab === t.id"
        class="flex shrink-0 items-center gap-1.5 rounded-(--fg-btn-radius-sm) px-3 py-1.5 font-(family-name:--fg-font-btn) text-xs font-bold whitespace-nowrap transition"
        :class="tab === t.id ? 'bg-accent text-on-accent' : 'bg-sunk text-muted hover:text-ink'"
        :data-shop-tab="t.id"
        @click="tab = t.id"
      >
        {{ t.label }}
        <span
          v-if="counts[t.id]"
          class="coin-chip num grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px]"
          :title="`${counts[t.id]} you can buy now`"
          >{{ counts[t.id] }}</span
        >
      </button>
    </div>
    <div
      :class="compact ? 'flex gap-2 overflow-x-auto pb-1' : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'"
      data-shop-grid
      @wheel="scroll"
    >
      <ShopItemCard v-for="i in items" :key="i.id" :item="i" :compact="compact" :is-new="newIds.has(i.id) && !i.owned" @open="open = i" />
    </div>
    <BuyDialog v-if="open" :key="open.id" :item="open" @close="open = null" @use="use" />
  </div>
</template>
