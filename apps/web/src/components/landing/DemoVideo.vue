<script setup>
// "See it in 60 seconds": a real recording of the app (scripts/landing-media.mjs).
// It plays muted and looped while on screen, unless the visitor prefers reduced motion,
// then it waits for a click. Controls are always there.
import { ref, watch } from 'vue'
import Icon from '../Icon.vue'
import { media, useInView, useMedia, REDUCED, vReveal } from './motion.js'

const video = ref(null)
const box = ref(null)
const onScreen = useInView(box, { once: false, threshold: 0.45 })
const reduced = useMedia(REDUCED)
const started = ref(false)
const playing = ref(false)
const length = ref('')
function onMeta() {
  const d = Math.round(video.value?.duration || 0)
  if (d) length.value = `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`
}

watch(onScreen, (v) => {
  const el = video.value
  if (!el) return
  if (v && !reduced.value) el.play().catch(() => {})
  else if (!v) el.pause()
})
function start() {
  started.value = true
  const el = video.value
  el.currentTime = 0
  el.muted = true
  el.controls = true
  el.play().catch(() => {})
}
</script>

<template>
  <section id="video" class="lp-section">
    <div class="lp-wrap">
      <div v-reveal class="head">
        <span class="lp-eyebrow">See it in action</span>
        <h2 class="lp-h2">A study night, <span class="lp-italic">in under a minute.</span></h2>
        <p class="lp-lead">Add a task, tick it off, check a habit, peek at your year, move a plant. That is the whole loop.</p>
      </div>
      <div ref="box" v-reveal="100" class="player">
        <video
          ref="video"
          :poster="media('demo-poster.webp')"
          muted
          loop
          playsinline
          preload="metadata"
          :controls="started"
          aria-label="Demo of FocusGateway: the study room, adding and finishing a task, habits, stats and decorating"
          @play="playing = true"
          @pause="playing = false"
          @loadedmetadata="onMeta"
        >
          <source :src="media('demo.webm')" type="video/webm" />
          <source :src="media('demo.mp4')" type="video/mp4" />
        </video>
        <button v-if="!started" class="overlay" :class="{ playing }" aria-label="Play the demo from the start with controls" @click="start">
          <span class="play"><Icon name="play" :size="26" /></span>
          <span class="len">Watch the demo{{ length ? ` · ${length}` : '' }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.head {
  text-align: center;
  max-width: 720px;
  margin-inline: auto;
}
.head .lp-h2 {
  margin-top: 14px;
}
.head .lp-lead {
  margin-top: 14px;
}
.player {
  position: relative;
  margin: 48px auto 0;
  max-width: 1040px;
  aspect-ratio: 1280 / 800;
  border-radius: 24px;
  overflow: hidden;
  background: #120f24;
  box-shadow: var(--lp-shadow-lg);
  border: 1px solid var(--lp-line);
}
.player::before {
  content: '';
  position: absolute;
  inset: -40px;
  z-index: -1;
}
video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #fff;
  cursor: pointer;
  background: radial-gradient(circle at 50% 50%, rgba(18, 15, 36, 0.35), rgba(18, 15, 36, 0.05) 60%);
  transition: background 0.4s;
}
.overlay.playing {
  background: transparent;
}
.play {
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: #16122b;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.3s cubic-bezier(0.3, 1.6, 0.5, 1),
    opacity 0.4s;
}
.play svg {
  margin-left: 4px;
}
.overlay:hover .play {
  transform: scale(1.08);
}
.overlay.playing .play {
  opacity: 0;
  transform: scale(0.8);
}
.overlay.playing:hover .play {
  opacity: 1;
  transform: scale(1);
}
.len {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(18, 15, 36, 0.6);
  backdrop-filter: blur(8px);
  font-size: 13.5px;
  font-weight: 650;
  transition: opacity 0.4s;
}
.overlay.playing .len {
  opacity: 0;
}
@media (max-width: 640px) {
  .player {
    border-radius: 16px;
    margin-top: 32px;
  }
  .play {
    width: 64px;
    height: 64px;
  }
}
</style>
