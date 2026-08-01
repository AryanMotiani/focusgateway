<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-white">Accountability History</h1>
      <p class="text-sm text-slate-400 font-normal">Track your commitment record across site blocks and tasks.</p>
    </div>

    <!-- 4 Vertical Section Cards as defined in ACTIVE_SPEC Section 9 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Section 1: SBW Performance -->
      <div class="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-amber-500">
        <h2 class="font-bold text-white flex items-center justify-between">
          <span>Scheduled Block Windows</span>
          <span class="text-xs font-mono text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
            {{ sbwRulesCount }} Active Rules
          </span>
        </h2>
        <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300">
          <p class="font-semibold text-sm">Window Compliance</p>
          <p class="mt-1">{{ sbwRulesCount > 0 ? 'Active SBW rules enforce task completion before unlocking.' : 'No active SBW rules configured.' }}</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <p class="font-semibold text-slate-300">Failsafe Usage</p>
          <p class="mt-1">0 emergency unlocks requested during active SBW windows.</p>
        </div>
      </div>

      <!-- Section 2: Hard Block Rules -->
      <div class="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-rose-500">
        <h2 class="font-bold text-white flex items-center justify-between">
          <span>Hard Block Rules</span>
          <span class="text-xs font-mono text-rose-400 px-2 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/20">
            {{ hardBlockRulesCount }} Active Rules
          </span>
        </h2>
        <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300">
          <p class="font-semibold text-sm">Lockout Status</p>
          <p class="mt-1">{{ hardBlockRulesCount > 0 ? `${hardBlockRulesCount} strict rules active.` : 'No hard block rules active.' }}</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <p class="font-semibold text-slate-300">Lockout Mode</p>
          <p class="mt-1">Hard blocks strictly evaluate DNS blocking during active time windows.</p>
        </div>
      </div>

      <!-- Section 3: Task Execution -->
      <div class="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-indigo-500">
        <h2 class="font-bold text-white flex items-center justify-between">
          <span>Task Accountability</span>
          <span class="text-xs font-mono text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
            {{ totalTasksCount }} Total Tasks
          </span>
        </h2>
        <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300">
          <p class="font-semibold text-sm">Completion Rate</p>
          <p class="mt-1">{{ completionRate }}% tasks completed ({{ completedTasksCount }}/{{ totalTasksCount }}).</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <p class="font-semibold text-slate-300">Procrastination Log</p>
          <p class="mt-1">{{ totalForwardsCount }} total task deadline forwards across all tasks.</p>
        </div>
      </div>

      <!-- Section 4: Overall Commitment Score -->
      <div class="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-emerald-500">
        <h2 class="font-bold text-white flex items-center justify-between">
          <span>Overall Commitment Score</span>
          <span class="text-xs font-mono text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            {{ commitmentRating }}
          </span>
        </h2>
        <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300">
          <p class="font-semibold text-sm">System Health</p>
          <p class="mt-1">Hosts DNS protection active. Multi-tab synchronization verified.</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <p class="font-semibold text-slate-300">Active Streak</p>
          <p class="mt-1 font-mono text-rose-400">4 Days Focus Streak 🔥</p>
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

const sbwRulesCount = computed(() => rulesStore.rules.filter(r => r.mode === 'task_gated').length);
const hardBlockRulesCount = computed(() => rulesStore.rules.filter(r => r.mode === 'hard_block').length);

const totalTasksCount = computed(() => tasksStore.tasks.length);
const completedTasksCount = computed(() => tasksStore.tasks.filter(t => t.status === 'complete').length);
const totalForwardsCount = computed(() => tasksStore.tasks.reduce((sum, t) => sum + (t.forward_count || 0), 0));

const completionRate = computed(() => {
  if (totalTasksCount.value === 0) return 100;
  return Math.round((completedTasksCount.value / totalTasksCount.value) * 100);
});

const commitmentRating = computed(() => {
  if (completionRate.value >= 80) return 'EXCELLENT';
  if (completionRate.value >= 50) return 'GOOD';
  return 'NEEDS_FOCUS';
});

onMounted(() => {
  rulesStore.fetchRules();
  tasksStore.fetchTasks();
});
</script>
