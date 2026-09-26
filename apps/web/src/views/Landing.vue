<script setup>
// The public landing page (#/home). Light by default with its own dark toggle, independent
// of the app themes. Sections live in components/landing, media in public/media
// (made by scripts/landing-media.mjs).
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/geist-mono'
import '../components/landing/landing.css'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { store } from '../lib/store.js'
import { REPO_URL } from '../config.js'
import Icon from '../components/Icon.vue'
import logo from '../assets/logo.svg'
import HeroSection from '../components/landing/HeroSection.vue'
import BigStatement from '../components/landing/BigStatement.vue'
import RewardLoop from '../components/landing/RewardLoop.vue'
import BlockStory from '../components/landing/BlockStory.vue'
import FeatureBento from '../components/landing/FeatureBento.vue'
import ScreenRail from '../components/landing/ScreenRail.vue'
import StyleCompare from '../components/landing/StyleCompare.vue'
import DemoVideo from '../components/landing/DemoVideo.vue'
import GetStarted from '../components/landing/GetStarted.vue'
import OpenBand from '../components/landing/OpenBand.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import { useFrame } from '../components/landing/motion.js'

const started = computed(() => !!store.state?.onboarding?.completed)

// ------------------------------------------------ light or dark, just for this page
const THEME_KEY = 'focusgateway:landing-theme'
function savedTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'dark' || v === 'light' ? v : 'light'
  } catch {
    return 'light'
  }
}
const theme = ref(savedTheme())
watch(theme, (v) => {
  try {
    localStorage.setItem(THEME_KEY, v)
  } catch {}
})
const toggleTheme = () => (theme.value = theme.value === 'dark' ? 'light' : 'dark')

// the page background behind overscroll follows the landing theme, then goes back to the app's.
// Read what was there before the immediate watch below paints it, and on leaving hand the
// background back to the stylesheet. Otherwise the landing cream stays on <body> under every
// app page and a dark theme ends up with light text on a light page.
const before = document.body.style.backgroundColor
watch(
  theme,
  (v) => {
    document.body.style.backgroundColor = v === 'dark' ? '#0e0c18' : '#fcfaf7'
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  document.body.style.backgroundColor = before
})

// ------------------------------------------------ nav
const scrolled = ref(false)
useFrame(() => {
  scrolled.value = window.scrollY > 12
})
// hash routing owns the # in the address, so in-page links scroll by hand
function go(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="lp" :data-theme="theme">
    <header class="nav" :class="{ scrolled }">
      <div class="lp-wrap nav-in">
        <RouterLink to="/home" class="brand" aria-label="FocusGateway home">
          <img :src="logo" alt="" width="30" height="30" />
          <span>FocusGateway</span>
        </RouterLink>
        <nav class="links" aria-label="Page">
          <button @click="go('how')">How it works</button>
          <button @click="go('rewards')">Rewards</button>
          <button @click="go('features')">Features</button>
          <a :href="REPO_URL" target="_blank" rel="noopener"><Icon name="github" :size="15" /> Open source</a>
        </nav>
        <div class="actions">
          <button
            class="theme"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
            @click="toggleTheme"
          >
            <Transition name="spin" mode="out-in">
              <Icon :key="theme" :name="theme === 'dark' ? 'sun' : 'moon'" :size="18" />
            </Transition>
          </button>
          <RouterLink :to="started ? '/' : '/welcome'" class="lp-btn lp-btn-primary lp-btn-sm get">
            {{ started ? 'Open app' : 'Get FocusGateway' }}
          </RouterLink>
        </div>
      </div>
    </header>

    <main>
      <HeroSection :started="started" />
      <BigStatement />
      <BlockStory />
      <RewardLoop />
      <FeatureBento />
      <ScreenRail />
      <StyleCompare />
      <DemoVideo />
      <GetStarted :started="started" />
      <OpenBand />
      <LandingFooter :started="started" />
    </main>
  </div>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  transition:
    background-color 0.3s,
    border-color 0.3s,
    backdrop-filter 0.3s;
  border-bottom: 1px solid transparent;
}
.nav.scrolled {
  background: color-mix(in srgb, var(--lp-bg) 78%, transparent);
  backdrop-filter: saturate(1.4) blur(14px);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  border-bottom-color: var(--lp-line);
}
.nav-in {
  animation: nav-in 0.8s var(--lp-ease) both;
  height: 68px;
  display: flex;
  align-items: center;
  gap: 24px;
}
@keyframes nav-in {
  from {
    opacity: 0;
    transform: translate3d(0, -14px, 0);
  }
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 750;
  font-size: 17px;
  letter-spacing: -0.015em;
}
.links {
  display: flex;
  gap: 4px;
  margin-left: 12px;
}
.links button,
.links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 14.5px;
  font-weight: 550;
  color: var(--lp-muted);
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}
.links button:hover,
.links a:hover {
  color: var(--lp-ink);
  background: var(--lp-surface-2);
}
.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.theme {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 1px solid var(--lp-line);
  background: var(--lp-surface);
  color: var(--lp-ink);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    color 0.2s,
    transform 0.2s;
}
.theme:hover {
  border-color: var(--lp-accent);
  background: var(--lp-accent-soft);
  color: var(--lp-accent);
  transform: translateY(-1px);
}
.spin-enter-active,
.spin-leave-active {
  transition:
    transform 0.25s,
    opacity 0.25s;
}
.spin-enter-from {
  transform: rotate(-90deg) scale(0.5);
  opacity: 0;
}
.spin-leave-to {
  transform: rotate(90deg) scale(0.5);
  opacity: 0;
}
@media (max-width: 820px) {
  .links {
    display: none;
  }
}
@media (max-width: 420px) {
  .brand span {
    display: none;
  }
}
</style>
