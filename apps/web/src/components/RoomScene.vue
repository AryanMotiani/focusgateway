<script setup>
// Cozy window scene: sky, skyline with lit windows, moon/sun, rain on glass.
// SVG for the static layers, a canvas for rain so it stays smooth.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({ scene: { type: String, default: 'night' }, rain: { type: Number, default: 0.5 }, pulse: { type: Number, default: 0 } })
const canvas = ref(null)
let raf = 0
let drops = []

const SCENES = {
  night: { sky: ['#0d0b24', '#231a4d', '#3b2a6b'], glow: '#f6b25e', city: '#120f2b', city2: '#1b163d', win: '#f6c67a', orb: '#f5efe6', orbGlow: 'rgba(245,239,230,.25)', stars: true },
  sunset: { sky: ['#2b1d4a', '#b0506b', '#f2a65a'], glow: '#ffcf8a', city: '#2a1830', city2: '#4a2640', win: '#ffd79a', orb: '#ffd3a1', orbGlow: 'rgba(255,190,120,.35)', stars: false },
  morning: { sky: ['#8ec5e8', '#c8e0ef', '#f4e2c8'], glow: '#fff1d0', city: '#5d6f8a', city2: '#8397b1', win: '#fef3d7', orb: '#fff6de', orbGlow: 'rgba(255,245,210,.5)', stars: false },
}
const s = computed(() => SCENES[props.scene] || SCENES.night)

// deterministic skyline
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
}
const buildings = (() => {
  const r = rng(7)
  const back = []
  const front = []
  for (let x = -20; x < 1620; ) {
    const w = 50 + r() * 90
    back.push({ x, w, h: 180 + r() * 260 })
    x += w + 4
  }
  for (let x = -40; x < 1640; ) {
    const w = 70 + r() * 120
    const h = 120 + r() * 220
    const wins = []
    for (let wy = 900 - h + 18; wy < 880; wy += 26) for (let wx = x + 12; wx < x + w - 14; wx += 20) if (r() < 0.32) wins.push({ x: wx, y: wy, o: 0.5 + r() * 0.5 })
    front.push({ x, w, h, wins })
    x += w + 8
  }
  return { back, front }
})()
const stars = (() => {
  const r = rng(42)
  return Array.from({ length: 90 }, () => ({ x: r() * 1600, y: r() * 420, s: r() * 1.6 + 0.3, d: r() * 4 }))
})()

function resize() {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  c.width = c.clientWidth * dpr
  c.height = c.clientHeight * dpr
}
function frame() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  const W = c.width
  const H = c.height
  ctx.clearRect(0, 0, W, H)
  const target = Math.round(props.rain * 260 * (W / 1600))
  while (drops.length < target) drops.push({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 22, v: 9 + Math.random() * 10, o: 0.15 + Math.random() * 0.35 })
  if (drops.length > target) drops.length = target
  ctx.lineWidth = Math.max(1, W / 1400)
  ctx.lineCap = 'round'
  for (const d of drops) {
    ctx.strokeStyle = `rgba(210,220,255,${d.o})`
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x - d.l * 0.18, d.y + d.l)
    ctx.stroke()
    d.y += d.v * (H / 900)
    d.x -= d.v * 0.18 * (H / 900)
    if (d.y > H) {
      d.y = -d.l
      d.x = Math.random() * W * 1.1
    }
  }
  raf = requestAnimationFrame(frame)
}
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  if (!reduce) raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
watch(() => props.rain, (v) => !v && canvas.value?.getContext('2d').clearRect(0, 0, canvas.value.width, canvas.value.height))
</script>

<template>
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" class="absolute inset-0 h-full w-full transition-opacity duration-700">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" :stop-color="s.sky[0]" />
          <stop offset=".6" :stop-color="s.sky[1]" />
          <stop offset="1" :stop-color="s.sky[2]" />
        </linearGradient>
        <radialGradient id="orbGlow"><stop offset="0" :stop-color="s.orbGlow" /><stop offset="1" stop-color="transparent" /></radialGradient>
        <radialGradient id="lamp" cx=".15" cy="1" r=".7"><stop offset="0" :stop-color="s.glow" stop-opacity=".45" /><stop offset="1" :stop-color="s.glow" stop-opacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      <g v-if="s.stars">
        <circle v-for="(st, i) in stars" :key="i" :cx="st.x" :cy="st.y" :r="st.s" fill="#fff" class="twinkle" :style="{ animationDelay: st.d + 's' }" />
      </g>
      <circle cx="1200" cy="230" r="170" fill="url(#orbGlow)" />
      <circle cx="1200" cy="230" r="58" :fill="s.orb" />
      <g :fill="s.city2" opacity=".85">
        <rect v-for="(b, i) in buildings.back" :key="'b' + i" :x="b.x" :y="900 - b.h - 60" :width="b.w" :height="b.h + 60" />
      </g>
      <g>
        <g v-for="(b, i) in buildings.front" :key="'f' + i">
          <rect :x="b.x" :y="900 - b.h" :width="b.w" :height="b.h" :fill="s.city" />
          <rect v-for="(w, j) in b.wins" :key="j" :x="w.x" :y="w.y" width="8" height="11" rx="1" :fill="s.win" :opacity="w.o * (scene === 'morning' ? 0.35 : 1)" />
        </g>
      </g>
      <rect width="1600" height="900" fill="url(#lamp)" :opacity="0.85 + pulse * 0.15" />
    </svg>
    <canvas v-show="rain > 0" ref="canvas" class="absolute inset-0 h-full w-full" />
    <!-- window frame -->
    <div class="pointer-events-none absolute inset-0 border-[14px] border-[#0b0918]/70 sm:border-[22px]" />
    <div class="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-[#0b0918]/60 max-sm:hidden" />
    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0918]/80 via-transparent to-[#0b0918]/30" />
  </div>
</template>

<style scoped>
.twinkle { animation: twinkle 4s ease-in-out infinite; }
@keyframes twinkle { 0%, 100% { opacity: .9 } 50% { opacity: .25 } }
</style>
