import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';

export interface ScheduleRule {
  id: number;
  mode: 'hard_block' | 'task_gated';
  label?: string;
  window_start: string;
  window_end: string;
  active_days: string;
  failsafe_enabled: boolean;
  is_active: boolean;
  sites: Array<{ bundle_key?: string; custom_domain?: string }>;
  is_currently_live: boolean;
  task_ids?: number[];
}

export const useRulesStore = defineStore('rules', () => {
  const rules = ref<ScheduleRule[]>([]);
  const loading = ref(false);
  const authStore = useAuthStore();

  async function fetchRules() {
    loading.value = true;
    try {
      if (!authStore.token) await authStore.loginStandard();
      const res = await fetch('/api/rules', {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      if (res.ok) {
        rules.value = await res.json();
      }
    } catch (e) {
      console.error('Fetch rules error:', e);
    } finally {
      loading.value = false;
    }
  }

  async function createRule(newRule: Partial<ScheduleRule>): Promise<{ ok: boolean; error?: string }> {
    try {
      if (!authStore.token) await authStore.loginStandard();
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(newRule),
      });

      if (res.ok) {
        await fetchRules();
        return { ok: true };
      }
      const data = await res.json();
      return { ok: false, error: data.error || 'Failed to create rule' };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async function deleteRule(id: number, reason: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        await fetchRules();
        return true;
      }
    } catch (e) {
      console.error('Delete rule failed:', e);
    }
    return false;
  }

  return { rules, loading, fetchRules, createRule, deleteRule };
});
