<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-white">Hard Block Rules</h1>
      <p class="text-sm text-slate-400">Strict site blocking during fixed windows regardless of tasks.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="rule in rulesStore.rules.filter(r => r.mode === 'hard_block')" :key="rule.id" class="glass-card p-5 rounded-2xl space-y-3 border-l-4 border-rose-500">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-white">{{ rule.label || 'Hard Block Rule' }}</h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
            HARD_BLOCK
          </span>
        </div>
        <p class="text-xs text-slate-400">⏰ {{ rule.window_start }} - {{ rule.window_end }}</p>
        <div class="flex flex-wrap gap-1.5 pt-2">
          <span v-for="site in rule.sites" :key="site.bundle_key || site.custom_domain" class="px-2 py-0.5 rounded bg-slate-900 text-xs font-mono text-slate-300 border border-slate-800">
            🚫 {{ site.bundle_key || site.custom_domain }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRulesStore } from '../stores/rules';

const rulesStore = useRulesStore();

onMounted(() => {
  rulesStore.fetchRules();
});
</script>
