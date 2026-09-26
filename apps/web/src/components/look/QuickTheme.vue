<script setup>
// The palette button, with the one click sun and moon button beside it: change the look from
// any page, the room included. The palette opens a compact popover with Light or Dark on top,
// then Game or Calm and the four themes of that mode as mini previews in the current variant.
// Changes apply at once. Settings keeps the full picker.
// glass: drawn as study room header buttons. label: show "Theme" next to the icon.
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { store } from '../../lib/store.js'
import { lookMode, themesFor, lookFor, setTheme, setLookMode, isDark } from '../../lib/look.js'
import Icon from '../Icon.vue'
import ColorModeButton from './ColorModeButton.vue'
import ColorModeSwitch from './ColorModeSwitch.vue'

const props = defineProps({ glass: Boolean, label: Boolean, up: Boolean })
const open = ref(false)
const btn = ref(null)
const pop = ref(null)
const pos = ref({})

const mode = computed(() => lookMode.value)
const themes = computed(() => themesFor(mode.value))
const current = computed(() => lookFor(mode.value))
const onboarded = computed(() => !!store.state?.onboarding?.completed)

function place() {
  const r = btn.value?.getBoundingClientRect()
  if (!r) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(340, vw - 24)
  // lined up with the button: from its left edge when there is room, else from its right edge
  const left = Math.max(12, Math.min(vw - w - 12, r.left + w <= vw - 12 ? r.left : r.right - w))
  // open upwards from buttons near the bottom (the sidebar footer)
  const above = props.up || r.bottom > vh * 0.6
  pos.value = above
    ? { left: left + 'px', bottom: vh - r.top + 8 + 'px', width: w + 'px' }
    : { left: left + 'px', top: r.bottom + 8 + 'px', width: w + 'px' }
}
function onDoc(e) {
  if (!open.value) return
  if (pop.value?.contains(e.target) || btn.value?.contains(e.target)) return
  close()
}
function onKey(e) {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation()
    close()
    btn.value?.focus()
  }
}
async function toggle() {
  if (open.value) return close()
  place()
  open.value = true
  document.addEventListener('pointerdown', onDoc, true)
  document.addEventListener('keydown', onKey, true)
  window.addEventListener('resize', place)
  await nextTick()
  pop.value?.querySelector('[aria-checked="true"]')?.focus()
}
function close() {
  open.value = false
  document.removeEventListener('pointerdown', onDoc, true)
  document.removeEventListener('keydown', onKey, true)
  window.removeEventListener('resize', place)
}
onBeforeUnmount(close)
</script>

<template>
  <span :class="glass ? 'contents' : 'inline-flex items-center gap-0.5'">
    <button
      ref="btn"
      type="button"
      :class="
        glass
          ? 'room-glass room-pill flex items-center gap-1.5 p-2 text-xs font-bold'
          : 'btn btn-ghost btn-sm gap-1.5 !px-2 text-muted hover:text-ink'
      "
      :aria-expanded="open"
      aria-haspopup="dialog"
      aria-label="Change theme"
      title="Change theme"
      data-theme-button
      @click="toggle"
    >
      <Icon name="palette" :size="16" /><span v-if="label" class="text-sm">Theme</span>
    </button>
    <ColorModeButton :glass="glass" />
  </span>
  <Teleport to="body">
    <div
      v-if="open"
      ref="pop"
      role="dialog"
      aria-label="Theme"
      data-theme-popover
      class="card fixed z-[90] max-h-[calc(100dvh-24px)] overflow-y-auto p-4 text-ink shadow-2xl"
      :style="pos"
    >
      <ColorModeSwitch auto wide />

      <div class="mt-3 flex items-center justify-between gap-3">
        <p class="font-semibold">Theme</p>
        <div class="flex rounded-xl border border-line p-0.5 text-sm" role="radiogroup" aria-label="Style">
          <button
            v-for="[m, l] in [
              ['game', 'Game'],
              ['minimal', 'Calm'],
            ]"
            :key="m"
            type="button"
            role="radio"
            :aria-checked="mode === m"
            class="rounded-lg px-3 py-1"
            :class="mode === m ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'"
            @click="setLookMode(m)"
          >
            {{ l }}
          </button>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2.5" role="radiogroup" :aria-label="`${mode === 'game' ? 'Game' : 'Calm'} themes`">
        <button
          v-for="t in themes"
          :key="t.id"
          type="button"
          role="radio"
          :aria-checked="current.theme === t.id"
          :aria-label="`${t.name} theme`"
          :data-theme-swatch="t.id"
          class="group rounded-2xl p-1 text-left transition"
          :class="current.theme === t.id ? 'bg-accent' : 'hover:bg-line'"
          @click="setTheme(t.id, mode)"
        >
          <span
            class="theme-scope block overflow-hidden rounded-xl border border-black/10 p-2"
            :data-theme-id="t.id"
            :data-mode="mode"
            :class="isDark && 'dark'"
          >
            <span class="h-display block text-2xl leading-none">Aa</span>
            <span class="mt-2 flex items-center gap-1">
              <i class="block h-2.5 flex-1 rounded-full bg-accent" />
              <i
                v-for="c in t.swatch[isDark ? 'dark' : 'light'].slice(4, 7)"
                :key="c"
                class="block h-2.5 w-2.5 rounded-full"
                :style="{ background: c }"
              />
            </span>
          </span>
          <span
            class="block truncate px-1 pt-1 text-center text-xs font-semibold"
            :class="current.theme === t.id ? 'text-on-accent' : 'text-muted group-hover:text-ink'"
            >{{ t.name }}</span
          >
        </button>
      </div>

      <p class="mt-3 border-t border-line pt-2.5 text-xs text-muted">
        Change it any time from the palette button.
        <RouterLink v-if="onboarded" to="/settings#look" class="font-semibold text-accent underline" @click="close"
          >More in Settings</RouterLink
        >
      </p>
    </div>
  </Teleport>
</template>
