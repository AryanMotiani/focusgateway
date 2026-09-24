<script setup>
import { computed } from 'vue'
import { store } from '../lib/store.js'
import { REPO_URL } from '../config.js'
import RoomScene from '../components/RoomScene.vue'
import Icon from '../components/Icon.vue'
import logo from '../assets/logo.svg'

const started = computed(() => store.state?.onboarding?.completed)
const FEATURES = [
  ['unlock', 'Task-gated windows', 'Instagram stays blocked from 4 to 7 until your homework is ticked off. Not done when the window ends? It stays blocked until you are.'],
  ['lock', 'Hard blocks', 'Nights, classes, exam week. Blocked for the whole window. You can even remove the escape hatch.'],
  ['target', 'Focus sessions', 'One click Pomodoro. Sites stay blocked through the breaks too, so a break never turns into an hour.'],
  ['key', 'A Failsafe that makes you think', 'Real emergencies happen. Overriding takes your PIN, a forced wait and a typed reason, and it is logged.'],
  ['list', 'Tasks and schedule', 'Deadlines, subtasks, tags, repeats and a week view you can drag things around in.'],
  ['sparkles', 'Minimal habits', 'Water, reading, sleep. Tick them off, keep the streak, nothing more.'],
  ['headphones', 'Lofi study room', 'Rainy window, generative lofi beats and café ambience, built right in. Still plays when YouTube is blocked.'],
  ['chart', 'Accountability history', 'Every forward, delete and override is counted. An honest mirror, not a guilt machine.'],
]
const STEPS = [
  ['Add the extension', 'Free for Chrome, Edge, Brave, Opera and Firefox. It keeps your data on your computer.'],
  ['Make a rule', 'Pick sites and a time window. Choose Hard Block, or attach the tasks that unlock it.'],
  ['Do the work', 'Finish your tasks and the sites open. Or don’t, and they stay shut.'],
]
</script>

<template>
  <div class="min-h-screen">
    <header class="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <div class="flex items-center gap-2.5"><img :src="logo" alt="" class="h-9 w-9" /><span class="text-lg font-semibold tracking-tight">FocusGateway</span></div>
      <nav class="flex items-center gap-1 text-sm">
        <a :href="REPO_URL" class="btn btn-ghost btn-sm max-sm:hidden" target="_blank" rel="noopener"><Icon name="github" :size="16" /> GitHub</a>
        <RouterLink to="/install" class="btn btn-ghost btn-sm">Install</RouterLink>
        <RouterLink :to="started ? '/' : '/welcome'" class="btn btn-primary btn-sm">{{ started ? 'Open app' : 'Get started' }}</RouterLink>
      </nav>
    </header>

    <section class="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-6 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
      <div>
        <p class="chip !bg-accent-soft !text-accent">Free · open source · no account needed</p>
        <h1 class="h-display mt-4 text-6xl leading-[0.95] sm:text-7xl">Study first.<br /><span class="text-accent italic">Scroll later.</span></h1>
        <p class="mt-5 max-w-lg text-lg text-muted">FocusGateway blocks distracting websites until your work is actually done. With tasks, habits and a cozy lofi study room built in.</p>
        <div class="mt-7 flex flex-wrap gap-3">
          <RouterLink to="/install" class="btn btn-primary px-5 py-3 text-base"><Icon name="puzzle" /> Add to your browser</RouterLink>
          <RouterLink :to="started ? '/' : '/welcome'" class="btn px-5 py-3 text-base">Try it in this tab</RouterLink>
        </div>
        <p class="mt-4 text-sm text-muted">Works in Chrome, Edge, Brave, Opera, Vivaldi, Arc and Firefox. Your data never leaves your computer.</p>
      </div>
      <RouterLink to="/room" class="group relative block aspect-[4/3] overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-black/5">
        <RoomScene scene="night" :rain="0.5" />
        <div class="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-2xl border border-white/10 bg-[#120f24]/60 p-4 text-white backdrop-blur-xl">
          <div>
            <p class="text-xs text-white/60 uppercase">Focus · round 2 of 4</p>
            <p class="font-mono text-3xl font-semibold">18:42</p>
          </div>
          <span class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#120f24] transition group-hover:scale-105">Enter the study room →</span>
        </div>
      </RouterLink>
    </section>

    <section class="border-y border-line bg-card/60">
      <div class="mx-auto grid max-w-6xl gap-6 px-5 py-14 md:grid-cols-3">
        <div v-for="([t, d], i) in STEPS" :key="t">
          <p class="h-display text-5xl text-accent">{{ i + 1 }}</p>
          <h3 class="mt-2 text-lg font-semibold">{{ t }}</h3>
          <p class="mt-1 text-muted">{{ d }}</p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-5 py-16">
      <h2 class="h-display text-5xl">Everything you need to get it done.</h2>
      <p class="mt-2 max-w-2xl text-muted">And nothing that turns productivity into another app to scroll.</p>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="[icon, t, d] in FEATURES" :key="t" class="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon :name="icon" /></span>
          <h3 class="mt-4 font-semibold">{{ t }}</h3>
          <p class="mt-1.5 text-sm text-muted">{{ d }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-5 pb-16">
      <div class="grid gap-8 rounded-[28px] bg-[#1b1640] p-8 text-white sm:p-12 lg:grid-cols-2">
        <div>
          <h2 class="h-display text-5xl">Hard to get around. On purpose.</h2>
          <p class="mt-4 text-white/70">Most blockers lose to "just disable the extension" or "turn on Secure DNS". Add the optional <b class="text-white">lock agent</b> and FocusGateway:</p>
        </div>
        <ul class="space-y-3 text-white/85">
          <li class="flex gap-3"><Icon name="check" class="mt-0.5 text-[#f6b25e]" /> Blocks your sites in every browser and app on the computer, not just one.</li>
          <li class="flex gap-3"><Icon name="check" class="mt-0.5 text-[#f6b25e]" /> Switches off Secure DNS and private windows through official browser policies.</li>
          <li class="flex gap-3"><Icon name="check" class="mt-0.5 text-[#f6b25e]" /> Can lock the extensions page so the blocker can’t be turned off mid-session.</li>
          <li class="flex gap-3"><Icon name="check" class="mt-0.5 text-[#f6b25e]" /> Keeps a running no-failsafe block alive even if you delete the rule.</li>
          <li class="flex gap-3 text-white/60"><Icon name="info" class="mt-0.5" /> Honest note: someone with admin rights can always undo software on their own machine. FocusGateway makes that slow, deliberate and visible.</li>
        </ul>
      </div>
    </section>

    <footer class="border-t border-line">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted">
        <p>FocusGateway · MIT licensed · made for students who want their evenings back</p>
        <div class="flex gap-4"><a :href="REPO_URL" target="_blank" rel="noopener" class="hover:text-ink">Source code</a><RouterLink to="/install" class="hover:text-ink">Install</RouterLink><RouterLink to="/room" class="hover:text-ink">Study room</RouterLink></div>
      </div>
    </footer>
  </div>
</template>
