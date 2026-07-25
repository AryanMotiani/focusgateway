import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'complete' | 'cancelled';
  forward_count: number;
  deadline: string;
  timer_seconds: number;
  parent_task_id: number | null;
  created_at: string;
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([]);
  const loading = ref(false);
  const authStore = useAuthStore();

  async function fetchTasks() {
    loading.value = true;
    try {
      if (!authStore.token) await authStore.loginStandard();
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      if (res.ok) {
        tasks.value = await res.json();
      }
    } catch (e) {
      console.error('Fetch tasks error:', e);
    } finally {
      loading.value = false;
    }
  }

  async function createTask(newTask: Partial<TaskItem>): Promise<{ ok: boolean; error?: string }> {
    try {
      if (!authStore.token) await authStore.loginStandard();
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(newTask),
      });

      if (res.ok) {
        await fetchTasks();
        return { ok: true };
      }
      const data = await res.json();
      return { ok: false, error: data.error || 'Failed to create task' };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async function updateTask(id: number, updates: Partial<TaskItem> & { reason?: string }): Promise<{ ok: boolean; error?: string }> {
    try {
      if (!authStore.token) await authStore.loginStandard();
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await fetchTasks();
        return { ok: true };
      }
      const data = await res.json();
      return { ok: false, error: data.error };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async function forwardTask(id: number): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/tasks/${id}/forward`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
      });

      if (res.ok) {
        await fetchTasks();
        return { ok: true };
      }
      const data = await res.json();
      return { ok: false, error: data.error };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  return { tasks, loading, fetchTasks, createTask, updateTask, forwardTask };
});
