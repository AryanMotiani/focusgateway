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
        <button v-else @click="stopTimer" class="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-600/30">
          Stop Session Early
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const secondsLeft = ref(1500); // 25 min
const isRunning = ref(false);
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

function stopTimer() {
  const reason = prompt('Type-to-confirm reason for stopping early (full sentence):');
  if (reason && reason.trim().length >= 10) {
    clearInterval(timerId);
    isRunning.value = false;
    secondsLeft.value = 1500;
  } else {
    alert('Full sentence reason required to stop early.');
  }
}
</script>
