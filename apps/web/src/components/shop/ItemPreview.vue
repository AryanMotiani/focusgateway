<script setup>
// The picture of any shop item: the decor drawing, an option preview, a window with the
// scene outside, or a record for a music style. It fills its parent, which must be positioned
// (relative) and sized.
import { computed } from 'vue'
import { tracksForStyle } from '@regimen/core'
import { itemMeta } from '../../lib/room.js'
import OptionPreview from './OptionPreview.vue'
import SceneSky from '../SceneSky.vue'

const props = defineProps({ item: { type: Object, required: true }, big: Boolean })
const meta = computed(() => (props.item.kind === 'object' ? itemMeta(props.item.id) : null))
const box = computed(() => {
  const m = meta.value
  const pad = 6
  return m ? `${-pad} ${-pad} ${m.w + pad * 2} ${m.h + pad * 2}` : ''
})
const RECORD = { 'music-jazz': '#3f6fb5', 'music-bossa': '#e59a3a', 'music-ambient': '#6c4fc2', 'music-classic': '#c2566a' }
const tracks = computed(() => (props.item.kind === 'music' ? tracksForStyle(props.item.id).length : 0))
</script>

<template>
  <span class="absolute inset-1 grid place-items-center">
    <svg v-if="meta" :viewBox="box" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g v-html="meta.svg" />
      <g v-if="meta.glow" v-html="meta.glow" />
    </svg>
    <OptionPreview v-else-if="item.kind === 'option'" :field="item.field" :value="item.value" :big="big" />
    <span
      v-else-if="item.kind === 'scene'"
      class="relative block aspect-[4/3] h-[88%] overflow-hidden rounded-lg border-[3px] border-[#8a5a36] shadow-[inset_0_0_0_2px_#5b3a22]"
    >
      <SceneSky
        :scene="item.id"
        view-box="300 150 1000 750"
        :id-prefix="`shop-${item.id}-${big ? 'b' : 's'}-`"
        class="absolute inset-0 h-full w-full"
      />
      <i class="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-[#8a5a36]" />
      <i class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#8a5a36]" />
    </span>
    <span v-else-if="item.kind === 'music'" class="relative grid aspect-square h-[82%] place-items-center">
      <span
        class="absolute inset-0 rounded-full shadow-[0_4px_10px_rgba(0,0,0,.35)]"
        style="background: repeating-radial-gradient(circle, #1b1822 0 2px, #26222f 2px 4px)"
      />
      <span class="absolute h-[40%] w-[40%] rounded-full" :style="{ background: RECORD[item.id] || '#c2566a' }" />
      <span class="absolute h-[7%] w-[7%] rounded-full bg-[#15121f]" />
      <span class="num absolute -right-1 -bottom-1 rounded-full bg-white px-1.5 text-[10px] font-bold text-[#15121f]"
        >{{ tracks }} tracks</span
      >
    </span>
  </span>
</template>
