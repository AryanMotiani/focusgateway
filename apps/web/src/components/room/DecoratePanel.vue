<script setup>
// Decorate mode: the tray of things to place (items, badges), the avatar editor, the room
// style editor and the shop. Drag a tile into the room, or tap it to drop it in a good spot.
// Drag a placed thing back onto the tray to put it away. Every avatar and room option shows:
// what you do not own yet shows its price (or the level it unlocks at), and tapping it opens
// the buy dialog (see packages/core/src/economy.js for prices and levels).
import { computed, ref, watch } from 'vue'
import { optionsFor, BRIGHTNESS_RANGE, OPTION_FIELDS, DEFAULT_STYLE, optionId, shopItem } from '@focusgateway/core'
import { inventory, room, quickPlace, removeItem, level } from '../../lib/room.js'
import { ownsItem, balance, freshAffordable } from '../../lib/shop.js'
import { HEADWEAR } from './avatarStyle.js'
import OptionPreview from '../shop/OptionPreview.vue'
import ShopGrid from '../shop/ShopGrid.vue'
import BuyDialog from '../shop/BuyDialog.vue'
import CoinIcon from '../shop/CoinIcon.vue'
import Icon from '../Icon.vue'

const props = defineProps({ startDrag: { type: Function, required: true }, tab: { type: String, default: 'items' } })
const emit = defineEmits(['close', 'update:tab', 'scene', 'style'])
const current = computed({ get: () => props.tab, set: (v) => emit('update:tab', v) })

const items = computed(() => inventory.value.objects)
const badges = computed(() => inventory.value.badges.filter((b) => b.owned).concat(inventory.value.badges.filter((b) => !b.owned)))
const ownedCount = computed(() => items.value.filter((i) => i.owned).length)
const badgeCount = computed(() => inventory.value.badges.filter((b) => b.owned).length)

// ---- buying from the tray and the editors
const buying = ref(null)
/** Opens the buy dialog for a shop item id, with its current state. */
function offer(id) {
  const item = shopItem(id)
  if (!item) return
  const locked = item.level > level.value
  buying.value = { ...item, owned: ownsItem(id), locked, affordable: !locked && item.price <= balance.value }
}
/** "Place it now", "Wear it now": what the buy dialog's main button does after buying. */
function use(item) {
  buying.value = null
  if (item.kind === 'object') {
    quickPlace(item.id)
    current.value = 'items'
  } else if (item.kind === 'option') {
    pick({ ...item, owned: true })
    const tab = item.category === 'avatar' ? 'avatar' : 'room'
    section.value[tab] = SECTIONS[tab].find((x) => x.fields.includes(item.field))?.id || section.value[tab]
    current.value = tab
  } else emit(item.kind === 'scene' ? 'scene' : 'style', item.id)
}

