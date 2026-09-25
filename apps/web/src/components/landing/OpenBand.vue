<script setup>
// The contrasting band: open source, local first, and honest about what software can do.
import Icon from '../Icon.vue'
import { REPO_URL, PRIVACY_URL } from '../../config.js'
import { vReveal } from './motion.js'

const STATS = [
  ['0', 'accounts to make'],
  ['0', 'servers holding your data'],
  ['0', 'trackers or ads'],
  ['MIT', 'licence, every line public'],
]
const PILLARS = [
  ['shield', 'Local first', 'Tasks, habits and history live in your browser. Nothing is uploaded, ever.'],
  ['github', 'Open source', 'Read the code before you give anything admin rights. You should, with any program.'],
  [
    'info',
    'Honest about limits',
    'Anyone with admin rights can undo software on their own machine. FocusGateway makes that slow, deliberate and visible.',
  ],
]
</script>

<template>
  <section id="open-source" class="band-wrap">
    <div class="lp-wrap">
      <div class="band">
        <div class="stars" aria-hidden="true"></div>
        <div v-reveal class="top">
          <div>
            <span class="lp-eyebrow eb">Open source, local first</span>
            <h2 class="lp-h2 h">Your study habits are <span class="lp-italic">nobody else's business.</span></h2>
          </div>
          <div class="btns">
            <a :href="REPO_URL" target="_blank" rel="noopener" class="lp-btn light"><Icon name="github" :size="18" /> Read the code</a>
            <a :href="PRIVACY_URL" target="_blank" rel="noopener" class="lp-btn outline">Privacy policy</a>
          </div>
        </div>
        <dl class="stats">
          <div v-for="([n, l], i) in STATS" :key="l" v-reveal="i * 80" class="stat">
            <dt class="lp-serif">{{ n }}</dt>
            <dd>{{ l }}</dd>
          </div>
        </dl>
        <div class="pillars">
          <div v-for="([icon, t, d], i) in PILLARS" :key="t" v-reveal="i * 80" class="pillar">
            <span class="p-icon"><Icon :name="icon" :size="18" /></span>
            <h3>{{ t }}</h3>
            <p>{{ d }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.band-wrap {
  padding-block: 40px;
}
.band {
  position: relative;
  overflow: hidden;
  border-radius: 36px;
  padding: 64px 56px;
  color: #f4f1ff;
  background:
    radial-gradient(60% 80% at 100% 0%, rgba(154, 136, 255, 0.35), transparent 60%),
    radial-gradient(50% 70% at 0% 100%, rgba(255, 154, 61, 0.18), transparent 60%), #17132b;
  isolation: isolate;
}
.lp[data-theme='dark'] .band {
  border: 1px solid var(--lp-line);
}
.stars {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.6;
  background-image:
    radial-gradient(1.5px 1.5px at 12% 22%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 32% 70%, #fff 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 58% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 78% 56%, #fff 50%, transparent 51%),
    radial-gradient(1px 1px at 90% 30%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 44% 88%, #fff 50%, transparent 51%),
    radial-gradient(1px 1px at 6% 80%, #fff 50%, transparent 51%);
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
  flex-wrap: wrap;
}
.eb {
  color: #ffc27a;
}
.h {
  margin-top: 14px;
  max-width: 17ch;
}
.h .lp-italic {
  color: #c8bcff;
}
.btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.light {
  background: #fff;
  color: #16122b;
}
.light:hover {
  transform: translateY(-2px);
}
.outline {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
}
.outline:hover {
  border-color: rgba(255, 255, 255, 0.6);
}
.stats {
  margin-top: 56px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.stat {
  padding: 28px 20px 0 0;
}
.stat dt {
  font-size: clamp(2.6rem, 5vw, 4rem);
  line-height: 1;
  font-weight: 600;
  letter-spacing: -0.04em;
}
.stat dd {
  margin-top: 8px;
  color: rgba(244, 241, 255, 0.68);
  font-size: 14.5px;
}
.pillars {
  margin-top: 48px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.pillar {
  padding: 22px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.p-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffc27a;
}
.pillar h3 {
  margin-top: 14px;
  font-weight: 700;
  font-size: 16.5px;
}
.pillar p {
  margin-top: 6px;
  color: rgba(244, 241, 255, 0.68);
  font-size: 14.5px;
  line-height: 1.55;
}
@media (max-width: 900px) {
  .band {
    padding: 44px 24px;
    border-radius: 28px;
  }
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pillars {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
