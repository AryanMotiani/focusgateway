<script setup>
// "How it blocks": a pinned scroll story on big screens. The steps on the left light up in
// turn while the picture on the right slides to the matching scene. On phones, and with
// reduced motion, it is a plain list of steps, each with its own picture.
import { computed, ref } from 'vue'
import StoryScene from './StoryScene.vue'
import { usePinProgress, useMedia, PINNABLE } from './motion.js'

const STEPS = [
  {
    kicker: 'Plan',
    title: 'Add what has to get done',
    text: 'Homework, a reading, twenty flashcards. Attach them to a window of time, like Instagram from 4 to 7.',
  },
  {
    kicker: 'Lock',
    title: 'The sites stay shut',
    text: 'Until those tasks are ticked, the window stays closed. In every tab, and with the lock agent in every browser and app too.',
  },
  {
    kicker: 'Earn',
    title: 'Finish, and it opens',
    text: 'Tick the last task and the sites unlock for the rest of the window. Earned, not begged for.',
  },
  {
    kicker: 'Failsafe',
    title: 'Real emergency? There is a way out',
    text: 'Your PIN, a forced wait and a typed reason. It works, and it is logged honestly, so it never turns into a habit.',
  },
]

const URLS = ['focusgateway / tasks', 'youtube.com', 'youtube.com', 'focusgateway / failsafe']
const root = ref(null)
const pinned = useMedia(PINNABLE)
const progress = ref(0)
usePinProgress(root, (p) => {
  if (pinned.value) progress.value = p
})
const active = computed(() => (pinned.value ? Math.min(STEPS.length - 1, Math.floor(progress.value * STEPS.length * 0.999)) : -1))

function jump(i) {
  const el = root.value
  if (!el || !pinned.value) return
  const top = el.getBoundingClientRect().top + window.scrollY
  const travel = el.offsetHeight - window.innerHeight
  window.scrollTo({ top: top + travel * ((i + 0.5) / STEPS.length), behavior: 'smooth' })
}
</script>

<template>
  <section id="how" ref="root" class="story" :class="{ pinned }" :style="pinned ? { height: STEPS.length * 85 + 60 + 'vh' } : null">
    <div class="sticky">
      <div class="lp-wrap grid-2">
        <div class="copy">
          <span class="lp-eyebrow">How it blocks</span>
          <h2 class="lp-h2 heading">A blocker you can't <span class="lp-italic">talk your way</span> out of.</h2>

          <ol class="steps">
            <li v-for="(s, i) in STEPS" :key="s.title" :class="{ on: active === i, past: active > i }">
              <component :is="pinned ? 'button' : 'div'" class="step" @click="jump(i)">
                <span class="num">{{ i + 1 }}</span>
                <span class="step-body">
                  <span class="kicker">{{ s.kicker }}</span>
                  <span class="step-title">{{ s.title }}</span>
                  <span class="step-text">{{ s.text }}</span>
                </span>
              </component>
              <!-- stacked layout: each step gets its picture right below it -->
              <div v-if="!pinned" class="window inline" aria-hidden="true">
                <div class="w-chrome">
                  <i></i><i></i><i></i><span class="w-url">{{ URLS[i] }}</span>
                </div>
                <div class="inline-scene"><StoryScene :step="i" :on="true" /></div>
              </div>
            </li>
          </ol>

          <div v-if="pinned" class="bar" aria-hidden="true">
            <span :style="{ transform: `scaleX(${progress})` }"></span>
          </div>
        </div>

        <div v-if="pinned" class="visual" aria-hidden="true">
          <div class="window">
            <div class="w-chrome">
              <i></i><i></i><i></i><span class="w-url">{{ URLS[Math.max(0, active)] }}</span>
            </div>
            <div class="scenes">
              <div v-for="i in 4" :key="i" class="scene" :class="{ on: active === i - 1, before: active < i - 1, after: active > i - 1 }">
                <StoryScene :step="i - 1" :on="active === i - 1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.story {
  position: relative;
  background: linear-gradient(180deg, var(--lp-bg) 0%, var(--lp-bg-tint) 18%, var(--lp-bg-tint) 82%, var(--lp-bg) 100%);
}
.sticky {
  padding-block: 96px;
}
.pinned .sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  padding-block: 84px 24px;
}
.grid-2 {
  display: grid;
  gap: 48px;
}
.pinned .grid-2 {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 64px;
}
.heading {
  margin-top: 14px;
  max-width: 15ch;
}
.steps {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step {
  width: 100%;
  display: flex;
  gap: 16px;
  text-align: left;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid transparent;
  transition:
    background 0.4s,
    border-color 0.4s,
    opacity 0.4s;
  cursor: default;
}
.pinned .step {
  cursor: pointer;
  opacity: 0.5;
}
.pinned li.past .step {
  opacity: 0.7;
}
.pinned li.on .step {
  opacity: 1;
  background: var(--lp-surface);
  border-color: var(--lp-line);
  box-shadow: var(--lp-shadow-md);
}
.num {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-family: var(--lp-serif);
  font-weight: 650;
  font-size: 17px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line-strong);
  transition:
    background 0.4s,
    color 0.4s,
    border-color 0.4s;
}
li.on .num,
.story:not(.pinned) .num {
  background: var(--lp-accent);
  color: var(--lp-on-accent);
  border-color: var(--lp-accent);
}
.step-body {
  display: flex;
  flex-direction: column;
}
.kicker {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lp-faint);
}
.step-title {
  margin-top: 2px;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
}
.step-text {
  font-size: 15px;
  line-height: 1.55;
  color: var(--lp-muted);
  display: grid;
  grid-template-rows: 1fr;
  margin-top: 4px;
  transition:
    grid-template-rows 0.4s,
    opacity 0.4s;
}
.pinned li:not(.on) .step-text {
  display: none;
}
.bar {
  margin-top: 22px;
  margin-left: 16px;
  height: 4px;
  width: calc(100% - 32px);
  border-radius: 4px;
  background: var(--lp-line);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--lp-accent), var(--lp-warm));
  transform-origin: left;
}

/* ------------------------------------------------ the window */
.visual {
  position: relative;
}
.window {
  position: relative;
  border-radius: 24px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-lg);
  overflow: hidden;
}
.w-chrome {
  display: flex;
  gap: 7px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--lp-line);
  background: var(--lp-surface-2);
}
.w-url {
  margin-inline: auto;
  transform: translateX(-24px);
  padding: 2px 14px;
  border-radius: 8px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  font-size: 12px;
  color: var(--lp-muted);
  min-width: 40%;
  text-align: center;
}
.w-chrome {
  align-items: center;
}
.w-chrome i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--lp-line-strong);
}
.scenes {
  position: relative;
  height: min(430px, 56vh);
}
.scene {
  position: absolute;
  inset: 0;
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.55s cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform: translateY(40px) scale(0.98);
  pointer-events: none;
}
.scene.after {
  transform: translateY(-40px) scale(0.98);
}
.scene.on {
  opacity: 1;
  transform: none;
}
/* ------------------------------------------------ stacked layout */
.story:not(.pinned) .steps {
  gap: 36px;
}
.story:not(.pinned) .step {
  padding: 0;
}
.window.inline {
  margin-top: 18px;
}
.inline-scene {
  padding: 24px 18px;
}
</style>