// a tile press becomes a drag once the pointer moves, otherwise it is a tap
let press = null
function down(tile, e) {
  if (e.button > 0) return
  press = { tile, x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}
function move(e) {
  if (!press || Math.hypot(e.clientX - press.x, e.clientY - press.y) < 7) return
  const { tile } = press
  press = null
  window.removeEventListener('pointermove', move)
  if (tile.owned) props.startDrag(tile.id, e)
}
function up() {
  window.removeEventListener('pointermove', move)
  if (press) tap(press.tile)
  press = null
}
function tap(tile) {
  if (!tile.owned) {
    if (!tile.badge) offer(tile.id)
    return
  }
  if (tile.placed) removeItem(tile.id)
  else quickPlace(tile.id)
}
function wheel(e) {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY
}

const box = (t) => {
  const pad = 6
  return `${-pad} ${-pad} ${t.w + pad * 2} ${t.h + pad * 2}`
}
const TABS = [
  { id: 'items', label: 'Items', icon: 'sparkles' },
  { id: 'badges', label: 'Badges', icon: 'target' },
  { id: 'avatar', label: 'Avatar', icon: 'edit' },
  { id: 'room', label: 'Room', icon: 'home' },
  { id: 'shop', label: 'Shop', icon: 'bag' },
]
const fresh = computed(() => freshAffordable.value.length)

// ---- avatar and room style options
if (!room.style) room.style = { ...DEFAULT_STYLE }
const SECTIONS = {
  avatar: [
    { id: 'you', label: 'You', fields: ['build', 'skin'] },
    { id: 'hair', label: 'Hair', fields: ['hair'] },
    { id: 'hairColor', label: 'Hair colour', fields: ['hairColor'] },
    { id: 'top', label: 'Top', fields: ['top'] },
    { id: 'topColor', label: 'Top colour', fields: ['topColor'] },
    { id: 'extras', label: 'Extras', fields: ['headphonesColor', 'glassesStyle', 'earrings'] },
  ],
  room: [
    { id: 'wall', label: 'Walls', fields: ['wall', 'pattern'] },
    { id: 'floor', label: 'Floor', fields: ['floor'] },
    { id: 'curtain', label: 'Curtains', fields: ['curtain'] },
    { id: 'wood', label: 'Wood', fields: ['wood'] },
    { id: 'light', label: 'Lighting', fields: ['light', 'fairy'] },
  ],
}
const STYLE_FIELDS = new Set(['wall', 'pattern', 'floor', 'curtain', 'wood', 'light', 'fairy'])
const groupOf = (field) => (STYLE_FIELDS.has(field) ? 'style' : 'avatar')
const section = ref({ avatar: 'hair', room: 'wall' })
const sections = computed(() => SECTIONS[current.value] || [])
const active = computed(() => sections.value.find((x) => x.id === section.value[current.value]) || sections.value[0])

const valueOf = (field) => room[groupOf(field)]?.[field]
/** Every option of a field with its state. A saved value stays usable even if not owned. */
function opts(field) {
  return optionsFor(field).map((o) => ({
    ...o,
    owned: ownsItem(optionId(field, o.value)) || valueOf(field) === o.value,
    locked: o.level > level.value,
    on: valueOf(field) === o.value,
  }))
}
const counts = computed(() => {
  const out = {}
  for (const list of Object.values(SECTIONS))
    for (const sec of list) {
      const all = sec.fields.flatMap((f) => optionsFor(f))
      out[sec.id] = [all.filter((o) => ownsItem(optionId(o.field, o.value))).length, all.length]
    }
  return out
})

function pick(o) {
  if (!o.owned) return offer(optionId(o.field, o.value))
  const g = groupOf(o.field)
  room[g][o.field] = o.value
  // picking a headphone colour or glasses style also puts them on
  if (o.field === 'headphonesColor') room.avatar.headphones = true
  if (o.field === 'glassesStyle') room.avatar.glasses = true
}
watch(current, () => (buying.value = null))

const fieldLabel = (field) => {
  if (field === 'hairColor' && HEADWEAR.has(room.avatar.hair)) return room.avatar.hair === 'hijab' ? 'Hijab colour' : 'Hat colour'
  if (field === 'headphonesColor') return 'Headphones'
  return OPTION_FIELDS[field]
}
const PREVIEW = {
  hair: 'avatar',
  top: 'avatar',
  glassesStyle: 'avatar',
  earrings: 'avatar',
  pattern: 'art',
  floor: 'art',
  light: 'art',
  fairy: 'art',
}
const kindOf = (field) => PREVIEW[field] || (field === 'build' ? 'avatar' : 'swatch')
const hidesEars = (h) => ['long', 'wavy', 'halfup', 'bob', 'curly', 'afro', 'braids', 'locs', 'hijab'].includes(h)
const bright = computed({
  get: () => room.style.brightness ?? 1,
  set: (v) => (room.style.brightness = Number(v)),
})
</script>

<template>
  <section
    class="flex flex-col rounded-3xl border border-white/10 bg-[#15121f]/85 text-white backdrop-blur-xl"
    data-room-tray
    aria-label="Decorate the room"
  >
    <div class="flex flex-wrap items-center gap-2 px-3 pt-3 sm:px-4">
      <div class="flex gap-1 rounded-full bg-white/5 p-1" role="tablist">
        <button
          v-for="t in TABS"
          :key="t.id"
          role="tab"
          :aria-selected="current === t.id"
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition max-sm:px-2.5"
          :class="current === t.id ? 'bg-white text-[#120f24]' : 'text-white/70 hover:bg-white/10'"
          @click="current = t.id"
        >
          <Icon :name="t.icon" :size="13" />{{ t.label }}
          <span v-if="t.id === 'items'" class="num opacity-60 max-sm:hidden">{{ ownedCount }}/{{ items.length }}</span>
          <span v-if="t.id === 'badges'" class="num opacity-60 max-sm:hidden">{{ badgeCount }}</span>
          <span v-if="t.id === 'shop'" class="num flex items-center gap-1 opacity-80"><CoinIcon :size="12" />{{ balance }}</span>
          <span
            v-if="t.id === 'shop' && fresh && current !== 'shop'"
            class="grid h-4 min-w-4 place-items-center rounded-full bg-[#ff5d8f] px-1 text-[9px] text-white"
            data-shop-dot
            >{{ fresh }}</span
          >
        </button>
      </div>
      <p class="min-w-0 flex-1 truncate text-xs text-white/55 max-sm:hidden">
        <template v-if="current === 'avatar' || current === 'room'"
          >Changes show up in the room right away. Tap a price to buy it with coins.</template
        >
        <template v-else-if="current === 'shop'">Earn coins by studying, spend them here. What you can afford comes first.</template>
        <template v-else>Drag into the room, or tap to place. Drag back here, or tap again, to put away.</template>
      </p>
      <button
        class="ml-auto flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#120f24]"
        @click="emit('close')"
      >
        <Icon name="check" :size="14" /> Done
      </button>
    </div>

    <!-- the shop, one scrolling row -->
    <div v-if="current === 'shop'" class="min-h-0 flex-1 p-3 sm:px-4" data-room-shop>
      <ShopGrid dark compact @use="use" />
    </div>

    <!-- items and badges -->
    <div
      v-else-if="current === 'items' || current === 'badges'"
      class="grid auto-cols-[88px] grid-flow-col grid-rows-[92px_92px] gap-2 overflow-x-auto overflow-y-hidden p-3 sm:px-4"
      @wheel="wheel"
    >
      <button
        v-for="t in current === 'items' ? items : badges"
        :key="t.id"
        class="tile group relative flex h-[92px] flex-col items-center justify-between rounded-2xl border p-1.5 text-center transition"
        :class="
          !t.owned
            ? t.badge
              ? 'cursor-not-allowed border-white/5 bg-white/[.03]'
              : 'border-white/5 bg-white/[.03] hover:border-[#ffc233]/50'
            : t.placed
              ? 'border-[#ffe08a]/50 bg-[#ffe08a]/10'
              : 'cursor-grab border-white/10 bg-white/[.07] hover:border-white/30 hover:bg-white/[.12]'
        "
        :title="
          t.owned
            ? t.name
            : t.badge
              ? `${t.name}: ${t.progress?.value ?? 0} of ${t.progress?.target}`
              : t.locked
                ? `${t.name}: unlocks at level ${t.level}, then ${t.price} coins`
                : `${t.name}: ${t.price} coins in the shop`
        "
        :aria-label="t.owned ? (t.placed ? `Put away ${t.name}` : `Place ${t.name}`) : t.badge ? `${t.name}, locked` : `Buy ${t.name}`"
        :aria-disabled="!t.owned"
        @pointerdown="down(t, $event)"
        @keydown.enter.prevent="tap(t)"
        @keydown.space.prevent="tap(t)"
      >
        <svg
          :viewBox="box(t)"
          class="h-[56px] w-[74px]"
          :class="!t.owned && (t.badge || t.locked ? 'opacity-30 grayscale' : 'opacity-55 saturate-50')"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <g v-html="t.svg" />
          <g v-if="t.glow" v-html="t.glow" />
        </svg>
        <span class="line-clamp-1 w-full text-[10px] leading-tight font-semibold" :class="t.owned ? 'text-white/85' : 'text-white/40'">{{
          t.name
        }}</span>
        <span
          v-if="!t.owned && (t.badge || t.locked)"
          class="num absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white/70"
          ><Icon name="lock" :size="9" />{{
            t.badge ? `${Math.min(t.progress.value, t.progress.target)}/${t.progress.target}` : 'LV ' + t.level
          }}</span
        >
        <span
          v-else-if="!t.owned"
          class="num absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
          :class="t.price <= balance ? 'bg-[#ffc233] text-[#2a1d00]' : 'bg-black/55 text-white/80'"
          ><CoinIcon :size="9" />{{ t.price }}</span
        >
        <span
          v-else-if="t.placed"
          class="absolute top-1.5 right-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#ffe08a] text-[#120f24]"
          ><Icon name="check" :size="10"
        /></span>
      </button>
      <p v-if="current === 'badges' && !badgeCount" class="row-span-2 self-center px-2 text-xs text-white/55">
        Earn milestones (tasks, streaks, focus hours) and they show up here as trophies, medals and frames.
      </p>
    </div>

    <!-- avatar and room style: pick a section, then an option -->
    <div v-else class="flex min-h-0 flex-1 flex-col text-xs">
      <div class="flex shrink-0 gap-1 overflow-x-auto px-3 pt-2.5 sm:px-4" role="tablist" @wheel="wheel">
        <button
          v-for="sec in sections"
          :key="sec.id"
          role="tab"
          :aria-selected="active.id === sec.id"
          class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-bold whitespace-nowrap transition"
          :class="active.id === sec.id ? 'bg-white/90 text-[#120f24]' : 'bg-white/5 text-white/70 hover:bg-white/10'"
          @click="section[current] = sec.id"
        >
          {{ sec.label }}
          <span class="num text-[10px] opacity-60">{{ counts[sec.id][0] }}/{{ counts[sec.id][1] }}</span>
        </button>
      </div>
      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 max-sm:max-h-[46vh] sm:px-4">
        <div v-for="field in active.fields" :key="field">
          <div class="mb-1.5 flex items-center gap-3">
            <p class="hud-label text-white/55">{{ fieldLabel(field) }}</p>
            <!-- on and off switches for the extras -->
            <button
              v-if="field === 'headphonesColor' || field === 'glassesStyle'"
              class="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              :class="
                room.avatar[field === 'glassesStyle' ? 'glasses' : 'headphones']
                  ? 'bg-white text-[#120f24]'
                  : 'bg-white/10 hover:bg-white/20'
              "
              :aria-pressed="room.avatar[field === 'glassesStyle' ? 'glasses' : 'headphones']"
              @click="
                field === 'glassesStyle' ? (room.avatar.glasses = !room.avatar.glasses) : (room.avatar.headphones = !room.avatar.headphones)
              "
            >
              {{ field === 'glassesStyle' ? (room.avatar.glasses ? 'Wearing' : 'Off') : room.avatar.headphones ? 'Wearing' : 'Off' }}
            </button>
            <p v-if="field === 'earrings' && hidesEars(room.avatar.hair)" class="text-white/40">Show with hair that leaves the ears out.</p>
            <label v-if="field === 'light'" class="ml-auto flex items-center gap-2 text-white/70">
              <Icon name="sun" :size="13" /> Brightness
              <input
                v-model.number="bright"
                type="range"
                :min="BRIGHTNESS_RANGE[0]"
                :max="BRIGHTNESS_RANGE[1]"
                step="0.05"
                class="w-24 accent-white"
                aria-label="Lamp brightness"
              />
            </label>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="o in opts(field)"
              :key="o.value"
              class="opt relative flex flex-col items-center justify-between gap-1 rounded-2xl border p-1.5 text-center transition"
              :class="[
                kindOf(field) === 'swatch' ? 'w-[64px]' : 'w-[76px]',
                o.on
                  ? 'border-[#ffe08a]/70 bg-[#ffe08a]/12'
                  : o.owned
                    ? 'border-white/10 bg-white/[.06] hover:border-white/30 hover:bg-white/[.12]'
                    : 'border-white/5 bg-white/[.02] hover:border-[#ffc233]/50',
              ]"
              :aria-pressed="o.on"
              :aria-label="o.owned ? o.name : o.locked ? `${o.name}, unlocks at level ${o.level}` : `Buy ${o.name} for ${o.price} coins`"
              :title="
                o.owned
                  ? o.name
                  : o.locked
                    ? `${o.name}: unlocks at level ${o.level}, then ${o.price} coins`
                    : `${o.name}: ${o.price} coins`
              "
              @click="pick(o)"
            >
              <span
                class="grid w-full place-items-center"
                :class="[kindOf(field) === 'swatch' ? 'h-8' : 'h-[52px]', !o.owned && 'opacity-50 saturate-50']"
              >
                <OptionPreview :field="field" :value="o.value" />
              </span>
              <span
                class="line-clamp-1 w-full text-[10px] leading-tight font-semibold"
                :class="o.owned ? 'text-white/85' : 'text-white/40'"
                >{{ o.name }}</span
              >
              <span
                v-if="!o.owned && o.locked"
                class="num absolute top-1 right-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white/75"
                ><Icon name="lock" :size="9" />LV {{ o.level }}</span
              >
              <span
                v-else-if="!o.owned"
                class="num absolute top-1 right-1 flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-bold"
                :class="o.price <= balance ? 'bg-[#ffc233] text-[#2a1d00]' : 'bg-black/60 text-white/80'"
                ><CoinIcon :size="9" />{{ o.price }}</span
              >
              <span v-else-if="o.on" class="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-[#ffe08a] text-[#120f24]"
                ><Icon name="check" :size="10"
              /></span>
            </button>
          </div>
        </div>
        <p v-if="active.id === 'you'" class="text-white/45">Build and skin tone are always yours to pick, free.</p>
        <p v-if="active.id === 'light'" class="text-white/45">
          The lamp shows at night, dusk and sunset. Fairy lights need the Fairy lights item in the room.
        </p>
      </div>
    </div>
    <BuyDialog v-if="buying" :key="buying.id" :item="buying" @close="buying = null" @use="use" />
  </section>
</template>

<style scoped>
.tile {
  touch-action: pan-x;
}
</style>
