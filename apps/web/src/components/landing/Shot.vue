<script setup>
// One app screenshot from public/media, in two sizes (see scripts/landing-media.mjs).
import { media } from './motion.js'

defineProps({
  name: { type: String, required: true },
  alt: { type: String, required: true },
  sizes: { type: String, default: '(max-width: 800px) 100vw, 800px' },
  eager: { type: Boolean, default: false },
})
</script>

<template>
  <img
    :src="media(`${name}-800.webp`)"
    :srcset="`${media(`${name}-800.webp`)} 800w, ${media(`${name}.webp`)} 1440w`"
    :sizes="sizes"
    :alt="alt"
    width="1440"
    height="900"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : 'auto'"
    decoding="async"
    draggable="false"
  />
</template>
