<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Scheduled Block Windows (SBW)</h1>
        <p class="text-sm text-slate-400">Configure time-based block windows gated by task completion.</p>
      </div>
      <button @click="openModal" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/30">
        + Create SBW Rule
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="sbwRules.length === 0" class="glass-card p-10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 border-l-4 border-amber-500">
      <span class="text-4xl">🛡️</span>
      <h2 class="font-semibold text-white">No SBW Rules Configured</h2>
      <p class="text-sm text-slate-400 max-w-sm">
        Scheduled Block Windows block distracting sites during specific work hours until specified tasks are marked complete.
      </p>
      <button @click="openModal" class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all">
        Create your first SBW Rule
      </button>
    </div>

    <!-- Rule List -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="rule in sbwRules" :key="rule.id" class="glass-card p-5 rounded-2xl space-y-3 border-l-4 border-amber-500">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-white">{{ rule.label || 'Task-Gated Window' }}</h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
            TASK_GATED
          </span>
        </div>
        <p class="text-xs text-slate-400">⏰ {{ rule.window_start }} - {{ rule.window_end }}</p>
        <p class="text-xs text-slate-500">
          🗓 Active days: {{ formatDays(rule.active_days) }}
          &nbsp;·&nbsp;
          🛡 Failsafe: {{ rule.failsafe_enabled ? 'Enabled' : 'OFF' }}
        </p>
        <div class="flex flex-wrap gap-1.5 pt-2">
          <span v-for="site in rule.sites" :key="site.bundle_key || site.custom_domain" class="px-2 py-0.5 rounded bg-slate-900 text-xs font-mono text-slate-300 border border-slate-800">
            🚫 {{ site.bundle_key || site.custom_domain }}
          </span>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span class="text-slate-400">
            Assigned Tasks: {{ rule.task_ids?.length || 0 }}
          </span>
          <button @click="confirmDelete(rule)" class="text-rose-400/70 hover:text-rose-400 transition-colors">
            🗑 Delete Rule
          </button>
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
              <option value="twitch">Twitch</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Gate on Tasks (Select at least 1)</label>
            <div v-if="tasksStore.tasks.length === 0" class="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-400">
              No tasks found! Create a task first in the Task Board before setting up an SBW rule.
            </div>
            <div v-else class="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-900 border border-slate-800 rounded-xl">
              <label v-for="task in tasksStore.tasks" :key="task.id" class="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer p-1 rounded hover:bg-slate-800/50">
                <input type="checkbox" :value="task.id" v-model="selectedTaskIds" class="rounded border-slate-700">
                <span>{{ task.title }}</span>
                <span class="text-[10px] text-slate-500 ml-auto font-mono">({{ task.status }})</span>
              </label>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button" @click="showModal = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" :disabled="selectedTaskIds.length === 0" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium">Save Rule</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="glass-card p-6 rounded-2xl w-full max-w-md space-y-4 border border-rose-500/30">
        <h2 class="text-lg font-bold text-rose-400">Delete SBW Rule</h2>
        <p class="text-sm text-slate-300">
          Deleting rule: <span class="font-semibold text-white">{{ deleteTarget.label || 'Task-Gated Window' }}</span>
        </p>
        <p class="text-xs text-slate-400">Type the phrase exactly to confirm (paste disabled):</p>
        <p class="text-xs font-mono text-rose-300 bg-rose-950/30 p-2 rounded-lg border border-rose-500/20 select-none">
          {{ deletePhrase }}
        </p>
        <textarea
          v-model="deleteInput"
          @paste.prevent
          rows="2"
          placeholder="Type the phrase above..."
          class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"
        ></textarea>
        <div class="flex items-center justify-end gap-3 pt-2">
          <button @click="cancelDelete" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            @click="executeDelete"
            :disabled="deleteInput.trim() !== deletePhrase"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium"
          >
            Delete Rule
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRulesStore, type ScheduleRule } from '../stores/rules';
import { useTasksStore } from '../stores/tasks';

const rulesStore = useRulesStore();
const tasksStore = useTasksStore();

const showModal = ref(false);
const selectedSite = ref('youtube');
const selectedTaskIds = ref<number[]>([]);

const newRule = ref({
  label: '',
  window_start: '09:00',
  window_end: '17:00',
});

// Delete state
const deleteTarget = ref<ScheduleRule | null>(null);
const deleteInput = ref('');
const deletePhrase = ref('');

const sbwRules = computed(() => rulesStore.rules.filter(r => r.mode === 'task_gated'));

function formatDays(days: string) {
  if (!days) return 'All Days';
  const map: Record<string, string> = { '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '0': 'Sun' };
  return days.split(',').map(d => map[d] || d).join(', ');
}

function openModal() {
  tasksStore.fetchTasks();
  if (tasksStore.tasks.length > 0) {
    selectedTaskIds.value = [tasksStore.tasks[0].id];
  } else {
    selectedTaskIds.value = [];
  }
  showModal.value = true;
}

async function submitRule() {
  if (selectedTaskIds.value.length === 0) {
    alert('At least one task must be selected for a Task-Gated SBW Rule.');
    return;
  }

  const res = await rulesStore.createRule({
    mode: 'task_gated',
    label: newRule.value.label,
    window_start: newRule.value.window_start,
    window_end: newRule.value.window_end,
    active_days: '1,2,3,4,5',
    failsafe_enabled: true,
    sites: [{ bundle_key: selectedSite.value }],
    task_ids: selectedTaskIds.value,
  });

  if (res.ok) {
    showModal.value = false;
    newRule.value = { label: '', window_start: '09:00', window_end: '17:00' };
  } else {
    alert(res.error || 'Conflict or error creating rule');
  }
}

function confirmDelete(rule: ScheduleRule) {
  deleteTarget.value = rule;
  deletePhrase.value = `delete rule ${rule.id}`;
  deleteInput.value = '';
}

function cancelDelete() {
  deleteTarget.value = null;
  deleteInput.value = '';
}

async function executeDelete() {
  if (!deleteTarget.value) return;
  if (deleteInput.value.trim() !== deletePhrase.value) return;
  const ok = await rulesStore.deleteRule(deleteTarget.value.id, deleteInput.value);
  if (ok) {
    cancelDelete();
  } else {
    alert('Failed to delete rule. PIN may be required.');
  }
}

onMounted(() => {
  rulesStore.fetchRules();
  tasksStore.fetchTasks();
});
</script>
