<script setup>
// A small gold coin, for the reward loop counters.
defineProps({ size: { type: Number, default: 16 } })
</script>

<template>
  <svg class="lp-coin" :width="size" :height="size" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="9" fill="#f09a12" />
    <circle cx="10" cy="9.2" r="8.2" fill="#ffc94a" />
    <circle cx="10" cy="10" r="6.2" fill="none" stroke="#b86e00" stroke-opacity="0.45" stroke-width="1.3" />
    <path d="M10 6.2l1.1 2.4 2.6.3-1.9 1.8.5 2.6L10 12l-2.3 1.3.5-2.6-1.9-1.8 2.6-.3z" fill="#fff6d8" />
  </svg>
</template>

<style scoped>
.lp-coin {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 1px rgba(120, 70, 0, 0.35));
}
</style>
