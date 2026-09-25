// Small motion helpers for the landing page. One passive scroll and resize listener feeds
// every subscriber once per animation frame. Everything else is CSS reading custom properties,
// so the only work per frame is a getBoundingClientRect and a style write per section.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

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

// ------------------------------------------------------------------ reveal on enter
// v-reveal fades and lifts an element in the first time it scrolls into view.
// The argument picks the move: v-reveal:left, :right, :scale, :tilt or :clip (default rises).
// The value is a delay in ms, for staggers: v-reveal:left="120".
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
function watchReveal(el) {
  const io = revealObserver()
  if (io) io.observe(el)
  else el.classList.add('is-in')
}
export const vReveal = {
  mounted(el, binding) {
    el.classList.add('lp-reveal')
    if (binding.arg) el.dataset.reveal = binding.arg
    if (binding.value) el.style.setProperty('--d', binding.value + 'ms')
    watchReveal(el)
  },
  unmounted(el) {
    revealer?.unobserve(el)
  },
}

// v-split: wraps every word of a static heading in a mask, so the words slide up into view one
// after another when it scrolls in. v-split.now plays straight away (the hero). The value is
// a start delay in ms. Only for elements whose text never changes after mount.
function splitWords(node, words) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 3) {
      const parts = child.textContent.split(/(\s+)/)
      if (parts.every((t) => !t.trim())) continue
      const frag = document.createDocumentFragment()
      for (const part of parts) {
        if (!part) continue
        if (!part.trim()) {
          frag.appendChild(document.createTextNode(' '))
          continue
        }
        const mask = document.createElement('span')
        mask.className = 'lp-w'
        const inner = document.createElement('span')
        inner.className = 'lp-wi'
        inner.textContent = part
        inner.style.setProperty('--wi', words.length)
        words.push(inner)
        mask.appendChild(inner)
        frag.appendChild(mask)
      }
      child.replaceWith(frag)
    } else if (child.nodeType === 1 && !['svg', 'br', 'img'].includes(child.tagName.toLowerCase())) {
      splitWords(child, words)
    }
  }
}
export const vSplit = {
  mounted(el, binding) {
    const label = el.textContent.replace(/\s+/g, ' ').trim()
    splitWords(el, [])
    el.setAttribute('aria-label', label)
    for (const c of el.children) c.setAttribute('aria-hidden', 'true')
    el.classList.add('lp-split')
    if (binding.value) el.style.setProperty('--d', binding.value + 'ms')
    if (binding.modifiers.now) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')))
    else watchReveal(el)
  },
  unmounted(el) {
    revealer?.unobserve(el)
  },
}

// ------------------------------------------------------------------ numbers
const ease = (k) => 1 - Math.pow(1 - k, 3)

/** Animates a number from `from` to `to` over `ms`, calling set(value) every frame. */
export function countTo(set, from, to, ms = 1200) {
  const t0 = performance.now()
  let raf = 0
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms)
    set(from + (to - from) * ease(k))
    if (k < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

/** A ref that glides toward whatever `source()` returns, for counters that tick instead of jump. */
export function useTween(source, ms = 600) {
  const shown = ref(source())
  let stop = null
  watch(source, (to) => {
    stop?.()
    stop = countTo((v) => (shown.value = v), shown.value, to, ms)
  })
  onBeforeUnmount(() => stop?.())
  return shown
}
