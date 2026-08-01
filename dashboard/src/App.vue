<template>
  <div class="flex min-h-screen bg-slate-950 text-slate-100">
    <!-- Mobile overlay -->
    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 bg-black/60 z-30 md:hidden"
      @click="mobileMenuOpen = false"
    ></div>

    <!-- Sidebar Navigation -->
    <aside
      :class="mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
      class="fixed md:relative z-40 w-64 h-full min-h-screen border-r border-slate-800/80 bg-slate-950 p-5 flex flex-col justify-between transition-transform duration-200"
    >
      <div class="space-y-6">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-2">
          <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            FG
          </div>
          <div>
            <h1 class="font-bold text-sm text-white tracking-wide">FocusGateway</h1>
            <p class="text-[10px] text-slate-400 font-mono">v1.0.0 • SQLite</p>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="space-y-1">
          <router-link to="/" @click="mobileMenuOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>📊</span> <span>Dashboard</span>
          </router-link>

          <router-link to="/sbw" @click="mobileMenuOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>🛡️</span> <span>SBW Windows</span>
          </router-link>

          <router-link to="/hardblock" @click="mobileMenuOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>🚫</span> <span>Hard Block</span>
          </router-link>

          <router-link to="/tasks" @click="mobileMenuOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>✅</span> <span>Tasks & Kanban</span>
          </router-link>

          <router-link to="/focus" @click="mobileMenuOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>🎯</span> <span>Focus Mode</span>
          </router-link>

          <router-link to="/history" @click="mobileMenuOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>📈</span> <span>History</span>
          </router-link>

          <router-link to="/settings" @click="mobileMenuOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>⚙️</span> <span>Settings</span>
          </router-link>
        </nav>
      </div>

      <!-- Service Status Indicator -->
      <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
        <span class="text-slate-400">Status</span>
        <span class="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Running
        </span>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile top bar -->
      <header class="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">FG</div>
          <span class="font-bold text-sm text-white">FocusGateway</span>
        </div>
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          <svg v-if="!mobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <main class="flex-1 p-6 md:p-8 overflow-y-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();
const mobileMenuOpen = ref(false);

onMounted(async () => {
  if (!authStore.token) {
    await authStore.loginStandard();
  }
});
</script>
