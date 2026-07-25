<template>
  <div class="space-y-6 max-w-3xl">
    <div>
      <h1 class="text-2xl font-bold text-white">Application Settings</h1>
      <p class="text-sm text-slate-400">Configure app preferences, Failsafe defaults, and security PIN.</p>
    </div>

    <!-- Failsafe Cooldown Duration -->
    <div class="glass-card p-6 rounded-2xl space-y-4">
      <h2 class="font-bold text-white">Failsafe Cooldown Timer</h2>
      <p class="text-xs text-slate-400">Forced delay duration before an emergency unlock is granted.</p>
      <div class="flex items-center gap-4">
        <input v-model="failsafeDuration" type="range" min="30" max="300" step="30" class="w-full">
        <span class="text-sm font-mono font-bold text-indigo-400 w-16">{{ failsafeDuration }}s</span>
      </div>
    </div>

    <!-- Emergency Recovery Info -->
    <div class="glass-card p-6 rounded-2xl space-y-3 border-l-4 border-amber-500">
      <h2 class="font-bold text-white flex items-center gap-2">
        <span>Emergency Recovery Path</span>
      </h2>
      <p class="text-xs text-slate-400">
        If the service crashes or is unreachable, run the self-gated recovery script from Start Menu or via command line:
      </p>
      <code class="block p-3 rounded-xl bg-slate-900 text-xs font-mono text-amber-300 overflow-x-auto">
        node src/recovery/recover.ts
      </code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const failsafeDuration = ref(30);
</script>
