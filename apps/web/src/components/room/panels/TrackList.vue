<script setup>
// Every track of every music style. Tracks of a style you have not unlocked yet show with
// a lock and the level that unlocks them. Click a track to play it.
import { computed } from 'vue'
import { UNLOCKS, tracksForStyle } from '@focusgateway/core'
import RoomIcon from '../RoomIcon.vue'
import EqBars from './EqBars.vue'

const props = defineProps({ current: String, level: { type: Number, default: 1 }, playing: Boolean })
const emit = defineEmits(['choose'])
const groups = computed(() =>
  UNLOCKS.filter((u) => u.kind === 'music').map((s) => ({ ...s, open: s.level <= props.level, tracks: tracksForStyle(s.id) })),
)
</script>

<template>
  <div class="space-y-3" role="list" aria-label="Tracks">
    <section v-for="g in groups" :key="g.id">
      <p class="hud-label mb-1 flex items-center gap-1.5 px-2 text-[11px] text-white/50">
        <RoomIcon :name="g.open ? 'music' : 'lock'" :size="11" />{{ g.name }}
        <span v-if="!g.open" class="num ml-auto rounded-full bg-white/10 px-1.5 py-px text-[10px] text-white/70">LV {{ g.level }}</span>
        <span v-else class="num ml-auto text-white/35">{{ g.tracks.length }}</span>
      </p>
      <button
        v-for="(t, i) in g.tracks"
        :key="t.id"
        role="listitem"
        :data-track="t.id"
        class="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition"
        :class="[
          t.id === current
            ? 'bg-white/12 text-white'
            : g.open
              ? 'text-white/80 hover:bg-white/8 hover:text-white'
              : 'cursor-not-allowed text-white/35',
        ]"
        :disabled="!g.open"
        :aria-current="t.id === current ? 'true' : undefined"
        :title="g.open ? `Play ${t.name}` : `${g.name} unlocks at level ${g.level}`"
        @click="emit('choose', t)"
      >
        <span class="grid w-4 shrink-0 place-items-center text-[11px] text-white/40">
          <EqBars v-if="t.id === current" :playing="playing" :bpm="t.bpm" small />
          <RoomIcon v-else-if="!g.open" name="lock" :size="11" />
          <span v-else class="num">{{ i + 1 }}</span>
        </span>
        <span class="min-w-0 flex-1 truncate" :class="t.id === current && 'font-semibold'">{{ t.name }}</span>
        <span class="num shrink-0 text-[10px] text-white/35 capitalize">{{ t.mood }} · {{ t.bpm }}</span>
      </button>
    </section>
  </div>
</template>
