<script setup>
// A hand drawn underline that draws itself in once. Sits under a word inside a relative span.
defineProps({ delay: { type: Number, default: 400 } })
</script>

<template>
  <svg class="scribble" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true" :style="{ '--delay': delay + 'ms' }">
    <path
      d="M4 15.5C48 8.8 108 5.6 168 6.4c43 .6 86 3.3 126 7.4M20 20.5c52-5 118-6.6 186-3.8"
      fill="none"
      stroke="currentColor"
      stroke-width="6"
      stroke-linecap="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<style scoped>
.scribble {
  position: absolute;
  left: -2%;
  bottom: -0.16em;
  width: 104%;
  height: 0.32em;
  color: var(--lp-scribble);
  overflow: visible;
  pointer-events: none;
  z-index: -1;
}
.scribble {
  clip-path: inset(0 100% 0 0);
  animation: draw 0.9s cubic-bezier(0.6, 0, 0.3, 1) var(--delay) forwards;
}
@keyframes draw {
  to {
    clip-path: inset(0 0 0 0);
  }
}
</style>
