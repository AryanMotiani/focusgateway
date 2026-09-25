<script setup>
// A little picture of one avatar or room style option: a mini avatar wearing it, a colour
// swatch, or a small drawing of the wallpaper, floor, lamp or fairy lights. Drawn against
// the player's own avatar and walls, so it shows how it will really look.
// Used by the decorate panel and the shop.
import { computed } from 'vue'
import { DEFAULT_AVATAR } from '@focusgateway/core'
import { room } from '../../lib/room.js'
import { SKIN, swatchOf } from '../room/avatarStyle.js'
import { wallOf, woodOf, PATTERNS, FLOORS, CURTAINS, LAMPS, FAIRY, styleSwatch } from '../room/roomStyle.js'
import RoomAvatar from '../room/RoomAvatar.vue'

const props = defineProps({ field: { type: String, required: true }, value: { type: String, required: true }, big: Boolean })

const STYLE_FIELDS = new Set(['wall', 'pattern', 'floor', 'curtain', 'wood', 'light', 'fairy'])
const isStyle = computed(() => STYLE_FIELDS.has(props.field))
const PREVIEW = { hair: 'avatar', top: 'avatar', glassesStyle: 'avatar', earrings: 'avatar', build: 'avatar' }
const kind = computed(() => PREVIEW[props.field] || (['pattern', 'floor', 'light', 'fairy'].includes(props.field) ? 'art' : 'swatch'))
const AV_BOX = {
  hair: '-66 -346 148 150',
  top: '-112 -300 226 236',
  build: '-112 -330 226 266',
  glassesStyle: '-42 -302 100 70',
  earrings: '-40 -300 100 80',
}
const hidesEars = (h) => ['long', 'wavy', 'halfup', 'bob', 'curly', 'afro', 'braids', 'locs', 'hijab'].includes(h)
const avatar = computed(() => {
  const av = { ...DEFAULT_AVATAR, ...room.avatar, headphones: false, [props.field]: props.value }
  if (props.field === 'glassesStyle') av.glasses = true
  if (props.field === 'earrings' && hidesEars(av.hair)) av.hair = 'bun'
  return av
})
const swatch = computed(() =>
  isStyle.value ? styleSwatch(props.field, props.value) : swatchOf(props.field, props.value, room.avatar.hair),
)
const wallNow = computed(() => wallOf(room.style?.wall))
const woodNow = computed(() => woodOf(room.style?.wood))
const tile = computed(() => {
  const p = PATTERNS[props.value]?.(wallNow.value.ink, woodNow.value)
  return p ? { w: p.w / 2.5, h: p.h / 2.5, svg: `<g transform="scale(.4)">${p.svg}</g>` } : null
})
const curtainBg = computed(() => {
  const c = CURTAINS[props.value]
  return c && `repeating-linear-gradient(90deg, ${c[0]} 0 6px, ${c[1]} 6px 11px, ${c[2]} 11px 13px)`
})
const woodBg = computed(() => {
  const w = woodOf(props.value)
  return `linear-gradient(180deg, ${w.hi} 0 18%, ${w.top} 18% 60%, ${w.b} 60% 82%, ${w.d} 82%)`
})
const lampBg = computed(() => {
  const l = LAMPS[props.value]
  if (!l) return ''
  if (l.cycle)
    return 'radial-gradient(circle, #fff 0 12%, transparent 13%), conic-gradient(#ff7aa8, #ffb35c, #7cf0a4, #6fb0ff, #b48cff, #ff7aa8)'
  return `radial-gradient(circle at 50% 50%, ${l.bulb[0]} 0 14%, ${l.pool[0]} 30%, ${l.pool[1]}55 62%, #15121f 80%)`
})
const uid = computed(() => `op-${props.field}-${props.value}-${props.big ? 'b' : 's'}`)
const scale = computed(() => (props.big ? 1.6 : 1))
</script>

