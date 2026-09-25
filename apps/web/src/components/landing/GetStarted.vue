<script setup>
// Get started in three steps, with the button that fits this visitor's browser and computer.
import Icon from '../Icon.vue'
import Arrow from './Arrow.vue'
import { vReveal } from './motion.js'
import { extensionLink, agentLink, osName } from './platform.js'

defineProps({ started: { type: Boolean, default: false } })
const ext = extensionLink()
const agent = agentLink()
</script>

<template>
  <section id="start" class="lp-section">
    <div class="lp-wrap">
      <div v-reveal class="head">
        <span class="lp-eyebrow">Get started</span>
        <h2 class="lp-h2">Two minutes. <span class="lp-italic">Three steps.</span></h2>
      </div>

      <ol class="steps">
        <li v-reveal class="step">
          <span class="n">1</span>
          <h3 class="t">Open the app</h3>
          <p class="d">It runs right here in your browser. Set a PIN, add tonight's tasks, pick a scene.</p>
          <RouterLink :to="started ? '/' : '/welcome'" class="lp-btn lp-btn-primary lp-btn-sm">
            {{ started ? 'Open your study room' : 'Start free' }} <Arrow />
          </RouterLink>
        </li>
        <li v-reveal="100" class="step">
          <span class="n">2</span>
          <h3 class="t">Add the extension</h3>
          <p class="d">So the blocks really block. Free, and it keeps everything on this computer.</p>
          <a v-if="ext.external" :href="ext.href" target="_blank" rel="noopener" class="lp-btn lp-btn-ghost lp-btn-sm"
            ><Icon name="puzzle" :size="16" /> {{ ext.label }}</a
          >
          <RouterLink v-else :to="ext.to" class="lp-btn lp-btn-ghost lp-btn-sm"
            ><Icon name="puzzle" :size="16" /> {{ ext.label }}</RouterLink
          >
        </li>
        <li v-reveal="200" class="step">
          <span class="n">3</span>
          <h3 class="t">Lock it down <span class="opt">optional</span></h3>
          <p class="d">
            The lock agent blocks every browser and app on {{ osName ? `your ${osName} computer` : 'your computer' }}, private windows
            included.
          </p>
          <RouterLink :to="agent.to" class="lp-btn lp-btn-ghost lp-btn-sm"
            ><Icon name="download" :size="16" /> {{ agent.label }}</RouterLink
          >
        </li>
      </ol>
      <p v-reveal class="works">Works in Chrome, Edge, Brave, Opera, Vivaldi, Arc and Firefox. Safari is covered by the lock agent.</p>
    </div>
  </section>
</template>

<style scoped>
.head {
  text-align: center;
}
.head .lp-h2 {
  margin-top: 14px;
}
.steps {
  position: relative;
  margin-top: 56px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  counter-reset: s;
}
.steps::before {
  content: '';
  position: absolute;
  top: 44px;
  left: 16%;
  right: 16%;
  border-top: 2px dashed var(--lp-line-strong);
  z-index: 0;
}
.step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 26px;
  border-radius: 26px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-sm);
}
.n {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--lp-accent-soft);
  color: var(--lp-accent);
  font-family: var(--lp-serif);
  font-size: 20px;
  font-weight: 650;
}
.step:first-child .n {
  background: var(--lp-accent);
  color: var(--lp-on-accent);
}
.t {
  margin-top: 18px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.opt {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--lp-surface-2);
  color: var(--lp-muted);
}
.d {
  margin-top: 8px;
  margin-bottom: 22px;
  color: var(--lp-muted);
  line-height: 1.55;
  font-size: 15px;
}
.step .lp-btn {
  margin-top: auto;
}
.works {
  margin-top: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--lp-muted);
}
@media (max-width: 860px) {
  .steps {
    grid-template-columns: minmax(0, 1fr);
  }
  .steps::before {
    top: 20px;
    bottom: 20px;
    left: 45px;
    right: auto;
    border-top: 0;
    border-left: 2px dashed var(--lp-line-strong);
  }
}
</style>
