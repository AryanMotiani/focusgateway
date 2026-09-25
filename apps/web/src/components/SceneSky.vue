<script setup>
// The view out of the study room window: sky, landscape and scene details, drawn in a
// 1600 x 900 box. Used by the room window (StudyRoom) and the landing page (RoomScene).
import { computed } from 'vue'
import { sceneOf } from '../lib/scenes.js'

const props = defineProps({
  scene: { type: String, default: 'scene-night' },
  viewBox: { type: String, default: '0 0 1600 900' },
  // gradient ids must be unique per page
  idPrefix: { type: String, default: 'sky-' },
})
const s = computed(() => sceneOf(props.scene))
const p = computed(() => props.idPrefix)

function rng(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}
const city = (() => {
  const r = rng(7)
  const back = []
  const front = []
  for (let x = -20; x < 1620;) {
    const w = 50 + r() * 90
    back.push({ x, w, h: 180 + r() * 260 })
    x += w + 4
  }
  for (let x = -40; x < 1640;) {
    const w = 70 + r() * 120
    const h = 120 + r() * 220
    const wins = []
    for (let wy = 900 - h + 18; wy < 880; wy += 26)
      for (let wx = x + 12; wx < x + w - 14; wx += 20) if (r() < 0.32) wins.push({ x: wx, y: wy, o: 0.5 + r() * 0.5, alt: r() < 0.4 })
    front.push({ x, w, h, wins })
    x += w + 8
  }
  return { back, front }
})()
const trees = (() => {
  const r = rng(19)
  const layer = (n, base, hmin, hmax) =>
    Array.from({ length: n }, (_, i) => {
      const x = (i / n) * 1700 - 50 + r() * 40
      const h = hmin + r() * (hmax - hmin)
      return { x, h, w: h * (0.32 + r() * 0.1), base }
    })
  return { far: layer(46, 860, 160, 300), near: layer(24, 900, 240, 420) }
})()
const peaks = (() => {
  const r = rng(5)
  const ridge = (count, base, hmin, hmax) => {
    const pts = [[-50, 900]]
    for (let i = 0; i <= count; i++) {
      const x = -50 + (i / count) * 1700
      pts.push([x, base - (hmin + r() * (hmax - hmin)) * (i % 2 ? 1 : 0.55)])
    }
    pts.push([1650, 900])
    return pts
  }
  return { far: ridge(10, 760, 180, 360), near: ridge(7, 900, 160, 330) }
})()
const stars = (() => {
  const r = rng(42)
  return Array.from({ length: 110 }, () => ({ x: r() * 1600, y: r() * 480, s: r() * 1.6 + 0.3, d: r() * 4 }))
})()
const poly = (pts) => pts.map((p) => p.join(',')).join(' ')
// snow caps: small triangles at the peak points of the far ridge
const caps = computed(() =>
  peaks.far
    .slice(1, -1)
    .filter((p, i) => i % 2 === 1)
    .map(([x, y]) => `${x - 38},${y + 46} ${x},${y} ${x + 38},${y + 46}`),
)
</script>

