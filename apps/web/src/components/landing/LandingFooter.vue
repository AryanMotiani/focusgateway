<script setup>
// The friendly last nudge and the footer.
import Icon from '../Icon.vue'
import Arrow from './Arrow.vue'
import Shot from './Shot.vue'
import logo from '../../assets/logo.svg'
import { REPO_URL, RELEASES_URL, PRIVACY_URL } from '../../config.js'
import { vReveal } from './motion.js'

defineProps({ started: { type: Boolean, default: false } })
const year = new Date().getFullYear()
</script>

<template>
  <section class="cta-wrap">
    <div class="lp-wrap">
      <div v-reveal class="cta">
        <div class="cta-pic" aria-hidden="true">
          <Shot name="room-morning" alt="" sizes="(max-width: 900px) 100vw, 600px" />
        </div>
        <div class="cta-copy">
          <h2 class="lp-h2">Tonight, the internet <span class="lp-italic">can wait.</span></h2>
          <p class="lp-lead">Free forever. No account, no email, no catch. Your room is ready.</p>
          <div class="btns">
            <RouterLink :to="started ? '/' : '/welcome'" class="lp-btn lp-btn-primary">
              {{ started ? 'Open your study room' : 'Start free, no account' }} <Arrow />
            </RouterLink>
            <RouterLink to="/install" class="lp-btn lp-btn-ghost"><Icon name="puzzle" :size="17" /> Get the extension</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="foot">
    <div class="lp-wrap cols">
      <div class="brand">
        <span class="logo"><img :src="logo" alt="" width="32" height="32" /> FocusGateway</span>
        <p>A cozy study room with a site blocker you can't talk your way out of. Made for students who want their evenings back.</p>
      </div>
      <nav aria-label="Product">
        <h3>Product</h3>
        <RouterLink to="/room">Study room</RouterLink>
        <RouterLink to="/welcome">Get started</RouterLink>
        <RouterLink to="/install">Install</RouterLink>
      </nav>
      <nav aria-label="Open source">
        <h3>Open source</h3>
        <a :href="REPO_URL" target="_blank" rel="noopener">GitHub</a>
        <a :href="RELEASES_URL" target="_blank" rel="noopener">Releases</a>
        <a :href="`${REPO_URL}/blob/master/LICENSE`" target="_blank" rel="noopener">MIT licence</a>
        <a :href="`${REPO_URL}/issues`" target="_blank" rel="noopener">Report an issue</a>
      </nav>
      <nav aria-label="Legal">
        <h3>Privacy</h3>
        <a :href="PRIVACY_URL" target="_blank" rel="noopener">Privacy policy</a>
        <span class="note">No cookies, no analytics, no account.</span>
      </nav>
    </div>
    <div class="lp-wrap">
      <div class="bottom">
        <span>© {{ year }} FocusGateway contributors · MIT licensed</span>
        <span class="love">Made with <Icon name="heart" :size="13" /> and a lot of lofi</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.cta-wrap {
  padding-block: 72px 96px;
}
.cta {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  align-items: center;
  gap: 48px;
  padding: 24px;
  border-radius: 36px;
  background:
    radial-gradient(70% 90% at 100% 0%, var(--lp-glow-2), transparent 60%),
    radial-gradient(70% 90% at 0% 100%, var(--lp-glow-1), transparent 60%), var(--lp-surface);
  border: 1px solid var(--lp-line);
  box-shadow: var(--lp-shadow-md);
}
.cta-pic {
  order: 2;
  border-radius: 24px;
  overflow: hidden;
  aspect-ratio: 1280 / 800;
  transform: rotate(2deg);
  box-shadow: var(--lp-shadow-lg);
}
.cta-pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cta-copy {
  padding: 32px 8px 32px 32px;
}
.cta-copy .lp-lead {
  margin-top: 16px;
}
.btns {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.foot {
  border-top: 1px solid var(--lp-line);
  padding-top: 56px;
  font-size: 14.5px;
}
.cols {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 32px;
}
.brand p {
  margin-top: 12px;
  max-width: 24rem;
  color: var(--lp-muted);
  line-height: 1.6;
}
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 750;
  font-size: 17px;
  letter-spacing: -0.01em;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
nav h3 {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lp-faint);
  margin-bottom: 2px;
}
nav a {
  color: var(--lp-ink-2);
  width: fit-content;
  transition: color 0.2s;
}
nav a:hover {
  color: var(--lp-accent);
}
.note {
  color: var(--lp-muted);
  font-size: 13.5px;
}
.bottom {
  margin-top: 48px;
  padding-block: 24px 32px;
  border-top: 1px solid var(--lp-line);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--lp-faint);
  font-size: 13.5px;
}
.love {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.love svg {
  color: #ff5a7a;
}
@media (max-width: 900px) {
  .cta {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 16px;
  }
  .cta-pic {
    order: 0;
    transform: none;
  }
  .cta-copy {
    padding: 20px 8px 16px;
  }
  .cols {
    grid-template-columns: 1fr 1fr;
  }
  .brand {
    grid-column: span 2;
  }
}
</style>
