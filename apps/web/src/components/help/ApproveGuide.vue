<script setup>
// "Allow this site" in two steps, with a small drawing of the browser toolbar and the
// FocusGateway popup. Used by the approval screen (App.vue) and the not-connected dialog.
// Check again asks the extension right away (pending approval) or reloads the page (after
// "Continue without blocking", when the page runs on its own).
import { ref } from 'vue'
import { store, checkApproval } from '../../lib/store.js'
import Icon from '../Icon.vue'
import logo from '../../assets/logo.svg'

const status = ref('idle') // idle | checking | waiting
async function retry() {
  if (!store.pendingApproval) return location.reload()
  status.value = 'checking'
  const ok = await checkApproval()
  status.value = ok ? 'idle' : 'waiting'
}
</script>

<template>
  <div data-approve-guide class="space-y-3 text-left text-sm">
    <p v-if="!store.pendingApproval" class="text-muted">Press <b>Connect now</b>. The page reloads and waits for these two steps.</p>
    <ol class="grid gap-3 sm:grid-cols-2">
      <li class="rounded-2xl border border-line bg-sunk p-3">
        <!-- the toolbar: address bar, the puzzle piece highlighted -->
        <div class="flex items-center gap-1.5 rounded-xl bg-card px-2 py-1.5 shadow-sm" aria-hidden="true">
          <span class="h-2 w-2 rounded-full bg-line" /><span class="h-2 w-2 rounded-full bg-line" />
          <span class="mx-1 h-4 flex-1 rounded-full bg-sunk" />
          <span class="grid h-7 w-7 place-items-center rounded-lg bg-accent text-on-accent ring-4 ring-accent-soft">
            <Icon name="puzzle" :size="15" />
          </span>
        </div>
        <div
          class="mt-1.5 ml-auto flex w-40 items-center gap-2 rounded-xl bg-card px-2 py-1.5 text-xs font-bold shadow-sm"
          aria-hidden="true"
        >
          <img :src="logo" alt="" class="h-5 w-5" /> FocusGateway
        </div>
        <p class="mt-2.5 flex gap-2">
          <b class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] text-on-accent">1</b>
          <span>Click the <b>puzzle piece</b> in the toolbar (top right), then <b>FocusGateway</b>.</span>
        </p>
      </li>
      <li class="rounded-2xl border border-line bg-sunk p-3">
        <!-- the popup: this site with its Allow button -->
        <div class="rounded-xl bg-card p-2 shadow-sm" aria-hidden="true">
          <div class="flex items-center gap-1.5 text-xs font-bold"><img :src="logo" alt="" class="h-4 w-4" /> FocusGateway</div>
          <div class="mt-1.5 flex items-center gap-2 rounded-lg bg-sunk px-2 py-1.5 text-xs">
            <Icon name="globe" :size="13" class="text-muted" />
            <span class="min-w-0 flex-1 truncate text-muted">this site</span>
            <span class="rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-on-accent ring-4 ring-accent-soft">Allow</span>
          </div>
        </div>
        <p class="mt-2.5 flex gap-2">
          <b class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] text-on-accent">2</b>
          <span>Press <b>Allow</b> next to this site. Blocking turns on right away.</span>
        </p>
      </li>
    </ol>
    <p class="text-xs text-muted">Tip: pin FocusGateway to the toolbar, so it is always one click away.</p>
    <div class="flex flex-wrap items-center gap-2">
      <button class="btn btn-primary" data-approve-retry :disabled="status === 'checking'" @click="retry">
        <Icon :name="store.pendingApproval ? 'refresh' : 'puzzle'" :size="15" />
        {{ !store.pendingApproval ? 'Connect now' : status === 'checking' ? 'Checking...' : 'Check again' }}
      </button>
      <span v-if="status === 'waiting'" role="status" class="text-xs text-muted"
        >Not allowed yet. Try the steps above, then check again.</span
      >
      <slot />
    </div>
  </div>
</template>
