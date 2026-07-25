<template>
  <div class="flex min-h-screen bg-slate-950 text-slate-100">
    <!-- Sidebar Navigation -->
    <aside class="w-64 border-r border-slate-800/80 bg-slate-950 p-5 flex flex-col justify-between hidden md:flex">
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
          <router-link to="/" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>📊</span> <span>Dashboard</span>
          </router-link>

          <router-link to="/sbw" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>🛡️</span> <span>SBW Windows</span>
          </router-link>

          <router-link to="/hardblock" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>🚫</span> <span>Hard Block</span>
          </router-link>

          <router-link to="/tasks" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>✅</span> <span>Tasks & Kanban</span>
          </router-link>

          <router-link to="/focus" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>🎯</span> <span>Focus Mode</span>
          </router-link>

          <router-link to="/history" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <span>📈</span> <span>History</span>
          </router-link>

          <router-link to="/settings" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-900 text-slate-300 hover:text-white" active-class="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
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
    <main class="flex-1 p-6 md:p-8 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();

onMounted(() => {
  if (!authStore.token) {
    authStore.loginStandard();
  }
});
</script>
