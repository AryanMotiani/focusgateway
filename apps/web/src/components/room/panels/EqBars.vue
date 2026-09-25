<script setup>
// A small animated equalizer that moves with the music's tempo, and rests when paused.
defineProps({ playing: Boolean, bpm: { type: Number, default: 72 }, small: Boolean })
</script>

<template>
  <span class="eq" :class="{ on: playing, small }" :style="{ '--beat': 60 / bpm + 's' }" aria-hidden="true"> <i /><i /><i /><i /> </span>
</template>

<style scoped>
.eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}
.eq.small {
  height: 11px;
  gap: 1.5px;
}
.eq i {
  display: block;
  width: 3px;
  height: 30%;
  border-radius: 1px;
  background: var(--fg-accent);
  transition: height 0.3s;
}
.eq.small i {
  width: 2px;
}
.eq.on i {
  animation: eq var(--beat) ease-in-out infinite alternate;
}
.eq.on i:nth-child(2) {
  animation-duration: calc(var(--beat) * 0.75);
  animation-delay: -0.2s;
}
.eq.on i:nth-child(3) {
  animation-duration: calc(var(--beat) * 1.25);
  animation-delay: -0.45s;
}
.eq.on i:nth-child(4) {
  animation-duration: calc(var(--beat) * 0.5);
  animation-delay: -0.1s;
}
@keyframes eq {
  0% {
    height: 20%;
  }
  100% {
    height: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .eq.on i {
    animation: none;
    height: 70%;
  }
}
</style>
