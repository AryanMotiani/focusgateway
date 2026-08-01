<template>
  <div class="space-y-6 max-w-3xl">
    <div>
      <h1 class="text-2xl font-bold text-white">Application Settings</h1>
      <p class="text-sm text-slate-400">Configure app preferences, Failsafe defaults, and security PIN.</p>
    </div>

    <!-- Failsafe Cooldown Duration -->
    <div class="glass-card p-6 rounded-2xl space-y-4">
      <h2 class="font-bold text-white">Failsafe Cooldown Timer</h2>
      <p class="text-xs text-slate-400">Forced delay duration before an emergency unlock is granted (30s – 300s).</p>
      <div class="flex items-center gap-4">
        <input
          v-model.number="failsafeDuration"
          @change="saveSettings"
          type="range"
          min="30"
          max="300"
          step="30"
          class="w-full cursor-pointer accent-indigo-500"
        >
        <span class="text-sm font-mono font-bold text-indigo-400 w-16">{{ failsafeDuration }}s</span>
      </div>
      <p v-if="savedNotice" class="text-xs text-emerald-400 transition-opacity">
        ✓ Setting saved to local configuration
      </p>
    </div>

    <!-- Admin PIN Management -->
    <div class="glass-card p-6 rounded-2xl space-y-4">
      <h2 class="font-bold text-white">Security PIN Verification</h2>
      <p class="text-xs text-slate-400">Test or elevate session privileges using your Admin PIN.</p>
      <div class="flex items-center gap-3">
        <input
          v-model="pinInput"
          type="password"
          placeholder="Enter PIN (Default: 1234)"
          class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 w-48 font-mono"
        >
        <button
          @click="verifyPin"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all"
        >
          Verify PIN
        </button>
      </div>
      <p v-if="pinStatus" :class="pinStatus.success ? 'text-emerald-400' : 'text-rose-400'" class="text-xs">
        {{ pinStatus.message }}
      </p>
    </div>

    <!-- Emergency Recovery Info -->
    <div class="glass-card p-6 rounded-2xl space-y-3 border-l-4 border-amber-500">
      <h2 class="font-bold text-white flex items-center gap-2">
        <span>Emergency Recovery Path</span>
      </h2>
      <p class="text-xs text-slate-400">
        If the background service crashes or is unreachable, run the self-gated recovery script from Start Menu or via command line:
      </p>
      <code class="block p-3 rounded-xl bg-slate-900 text-xs font-mono text-amber-300 overflow-x-auto">
        node src/recovery/recover.ts
      </code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const failsafeDuration = ref(
  parseInt(localStorage.getItem('fg_failsafe_duration') || '30', 10)
);
const savedNotice = ref(false);

const pinInput = ref('');
const pinStatus = ref<{ success: boolean; message: string } | null>(null);

function saveSettings() {
  localStorage.setItem('fg_failsafe_duration', String(failsafeDuration.value));
  savedNotice.value = true;
  setTimeout(() => {
    savedNotice.value = false;
  }, 2500);
}

async function verifyPin() {
  if (!pinInput.value) return;
  const ok = await authStore.verifyPin(pinInput.value);
  if (ok) {
    pinStatus.value = { success: true, message: '✓ PIN verified. Admin role granted for 15 minutes.' };
    pinInput.value = '';
  } else {
    pinStatus.value = { success: false, message: '❌ Invalid PIN code.' };
  }
}

onMounted(() => {
  if (isNaN(failsafeDuration.value)) {
    failsafeDuration.value = 30;
  }
});
</script>
