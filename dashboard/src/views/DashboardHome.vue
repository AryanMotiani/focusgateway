<template>
  <div class="space-y-6">
    <!-- Top Greeting Banner -->
    <div class="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-indigo-500">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>FocusGateway Dashboard</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Service Active
          </span>
        </h1>
        <p class="text-sm text-slate-400 mt-1">
          Your commitment system is actively evaluating rules and protecting your focus.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/tasks" class="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2">
          <span>Manage Tasks</span>
        </router-link>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="glass-card p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Rules</p>
          <p class="text-2xl font-bold text-white mt-1">{{ rulesStore.rules.length }}</p>
        </div>
        <div class="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
      </div>

      <div class="glass-card p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Tasks</p>
          <p class="text-2xl font-bold text-white mt-1">{{ pendingTasksCount }}</p>
        </div>
        <div class="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
      </div>

      <div class="glass-card p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed Tasks</p>
          <p class="text-2xl font-bold text-emerald-400 mt-1">{{ completedTasksCount }}</p>
        </div>
        <div class="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
      </div>

      <div class="glass-card p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Streak</p>
          <p class="text-2xl font-bold text-rose-400 mt-1">4 Days 🔥</p>
        </div>
        <div class="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>
        </div>
      </div>
    </div>

    <!-- Currently Active Block Card -->
    <div class="glass-card p-6 rounded-2xl space-y-4">
      <h2 class="text-lg font-semibold text-white flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Active Site Blocks</span>
      </h2>

      <div v-if="rulesStore.rules.length === 0" class="text-center py-8 text-slate-400 text-sm">
        No active block rules configured yet. Create a Scheduled Block Window or Hard Block to start.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="rule in rulesStore.rules" :key="rule.id" class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-white">{{ rule.label || 'Default Block Window' }}</span>
              <span :class="rule.mode === 'hard_block' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'" class="px-2 py-0.5 rounded text-xs font-mono uppercase border">
                {{ rule.mode }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              ⏰ {{ rule.window_start }} - {{ rule.window_end }}
            </p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRulesStore } from '../stores/rules';
import { useTasksStore } from '../stores/tasks';

const rulesStore = useRulesStore();
const tasksStore = useTasksStore();

const pendingTasksCount = computed(() => tasksStore.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length);
const completedTasksCount = computed(() => tasksStore.tasks.filter(t => t.status === 'complete').length);

onMounted(() => {
  rulesStore.fetchRules();
  tasksStore.fetchTasks();
});
</script>
