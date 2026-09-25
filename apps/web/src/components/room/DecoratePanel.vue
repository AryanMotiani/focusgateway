<script setup>
// Decorate mode: the tray of things to place (items, badges), the avatar editor and the
// room style editor. Drag a tile into the room, or tap it to drop it in a good spot. Drag a
// placed thing back onto the tray to put it away. Every avatar and room option shows, the
// locked ones greyed with the level they unlock at (see packages/core/src/options.js).
import { computed, ref, watch } from 'vue'
import { optionsFor, DEFAULT_AVATAR, DEFAULT_STYLE, BRIGHTNESS_RANGE, OPTION_FIELDS } from '@focusgateway/core'
import { inventory, room, quickPlace, removeItem, level } from '../../lib/room.js'
import { SKIN, HEADWEAR, swatchOf } from './avatarStyle.js'
import { wallOf, woodOf, PATTERNS, FLOORS, CURTAINS, LAMPS, FAIRY, styleSwatch } from './roomStyle.js'
import RoomAvatar from './RoomAvatar.vue'
import Icon from '../Icon.vue'

const props = defineProps({ startDrag: { type: Function, required: true }, tab: { type: String, default: 'items' } })
const emit = defineEmits(['close', 'update:tab'])
const current = computed({ get: () => props.tab, set: (v) => emit('update:tab', v) })

const items = computed(() => inventory.value.objects)
const badges = computed(() => inventory.value.badges.filter((b) => b.owned).concat(inventory.value.badges.filter((b) => !b.owned)))
const ownedCount = computed(() => items.value.filter((i) => i.owned).length)
const badgeCount = computed(() => inventory.value.badges.filter((b) => b.owned).length)

