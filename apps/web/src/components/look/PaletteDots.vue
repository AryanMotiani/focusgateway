<script setup>
// A tiny chip that shows a palette: its paper as the background, accent and second colour as dots.
defineProps({ colors: Array, size: { type: String, default: 'md' } })
</script>
<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 dark:border-white/15"
    :class="size === 'sm' ? 'px-1 py-0.5' : 'px-1.5 py-1'"
    :style="{ background: colors[0] }"
    aria-hidden="true"
  >
    <span class="rounded-full" :class="size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'" :style="{ background: colors[1] }" />
    <span class="rounded-full" :class="size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'" :style="{ background: colors[2] }" />
  </span>
</template>
