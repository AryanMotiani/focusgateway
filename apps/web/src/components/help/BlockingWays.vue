<script setup>
// The three ways to block, as a friendly choice. Two looks:
//  page  the Blocking page's empty state (no rules yet), with "Not now, I will just use the study room"
//  card  the compact start card in the room, shown once after the room intro, with "Maybe later"
// "Set one up" emits setup(id): 'gated' | 'hard' | 'focus'. "Learn more" opens the Blocking
// help at "Three ways to block" (helpContent.js).
import { openHelp } from '../../lib/tour.js'
import Icon from '../Icon.vue'

defineProps({ variant: { type: String, default: 'page' } })
const emit = defineEmits(['setup', 'dismiss'])

const WAYS = [
  { id: 'gated', name: 'Task-gated window', icon: 'unlock', line: "Sites open only after that window's tasks are done." },
  { id: 'hard', name: 'Hard block', icon: 'moon', line: 'Fixed times, like sleep or exams.' },
  { id: 'focus', name: 'Focus session', icon: 'clock', line: 'Block sites while a timer runs.' },
]
const learn = () => openHelp('blocking', 'ways')
</script>

<template>
  <section v-if="variant === 'page'" class="card p-5 sm:p-6" data-blocking-ways="page" aria-labelledby="ways-title">
    <div class="flex items-start gap-3">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"
        ><Icon name="shield" :size="20"
      /></span>
      <div>
        <h2 id="ways-title" class="text-xl font-semibold">You have not blocked any sites yet</h2>
        <p class="text-sm text-muted">There are three ways to do it. Pick the one that fits, you can add the others later.</p>
      </div>
    </div>
    <div class="mt-5 grid gap-3 md:grid-cols-3">
      <article v-for="w in WAYS" :key="w.id" class="flex flex-col rounded-2xl border border-line bg-card p-3.5 sm:p-4" :data-way="w.id">
        <div class="flex items-center gap-2.5 md:flex-col md:items-start">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"
            ><Icon :name="w.icon" :size="18"
          /></span>
          <h3 class="text-base leading-tight font-semibold [font-size-adjust:none]">{{ w.name }}</h3>
        </div>
        <p class="mt-1.5 flex-1 text-sm text-muted">{{ w.line }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm" @click="emit('setup', w.id)">Set one up</button>
          <button class="text-sm font-semibold text-accent hover:underline" @click="learn">Learn more</button>
        </div>
      </article>
    </div>
    <button class="mt-4 text-sm text-muted hover:text-ink" data-ways-dismiss @click="emit('dismiss')">
      Not now, I will just use the study room
    </button>
  </section>

  <section
    v-else
    class="room-glass pop-in w-[min(360px,calc(100vw-24px))] rounded-(--fg-room-radius) bg-(--fg-room-base) p-3"
    data-blocking-ways="card"
    aria-labelledby="ways-card-title"
  >
    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <p id="ways-card-title" class="text-sm leading-tight font-bold">Want to block some sites?</p>
        <p class="text-[11px] leading-tight text-muted">Pick one way to start. You can add more later.</p>
      </div>
      <button class="shrink-0 rounded-full p-1 text-muted hover:text-ink" aria-label="Maybe later" @click="emit('dismiss')">
        <Icon name="x" :size="14" />
      </button>
    </div>
    <ul class="mt-2 space-y-1.5">
      <li v-for="w in WAYS" :key="w.id">
        <button
          class="room-hover flex w-full items-center gap-2.5 rounded-xl p-2 text-left"
          :data-way="w.id"
          :title="`Set up a ${w.name.toLowerCase()}`"
          @click="emit('setup', w.id)"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"
            ><Icon :name="w.icon" :size="16"
          /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm leading-tight font-semibold">{{ w.name }}</span>
            <span class="block text-[11px] leading-tight text-muted">{{ w.line }}</span>
          </span>
          <Icon name="chevronRight" :size="14" class="shrink-0 text-muted" />
        </button>
      </li>
    </ul>
    <div class="mt-2 flex items-center justify-between gap-2 px-1">
      <button class="text-xs font-semibold text-accent hover:underline" @click="learn">Learn more</button>
      <button class="text-xs text-muted hover:text-ink" data-ways-dismiss @click="emit('dismiss')">Maybe later</button>
    </div>
  </section>
</template>
