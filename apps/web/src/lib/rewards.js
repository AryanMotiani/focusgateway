// Game feel: XP pops where you clicked, sounds, and level-up / new badge moments.
import { computed, reactive, watch } from 'vue'
import { progressOf, newlyUnlocked, computeMilestones } from '@focusgateway/core'
import { store } from './store.js'
import { sfx } from './sfx.js'

export const isGame = computed(() => (store.state?.settings?.uiMode || 'game') === 'game')
const soundsOn = () => isGame.value && store.state?.settings?.sounds !== false

export const progress = computed(() => (store.state ? progressOf(store.state) : null))
// minute resolution: milestones do not need to recompute every second
export const milestones = computed(() => (store.state ? computeMilestones(store.state, store.minute) : []))
/** Total XP right now, to show what an action really earned (the anti-farming rules can make it 0). */
export const currentXp = () => progress.value?.xp || 0

export const celebration = reactive({ levelUp: null, badge: null })

function remember(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}
function recall(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

/** Floats "+20 XP" up from an element or click. */
export function popXp(source, amount, label = 'XP') {
  if (!amount || !isGame.value) return
  const r = source?.getBoundingClientRect ? source.getBoundingClientRect() : source?.target?.getBoundingClientRect?.()
  const x = r ? r.left + r.width / 2 : window.innerWidth / 2
  const y = r ? r.top : window.innerHeight / 2
  const el = document.createElement('div')
  el.className = 'xp-pop'
  el.textContent = `+${amount} ${label}`
  el.style.left = x + 'px'
  el.style.top = y + 'px'
  document.body.append(el)
  setTimeout(() => el.remove(), 1200)
}

export function playTick() {
  if (soundsOn()) sfx.tick()
}
export function playHabit() {
  if (soundsOn()) sfx.habit()
}

/** Watch for level-ups and newly earned badges. Call once from App. */
export function startRewardWatch() {
  watch(
    () => progress.value?.level,
    (level) => {
      if (!level) return
      const seen = recall('focusgateway:seen-level')
      if (seen && level > seen) {
        celebration.levelUp = { from: seen, to: level, title: progress.value.title, unlocks: newlyUnlocked(seen, level) }
        if (soundsOn()) sfx.levelUp()
      }
      if (!seen || level > seen) remember('focusgateway:seen-level', level)
    },
    { immediate: true },
  )
  watch(
    () => milestones.value.filter((m) => m.achieved).map((m) => m.id),
    (ids) => {
      if (!store.state) return
      const seen = recall('focusgateway:seen-badges')
      if (!seen) return remember('focusgateway:seen-badges', ids)
      const fresh = ids.filter((id) => !seen.includes(id))
      if (fresh.length && !celebration.levelUp) {
        celebration.badge = milestones.value.find((m) => m.id === fresh.at(-1))
        if (soundsOn()) sfx.badge()
      }
      remember('focusgateway:seen-badges', [...new Set([...seen, ...ids])])
    },
    { immediate: true },
  )
}
