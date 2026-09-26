<script setup>
// The one sentence that says what Regimen is, set huge. The section pins while you scroll
// and the words fill in one after another, with two small inline pictures sliding open from
// the sides. With reduced motion it is just the sentence, fully lit.
import { ref } from 'vue'
import { media, useFrame, useMedia, REDUCED, clamp } from './motion.js'

// a word, or a picture pill ({ pic }), or a word with a colour ({ w, c })
const WORDS = [
  'Distracting',
  'sites',
  'stay',
  { w: 'locked', c: 'lock' },
  { pic: 'lock', from: 'left' },
  'until',
  "today's",
  'work',
  'is',
  { w: 'done.', c: 'accent' },
  'Then',
  'you',
  'get',
  'a',
  { w: 'cozy', c: 'warm' },
  { pic: 'room', from: 'right' },
  'room',
  'to',
  'do',
  // no break before the last word, so it never sits alone on a line
  'it\u00a0in.',
].map((x) => (typeof x === 'string' ? { w: x } : x))
const COUNT = WORDS.length
const TEXT = WORDS.filter((x) => x.w)
  .map((x) => x.w.replace('\u00a0', ' '))
  .join(' ')

const root = ref(null)
const reduced = useMedia(REDUCED)
useFrame(() => {
  const el = root.value
  if (!el) return
  if (reduced.value) return el.style.setProperty('--p', '1')
  const r = el.getBoundingClientRect()
  const travel = r.height - window.innerHeight
  // starts filling while the section is still coming up, done a little before it unpins
  const p = clamp((window.innerHeight * 0.6 - r.top) / (travel + window.innerHeight * 0.35))
  el.style.setProperty('--p', p.toFixed(4))
})
</script>

<template>
  <section ref="root" class="big" :class="{ still: reduced }" :style="{ '--n': COUNT }">
    <div class="sticky">
      <div class="lp-wrap">
        <p class="say lp-serif">
          <span class="sr">{{ TEXT }}</span>
          <template v-for="(x, i) in WORDS" :key="i">
            <span v-if="x.pic" class="pic" :class="['pic-' + x.pic, 'from-' + x.from]" :style="{ '--i': i }" aria-hidden="true">
              <img v-if="x.pic === 'room'" :src="media('room-night-800.webp')" alt="" loading="lazy" decoding="async" />
              <span v-else class="glyph">
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke-linecap="round" />
                  <rect x="5" y="11" width="14" height="10" rx="2.5" />
                </svg>
              </span>
            </span>
            <span v-else class="word" :class="x.c" :style="{ '--i': i }" aria-hidden="true">{{ x.w }}</span>
            {{ ' ' }}
          </template>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.big {
  --p: 0;
  position: relative;
  height: 200vh;
}
.big.still {
  height: auto;
}
.sticky {
  position: sticky;
  top: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding-block: 88px 24px;
}
.still .sticky {
  position: static;
  min-height: 0;
  padding-block: 96px;
}
.say {
  font-size: clamp(2.5rem, min(7.4vw, 12.5vh), 8rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  font-weight: 600;
}
/* every word waits its turn: faint and a little low, then lit and in place */
.word {
  --k: clamp(0, calc(var(--p) * (var(--n) + 3) - var(--i)), 1);
  display: inline-block;
  color: var(--lp-ink);
  opacity: calc(0.13 + var(--k) * 0.87);
  transform: translate3d(0, calc((1 - var(--k)) * 0.18em), 0);
  transition:
    opacity 0.25s linear,
    transform 0.35s var(--lp-ease);
}
.word.accent {
  color: var(--lp-accent);
  font-style: italic;
  font-variation-settings:
    'SOFT' 100,
    'WONK' 1;
}
.word.warm {
  color: var(--lp-warm);
  font-style: italic;
  font-variation-settings:
    'SOFT' 100,
    'WONK' 1;
}
.word.lock {
  color: var(--lp-red);
}
/* the inline pictures open up and slide in from their side */
.pic {
  --k: clamp(0, calc(var(--p) * (var(--n) + 3) - var(--i)), 1);
  display: inline-block;
  vertical-align: -0.08em;
  height: 0.78em;
  width: calc(var(--k) * var(--w));
  opacity: var(--k);
  border-radius: 999px;
  overflow: hidden;
  transform: translate3d(calc((1 - var(--k)) * var(--dir) * 1.2em), 0, 0);
  transition:
    width 0.3s var(--lp-ease),
    opacity 0.3s linear,
    transform 0.4s var(--lp-ease);
}
.from-left {
  --dir: -1;
}
.from-right {
  --dir: 1;
}
.pic-lock {
  --w: 1.2em;
}
.pic-room {
  --w: 1.9em;
  box-shadow: var(--lp-shadow-md);
}
.pic-room img {
  width: 1.9em;
  height: 100%;
  object-fit: cover;
  object-position: 45% 40%;
  display: block;
}
.glyph {
  display: grid;
  place-items: center;
  width: 1.2em;
  height: 100%;
  padding: 0.13em;
  border-radius: inherit;
  background: var(--lp-red-soft);
  color: var(--lp-red);
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (max-width: 640px) {
  .big {
    height: 170vh;
  }
  .say {
    font-size: clamp(2.3rem, 11.5vw, 3.6rem);
    line-height: 1.05;
  }
}
</style>