// a tile press becomes a drag once the pointer moves, otherwise it is a tap
let press = null
function down(tile, e) {
  if (!tile.owned || e.button > 0) return
  press = { tile, x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}
function move(e) {
  if (!press || Math.hypot(e.clientX - press.x, e.clientY - press.y) < 7) return
  const { tile } = press
  press = null
  window.removeEventListener('pointermove', move)
  props.startDrag(tile.id, e)
}
function up() {
  window.removeEventListener('pointermove', move)
  if (press) tap(press.tile)
  press = null
}
function tap(tile) {
  if (!tile.owned) return
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
]

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
/** Every option of a field with its state. A saved value stays usable even above your level. */
function opts(field) {
  return optionsFor(field).map((o) => ({
    ...o,
    owned: o.level <= level.value || valueOf(field) === o.value,
    on: valueOf(field) === o.value,
  }))
}
const counts = computed(() => {
  const out = {}
  for (const list of Object.values(SECTIONS))
    for (const sec of list) {
      const all = sec.fields.flatMap((f) => optionsFor(f))
      out[sec.id] = [all.filter((o) => o.level <= level.value).length, all.length]
    }
  return out
})

// tapping a locked option says when it unlocks
const hint = ref(null)
let hintT = 0
function pick(o) {
  if (!o.owned) {
    hint.value = `${OPTION_FIELDS[o.field]} ${o.name} unlocks at level ${o.level}. You are level ${level.value}.`
    clearTimeout(hintT)
    hintT = setTimeout(() => (hint.value = null), 4000)
    return
  }
  hint.value = null
  const g = groupOf(o.field)
  room[g][o.field] = o.value
  // picking a headphone colour or glasses style also puts them on
  if (o.field === 'headphonesColor') room.avatar.headphones = true
  if (o.field === 'glassesStyle') room.avatar.glasses = true
}
watch([current, active], () => (hint.value = null))

const fieldLabel = (field) => {
  if (field === 'hairColor' && HEADWEAR.has(room.avatar.hair)) return room.avatar.hair === 'hijab' ? 'Hijab colour' : 'Hat colour'
  if (field === 'headphonesColor') return 'Headphones'
  return OPTION_FIELDS[field]
}
// how each option is shown: a mini avatar, a swatch, or a little drawing
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
const AV_BOX = {
  hair: '-66 -346 148 150',
  top: '-112 -300 226 236',
  build: '-112 -330 226 266',
  glassesStyle: '-42 -302 100 70',
  earrings: '-40 -300 100 80',
}
const hidesEars = (h) => ['long', 'wavy', 'halfup', 'bob', 'curly', 'afro', 'braids', 'locs', 'hijab'].includes(h)
function previewAvatar(o) {
  const av = { ...DEFAULT_AVATAR, ...room.avatar, headphones: false, [o.field]: o.value }
  if (o.field === 'glassesStyle') av.glasses = true
  if (o.field === 'earrings' && hidesEars(av.hair)) av.hair = 'bun'
  return av
}
const swatch = (o) => (groupOf(o.field) === 'style' ? styleSwatch(o.field, o.value) : swatchOf(o.field, o.value, room.avatar.hair))

// little drawings for the room options, in a 64 x 44 box
const wallNow = computed(() => wallOf(room.style.wall))
const woodNow = computed(() => woodOf(room.style.wood))
function patternTile(value) {
  const p = PATTERNS[value]?.(wallNow.value.ink, woodNow.value)
  return p ? { w: p.w / 2.5, h: p.h / 2.5, svg: `<g transform="scale(.4)">${p.svg}</g>` } : null
}
const curtainBg = (v) => {
  const c = CURTAINS[v]
  return `repeating-linear-gradient(90deg, ${c[0]} 0 6px, ${c[1]} 6px 11px, ${c[2]} 11px 13px)`
}
const woodBg = (v) => {
  const w = woodOf(v)
  return `linear-gradient(180deg, ${w.hi} 0 18%, ${w.top} 18% 60%, ${w.b} 60% 82%, ${w.d} 82%)`
}
const lampBg = (v) => {
  const l = LAMPS[v]
  if (l.cycle)
    return 'radial-gradient(circle, #fff 0 12%, transparent 13%), conic-gradient(#ff7aa8, #ffb35c, #7cf0a4, #6fb0ff, #b48cff, #ff7aa8)'
  return `radial-gradient(circle at 50% 50%, ${l.bulb[0]} 0 14%, ${l.pool[0]} 30%, ${l.pool[1]}55 62%, #15121f 80%)`
}
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
        </button>
      </div>
      <p class="min-w-0 flex-1 truncate text-xs text-white/55 max-sm:hidden">
        <template v-if="current === 'avatar' || current === 'room'"
          >Changes show up in the room right away. More unlock as you level up.</template
        >
        <template v-else>Drag into the room, or tap to place. Drag back here, or tap again, to put away.</template>
      </p>
      <button
        class="ml-auto flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#120f24]"
        @click="emit('close')"
      >
        <Icon name="check" :size="14" /> Done
      </button>
    </div>

    <!-- items and badges -->
    <div
      v-if="current === 'items' || current === 'badges'"
      class="grid auto-cols-[88px] grid-flow-col grid-rows-[92px_92px] gap-2 overflow-x-auto overflow-y-hidden p-3 sm:px-4"
      @wheel="wheel"
    >
      <button
        v-for="t in current === 'items' ? items : badges"
        :key="t.id"
        class="tile group relative flex h-[92px] flex-col items-center justify-between rounded-2xl border p-1.5 text-center transition"
        :class="
          !t.owned
            ? 'cursor-not-allowed border-white/5 bg-white/[.03]'
            : t.placed
              ? 'border-[#ffe08a]/50 bg-[#ffe08a]/10'
              : 'cursor-grab border-white/10 bg-white/[.07] hover:border-white/30 hover:bg-white/[.12]'
        "
        :title="
          t.owned
            ? t.name
            : t.level
              ? `${t.name}: unlocks at level ${t.level}`
              : `${t.name}: ${t.progress?.value ?? 0} of ${t.progress?.target}`
        "
        :aria-label="t.owned ? (t.placed ? `Put away ${t.name}` : `Place ${t.name}`) : `${t.name}, locked`"
        :aria-disabled="!t.owned"
        @pointerdown="down(t, $event)"
        @keydown.enter.prevent="tap(t)"
        @keydown.space.prevent="tap(t)"
      >
        <svg
          :viewBox="box(t)"
          class="h-[56px] w-[74px]"
          :class="!t.owned && 'opacity-30 grayscale'"
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
          v-if="!t.owned"
          class="num absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white/70"
          ><Icon name="lock" :size="9" />{{
            t.level ? 'LV ' + t.level : `${Math.min(t.progress.value, t.progress.target)}/${t.progress.target}`
          }}</span
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
      <p
        v-if="hint"
        class="mx-3 mt-2 flex items-center gap-1.5 rounded-xl bg-[#ffe08a]/15 px-3 py-1.5 font-semibold text-[#ffe08a] sm:mx-4"
        role="status"
      >
        <Icon name="lock" :size="12" />{{ hint }}
      </p>
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
                    : 'border-white/5 bg-white/[.02]',
              ]"
              :aria-pressed="o.on"
              :aria-disabled="!o.owned"
              :aria-label="o.owned ? o.name : `${o.name}, unlocks at level ${o.level}`"
              :title="o.owned ? o.name : `${o.name}: unlocks at level ${o.level}`"
              @click="pick(o)"
            >
              <span
                class="grid w-full place-items-center"
                :class="[kindOf(field) === 'swatch' ? 'h-8' : 'h-[52px]', !o.owned && 'opacity-40 saturate-50']"
              >
                <!-- mini avatar -->
                <svg v-if="kindOf(field) === 'avatar'" :viewBox="AV_BOX[field]" class="h-full w-full" aria-hidden="true">
                  <RoomAvatar :avatar="previewAvatar(o)" :uid="`pv-${field}-${o.value}`" still bare />
                </svg>
                <!-- colour swatches -->
                <span
                  v-else-if="
                    field === 'skin' || field === 'hairColor' || field === 'topColor' || field === 'headphonesColor' || field === 'wall'
                  "
                  class="h-7 w-7 rounded-full shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]"
                  :style="{
                    background:
                      field === 'skin'
                        ? SKIN[o.value][0]
                        : field === 'wall'
                          ? `linear-gradient(180deg, ${swatch(o)} 58%, ${wallOf(o.value).low} 58%)`
                          : swatch(o),
                  }"
                />
                <span v-else-if="field === 'curtain'" class="h-7 w-7 rounded-lg" :style="{ background: curtainBg(o.value) }" />
                <span v-else-if="field === 'wood'" class="h-7 w-9 rounded-md" :style="{ background: woodBg(o.value) }" />
                <span v-else-if="field === 'light'" class="h-[46px] w-[46px] rounded-full" :style="{ background: lampBg(o.value) }" />
                <!-- wallpaper on your wall colour -->
                <svg v-else-if="field === 'pattern'" viewBox="0 0 64 46" class="h-[46px] w-[64px] rounded-lg" aria-hidden="true">
                  <defs v-if="patternTile(o.value)">
                    <pattern
                      :id="`pv-pat-${o.value}`"
                      :width="patternTile(o.value).w"
                      :height="patternTile(o.value).h"
                      patternUnits="userSpaceOnUse"
                      v-html="patternTile(o.value).svg"
                    />
                  </defs>
                  <rect width="64" height="46" :fill="wallNow.base" />
                  <rect v-if="patternTile(o.value)" width="64" height="34" :fill="`url(#pv-pat-${o.value})`" />
                  <rect y="34" width="64" height="12" :fill="wallNow.low" />
                  <rect y="33" width="64" height="2" :fill="wallNow.rail" />
                </svg>
                <svg v-else-if="field === 'floor'" viewBox="0 0 64 46" class="h-[46px] w-[64px] rounded-lg" aria-hidden="true">
                  <defs>
                    <linearGradient :id="`pv-fl-${o.value}`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" :stop-color="FLOORS[o.value].top" />
                      <stop offset="1" :stop-color="FLOORS[o.value].bottom" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="46" :fill="`url(#pv-fl-${o.value})`" />
                  <g v-if="FLOORS[o.value].kind === 'boards'" :stroke="FLOORS[o.value].line" stroke-width="1.5" opacity=".6">
                    <path d="M0 12 H64 M0 26 H64 M0 40 H64 M20 0 V12 M48 0 V12 M8 12 V26 M38 12 V26 M26 26 V40 M56 26 V40" />
                  </g>
                  <g v-else-if="FLOORS[o.value].kind === 'tiles'">
                    <path
                      d="M0 0 H16 V16 H0Z M32 0 H48 V16 H32Z M16 16 H32 V32 H16Z M48 16 H64 V32 H48Z M0 32 H16 V48 H0Z M32 32 H48 V48 H32Z"
                      :fill="FLOORS[o.value].alt"
                    />
                    <path d="M0 16 H64 M0 32 H64 M16 0 V46 M32 0 V46 M48 0 V46" :stroke="FLOORS[o.value].line" stroke-width="1.2" />
                  </g>
                  <g v-else fill="#000" opacity=".12">
                    <circle v-for="k in 14" :key="k" :cx="(k * 23) % 62" :cy="(k * 17) % 44" r="1" />
                  </g>
                </svg>
                <svg v-else-if="field === 'fairy'" viewBox="0 0 64 30" class="h-[30px] w-[64px]" aria-hidden="true">
                  <path d="M2 4 Q32 26 62 4" stroke="#6c6275" stroke-width="1.2" fill="none" />
                  <g v-for="(c, k) in [0, 1, 2, 3, 4]" :key="k">
                    <circle
                      :cx="8 + k * 12"
                      :cy="9 + Math.sin(((k + 0.5) / 5) * Math.PI) * 8"
                      r="6"
                      :fill="FAIRY[o.value][k % FAIRY[o.value].length]"
                      opacity=".3"
                    />
                    <circle
                      :cx="8 + k * 12"
                      :cy="9 + Math.sin(((k + 0.5) / 5) * Math.PI) * 8"
                      r="3"
                      :fill="FAIRY[o.value][k % FAIRY[o.value].length]"
                    />
                  </g>
                </svg>
              </span>
              <span
                class="line-clamp-1 w-full text-[10px] leading-tight font-semibold"
                :class="o.owned ? 'text-white/85' : 'text-white/40'"
                >{{ o.name }}</span
              >
              <span
                v-if="!o.owned"
                class="num absolute top-1 right-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white/75"
                ><Icon name="lock" :size="9" />LV {{ o.level }}</span
              >
              <span v-else-if="o.on" class="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-[#ffe08a] text-[#120f24]"
                ><Icon name="check" :size="10"
              /></span>
            </button>
          </div>
        </div>
        <p v-if="active.id === 'you'" class="text-white/45">Build and skin tone are always yours to pick. Level {{ level }}.</p>
        <p v-if="active.id === 'light'" class="text-white/45">
          The lamp shows at night, dusk and sunset. Fairy lights need the Fairy lights item in the room.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tile {
  touch-action: pan-x;
}
.opt[aria-disabled='true'] {
  cursor: help;
}
</style>
