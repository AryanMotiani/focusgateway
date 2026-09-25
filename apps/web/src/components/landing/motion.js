// Small motion helpers for the landing page. One passive scroll and resize listener feeds
// every subscriber once per animation frame. Everything else is CSS reading custom properties,
// so the only work per frame is a getBoundingClientRect and a style write per section.
import { onBeforeUnmount, onMounted, ref } from 'vue'

const subscribers = new Set()
let queued = false
let listening = false

function flush() {
  queued = false
  for (const fn of subscribers) fn()
}
function schedule() {
  if (!queued) {
    queued = true
    requestAnimationFrame(flush)
  }
}
function listen() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
}
function unlisten() {
  if (!subscribers.size && listening) {
    listening = false
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
  }
}

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

/** Calls fn on every frame the page scrolled or resized, and once after mount. */
export function useFrame(fn) {
  onMounted(() => {
    subscribers.add(fn)
    listen()
    schedule()
  })
  onBeforeUnmount(() => {
    subscribers.delete(fn)
    unlisten()
  })
}

/**
 * Progress through a tall "pinned" section: 0 when its top reaches the top of the viewport,
 * 1 when its bottom reaches the bottom. Writes it to --p on the element and hands it to onChange.
 */
export function usePinProgress(elRef, onChange) {
  useFrame(() => {
    const el = elRef.value
    if (!el) return
    const r = el.getBoundingClientRect()
    const travel = r.height - window.innerHeight
    const p = travel > 0 ? clamp(-r.top / travel) : 0
    el.style.setProperty('--p', p.toFixed(4))
    onChange?.(p, r)
  })
}

/** Where an element is on its way through the viewport: -1 just below it, 0 centred, 1 just above. */
export function useViewportOffset(elRef, onChange) {
  useFrame(() => {
    const el = elRef.value
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const centre = r.top + r.height / 2
    onChange(clamp((vh / 2 - centre) / ((vh + r.height) / 2), -1, 1), r)
  })
}

/** True once (or while, with { once: false }) the element is on screen. */
export function useInView(elRef, { once = true, threshold = 0.25, rootMargin = '0px' } = {}) {
  const seen = ref(false)
  let io
  onMounted(() => {
    if (!('IntersectionObserver' in window)) {
      seen.value = true
      return
    }
    io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          seen.value = true
          if (once) io.disconnect()
        } else if (!once) seen.value = false
      },
      { threshold, rootMargin },
    )
    if (elRef.value) io.observe(elRef.value)
  })
  onBeforeUnmount(() => io?.disconnect())
  return seen
}

/** Reactive media query, for prefers-reduced-motion and the pinned layout breakpoint. */
export function useMedia(query) {
  const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null
  const matches = ref(!!mql?.matches)
  const update = (e) => (matches.value = e.matches)
  onMounted(() => mql?.addEventListener?.('change', update))
  onBeforeUnmount(() => mql?.removeEventListener?.('change', update))
  return matches
}

export const REDUCED = '(prefers-reduced-motion: reduce)'
/** Pinned scroll scenes need room: wide enough and tall enough, and motion allowed. */
export const PINNABLE = '(min-width: 900px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)'

/** Media files live in public/media, so they work under the GitHub Pages subpath too. */
export const media = (file) => `${import.meta.env.BASE_URL}media/${file}`

// v-reveal: fades and lifts an element in the first time it scrolls into view.
// v-reveal="120" delays it by 120 ms, for simple staggers.
let revealer = null
function revealObserver() {
  if (revealer || typeof IntersectionObserver === 'undefined') return revealer
  revealer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        revealer.unobserve(e.target)
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  )
  return revealer
}
export const vReveal = {
  mounted(el, binding) {
    el.classList.add('lp-reveal')
    if (binding.value) el.style.setProperty('--d', binding.value + 'ms')
    const io = revealObserver()
    if (io) io.observe(el)
    else el.classList.add('is-in')
  },
  unmounted(el) {
    revealer?.unobserve(el)
  },
}
