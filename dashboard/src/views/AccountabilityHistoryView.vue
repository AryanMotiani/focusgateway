<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-white">Accountability History</h1>
      <p class="text-sm text-slate-400">Track your completed tasks, forwards, and deadline performance.</p>
    </div>

    <!-- 4 Vertical Section Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Section 1: SBW Performance -->
      <div class="glass-card p-6 rounded-2xl space-y-4">
        <h2 class="font-bold text-white flex items-center gap-2">
          <span>Scheduled Block Windows</span>
        </h2>
        <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300">
          <p class="font-semibold text-sm">Positive Record</p>
          <p class="mt-1">14 SBW windows completed without Failsafe usage.</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <p class="font-semibold text-slate-300">Failsafe Count</p>
          <p class="mt-1">0 emergency unlocks requested.</p>
        </div>
      </div>

      <!-- Section 2: Task Execution -->
      <div class="glass-card p-6 rounded-2xl space-y-4">
        <h2 class="font-bold text-white flex items-center gap-2">
          <span>Task Accountability</span>
        </h2>
        <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300">
          <p class="font-semibold text-sm">Completion Rate</p>
          <p class="mt-1">88% tasks completed on or before deadline.</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <p class="font-semibold text-slate-300">Procrastination Log</p>
          <p class="mt-1">3 tasks forwarded (2 Medium priority, 1 Low priority).</p>
        </div>
      </div>
    </div>
  </div>
</template>
