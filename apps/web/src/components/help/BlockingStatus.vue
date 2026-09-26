<script setup>
// "Blocking status": everything blocking needs in this browser as a checklist, each line
// with a green check, a red cross or a grey dot and a one-click fix. Sits at the top of the
// Blocking page and in Settings, and opens in a dialog from the red "Blocking is off" chips.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { REPO_URL } from '../../config.js'
import { store, blocks, blockingIssue, extensionOutdated, APP_VERSION, requestHostAccess } from '../../lib/store.js'
import { ruleWhy } from './ruleWhy.js'
import { showBlockingOff } from './guard.js'
import { browser, browserName, installTarget, PHONE_NOTE } from './install.js'
import BlockingTest from './BlockingTest.vue'
import Icon from '../Icon.vue'

defineProps({ bare: Boolean })
const emit = defineEmits(['navigate'])
const router = useRouter()
const TROUBLE = REPO_URL + '/blob/master/docs/TROUBLESHOOTING-blocking.md'

const go = (to) => {
  emit('navigate')
  router.push(to)
}
const time = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const items = computed(() => {
  const local = store.mode === 'local'
  const installed = store.health.extension
  const inside = store.mode === 'extension'
  const install = installTarget()
  const list = []

  // 1. the extension
  if (!local)
    list.push(
      extensionOutdated.value
        ? {
            id: 'extension',
            label: 'Extension connected',
            state: 'warn',
            text: `Connected, but version ${store.health.version} is older than this site (${APP_VERSION}). Update your extension to use the latest features.`,
            fix: { label: 'Update', run: () => go('/install') },
          }
        : {
            id: 'extension',
            label: 'Extension connected',
            state: 'ok',
            text: inside ? 'You are inside the extension.' : `Connected${store.health.version ? `, version ${store.health.version}` : ''}.`,
          },
    )
  else if (installed)
    list.push({ id: 'extension', label: 'Extension connected', state: 'bad', text: `Installed in ${browserName}, but not connected here.` })
  else if (browser === 'phone') list.push({ id: 'extension', label: 'Extension connected', state: 'off', text: PHONE_NOTE })
  else
    list.push({
      id: 'extension',
      label: 'Extension connected',
      state: 'bad',
      text: `Not installed in ${browserName}. It is free and takes a minute.`,
      fix: install?.store ? { label: install.label, href: install.url } : { label: 'Install', run: () => go('/install') },
    })

  // 2. this site approved
  if (inside) list.push({ id: 'approved', label: 'This site approved', state: 'ok', text: 'No approval needed inside the extension.' })
  else if (!local) list.push({ id: 'approved', label: 'This site approved', state: 'ok', text: 'This site may use the extension.' })
  else if (installed)
    list.push({
      id: 'approved',
      label: 'This site approved',
      state: 'bad',
      text: 'Not allowed yet: puzzle piece, FocusGateway, Allow.',
      fix: { label: 'Connect', run: () => showBlockingOff('not-approved', 'info') },
    })
  else list.push({ id: 'approved', label: 'This site approved', state: 'off', text: 'Needs the extension first.' })

  // 3. website access (Firefox can install without it)
  if (local) list.push({ id: 'access', label: 'Website access granted', state: 'off', text: 'Needs the extension first.' })
  else if (store.health.hostAccess === false)
    list.push({
      id: 'access',
      label: 'Website access granted',
      state: 'bad',
      text: 'The extension can not reach websites. Common in Firefox.',
      fix: { label: 'Fix', run: () => (inside ? requestHostAccess() : showBlockingOff('no-access', 'info')) },
    })
  else list.push({ id: 'access', label: 'Website access granted', state: 'ok', text: 'The extension can reach every website.' })

  // 4. the lock agent (optional)
  const agent = store.state?.agent
  if (agent?.paired)
    list.push({
      id: 'agent',
      label: 'Lock agent',
      state: agent.lastError ? 'warn' : 'ok',
      text: agent.lastError ? `Problem: ${agent.lastError}` : 'Connected. Blocks in every browser and app too.',
    })
  else
    list.push({
      id: 'agent',
      label: 'Lock agent',
      optional: true,
      state: 'off',
      text: 'Blocks in other browsers and apps too.',
      fix: { label: 'Set up', run: () => go('/install') },
    })
  return list
})

