<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Scheduled Block Windows (SBW)</h1>
        <p class="text-sm text-slate-400">Configure time-based block windows gated by task completion.</p>
      </div>
      <button @click="showModal = true" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/30">
        + Create SBW Rule
      </button>
    </div>

    <!-- Rule List -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="rule in rulesStore.rules.filter(r => r.mode === 'task_gated')" :key="rule.id" class="glass-card p-5 rounded-2xl space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-white">{{ rule.label || 'Task-Gated Window' }}</h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
            TASK_GATED
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

    <!-- Create Rule Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="glass-card p-6 rounded-2xl w-full max-w-md space-y-4">
        <h2 class="text-lg font-bold text-white">Create Scheduled Block Window</h2>
        <form @submit.prevent="submitRule" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Label</label>
            <input v-model="newRule.label" placeholder="e.g. Work Hours" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Start Time</label>
              <input v-model="newRule.window_start" type="time" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">End Time</label>
              <input v-model="newRule.window_end" type="time" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Target Site</label>
            <select v-model="selectedSite" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="youtube">YouTube (youtube.com, ytimg.com, etc.)</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter / X</option>
              <option value="reddit">Reddit</option>
              <option value="netflix">Netflix</option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button" @click="showModal = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium">Save Rule</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRulesStore } from '../stores/rules';

const rulesStore = useRulesStore();
const showModal = ref(false);
const selectedSite = ref('youtube');

const newRule = ref({
  label: '',
  window_start: '09:00',
  window_end: '17:00',
});

async function submitRule() {
  const res = await rulesStore.createRule({
    mode: 'task_gated',
    label: newRule.value.label,
    window_start: newRule.value.window_start,
    window_end: newRule.value.window_end,
    active_days: '1,2,3,4,5',
    failsafe_enabled: true,
    sites: [{ bundle_key: selectedSite.value }],
    task_ids: [1],
  });

  if (res.ok) {
    showModal.value = false;
  } else {
    alert(res.error || 'Conflict or error creating rule');
  }
}

onMounted(() => {
  rulesStore.fetchRules();
});
</script>
