<script setup>
// A one-time tip for a study room window, the first time it is opened from the dock (and for
// decorate mode). Two sentences at most and a "Got it" button. Where it sits is up to the
// parent: under or over the window with a small arrow, or in line on phones.
// The text comes from ROOM_TIPS in lib/tour.js, which also remembers which tips were seen.
import { onMounted, ref } from 'vue'
import RoomIcon from './RoomIcon.vue'

defineProps({ text: { type: String, required: true }, side: { type: String, default: 'inline' }, name: String })
const emit = defineEmits(['done'])
const btn = ref(null)
// the button takes focus without scrolling, so keyboard users can dismiss it right away
onMounted(() => btn.value?.focus({ preventScroll: true }))
</script>

<template>
  <div class="tip" :class="'tip-' + side" role="note" :aria-label="name ? `Tip: ${name}` : 'Tip'" data-room-tip @pointerdown.stop>
    <i v-if="side === 'below' || side === 'above'" class="tip-arrow" aria-hidden="true" />
    <span class="tip-icon" aria-hidden="true"><RoomIcon name="sparkles" :size="14" /></span>
    <p class="tip-text">{{ text }}</p>
    <button ref="btn" type="button" class="tip-ok" data-room-tip-ok @click="emit('done')">Got it</button>
  </div>
</template>

<style scoped>
.tip {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-items: start;
  padding: 12px 12px 10px;
  border-radius: 14px;
  background: var(--fg-card);
  color: var(--fg-ink);
  border: 1.5px solid var(--fg-accent);
  box-shadow: 0 14px 34px rgb(0 0 0 / 0.28);
  font-size: 13px;
  line-height: 1.45;
  cursor: default;
  animation: tip-in 0.22s ease-out;
}
@keyframes tip-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}
.tip-below,
.tip-above,
.tip-inside {
  position: absolute;
  z-index: 5;
  left: 10px;
  width: min(320px, calc(100% - 20px));
  min-width: 240px;
}
.tip-below {
  top: calc(100% + 12px);
}
.tip-above {
  bottom: calc(100% + 12px);
}
.tip-inside {
  top: 42px;
}
.tip-inline {
  margin: 8px 10px 0;
}
.tip-arrow {
  position: absolute;
  left: 22px;
  width: 12px;
  height: 12px;
  background: var(--fg-card);
  border: 1.5px solid var(--fg-accent);
  transform: rotate(45deg);
}
.tip-below .tip-arrow {
  top: -7.5px;
  border-right: 0;
  border-bottom: 0;
}
.tip-above .tip-arrow {
  bottom: -7.5px;
  border-left: 0;
  border-top: 0;
}
.tip-icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--fg-accent-soft);
  color: var(--fg-accent);
}
.tip-text {
  margin-top: 2px;
  color: var(--fg-ink);
}
.tip-ok {
  grid-column: 2;
  justify-self: end;
  margin-top: 4px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--fg-accent);
  color: var(--fg-on-accent);
  font-size: 12px;
  font-weight: 700;
}
.tip-ok:focus-visible {
  outline: 2px solid var(--fg-accent);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .tip {
    animation: none;
  }
}
</style>