<template>
  <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient :id="p + 'sky'" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="s.sky[0]" />
        <stop offset=".6" :stop-color="s.sky[1]" />
        <stop offset="1" :stop-color="s.sky[2]" />
      </linearGradient>
      <radialGradient :id="p + 'orb'">
        <stop offset="0" :stop-color="s.orb || '#fff'" stop-opacity=".35" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="p + 'aurora'" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#3dffb0" stop-opacity="0" />
        <stop offset=".35" stop-color="#3dffb0" stop-opacity=".55" />
        <stop offset=".7" stop-color="#6fa8ff" stop-opacity=".45" />
        <stop offset="1" stop-color="#b86bff" stop-opacity="0" />
      </linearGradient>
      <linearGradient :id="p + 'sea'" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="s.far" />
        <stop offset="1" :stop-color="s.near" />
      </linearGradient>
      <radialGradient :id="p + 'planet'" cx=".35" cy=".35" r=".75">
        <stop offset="0" stop-color="#f3b27a" />
        <stop offset=".6" stop-color="#b35f5f" />
        <stop offset="1" stop-color="#3a1f3f" />
      </radialGradient>
    </defs>
    <rect width="1600" height="900" :fill="`url(#${p}sky)`" />
    <g v-if="s.stars">
      <circle
        v-for="(st, i) in stars"
        :key="i"
        :cx="st.x"
        :cy="st.y"
        :r="st.s"
        fill="#fff"
        class="twinkle"
        :style="{ animationDelay: st.d + 's' }"
      />
    </g>
    <g v-if="s.aurora" class="aurora">
      <path
        d="M-50 260 C 300 120, 600 330, 900 200 S 1400 150, 1700 260 L1700 330 C 1300 250, 1000 380, 700 300 S 200 240, -50 340 Z"
        :fill="`url(#${p}aurora)`"
      />
      <path
        d="M-50 180 C 350 60, 700 260, 1000 150 S 1450 110, 1700 190 L1700 230 C 1350 170, 1050 290, 750 220 S 250 160, -50 240 Z"
        :fill="`url(#${p}aurora)`"
        opacity=".6"
      />
    </g>
    <template v-if="s.orb">
      <circle cx="1200" :cy="s.orbY || 230" r="170" :fill="`url(#${p}orb)`" />
      <circle cx="1200" :cy="s.orbY || 230" r="58" :fill="s.orb" />
    </template>

    <!-- landscapes -->
    <template v-if="s.land === 'city'">
      <g :fill="s.far" opacity=".85">
        <rect v-for="(b, i) in city.back" :key="'b' + i" :x="b.x" :y="900 - b.h - 60" :width="b.w" :height="b.h + 60" />
      </g>
      <g v-for="(b, i) in city.front" :key="'f' + i">
        <rect :x="b.x" :y="900 - b.h" :width="b.w" :height="b.h" :fill="s.near" />
        <rect
          v-for="(w, j) in b.wins"
          :key="j"
          :x="w.x"
          :y="w.y"
          width="8"
          height="11"
          rx="1"
          :fill="s.neon && w.alt ? s.win2 : s.win"
          :opacity="w.o * (s.winDim || 1)"
        />
      </g>
      <g v-if="s.neon">
        <rect x="210" y="560" width="120" height="34" rx="6" fill="none" stroke="#ff4fd8" stroke-width="4" class="flicker" />
        <rect x="1010" y="520" width="90" height="28" rx="6" fill="none" stroke="#43f0ff" stroke-width="4" />
      </g>
    </template>
    <template v-else-if="s.land === 'forest'">
      <g :fill="s.far">
        <polygon
          v-for="(t, i) in trees.far"
          :key="'tf' + i"
          :points="`${t.x - t.w / 2},${t.base} ${t.x},${t.base - t.h} ${t.x + t.w / 2},${t.base}`"
        />
      </g>
      <rect x="0" y="850" width="1600" height="50" :fill="s.far" />
      <g :fill="s.near">
        <polygon
          v-for="(t, i) in trees.near"
          :key="'tn' + i"
          :points="`${t.x - t.w / 2},${t.base} ${t.x},${t.base - t.h} ${t.x + t.w / 2},${t.base}`"
        />
      </g>
      <g v-if="s.blossom" fill="#ffb3c8" opacity=".85">
        <circle v-for="(t, i) in trees.near" :key="'bl' + i" :cx="t.x" :cy="t.base - t.h * 0.62" :r="t.w * 0.55" />
      </g>
      <g v-else>
        <rect x="1180" y="760" width="110" height="80" fill="#1a1410" />
        <polygon points="1165,765 1235,712 1305,765" fill="#1a1410" />
        <rect x="1205" y="785" width="22" height="22" :fill="s.glow" opacity=".85" />
      </g>
    </template>
    <template v-else-if="s.land === 'mountains'">
      <polygon :points="poly(peaks.far)" :fill="s.far" />
      <polygon v-for="(c, i) in caps" :key="'c' + i" :points="c" :fill="s.cap" opacity=".9" />
      <polygon :points="poly(peaks.near)" :fill="s.near" />
    </template>
    <template v-else-if="s.land === 'sea'">
      <rect x="0" y="560" width="1600" height="340" :fill="`url(#${p}sea)`" />
      <g stroke="#ffe2b0" stroke-linecap="round" opacity=".55">
        <line
          v-for="i in 14"
          :key="'w' + i"
          :x1="1200 - i * 18"
          :y1="575 + i * 22"
          :x2="1200 + i * 18"
          :y2="575 + i * 22"
          :stroke-width="3 + i * 0.3"
          class="glint"
          :style="{ animationDelay: i * 0.2 + 's' }"
        />
      </g>
      <rect x="260" y="430" width="34" height="150" fill="#f4efe6" />
      <rect x="260" y="470" width="34" height="18" fill="#c94f4f" />
      <rect x="252" y="410" width="50" height="26" :fill="s.glow" />
    </template>
    <template v-else-if="s.land === 'space'">
      <circle cx="1150" cy="330" r="190" :fill="`url(#${p}planet)`" />
      <ellipse
        cx="1150"
        cy="330"
        rx="330"
        ry="58"
        fill="none"
        stroke="#f3cf9a"
        stroke-width="10"
        opacity=".55"
        transform="rotate(-14 1150 330)"
      />
      <circle cx="330" cy="200" r="36" fill="#cfd8ff" opacity=".8" />
    </template>
  </svg>
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
@media (prefers-reduced-motion: reduce) {
  .twinkle,
  .flicker,
  .aurora,
  .glint {
    animation: none;
  }
}
</style>
