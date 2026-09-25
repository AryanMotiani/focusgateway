<script setup>
// Decorate mode: the tray of things to place (items, badges) and the avatar editor.
// Drag a tile into the room, or tap it to drop it in a good spot. Drag a placed thing
// back onto the tray to put it away.
import { computed } from 'vue'
import { AVATAR_OPTIONS } from '@focusgateway/core'
import { inventory, room, quickPlace, removeItem, level } from '../../lib/room.js'
import { SKIN, HAIR, WRAP, TOP, LABELS } from './avatarStyle.js'
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
const hairColors = computed(() => (room.avatar.hair === 'hijab' ? WRAP : HAIR))
const TABS = [
  { id: 'items', label: 'Items', icon: 'sparkles' },
  { id: 'badges', label: 'Badges', icon: 'target' },
  { id: 'avatar', label: 'Avatar', icon: 'edit' },
]
</script>

<template>
  <section
    class="flex flex-col rounded-3xl border border-white/10 bg-[#120f24]/85 text-white backdrop-blur-xl"
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
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition"
          :class="current === t.id ? 'bg-white text-[#120f24]' : 'text-white/70 hover:bg-white/10'"
          @click="current = t.id"
        >
          <Icon :name="t.icon" :size="13" />{{ t.label }}
          <span v-if="t.id === 'items'" class="num opacity-60">{{ ownedCount }}/{{ items.length }}</span>
          <span v-if="t.id === 'badges'" class="num opacity-60">{{ badgeCount }}</span>
        </button>
      </div>
      <p class="min-w-0 flex-1 truncate text-xs text-white/55 max-sm:hidden">
        <template v-if="current === 'avatar'">Changes show up in the room right away.</template>
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
      v-if="current !== 'avatar'"
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

    <!-- avatar editor -->
    <div v-else class="grid gap-x-6 sm:max-h-[min(46vh,320px)] gap-y-3 overflow-y-auto p-3 text-xs sm:grid-cols-2 sm:px-4 lg:grid-cols-3">
      <div>
        <p class="hud-label mb-1.5 text-white/55">Build</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="b in AVATAR_OPTIONS.build"
            :key="b"
            class="rounded-full px-3 py-1.5 font-bold"
            :class="room.avatar.build === b ? 'bg-white text-[#120f24]' : 'bg-white/10 hover:bg-white/20'"
            @click="room.avatar.build = b"
          >
            {{ LABELS.build[b] }}
          </button>
        </div>
      </div>
      <div>
        <p class="hud-label mb-1.5 text-white/55">Skin tone</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="k in AVATAR_OPTIONS.skin"
            :key="k"
            class="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[#120f24]"
            :class="room.avatar.skin === k ? 'ring-white' : 'ring-transparent'"
            :style="{ background: SKIN[k][0] }"
            :aria-label="`Skin tone ${k.slice(1)}`"
            :aria-pressed="room.avatar.skin === k"
            @click="room.avatar.skin = k"
          />
        </div>
      </div>
      <div>
        <p class="hud-label mb-1.5 text-white/55">Hair</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="h in AVATAR_OPTIONS.hair"
            :key="h"
            class="rounded-full px-3 py-1.5 font-bold"
            :class="room.avatar.hair === h ? 'bg-white text-[#120f24]' : 'bg-white/10 hover:bg-white/20'"
            @click="room.avatar.hair = h"
          >
            {{ LABELS.hair[h] }}
          </button>
        </div>
      </div>
      <div>
        <p class="hud-label mb-1.5 text-white/55">{{ room.avatar.hair === 'hijab' ? 'Hijab colour' : 'Hair colour' }}</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in AVATAR_OPTIONS.hairColor"
            :key="c"
            class="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[#120f24]"
            :class="room.avatar.hairColor === c ? 'ring-white' : 'ring-transparent'"
            :style="{ background: hairColors[c][0] }"
            :aria-label="c"
            :aria-pressed="room.avatar.hairColor === c"
            @click="room.avatar.hairColor = c"
          />
        </div>
      </div>
      <div>
        <p class="hud-label mb-1.5 text-white/55">Top</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="t in AVATAR_OPTIONS.top"
            :key="t"
            class="rounded-full px-3 py-1.5 font-bold"
            :class="room.avatar.top === t ? 'bg-white text-[#120f24]' : 'bg-white/10 hover:bg-white/20'"
            @click="room.avatar.top = t"
          >
            {{ LABELS.top[t] }}
          </button>
        </div>
      </div>
      <div>
        <p class="hud-label mb-1.5 text-white/55">Top colour</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in AVATAR_OPTIONS.topColor"
            :key="c"
            class="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[#120f24]"
            :class="room.avatar.topColor === c ? 'ring-white' : 'ring-transparent'"
            :style="{ background: TOP[c][0] }"
            :aria-label="c"
            :aria-pressed="room.avatar.topColor === c"
            @click="room.avatar.topColor = c"
          />
        </div>
      </div>
      <div class="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
        <button
          v-for="k in ['headphones', 'glasses']"
          :key="k"
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold"
          :class="room.avatar[k] ? 'bg-white text-[#120f24]' : 'bg-white/10 hover:bg-white/20'"
          :aria-pressed="room.avatar[k]"
          @click="room.avatar[k] = !room.avatar[k]"
        >
          <Icon :name="room.avatar[k] ? 'check' : 'plus'" :size="13" />{{ k === 'headphones' ? 'Headphones' : 'Glasses' }}
        </button>
        <span class="self-center text-white/45">Level {{ level }}. More decor unlocks as you level up.</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tile {
  touch-action: pan-x;
}
</style>
