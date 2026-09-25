<script setup>
// The full-bleed window scene used on the landing page: sky and landscape (SceneSky),
// canvas rain and weather, and optional sill objects. The study room itself is StudyRoom.
// To add a scene, add an entry to SCENES in lib/scenes.js and an unlock in packages/core/src/unlocks.js.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { sceneOf } from '../lib/scenes.js'
import SceneSky from './SceneSky.vue'

const props = defineProps({
  scene: { type: String, default: 'scene-night' },
  rain: { type: Number, default: 0.5 },
  pulse: { type: Number, default: 0 },
  objects: { type: Array, default: () => [] },
})
const canvas = ref(null)
let raf = 0
let parts = []

const s = computed(() => sceneOf(props.scene))

// ---- canvas: rain (from the ambience slider) + scene weather
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
  const k = H / 900
  ctx.clearRect(0, 0, W, H)
  const weather = s.value.weather
  const wantRain = Math.round(props.rain * 260 * (W / 1600))
  const wantWeather = weather === 'snow' ? 140 : weather === 'petals' ? 50 : weather === 'fireflies' ? 36 : 0
  const rainParts = parts.filter((p) => p.t === 'rain')
  const otherParts = parts.filter((p) => p.t !== 'rain' && p.t === weather)
  while (rainParts.length < wantRain)
    rainParts.push({
      t: 'rain',
      x: Math.random() * W,
      y: Math.random() * H,
      l: 10 + Math.random() * 22,
      v: 9 + Math.random() * 10,
      o: 0.15 + Math.random() * 0.35,
    })
  rainParts.length = Math.min(rainParts.length, wantRain)
  while (otherParts.length < wantWeather)
    otherParts.push({
      t: weather,
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 2.5,
      v: 0.4 + Math.random(),
      ph: Math.random() * 6.28,
    })
  otherParts.length = Math.min(otherParts.length, wantWeather)
  parts = [...rainParts, ...otherParts]
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1, W / 1400)
  for (const d of rainParts) {
    ctx.strokeStyle = `rgba(210,220,255,${d.o})`
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x - d.l * 0.18, d.y + d.l)
    ctx.stroke()
    d.y += d.v * k
    d.x -= d.v * 0.18 * k
    if (d.y > H) {
      d.y = -d.l
      d.x = Math.random() * W * 1.1
    }
  }
  const t = performance.now() / 1000
  for (const p of otherParts) {
    if (p.t === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      p.y += p.v * 1.2 * k
      p.x += Math.sin(t + p.ph) * 0.4 * k
    } else if (p.t === 'petals') {
      ctx.fillStyle = 'rgba(255,170,195,0.9)'
      p.y += p.v * k
      p.x += (Math.sin(t * 0.8 + p.ph) * 0.9 + 0.4) * k
    } else {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + p.ph))
      ctx.fillStyle = `rgba(255,236,150,${a})`
      p.x += Math.sin(t * 0.5 + p.ph) * 0.3 * k
      p.y += Math.cos(t * 0.4 + p.ph) * 0.25 * k
    }
    ctx.beginPath()
    if (p.t === 'petals') ctx.ellipse(p.x, p.y, p.r * 2 * k * 1.5, p.r * k * 1.5, t + p.ph, 0, 6.28)
    else ctx.arc(p.x, p.y, p.r * k * (p.t === 'fireflies' ? 1.2 : 1), 0, 6.28)
    ctx.fill()
    if (p.y > H + 10) {
      p.y = -10
      p.x = Math.random() * W
    }
    if (p.x > W + 10) p.x = -10
  }
  raf = requestAnimationFrame(frame)
}
const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  if (!reduce) raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
watch(
  () => props.scene,
  () => (parts = []),
)

const has = (id) => props.objects.includes(id)
const plantStage = computed(() => (has('obj-plant-3') ? 3 : has('obj-plant-2') ? 2 : has('obj-plant') ? 1 : 0))
const sillItems = computed(
  () =>
    ['obj-lamp', 'obj-books', 'obj-mug', 'obj-cat', 'obj-candle', 'obj-globe', 'obj-telescope', 'obj-trophy'].filter(has).length +
    (plantStage.value ? 1 : 0),
)
</script>

