<script setup>
// The help drawer: what the current page is for, what each part means, how to use it, tips,
// keyboard keys, the page's tour and links to the full guides. Opened by the "?" buttons.
// Page tours only start from here ("Take the tour"), never by themselves.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { help, closeHelp, startTour, tourSeen, TOURS } from '../../lib/tour.js'
import { HELP } from './helpContent.js'
import { REPO_URL } from '../../config.js'
import Icon from '../Icon.vue'

const USER_GUIDE = REPO_URL + '/blob/master/docs/USER-GUIDE.md'
const DEV_GUIDE = REPO_URL + '/blob/master/docs/DEVELOPER-GUIDE.md'
const TROUBLE = REPO_URL + '/blob/master/docs/TROUBLESHOOTING-blocking.md'

const panel = ref(null)
const page = computed(() => HELP[help.page] || HELP.today)
// help.open in the dependency list: the seen list is not reactive, so re-read it on each open
const tourLabel = computed(() => help.open && (page.value.tourLabel || (tourSeen(page.value.tour) ? 'Replay the tour' : 'Take the tour')))
let before = null

function replay(id) {
  closeHelp()
  // let the drawer close first, so the tour measures the page, not the drawer
  setTimeout(() => startTour(id, { force: true }), 250)
}
function onKey(e) {
  if (!help.open) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    closeHelp()
  }
}
watch(
  () => help.open,
  async (open) => {
    if (open) {
      before = document.activeElement
      await nextTick()
      panel.value?.querySelector('button')?.focus()
      // "Learn more" links jump to their section
      const target = help.section && panel.value?.querySelector(`[data-help-section="${help.section}"]`)
      if (target) {
        target.scrollIntoView({ block: 'start' })
        target.classList.add('help-flash')
      }
    } else before?.focus?.()
  },
)
// another page: its own help, so close this one
const route = useRoute()
watch(() => route.path, closeHelp)
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <Teleport to="body">
    <Transition name="help">
      <div v-if="help.open" class="fixed inset-0 z-[80] flex justify-end" data-help-drawer>
        <div class="absolute inset-0 bg-[#0b0918]/45 backdrop-blur-[2px]" @click="closeHelp" />
        <aside
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          class="help-panel relative flex h-full w-full max-w-md flex-col bg-paper text-ink shadow-2xl"
        >
          <header class="flex items-start gap-3 border-b border-line p-5">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent">?</span>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold tracking-wide text-muted uppercase">Help</p>
              <h2 id="help-title" class="text-xl font-semibold">{{ page.title }}</h2>
            </div>
            <button class="btn btn-ghost btn-sm" aria-label="Close help" @click="closeHelp"><Icon name="x" /></button>
          </header>

          <div class="flex-1 space-y-6 overflow-y-auto p-5 text-sm">
            <p class="text-base">{{ page.intro }}</p>

            <div v-if="page.tour && TOURS[page.tour]" class="flex flex-wrap gap-2">
              <button class="btn btn-primary btn-sm" data-replay-tour @click="replay(page.tour)">
                <Icon name="play" :size="13" /> {{ tourLabel }}
              </button>
              <button v-for="[id, label] in page.tours || []" :key="id" class="btn btn-sm" @click="replay(id)">{{ label }}</button>
            </div>

            <section v-for="s in page.sections" :key="s.h" :data-help-section="s.id || null" class="scroll-mt-4 rounded-xl">
              <h3 class="mb-2 font-semibold">{{ s.h }}</h3>
              <ul class="space-y-1.5 text-muted">
                <li v-for="(it, i) in s.items" :key="i" class="flex gap-2">
                  <span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{{ it }}
                </li>
              </ul>
            </section>

            <section v-if="page.tips?.length" class="rounded-xl bg-accent-soft p-4">
              <h3 class="mb-1.5 flex items-center gap-1.5 font-semibold text-accent"><Icon name="sparkles" :size="15" /> Tips</h3>
              <ul class="space-y-1">
                <li v-for="(t, i) in page.tips" :key="i">{{ t }}</li>
              </ul>
            </section>

            <section v-if="page.keys?.length">
              <h3 class="mb-2 font-semibold">Keyboard</h3>
              <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                <template v-for="[k, what] in page.keys" :key="k">
                  <dt>
                    <kbd class="rounded-md border border-line bg-card px-1.5 py-0.5 font-mono text-xs">{{ k }}</kbd>
                  </dt>
                  <dd class="text-muted">{{ what }}</dd>
                </template>
              </dl>
            </section>
          </div>

          <footer class="space-y-1 border-t border-line p-5 text-sm">
            <a :href="USER_GUIDE" target="_blank" rel="noopener" class="flex items-center gap-2 font-semibold text-accent"
              ><Icon name="list" :size="15" /> Full user guide</a
            >
            <a :href="TROUBLE" target="_blank" rel="noopener" class="flex items-center gap-2 text-muted hover:text-ink"
              ><Icon name="alert" :size="15" /> Sites not blocked? Troubleshooting</a
            >
            <a :href="DEV_GUIDE" target="_blank" rel="noopener" class="flex items-center gap-2 text-muted hover:text-ink"
              ><Icon name="terminal" :size="15" /> Developer guide</a
            >
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.help-enter-active,
.help-leave-active {
  transition: opacity 0.2s ease;
}
.help-enter-active .help-panel,
.help-leave-active .help-panel {
  transition: transform 0.25s ease;
}
.help-enter-from,
.help-leave-to {
  opacity: 0;
}
.help-enter-from .help-panel,
.help-leave-to .help-panel {
  transform: translateX(24px);
}
.help-flash {
  animation: help-flash 1.6s ease-out;
}
@keyframes help-flash {
  0%,
  40% {
    box-shadow: 0 0 0 6px var(--fg-accent-soft);
    background: var(--fg-accent-soft);
  }
}
@media (prefers-reduced-motion: reduce) {
  .help-flash {
    animation: none;
  }
  .help-enter-active,
  .help-leave-active,
  .help-enter-active .help-panel,
  .help-leave-active .help-panel {
    transition: none;
  }
}
</style>
