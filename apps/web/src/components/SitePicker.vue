<script setup>
import { computed, ref } from 'vue'
import { sites, attempt, call } from '../lib/store.js'
import Icon from './Icon.vue'

const model = defineModel({ type: Array, default: () => [] })
const q = ref('')
const adding = ref(false)
const customName = ref('')
const customDomains = ref('')

const CATS = {
  social: 'Social',
  video: 'Video',
  chat: 'Chat',
  music: 'Music',
  shopping: 'Shopping',
  games: 'Games',
  news: 'News',
  sports: 'Sports',
  entertainment: 'Entertainment',
  dating: 'Dating',
  custom: 'Your sites',
}
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return sites.value.filter((x) => !s || x.name.toLowerCase().includes(s) || x.domains.some((d) => d.includes(s)))
})
const grouped = computed(() => {
  const g = {}
  for (const s of filtered.value) (g[s.category || 'custom'] ||= []).push(s)
  return Object.entries(g).sort((a, b) => (a[0] === 'custom' ? -1 : b[0] === 'custom' ? 1 : 0))
})
const toggle = (id) => (model.value = model.value.includes(id) ? model.value.filter((x) => x !== id) : [...model.value, id])

async function addCustom() {
  const site = await attempt(() => call('sites.add', { name: customName.value, domains: customDomains.value }), 'Site added')
  model.value = [...model.value, site.id]
  customName.value = customDomains.value = ''
  adding.value = false
}
function quickAdd() {
  customDomains.value = q.value
  customName.value = ''
  adding.value = true
}
</script>

<template>
  <div>
    <div class="relative">
      <input v-model="q" class="input pl-9" placeholder="Search YouTube, Instagram, reddit.com…" aria-label="Search sites" />
      <span class="absolute top-1/2 left-3 -translate-y-1/2 text-muted"><Icon name="globe" :size="16" /></span>
    </div>
    <div v-if="model.length" class="mt-2 flex flex-wrap gap-1.5">
      <button v-for="id in model" :key="id" type="button" class="chip bg-accent-soft text-accent" @click="toggle(id)">
        {{ sites.find((s) => s.id === id)?.name || id }} <Icon name="x" :size="12" />
      </button>
    </div>
    <div class="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
      <div v-for="[cat, list] in grouped" :key="cat">
        <p class="label">{{ CATS[cat] || cat }}</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="s in list"
            :key="s.id"
            type="button"
            :title="s.domains.join(', ')"
            class="rounded-full border px-3 py-1 text-sm transition"
            :class="
              model.includes(s.id) ? 'border-accent bg-accent text-white dark:text-[#120f24]' : 'border-line bg-card hover:border-accent'
            "
            @click="toggle(s.id)"
          >
            {{ s.name }}
          </button>
        </div>
      </div>
      <p v-if="!filtered.length" class="text-sm text-muted">
        Not in the list.
        <button type="button" class="font-semibold text-accent underline" @click="quickAdd">Add "{{ q }}" as a custom site</button>
      </p>
    </div>
    <div class="mt-3">
      <button v-if="!adding" type="button" class="btn btn-sm" @click="adding = true">
        <Icon name="plus" :size="14" /> Any other website
      </button>
      <div v-else class="card space-y-2 bg-sunk p-3">
        <input v-model="customName" class="input" placeholder="Name (optional), e.g. Chess" />
        <textarea v-model="customDomains" class="input min-h-16" placeholder="Website addresses, e.g. chess.com lichess.org" />
        <p class="text-xs text-muted">Subdomains are included automatically. Separate several with spaces or commas.</p>
        <div class="flex gap-2">
          <button type="button" class="btn btn-sm btn-primary" :disabled="!customDomains.trim()" @click="addCustom">Add site</button>
          <button type="button" class="btn btn-sm" @click="adding = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>
