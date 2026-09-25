<script setup>
// The coin: gold, with a rim and a shine. Same drawing as the coin burst in lib/shop.js.
defineProps({ size: { type: [Number, String], default: 16 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" class="shrink-0">
    <circle cx="12" cy="12" r="11" fill="#e0a31a" />
    <circle cx="12" cy="11" r="9.5" fill="#ffd34d" />
    <circle cx="12" cy="11" r="6" fill="none" stroke="#e0a31a" stroke-width="1.6" />
    <path d="M8.5 7.5 A5 5 0 0 1 12 6" stroke="#fff6c8" stroke-width="1.6" fill="none" stroke-linecap="round" />
  </svg>
</template>
