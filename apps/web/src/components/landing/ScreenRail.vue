<script setup>
// "A closer look": real screenshots on a rail. On big screens the section pins and the rail
// slides sideways as you scroll down. On phones and with reduced motion it is a swipeable
// row that snaps to each card.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Shot from './Shot.vue'
import { usePinProgress, useMedia, PINNABLE, vReveal } from './motion.js'

const CARDS = [
  { name: 'today', tag: 'Today', title: 'Your day on one page', text: 'Tasks due, what is blocked right now, a focus timer and habits.' },
  {
    name: 'room-drawer',
    tag: 'Study room',
    title: 'Tasks without leaving the room',
    text: 'The drawer holds tasks, habits, blocks and progress. The rain keeps going.',
  },
  {
    name: 'tasks',
    tag: 'Tasks',
    title: 'Deadlines, subtasks, repeats',
    text: 'Group by day, tag by subject, forward what can wait (it gets counted).',
  },
  { name: 'habits', tag: 'Habits', title: 'A year at a glance', text: 'One grid per habit, streaks and a best run to beat.' },
  {
    name: 'stats',
    tag: 'Accountability',
    title: 'Every box is a promise',
    text: 'Streaks, badges and an honest calendar of days cleared or not.',
  },
  {
    name: 'decorate',
    tag: 'Decorate',
    title: 'Make the room yours',
    text: 'Drag plants, posters and a sleepy cat into place. More unlocks as you level.',
  },
]

const root = ref(null)
const track = ref(null)
const pinned = useMedia(PINNABLE)
const distance = ref(0)

function measure() {
  const t = track.value
  if (!t) return
  const box = t.parentElement
  const pad = parseFloat(getComputedStyle(box).paddingLeft) + parseFloat(getComputedStyle(box).paddingRight)
  distance.value = Math.max(0, t.scrollWidth - (box.clientWidth - pad))
}
usePinProgress(root, (p) => {
  if (!pinned.value || !track.value) return
  track.value.style.transform = `translate3d(${(-p * distance.value).toFixed(1)}px, 0, 0)`
})
let ro
onMounted(() => {
  measure()
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(measure)
    ro.observe(track.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <section ref="root" class="rail" :class="{ pinned }" :style="pinned ? { height: `calc(100vh + ${distance}px)` } : null">
    <div class="sticky">
      <div v-reveal class="lp-wrap head">
        <div>
          <span class="lp-eyebrow">A closer look</span>
          <h2 class="lp-h2">Made to be <span class="lp-italic">opened every day.</span></h2>
        </div>
        <p class="lp-lead side">Real screens from the app, with a few months of study in them.</p>
      </div>
      <div class="viewport">
        <div
          ref="track"
          class="track"
          :style="pinned ? null : { transform: 'none' }"
          :tabindex="pinned ? -1 : 0"
          aria-label="Screenshots of the app"
          role="region"
        >
          <figure v-for="c in CARDS" :key="c.name" class="rcard">
            <div class="pic">
              <Shot :name="c.name" :alt="`${c.tag}: ${c.title}`" sizes="(max-width: 700px) 86vw, 640px" />
            </div>
            <figcaption>
              <span class="tag">{{ c.tag }}</span>
              <b>{{ c.title }}</b>
              <span class="lp-muted">{{ c.text }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rail {
  position: relative;
}
.sticky {
  padding-block: 96px;
}
.pinned .sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-block: 84px 24px;
  overflow: hidden;
}
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.head .lp-h2 {
  margin-top: 14px;
}
.side {
  max-width: 22rem;
}
.viewport {
  margin-top: 40px;
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 32px;
}
.track {
  display: flex;
  gap: 24px;
  will-change: transform;
}
.rcard {
  flex: 0 0 auto;
  width: min(640px, 52vw, calc((100vh - 360px) * 1.6));
  transition: transform 0.4s ease;
}
.rcard:hover {
  transform: translateY(-4px);
}
.pic {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-md);
  background: var(--lp-surface-2);
  aspect-ratio: 1280 / 800;
}
.pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
figcaption {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-inline: 4px;
  font-size: 14.5px;
  line-height: 1.5;
}
figcaption b {
  font-size: 17px;
  letter-spacing: -0.01em;
}
.tag {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lp-accent);
}

/* swipe row: phones, small windows and reduced motion */
.rail:not(.pinned) .viewport {
  padding-inline: 0;
}
.rail:not(.pinned) .track {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 20px;
  padding: 8px 20px 20px;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}
.rail:not(.pinned) .track::-webkit-scrollbar {
  display: none;
}
.rail:not(.pinned) .rcard {
  scroll-snap-align: start;
  width: min(560px, 84vw);
  transform: none;
}
@media (min-width: 640px) {
  .rail:not(.pinned) .track {
    padding-inline: 32px;
    scroll-padding-inline: 32px;
  }
}
@media (max-width: 640px) {
  .sticky {
    padding-block: 64px;
  }
}
</style>
