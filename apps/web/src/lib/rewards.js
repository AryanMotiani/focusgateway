// Game feel: XP pops where you clicked, sounds, and level-up / new badge / session reward
// moments, plus the gentle "new things you can afford" nudge for the shop.
import { computed, reactive, watch } from 'vue'
import { progressOf, newlyUnlocked, computeMilestones, dateKey } from '@focusgateway/core'
import { store } from './store.js'
import { sfx } from './sfx.js'
import { freshAffordable, initKnown, newlyAffordable, balance } from './shop.js'

export const isGame = computed(() => (store.state?.settings?.uiMode || 'game') === 'game')
const soundsOn = () => isGame.value && store.state?.settings?.sounds !== false

export const progress = computed(() => (store.state ? progressOf(store.state) : null))
// minute resolution: milestones do not need to recompute every second
export const milestones = computed(() => (store.state ? computeMilestones(store.state, store.minute) : []))
/** Total XP right now, to show what an action really earned (the anti-farming rules can make it 0). */
export const currentXp = () => progress.value?.xp || 0

// session: the reward card after a focus session, nudge: the "you can afford" toast
export const celebration = reactive({ levelUp: null, badge: null, session: null, nudge: null })

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

const NUDGED = 'focusgateway:shop-nudged'
const NUDGE_DAY = 'focusgateway:shop-nudge-day'
/**
 * Tells the player when something new in the shop became affordable, and once a day at the
 * start if anything affordable is waiting. Not on the shop itself, and not over a bigger card.
 */
function maybeNudge() {
  const fresh = freshAffordable.value
  if (!fresh.length || celebration.session || celebration.levelUp || !store.state?.onboarding?.completed) return
  if (/^#\/(shop|home|welcome)/.test(location.hash)) return
  const nudged = recall(NUDGED) || []
  const day = dateKey(Date.now())
  const newOnes = fresh.filter((i) => !nudged.includes(i.id))
  if (!newOnes.length && recall(NUDGE_DAY) === day) return
  remember(NUDGED, [...new Set([...nudged, ...fresh.map((i) => i.id)])].slice(-300))
  remember(NUDGE_DAY, day)
  celebration.nudge = { items: (newOnes.length ? newOnes : fresh).slice(0, 3), count: fresh.length }
}

/** Watch for level-ups, newly earned badges, finished sessions and the shop. Call once from App. */
export function startRewardWatch() {
  watch(
    () => !!store.state,
    (ready) => ready && initKnown(),
    { immediate: true },
  )
  // A focus session just ended (here, or while the app was closed, in the last few hours):
  // show what it paid. The amounts come from the backend, stored on the session.
  watch(
    () => store.state?.focus?.history?.at(-1)?.id,
    (id) => {
      if (!id) return
      const entry = store.state.focus.history.at(-1)
      const seen = recall('focusgateway:seen-session')
      remember('focusgateway:seen-session', id)
      if (!seen || seen === id || !entry.reward || store.now - (entry.endedAt || 0) > 6 * 3600_000) return
      const afford = newlyAffordable(balance.value - entry.reward.coins)
      remember(NUDGED, [...new Set([...(recall(NUDGED) || []), ...freshAffordable.value.map((i) => i.id)])].slice(-300))
      celebration.session = { entry, reward: entry.reward, afford, xpBefore: (progress.value?.xp || 0) - entry.reward.xp }
      if (soundsOn()) sfx.purchase()
    },
    { immediate: true },
  )
  let nudgeT = 0
  watch(
    () => [freshAffordable.value.map((i) => i.id).join(), !!celebration.session, !!celebration.levelUp],
    () => {
      clearTimeout(nudgeT)
      nudgeT = setTimeout(maybeNudge, 1800)
    },
    { immediate: true },
  )
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
