<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Task Board</h1>
        <p class="text-sm text-slate-400">Complete tasks to unlock TASK_GATED block windows.</p>
      </div>
      <button @click="showModal = true" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2">
        <span>+ Add Task</span>
      </button>
    </div>

    <!-- Kanban Board -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Pending Column -->
      <div class="glass-card p-4 rounded-2xl space-y-4" @dragover.prevent @drop="onDrop($event, 'pending')">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Pending</span>
          </span>
          <span class="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
            {{ getColumnTasks('pending').length }}
          </span>
        </div>

        <div v-for="task in getColumnTasks('pending')" :key="task.id"
             v-uppercase-on-drag
             draggable="true" @dragstart="onDragStart($event, task)"
             class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-medium text-white task-title">{{ task.title }}</h3>
            <span :class="getPriorityBadgeClass(task.priority)" class="px-2 py-0.5 rounded text-[10px] font-mono uppercase border">
              {{ task.priority }}
            </span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>📅 {{ formatDate(task.deadline) }}</span>
            <div class="flex items-center gap-1" title="Forward Count (Procrastination)">
              <span v-for="n in getMaxForwards(task.priority)" :key="n"
                    :class="n <= task.forward_count ? 'bg-rose-500' : 'bg-slate-700'"
                    class="w-2 h-2 rounded-full"></span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button @click="confirmDeleteTask(task)" class="text-[10px] text-rose-400/70 hover:text-rose-400 transition-colors">
              🗑 Delete
            </button>
          </div>
        </div>
      </div>

      <!-- In Progress Column -->
      <div class="glass-card p-4 rounded-2xl space-y-4" @dragover.prevent @drop="onDrop($event, 'in_progress')">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
            <span>In Progress</span>
          </span>
          <span class="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
            {{ getColumnTasks('in_progress').length }}
          </span>
        </div>

        <div v-for="task in getColumnTasks('in_progress')" :key="task.id"
             v-uppercase-on-drag
             draggable="true" @dragstart="onDragStart($event, task)"
             class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-medium text-white task-title">{{ task.title }}</h3>
            <span :class="getPriorityBadgeClass(task.priority)" class="px-2 py-0.5 rounded text-[10px] font-mono uppercase border">
              {{ task.priority }}
            </span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>📅 {{ formatDate(task.deadline) }}</span>
            <!-- Forward dots (same as Pending column) -->
            <div class="flex items-center gap-1" title="Forward Count (Procrastination)">
              <span v-for="n in getMaxForwards(task.priority)" :key="n"
                    :class="n <= task.forward_count ? 'bg-rose-500' : 'bg-slate-700'"
                    class="w-2 h-2 rounded-full"></span>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1">
            <button @click="tasksStore.forwardTask(task.id)" class="text-xs text-amber-400 hover:underline">
              Forward ➔
            </button>
            <button @click="confirmDeleteTask(task)" class="text-[10px] text-rose-400/70 hover:text-rose-400 transition-colors">
              🗑 Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Complete Column -->
      <div class="glass-card p-4 rounded-2xl space-y-4" @dragover.prevent @drop="onDrop($event, 'complete')">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Completed</span>
          </span>
          <span class="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
            {{ getColumnTasks('complete').length }}
          </span>
        </div>

        <div v-for="task in getColumnTasks('complete')" :key="task.id"
             class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2 opacity-80">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-medium text-emerald-200 line-through">{{ task.title }}</h3>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Done
            </span>
          </div>
          <div class="flex justify-end">
            <button @click="confirmDeleteTask(task)" class="text-[10px] text-rose-400/50 hover:text-rose-400 transition-colors">
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="glass-card p-6 rounded-2xl w-full max-w-md space-y-4">
        <h2 class="text-lg font-bold text-white">Create New Task</h2>
        <form @submit.prevent="submitTask" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Title</label>
            <input v-model="newTask.title" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Priority</label>
            <select v-model="newTask.priority" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="low">Low (Max 5 Forwards)</option>
              <option value="medium">Medium (Max 3 Forwards)</option>
              <option value="high">High (Max 1 Forward)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Deadline</label>
            <input v-model="newTask.deadline" type="datetime-local" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500">
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button" @click="showModal = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium">Save Task</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="glass-card p-6 rounded-2xl w-full max-w-md space-y-4 border border-rose-500/30">
        <h2 class="text-lg font-bold text-rose-400">Delete Task</h2>
        <p class="text-sm text-slate-300">
          You are deleting: <span class="font-semibold text-white">{{ deleteTarget.title }}</span>
        </p>
        <p class="text-xs text-slate-400">
          Type the full sentence below to confirm deletion (no copy-paste allowed):
        </p>
        <p class="text-xs font-mono text-rose-300 bg-rose-950/30 p-2 rounded-lg border border-rose-500/20 select-none">
          {{ deleteConfirmPhrase }}
        </p>
        <textarea
          v-model="deleteConfirmInput"
          @paste.prevent
          rows="2"
          placeholder="Type the phrase exactly..."
          class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"
        ></textarea>
        <div class="flex items-center justify-end gap-3 pt-2">
          <button @click="cancelDelete" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            @click="executeDelete"
            :disabled="deleteConfirmInput.trim() !== deleteConfirmPhrase"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTasksStore, type TaskItem } from '../stores/tasks';

const tasksStore = useTasksStore();
const showModal = ref(false);

const newTask = ref({
  title: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  deadline: '',
});

// Delete task state
const deleteTarget = ref<TaskItem | null>(null);
const deleteConfirmInput = ref('');
const deleteConfirmPhrase = ref('');

function getColumnTasks(status: string) {
  return tasksStore.tasks.filter(t => t.status === status);
}

function getMaxForwards(priority: string) {
  return priority === 'high' ? 1 : priority === 'medium' ? 3 : 5;
}

function getPriorityBadgeClass(priority: string) {
  if (priority === 'high') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (priority === 'medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function onDragStart(event: DragEvent, task: TaskItem) {
  event.dataTransfer?.setData('text/plain', String(task.id));
}

async function onDrop(event: DragEvent, newStatus: TaskItem['status']) {
  const taskIdStr = event.dataTransfer?.getData('text/plain');
  if (taskIdStr) {
    const id = parseInt(taskIdStr, 10);
    await tasksStore.updateTask(id, { status: newStatus });
  }
}

async function submitTask() {
  if (!newTask.value.title || !newTask.value.deadline) return;
  const res = await tasksStore.createTask({
    title: newTask.value.title,
    priority: newTask.value.priority,
    deadline: new Date(newTask.value.deadline).toISOString(),
  });
  if (res.ok) {
    showModal.value = false;
    newTask.value = { title: '', priority: 'medium', deadline: '' };
  }
}

function confirmDeleteTask(task: TaskItem) {
  deleteTarget.value = task;
  deleteConfirmPhrase.value = `I confirm deleting task ${task.id}`;
  deleteConfirmInput.value = '';
}

function cancelDelete() {
  deleteTarget.value = null;
  deleteConfirmInput.value = '';
}

async function executeDelete() {
  if (!deleteTarget.value) return;
  if (deleteConfirmInput.value.trim() !== deleteConfirmPhrase.value) return;
  const res = await tasksStore.deleteTask(deleteTarget.value.id, deleteConfirmInput.value);
  if (res.ok) {
    cancelDelete();
  } else {
    alert(res.error || 'Failed to delete task');
  }
}

onMounted(() => {
  tasksStore.fetchTasks();
});
</script>