<template>
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
    <SceneSky :scene="scene" id-prefix="rs-" class="absolute inset-0 h-full w-full" />
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" class="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id="rs-lamp" cx=".15" cy="1" r=".7">
          <stop offset="0" :stop-color="s.glow" stop-opacity=".45" />
          <stop offset="1" :stop-color="s.glow" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#rs-lamp)" :opacity="0.85 + pulse * 0.15" />
    </svg>
    <canvas ref="canvas" class="absolute inset-0 h-full w-full" />

    <!-- window frame -->
    <div class="pointer-events-none absolute inset-0 border-[14px] border-[#0b0918]/70 sm:border-[22px]" />
    <div class="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-[#0b0918]/60 max-sm:hidden" />
    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0918]/80 via-transparent to-[#0b0918]/30" />

    <!-- fairy lights across the top of the window -->
    <svg
      v-if="has('obj-lights')"
      class="pointer-events-none absolute inset-x-0 top-3 h-16 w-full"
      viewBox="0 0 1600 60"
      preserveAspectRatio="none"
    >
      <path d="M0 8 Q 200 50 400 12 T 800 12 T 1200 12 T 1600 8" fill="none" stroke="#2a2233" stroke-width="2" />
      <circle
        v-for="i in 24"
        :key="'fl' + i"
        :cx="i * 66 - 20"
        :cy="16 + Math.abs(Math.sin(i * 0.95)) * 22"
        r="5"
        :fill="['#ffd27a', '#ff9fb3', '#9fd6ff', '#b8ffb0'][i % 4]"
        class="twinkle"
        :style="{ animationDelay: (i % 5) * 0.6 + 's' }"
      />
    </svg>

    <!-- window sill with unlocked objects -->
    <div
      v-if="sillItems"
      class="pointer-events-none absolute right-[4%] bottom-[112px] flex items-end gap-3 sm:right-[6%] sm:bottom-[120px] sm:gap-5 lg:right-[440px] lg:bottom-[130px]"
    >
      <svg v-if="has('obj-lamp')" width="58" height="84" viewBox="0 0 58 84">
        <ellipse cx="29" cy="30" rx="40" ry="30" fill="#ffd27a" opacity=".18" />
        <path d="M12 30 L22 8 H36 L46 30 Z" fill="#e9b949" />
        <rect x="27" y="30" width="4" height="44" fill="#3a3144" />
        <rect x="14" y="74" width="30" height="8" rx="3" fill="#3a3144" />
      </svg>
      <svg v-if="has('obj-books')" width="54" height="60" viewBox="0 0 54 60">
        <rect x="2" y="44" width="50" height="14" rx="2" fill="#5b7bd6" />
        <rect x="6" y="30" width="44" height="14" rx="2" fill="#d65b7b" />
        <rect x="4" y="16" width="46" height="14" rx="2" fill="#e9b949" />
        <rect x="10" y="2" width="36" height="14" rx="2" fill="#4fae82" />
      </svg>
      <svg v-if="plantStage" width="56" height="96" viewBox="0 0 56 96">
        <path d="M14 70 H42 L38 94 H18 Z" fill="#c9774b" />
        <path d="M28 70 V40" stroke="#3f8f5a" stroke-width="3" />
        <ellipse cx="18" cy="52" rx="11" ry="6" fill="#4fae6e" transform="rotate(-30 18 52)" />
        <ellipse cx="38" cy="48" rx="11" ry="6" fill="#4fae6e" transform="rotate(30 38 48)" />
        <template v-if="plantStage >= 2">
          <path d="M28 44 V18" stroke="#3f8f5a" stroke-width="3" />
          <ellipse cx="18" cy="28" rx="10" ry="5" fill="#5fc27d" transform="rotate(-30 18 28)" />
          <ellipse cx="38" cy="24" rx="10" ry="5" fill="#5fc27d" transform="rotate(30 38 24)" />
        </template>
        <g v-if="plantStage >= 3">
          <circle cx="28" cy="12" r="7" fill="#ff8fb1" />
          <circle cx="28" cy="12" r="3" fill="#ffe27a" />
        </g>
      </svg>
      <svg v-if="has('obj-mug')" width="48" height="60" viewBox="0 0 48 60">
        <path
          d="M14 18 q -4 -8 2 -14 M24 18 q -4 -8 2 -14"
          stroke="#ffffff"
          stroke-opacity=".5"
          stroke-width="2"
          fill="none"
          class="steam"
        />
        <rect x="6" y="24" width="28" height="32" rx="6" fill="#e9e2f5" />
        <path d="M34 30 h6 a6 6 0 0 1 0 14 h-6" fill="none" stroke="#e9e2f5" stroke-width="4" />
      </svg>
      <svg v-if="has('obj-cat')" width="84" height="46" viewBox="0 0 84 46" class="breathe">
        <ellipse cx="44" cy="32" rx="36" ry="14" fill="#2a2233" />
        <circle cx="16" cy="26" r="12" fill="#2a2233" />
        <path d="M8 18 L10 8 L16 16 Z M18 16 L24 8 L25 19 Z" fill="#2a2233" />
        <path d="M10 26 q3 2 6 0 M18 26 q3 2 6 0" stroke="#9f93b3" stroke-width="1.5" fill="none" />
        <path d="M78 34 q 8 -2 4 -14" stroke="#2a2233" stroke-width="6" fill="none" stroke-linecap="round" />
      </svg>
      <svg v-if="has('obj-candle')" width="26" height="64" viewBox="0 0 26 64">
        <ellipse cx="13" cy="12" rx="14" ry="14" fill="#ffcf6b" opacity=".2" />
        <path d="M13 4 q5 7 0 12 q-5 -5 0 -12" fill="#ffc34d" class="flicker" />
        <rect x="6" y="18" width="14" height="44" rx="3" fill="#f3ead9" />
      </svg>
      <svg v-if="has('obj-globe')" width="52" height="74" viewBox="0 0 52 74">
        <circle cx="26" cy="28" r="20" fill="#5b9bd6" />
        <path d="M14 20 q8 -6 14 2 q-4 8 6 12 q-8 6 -14 -2" fill="#6fcf8a" />
        <path d="M26 50 V64 M14 66 H38" stroke="#8a6a3a" stroke-width="4" />
      </svg>
      <svg v-if="has('obj-telescope')" width="78" height="84" viewBox="0 0 78 84">
        <rect x="14" y="16" width="58" height="14" rx="5" fill="#c9c3d6" transform="rotate(-24 40 24)" />
        <path d="M36 34 L22 82 M40 34 L40 82 M44 34 L58 82" stroke="#6a6280" stroke-width="3" />
      </svg>
      <svg v-if="has('obj-trophy')" width="52" height="70" viewBox="0 0 52 70">
        <path d="M12 6 H40 V22 a14 14 0 0 1 -28 0 Z" fill="#f2b705" />
        <path d="M12 10 H4 a8 8 0 0 0 8 14 M40 10 H48 a8 8 0 0 1 -8 14" stroke="#f2b705" stroke-width="4" fill="none" />
        <rect x="22" y="36" width="8" height="14" fill="#d99a00" />
        <rect x="12" y="50" width="28" height="10" rx="2" fill="#6a4a1f" />
      </svg>
    </div>
    <div
      v-if="sillItems"
      class="pointer-events-none absolute right-[2%] bottom-[104px] h-2 w-[min(640px,70%)] rounded-full bg-[#1a1522]/80 sm:bottom-[112px]"
    />
  </div>
</template>

<style scoped>
.twinkle {
  animation: twinkle 4s ease-in-out infinite;
}
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.25;
  }
}
.flicker {
  animation: flicker 2.8s steps(2) infinite;
}
@keyframes flicker {
  0%,
  92% {
    opacity: 1;
  }
  95% {
    opacity: 0.35;
  }
}
.aurora {
  animation: sway 14s ease-in-out infinite alternate;
  transform-origin: center;
}
@keyframes sway {
  from {
    transform: translateX(-30px) skewX(-3deg);
  }
  to {
    transform: translateX(30px) skewX(3deg);
  }
}
.glint {
  animation: glint 3s ease-in-out infinite;
}
@keyframes glint {
  50% {
    opacity: 0.2;
  }
}
.steam {
  animation: steam 3s ease-in-out infinite;
}
@keyframes steam {
  0%,
  100% {
    opacity: 0.2;
    transform: translateY(2px);
  }
  50% {
    opacity: 0.7;
    transform: translateY(-2px);
  }
}
.breathe {
  animation: breathe 4s ease-in-out infinite;
  transform-origin: bottom;
}
@keyframes breathe {
  50% {
    transform: scaleY(1.04);
  }
}
</style>
