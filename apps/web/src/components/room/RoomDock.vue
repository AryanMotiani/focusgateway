<script setup>
// The dock: one button per study room window. A minimized window shows with its name,
// click to bring it back. An open one has a dot, click to bring it to the front (or,
// when it already is, minimize it). Plus "Reset layout".
import { computed } from 'vue'
import RoomIcon from './RoomIcon.vue'

const props = defineProps({ ctl: { type: Object, required: true }, items: { type: Array, required: true }, stacked: Boolean, hint: String })
const emit = defineEmits(['reset'])
const list = computed(() =>
  props.items
    .filter((it) => props.ctl.wm.wins[it.id])
    .map((it) => {
      const w = props.ctl.wm.wins[it.id]
      return { ...it, min: w.min, top: !w.min && w.z === props.ctl.wm.top - 1 }
    })
    // on phones the open windows are right there in the column, so only minimized ones show
    .filter((it) => !props.stacked || it.min),
)
const anyMin = computed(() => list.value.some((x) => x.min))
defineExpose({ count: computed(() => list.value.length) })
</script>

<template>
  <nav class="dock" :class="stacked ? 'dock-stacked' : 'dock-free'" aria-label="Room windows">
    <button
      v-for="it in list"
      :key="it.id"
      class="dock-btn"
      :class="{ 'dock-min': it.min, 'dock-top': it.top && !stacked }"
      :data-dock="it.id"
      :aria-label="it.min ? `Restore ${it.title}` : `${it.title}, open`"
      :title="it.min ? `Restore ${it.title}` : it.top || stacked ? `Minimize ${it.title}` : `Bring ${it.title} to the front`"
      @click="ctl.toggleMin(it.id)"
    >
      <RoomIcon :name="it.icon" :size="16" />
      <span v-if="it.min" class="dock-label">{{ it.title }}</span>
      <i v-if="!it.min" class="dock-dot" />
    </button>
    <span class="dock-sep" />
    <button
      class="dock-btn"
      aria-label="Reset layout"
      :title="`Reset layout${anyMin ? ', brings every window back' : ''}`"
      data-dock-reset
      @click="emit('reset')"
    >
      <RoomIcon name="layout" :size="16" />
      <span v-if="stacked" class="dock-label">Reset</span>
    </button>
    <span
      v-if="hint && !stacked"
      class="dock-btn dock-hint"
      tabindex="0"
      role="note"
      :title="hint"
      :aria-label="`Keyboard shortcuts: ${hint}`"
    >
      <RoomIcon name="keyboard" :size="16" />
    </span>
  </nav>
</template>

<style scoped>
.dock {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  color: #fff;
  background: rgb(19 16 30 / 0.78);
  border: 1px solid rgb(255 255 255 / 0.11);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.06),
    0 12px 30px -12px rgb(0 0 0 / 0.6);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}
.dock-free {
  border-radius: 14px;
}
.dock-stacked {
  border-radius: 14px;
  overflow-x: auto;
  scrollbar-width: none;
}
.dock-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  min-width: 34px;
  justify-content: center;
  padding: 0 9px;
  border-radius: 10px;
  color: rgb(255 255 255 / 0.75);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.dock-btn:hover {
  background: rgb(255 255 255 / 0.1);
  color: #fff;
}
.dock-btn:focus-visible {
  outline: 2px solid var(--fg-accent);
  outline-offset: 1px;
}
.dock-min {
  color: rgb(255 255 255 / 0.9);
  background: rgb(255 255 255 / 0.07);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
}
.dock-top {
  color: #fff;
}
.dock-dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.45);
}
.dock-top .dock-dot {
  background: var(--fg-accent);
}
.dock-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dock-hint {
  cursor: help;
  color: rgb(255 255 255 / 0.5);
}
.dock-sep {
  width: 1px;
  height: 20px;
  margin: 0 3px;
  background: rgb(255 255 255 / 0.12);
}
</style>