// 5. what is blocking right now, and why (or why not)
const running = computed(() => {
  const s = store.state
  if (!s) return []
  return blocks.value.blocks.map((b) => {
    if (b.kind === 'focus') return { id: 'focus', name: b.name, text: `Until ${time(b.until)}, breaks included.` }
    const rule = s.rules.find((r) => r.id === b.ruleId)
    return { id: b.ruleId, name: b.name, text: rule ? ruleWhy(s, rule, store.now).text : '' }
  })
})
const idle = computed(() => {
  const s = store.state
  if (!s || running.value.length) return []
  return s.rules.slice(0, 3).map((r) => ({ id: r.id, name: r.name, text: ruleWhy(s, r, store.now).text }))
})
const blocksItem = computed(() => {
  const n = running.value.length
  const rules = store.state?.rules?.length
  if (blockingIssue.value && n)
    return { state: 'bad', text: `${n} block${n === 1 ? ' should' : 's should'} be running, but nothing is blocked in this browser.` }
  if (blockingIssue.value && rules) return { state: 'off', text: 'Your rules are saved. They block once the steps above are done.' }
  if (n) return { state: 'ok', text: `${n} running now.` }
  return { state: 'off', text: rules ? 'Nothing is blocking right now.' : 'No blocks yet. Add a rule or start a focus session.' }
})

const ICON = { ok: 'check', bad: 'x', warn: 'alert', off: null }
const TONE = {
  ok: 'bg-good text-on-good',
  bad: 'bg-bad text-on-bad',
  warn: 'bg-caution-soft text-caution',
  off: 'bg-sunk text-muted border border-line',
}
const allGood = computed(() => !blockingIssue.value && !extensionOutdated.value)
</script>

<template>
  <div data-blocking-status :class="!bare && 'card p-5'">
    <div v-if="!bare" class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 text-lg font-semibold"><Icon name="shield" :size="18" /> Blocking status</h2>
      <span class="chip" :class="allGood ? '!bg-good-soft !text-good' : '!bg-bad-soft !text-bad'" data-blocking-status-summary>
        {{ allGood ? 'Ready to block' : 'Blocking is off' }}
      </span>
    </div>
    <ul class="divide-y divide-line">
      <li v-for="it in items" :key="it.id" class="flex items-start gap-3 py-2.5" :data-check="it.id" :data-state="it.state">
        <span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" :class="TONE[it.state]">
          <Icon v-if="ICON[it.state]" :name="ICON[it.state]" :size="14" />
          <i v-else class="block h-1.5 w-1.5 rounded-full bg-current" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold"
            >{{ it.label }}<span v-if="it.optional" class="ml-1.5 text-xs font-normal text-muted">optional</span></span
          >
          <span class="block text-xs" :class="it.state === 'bad' ? 'text-bad' : 'text-muted'">{{ it.text }}</span>
        </span>
        <template v-if="it.fix">
          <a
            v-if="it.fix.href"
            :href="it.fix.href"
            target="_blank"
            rel="noopener"
            class="btn btn-sm shrink-0"
            :class="it.state === 'bad' && 'btn-primary'"
            >{{ it.fix.label }}</a
          >
          <button v-else class="btn btn-sm shrink-0" :class="it.state !== 'off' && 'btn-primary'" @click="it.fix.run">
            {{ it.fix.label }}
          </button>
        </template>
      </li>
      <li class="flex items-start gap-3 py-2.5" data-check="blocks" :data-state="blocksItem.state">
        <span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" :class="TONE[blocksItem.state]">
          <Icon v-if="ICON[blocksItem.state]" :name="ICON[blocksItem.state]" :size="14" />
          <i v-else class="block h-1.5 w-1.5 rounded-full bg-current" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">Blocks running right now</span>
          <span class="block text-xs" :class="blocksItem.state === 'bad' ? 'text-bad' : 'text-muted'">{{ blocksItem.text }}</span>
          <span v-if="running.length || idle.length" class="mt-1.5 block space-y-1">
            <span v-for="b in [...running, ...idle]" :key="b.id" class="block rounded-lg bg-sunk px-2.5 py-1.5 text-xs">
              <b>{{ b.name }}</b> <span class="text-muted">{{ b.text }}</span>
            </span>
          </span>
        </span>
      </li>
    </ul>
    <div class="mt-3 border-t border-line pt-3">
      <BlockingTest compact />
      <p class="mt-2 text-xs text-muted">
        Private window? Allow FocusGateway there in your browser's extension settings.
        <a :href="TROUBLE" target="_blank" rel="noopener" class="font-semibold text-accent underline" data-trouble-link
          >Troubleshooting guide</a
        >
      </p>
    </div>
  </div>
</template>
