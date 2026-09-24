<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { store, blocks, useLocalInstead } from './lib/store.js'
import { lofi } from './lib/lofi.js'
import Icon from './components/Icon.vue'
import logo from './assets/logo.svg'
import Toasts from './components/Toasts.vue'
import DialogHost from './components/DialogHost.vue'

const route = useRoute()
const menu = ref(false)

// theme: follows settings (system / light / dark)
const media = window.matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(media.matches)
media.addEventListener?.('change', (e) => (systemDark.value = e.matches))
watchEffect(() => {
  const t = store.state?.settings?.theme || 'system'
  const dark = t === 'dark' || (t === 'system' && systemDark.value)
  document.documentElement.classList.toggle('dark', dark)
})

const nav = [
  { to: '/', label: 'Today', icon: 'home' },
  { to: '/tasks', label: 'Tasks', icon: 'list' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/blocking', label: 'Blocking', icon: 'shield' },
  { to: '/habits', label: 'Habits', icon: 'target' },
  { to: '/room', label: 'Study room', icon: 'headphones' },
  { to: '/stats', label: 'Accountability', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]
const mobileNav = [nav[0], nav[1], nav[3], nav[4], nav[5]]
const activeCount = computed(() => blocks.value.blocks.length)
const music = lofi()
</script>

<template>
  <div v-if="store.pendingApproval" class="grid min-h-screen place-items-center p-6">
    <div class="card max-w-md p-6 text-center">
      <img :src="logo" alt="" class="mx-auto h-12 w-12" />
      <h1 class="mt-4 text-xl font-semibold">Approve this site in the extension</h1>
      <p class="mt-2 text-sm text-muted">
        Click the FocusGateway icon in your browser toolbar and press <b>Allow</b> for this site. This page continues on its own.
      </p>
      <button class="btn mt-5" @click="useLocalInstead">Use without the extension</button>
    </div>
  </div>

  <template v-else>
    <RouterView v-if="route.meta.bare" />
    <div v-else class="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <!-- sidebar -->
      <aside class="sticky top-0 hidden h-screen flex-col border-r border-line px-4 py-5 lg:flex">
        <RouterLink to="/" class="mb-6 flex items-center gap-2.5 px-2">
          <img :src="logo" alt="" class="h-8 w-8" />
          <span class="text-[17px] font-semibold tracking-tight">FocusGateway</span>
        </RouterLink>
        <nav class="flex flex-1 flex-col gap-0.5" aria-label="Main">
          <RouterLink
            v-for="n in nav"
            :key="n.to"
            :to="n.to"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-sunk hover:text-ink"
            exact-active-class="!bg-accent-soft !text-accent"
          >
            <Icon :name="n.icon" /> {{ n.label }}
            <span
              v-if="n.to === '/blocking' && activeCount"
              class="ml-auto rounded-full bg-accent px-2 text-[11px] font-bold text-white dark:text-[#120f24]"
              >{{ activeCount }}</span
            >
            <span v-if="n.to === '/room' && music.playing" class="ml-auto h-2 w-2 animate-pulse rounded-full bg-warm" />
          </RouterLink>
        </nav>
        <div class="space-y-2">
          <RouterLink v-if="store.mode === 'local'" to="/install" class="block rounded-xl bg-warm-soft p-3 text-xs">
            <b class="text-warm">Blocking is off.</b> <span class="text-muted">Install the free extension to block sites.</span>
          </RouterLink>
          <p v-else-if="!store.state?.agent?.paired" class="px-3 text-xs text-muted">
            Extension active. <RouterLink to="/install" class="text-accent underline">Add the lock agent</RouterLink> for every browser.
          </p>
          <p v-else class="px-3 text-xs text-good">Extension + lock agent active</p>
        </div>
      </aside>

      <!-- mobile top bar -->
      <header
        class="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden"
      >
        <RouterLink to="/" class="flex items-center gap-2"
          ><img :src="logo" alt="" class="h-7 w-7" /><span class="font-semibold">FocusGateway</span></RouterLink
        >
        <button class="btn btn-ghost btn-sm" aria-label="Menu" @click="menu = !menu"><Icon name="menu" /></button>
      </header>
      <div v-if="menu" class="fixed inset-0 z-40 bg-paper p-4 lg:hidden" @click="menu = false">
        <div class="mb-4 flex justify-end">
          <button class="btn btn-ghost btn-sm" aria-label="Close menu"><Icon name="x" /></button>
        </div>
        <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="flex items-center gap-3 rounded-xl px-3 py-3 font-medium"
          ><Icon :name="n.icon" /> {{ n.label }}</RouterLink
        >
        <RouterLink to="/install" class="flex items-center gap-3 rounded-xl px-3 py-3 font-medium"
          ><Icon name="puzzle" /> Install</RouterLink
        >
      </div>

      <main class="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        <RouterView />
      </main>

      <!-- mobile bottom nav -->
      <nav
        class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Quick"
      >
        <RouterLink
          v-for="n in mobileNav"
          :key="n.to"
          :to="n.to"
          class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted"
          exact-active-class="!text-accent"
        >
          <Icon :name="n.icon" :size="20" /> {{ n.label === 'Study room' ? 'Room' : n.label }}
        </RouterLink>
      </nav>
    </div>
  </template>

  <Toasts />
  <DialogHost />
</template>
