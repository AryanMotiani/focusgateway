// The shop in the app: coins, what is owned, buying, and what is new since the last visit.
// The rules (prices, levels, earning) all live in packages/core/src/economy.js.
import { computed, ref } from 'vue'
import { coinsOf, ownsFn, SHOP_ITEMS, focusLive, affordableItems } from '@focusgateway/core'
import { store, call, toast } from './store.js'
import { progress, isGame } from './rewards.js'
import { sfx } from './sfx.js'

export const wallet = computed(() => coinsOf(store.state))
/** Coins to spend right now (never shown below 0, see economy.js). */
export const balance = computed(() => Math.max(0, wallet.value.balance))
export const shopLevel = computed(() => progress.value?.level || 1)
const hasFn = computed(() => ownsFn(store.state))
/** Does the player own this shop item (free ones always)? */
export const ownsItem = (id) => hasFn.value(id)

/** The running focus session, live: coins and XP so far, and what finishing pays. */
export const live = computed(() => (store.state?.focus?.active ? focusLive(store.state, store.now) : null))

// ---- "New": what became buyable or affordable since the last visit to the shop.
// known[id] is 1 when it was seen unlocked, 2 when it was seen affordable.
const KNOWN_KEY = 'focusgateway:shop-known'
function load() {
  try {
    return JSON.parse(localStorage.getItem(KNOWN_KEY) || 'null')
  } catch {
    return null
  }
}
const known = ref(load())
function save() {
  try {
    localStorage.setItem(KNOWN_KEY, JSON.stringify(known.value))
  } catch {}
}

/** Every item for sale, with its state for this player. */
export const catalog = computed(() => {
  if (!store.state) return []
  const has = hasFn.value
  const lvl = shopLevel.value
  const coins = balance.value
  return SHOP_ITEMS.filter((i) => i.price).map((i) => {
    const owned = has(i.id)
    const locked = !owned && i.level > lvl
    const affordable = !owned && !locked && i.price <= coins
    const rank = owned || locked ? 0 : affordable ? 2 : 1
    return { ...i, owned, locked, affordable, rank, fresh: rank > 0 && rank > (known.value?.[i.id] || 0) }
  })
})

// The first time the app runs with the shop, things already visible count as seen, except
// what can be bought right away: that shows as new, so the shop says hello at the start.
export function initKnown() {
  if (known.value || !store.state) return
  known.value = Object.fromEntries(catalog.value.filter((i) => i.rank === 1).map((i) => [i.id, 1]))
  save()
}

/** Affordable things not seen yet: they light the dot on the shop buttons. */
export const freshAffordable = computed(() => (known.value ? catalog.value.filter((i) => i.rank === 2 && i.fresh) : []))

/** Remember everything as it is now (called when the shop is looked at). */
export function markSeen() {
  const next = { ...(known.value || {}) }
  for (const i of catalog.value) if (i.rank > (next[i.id] || 0)) next[i.id] = i.rank
  known.value = next
  save()
}

/** What `coins` more made affordable: for "You can now afford" after a session. */
export function newlyAffordable(coinsBefore, limit = 3) {
  if (!store.state) return []
  const now = affordableItems(store.state, shopLevel.value, balance.value)
  return now
    .filter((i) => i.price > coinsBefore)
    .sort((a, b) => b.price - a.price)
    .slice(0, limit)
}

// ---- buying

const soundsOn = () => isGame.value && store.state?.settings?.sounds !== false

/** Buys an item. Returns true when it worked. `from` is where the coins burst from. */
export async function buy(id, from) {
  try {
    await call('shop.buy', { id })
  } catch (e) {
    toast(e.message, 'error')
    return false
  }
  markSeen()
  coinBurst(from, 14, 'spend')
  if (soundsOn()) sfx.purchase()
  return true
}

/** Claims the one time starter gift. */
export async function claimGift(from) {
  try {
    await call('shop.gift')
  } catch (e) {
    toast(e.message, 'error')
    return false
  }
  coinBurst(from, 22)
  if (soundsOn()) sfx.purchase()
  return true
}

export function playCoin() {
  if (soundsOn()) sfx.coin()
}

// ---- the coin burst: little coins that fly out of an element and fade

const COIN_SVG =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#e0a31a"/><circle cx="12" cy="11" r="9.5" fill="#ffd34d"/><circle cx="12" cy="11" r="6" fill="none" stroke="#e0a31a" stroke-width="1.6"/><path d="M8.5 7.5 A5 5 0 0 1 12 6" stroke="#fff6c8" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'

/**
 * Coins fly out of `from` (an element or an event). 'earn' bursts up and out, 'spend'
 * bursts and falls. Nothing when motion is reduced or the app is in minimal mode.
 */
export function coinBurst(from, n = 12, kind = 'earn') {
  if (typeof document === 'undefined' || !isGame.value) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const el = from?.currentTarget || from?.target || from
  const r = el?.getBoundingClientRect ? el.getBoundingClientRect() : null
  const x = r ? r.left + r.width / 2 : window.innerWidth / 2
  const y = r ? r.top + r.height / 2 : window.innerHeight / 2
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div')
    const size = 14 + Math.random() * 10
    Object.assign(c.style, {
      position: 'fixed',
      left: x - size / 2 + 'px',
      top: y - size / 2 + 'px',
      width: size + 'px',
      height: size + 'px',
      zIndex: 90,
      pointerEvents: 'none',
      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))',
    })
    c.innerHTML = COIN_SVG
    document.body.append(c)
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.6
    const dist = 50 + Math.random() * 70
    const dx = Math.cos(angle) * dist
    const up = kind === 'earn' ? -40 - Math.random() * 60 : -20 - Math.random() * 30
    const fall = kind === 'earn' ? -80 - Math.random() * 40 : 90 + Math.random() * 60
    const spin = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)
    const a = c.animate(
      [
        { transform: 'translate(0,0) scale(.4) rotateY(0)', opacity: 0 },
        {
          transform: `translate(${dx * 0.7}px, ${Math.sin(angle) * dist * 0.5 + up}px) scale(1.1) rotateY(${spin / 2}deg)`,
          opacity: 1,
          offset: 0.35,
        },
        { transform: `translate(${dx}px, ${fall}px) scale(.8) rotateY(${spin}deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)', delay: i * 12 },
    )
    a.onfinish = () => c.remove()
    setTimeout(() => c.remove(), 2000)
  }
}

/** Floats "+N coins" up from an element, like the XP pop. */
export function popCoins(from, amount) {
  if (!amount || !isGame.value || typeof document === 'undefined') return
  const el = from?.currentTarget || from?.target || from
  const r = el?.getBoundingClientRect ? el.getBoundingClientRect() : null
  const p = document.createElement('div')
  p.className = 'xp-pop'
  p.style.color = '#f2b705'
  p.textContent = `+${amount} coins`
  p.style.left = (r ? r.left + r.width / 2 : window.innerWidth / 2) + 'px'
  p.style.top = (r ? r.top : window.innerHeight / 2) + 'px'
  document.body.append(p)
  setTimeout(() => p.remove(), 1200)
}