<template>
  <span class="grid place-items-center" :style="{ transform: `scale(${scale})` }">
    <svg v-if="kind === 'avatar'" :viewBox="AV_BOX[field]" class="h-[52px] w-[70px]" aria-hidden="true">
      <RoomAvatar :avatar="avatar" :uid="uid" still bare />
    </svg>
    <span
      v-else-if="['skin', 'hairColor', 'topColor', 'headphonesColor', 'wall'].includes(field)"
      class="h-8 w-8 rounded-full shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]"
      :style="{
        background:
          field === 'skin'
            ? SKIN[value][0]
            : field === 'wall'
              ? `linear-gradient(180deg, ${swatch} 58%, ${wallOf(value).low} 58%)`
              : swatch,
      }"
    />
    <span v-else-if="field === 'curtain'" class="h-8 w-8 rounded-lg" :style="{ background: curtainBg }" />
    <span v-else-if="field === 'wood'" class="h-8 w-10 rounded-md" :style="{ background: woodBg }" />
    <span v-else-if="field === 'light'" class="h-[46px] w-[46px] rounded-full" :style="{ background: lampBg }" />
    <svg v-else-if="field === 'pattern'" viewBox="0 0 64 46" class="h-[46px] w-[64px] rounded-lg" aria-hidden="true">
      <defs v-if="tile">
        <pattern :id="`${uid}-pat`" :width="tile.w" :height="tile.h" patternUnits="userSpaceOnUse" v-html="tile.svg" />
      </defs>
      <rect width="64" height="46" :fill="wallNow.base" />
      <rect v-if="tile" width="64" height="34" :fill="`url(#${uid}-pat)`" />
      <rect y="34" width="64" height="12" :fill="wallNow.low" />
      <rect y="33" width="64" height="2" :fill="wallNow.rail" />
    </svg>
    <svg v-else-if="field === 'floor'" viewBox="0 0 64 46" class="h-[46px] w-[64px] rounded-lg" aria-hidden="true">
      <defs>
        <linearGradient :id="`${uid}-fl`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" :stop-color="FLOORS[value].top" />
          <stop offset="1" :stop-color="FLOORS[value].bottom" />
        </linearGradient>
      </defs>
      <rect width="64" height="46" :fill="`url(#${uid}-fl)`" />
      <g v-if="FLOORS[value].kind === 'boards'" :stroke="FLOORS[value].line" stroke-width="1.5" opacity=".6">
        <path d="M0 12 H64 M0 26 H64 M0 40 H64 M20 0 V12 M48 0 V12 M8 12 V26 M38 12 V26 M26 26 V40 M56 26 V40" />
      </g>
      <g v-else-if="FLOORS[value].kind === 'tiles'">
        <path
          d="M0 0 H16 V16 H0Z M32 0 H48 V16 H32Z M16 16 H32 V32 H16Z M48 16 H64 V32 H48Z M0 32 H16 V48 H0Z M32 32 H48 V48 H32Z"
          :fill="FLOORS[value].alt"
        />
        <path d="M0 16 H64 M0 32 H64 M16 0 V46 M32 0 V46 M48 0 V46" :stroke="FLOORS[value].line" stroke-width="1.2" />
      </g>
      <g v-else fill="#000" opacity=".12">
        <circle v-for="k in 14" :key="k" :cx="(k * 23) % 62" :cy="(k * 17) % 44" r="1" />
      </g>
    </svg>
    <svg v-else-if="field === 'fairy'" viewBox="0 0 64 30" class="h-[30px] w-[64px]" aria-hidden="true">
      <path d="M2 4 Q32 26 62 4" stroke="#6c6275" stroke-width="1.2" fill="none" />
      <g v-for="k in [0, 1, 2, 3, 4]" :key="k">
        <circle
          :cx="8 + k * 12"
          :cy="9 + Math.sin(((k + 0.5) / 5) * Math.PI) * 8"
          r="6"
          :fill="FAIRY[value][k % FAIRY[value].length]"
          opacity=".3"
        />
        <circle :cx="8 + k * 12" :cy="9 + Math.sin(((k + 0.5) / 5) * Math.PI) * 8" r="3" :fill="FAIRY[value][k % FAIRY[value].length]" />
      </g>
    </svg>
  </span>
</template>
