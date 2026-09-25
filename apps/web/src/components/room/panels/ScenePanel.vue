<script setup>
// Scene and music: the view out the window and the music style, both unlock by level.
import { UNLOCKS, isUnlocked } from '@focusgateway/core'
import RoomIcon from '../RoomIcon.vue'

const props = defineProps({ ui: { type: Object, required: true }, level: { type: Number, default: 1 }, onboarded: Boolean })
const emit = defineEmits(['decorate', 'style', 'scene'])
const scenes = UNLOCKS.filter((u) => u.kind === 'scene')
const styles = UNLOCKS.filter((u) => u.kind === 'music')
const has = (id) => isUnlocked(id, props.level)
const chip = (on, open) => (on ? 'room-on' : open ? 'bg-sunk room-hover' : 'cursor-not-allowed bg-sunk text-muted opacity-60')
const pill = 'flex items-center gap-1.5 rounded-(--fg-room-btn-radius) px-3 py-1.5 text-xs font-bold transition'
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="hud-label mb-2 text-muted">Out the window</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="sc in scenes"
          :key="sc.id"
          :class="[pill, chip(ui.scene === sc.id, has(sc.id))]"
          :disabled="!has(sc.id)"
          :title="has(sc.id) ? sc.name : `Unlocks at level ${sc.level}`"
          @click="emit('scene', sc.id)"
        >
          <RoomIcon v-if="!has(sc.id)" name="lock" :size="12" />{{ sc.name }}<span v-if="!has(sc.id)" class="num">LV {{ sc.level }}</span>
        </button>
      </div>
    </div>
    <div>
      <p class="hud-label mb-2 text-muted">Music style</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="st in styles"
          :key="st.id"
          :class="[pill, chip(ui.style === st.id, has(st.id))]"
          :disabled="!has(st.id)"
          :title="has(st.id) ? st.name : `Unlocks at level ${st.level}`"
          @click="emit('style', st.id)"
        >
          <RoomIcon :name="has(st.id) ? 'music' : 'lock'" :size="12" />{{ st.name
          }}<span v-if="!has(st.id)" class="num">LV {{ st.level }}</span>
        </button>
      </div>
    </div>
    <div v-if="onboarded" class="flex flex-wrap gap-2 border-t border-line pt-4">
      <button class="bg-sunk room-hover" :class="pill" @click="emit('decorate', 'items')">
        <RoomIcon name="edit" :size="13" /> Decorate the room
      </button>
      <button class="bg-sunk room-hover" :class="pill" @click="emit('decorate', 'avatar')">
        <RoomIcon name="sparkles" :size="13" /> Change your avatar
      </button>
      <button class="bg-sunk room-hover" :class="pill" @click="emit('decorate', 'room')">
        <RoomIcon name="home" :size="13" /> Walls, floor and light
      </button>
    </div>
    <p v-else class="text-xs text-muted">Set up FocusGateway to decorate the room and change your avatar.</p>
  </div>
</template>
