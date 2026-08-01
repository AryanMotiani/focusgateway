<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <div class="text-center space-y-2">
      <h1 class="text-2xl font-bold text-white">Focus Mode</h1>
      <p class="text-sm text-slate-400">Ad-hoc focus interval with immediate site blocking.</p>
    </div>

    <!-- Countdown Ring Container -->
    <div class="glass-card p-8 rounded-3xl flex flex-col items-center justify-center space-y-6 text-center border border-indigo-500/20">
      <div class="relative w-48 h-48 flex items-center justify-center">
        <!-- Glowing ring background -->
        <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20 glow-indigo"></div>
        <div class="space-y-1">
          <span class="text-4xl font-bold tracking-tight text-white font-mono">{{ formatTime(secondsLeft) }}</span>
          <p class="text-xs uppercase font-semibold text-indigo-400 tracking-wider">{{ isRunning ? 'Focus Interval' : 'Ready' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button v-if="!isRunning" @click="startTimer" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30">
          Start Focus Session (25 min)
        </button>
        <button v-else @click="openStopModal" class="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-600/30">
          Stop Session Early
        </button>
      </div>
    </div>

    <!-- Stop Early Type-to-Confirm Modal -->
    <div v-if="showStopModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="glass-card p-6 rounded-2xl w-full max-w-md space-y-4 border border-rose-500/30">
        <h2 class="text-lg font-bold text-rose-400">Stop Focus Session Early</h2>
        <p class="text-xs text-slate-300">
          Stopping early compromises your focus commitment. Type the confirmation phrase below (paste disabled):
        </p>

        <p class="text-xs font-mono text-rose-300 bg-rose-950/30 p-3 rounded-xl border border-rose-500/20 select-none">
          {{ requiredPhrase }}
        </p>

        <textarea
          v-model="userPhraseInput"
          @paste.prevent
          rows="2"
          placeholder="Type the sentence above exactly..."
          class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"
        ></textarea>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button @click="showStopModal = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white">
            Resume Focus
          </button>
          <button
            @click="confirmStopEarly"
            :disabled="userPhraseInput.trim() !== requiredPhrase"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium"
          >
            Confirm Stop Early
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const secondsLeft = ref(1500); // 25 min
const isRunning = ref(false);
const showStopModal = ref(false);
const requiredPhrase = ref('I am stopping my focus session early and breaking commitment');
const userPhraseInput = ref('');

let timerId: any = null;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startTimer() {
  isRunning.value = true;
  timerId = setInterval(() => {
    if (secondsLeft.value > 0) {
      secondsLeft.value--;
    } else {
      clearInterval(timerId);
      isRunning.value = false;
      alert('Focus interval complete! Take a break.');
    }
  }, 1000);
}

function openStopModal() {
  userPhraseInput.value = '';
  showStopModal.value = true;
}

function confirmStopEarly() {
  if (userPhraseInput.value.trim() === requiredPhrase.value) {
    clearInterval(timerId);
    isRunning.value = false;
    secondsLeft.value = 1500;
    showStopModal.value = false;
  }
}
</script>
