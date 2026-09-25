<script setup>
// The "?" on every page (top right of the header, and in the study room's top bar).
// Opens the help drawer for this page. glass: styled by the parent (the room's pill classes).
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { openHelp, pageFor } from '../../lib/tour.js'

const props = defineProps({ page: String, glass: Boolean })
const route = useRoute()
const id = computed(() => props.page || pageFor(route.path) || 'today')
</script>

<template>
  <button
    type="button"
    data-help-button
    class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-bold transition"
    :class="glass ? '' : 'border border-line bg-card text-muted hover:border-accent hover:text-accent'"
    aria-label="Help for this page"
    title="Help: what everything here means (?)"
    @click="openHelp(id)"
  >
    ?
  </button>
</template>
