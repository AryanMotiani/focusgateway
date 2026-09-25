<script setup>
// The student at the desk, seen from behind at a three-quarter angle, writing in a
// notebook. Drawn around (0, 0) = the middle of the chair seat, in room units.
// Idle motion is CSS only: breathing, writing, a page flip now and then, a head tilt,
// and a small nod on the music beat (the --nod variable is set by StudyRoom).
import { computed } from 'vue'
import { DEFAULT_AVATAR } from '@focusgateway/core'
import { SKIN, HAIR, WRAP, TOP } from './avatarStyle.js'

const props = defineProps({ avatar: { type: Object, default: () => ({}) }, uid: { type: String, default: 'av' } })
const a = computed(() => ({ ...DEFAULT_AVATAR, ...props.avatar }))

const BUILDS = {
  neutral: { sw: 68, ww: 54, neck: 14, rx: 40, ry: 45 },
  masc: { sw: 78, ww: 60, neck: 16, rx: 41, ry: 45 },
  fem: { sw: 60, ww: 48, neck: 12, rx: 38, ry: 44 },
}
const b = computed(() => BUILDS[a.value.build] || BUILDS.neutral)
const skin = computed(() => SKIN[a.value.skin] || SKIN.s3)
const hairC = computed(() => (a.value.hair === 'hijab' ? WRAP : HAIR)[a.value.hairColor] || HAIR.espresso)
const top = computed(() => TOP[a.value.topColor] || TOP.green)
const hairDark = computed(() => shade(hairC.value[0], -0.18))
const topDD = computed(() => shade(top.value[1], -0.2))

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)))
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// head position: a little to the right of the body, looking down at the notebook
const hx = 8
const hy = -262
const g = computed(() => {
  const { sw, ww, rx, ry, neck } = b.value
  const torso =
    `M${-neck - 4} -208 C${-sw * 0.55} -210 ${-sw} -204 ${-sw} -174 ` +
    `C${-sw} -120 ${-ww - 4} -60 ${-ww} 6 L${ww} 6 C${ww + 4} -60 ${sw} -120 ${sw} -174 ` +
    `C${sw} -204 ${sw * 0.55} -210 ${neck + 4} -208 Q0 -200 ${-neck - 4} -208Z`
  const shadeSide = `M${-sw - 2} -190 C${-sw + 30} -180 ${-ww + 22} -80 ${-ww + 18} 8 L${-ww - 10} 8 L${-sw - 10} -190Z`
  // arms: shoulder, elbow resting near the desk edge, forearm forward on the desk
  const armL = [
    [-sw + 16, -182],
    [-sw - 6, -102],
    [-sw + 30, -150],
  ]
  const armR = [
    [sw - 16, -182],
    [sw + 8, -100],
    [sw + 30, -150],
  ]
  return { sw, ww, rx, ry, neck, torso, shadeSide, armL, armR }
})
const seg = (p, q) => `M${p[0]} ${p[1]} L${q[0]} ${q[1]}`
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]

const hair = computed(() => {
  const { rx, ry } = g.value
  const s = a.value.hair
  const tight =
    `M${hx - rx - 1} ${hy + 2} C${hx - rx - 2} ${hy - ry * 0.9} ${hx - rx * 0.45} ${hy - ry - 3} ${hx} ${hy - ry - 3} ` +
    `C${hx + rx * 0.55} ${hy - ry - 3} ${hx + rx + 2} ${hy - ry * 0.8} ${hx + rx} ${hy - 4} L${hx + rx - 9} ${hy - 3} ` +
    `C${hx + rx - 10} ${hy + 14} ${hx + rx * 0.4} ${hy + 25} ${hx + 3} ${hy + 27} C${hx - rx * 0.4} ${hy + 25} ${hx - rx + 9} ${hy + 14} ${hx - rx + 8} ${hy}Z`
  const shortCap =
    `M${hx - rx - 4} ${hy + 4} C${hx - rx - 6} ${hy - ry * 0.8} ${hx - rx * 0.5} ${hy - ry - 8} ${hx + 2} ${hy - ry - 8} ` +
    `C${hx + rx * 0.62} ${hy - ry - 8} ${hx + rx + 5} ${hy - ry * 0.72} ${hx + rx + 3} ${hy - 3} L${hx + rx - 7} ${hy - 4} ` +
    `C${hx + rx - 8} ${hy + 16} ${hx + rx * 0.5} ${hy + 30} ${hx + 4} ${hy + 31} C${hx - rx * 0.5} ${hy + 30} ${hx - rx + 5} ${hy + 18} ${hx - rx + 4} ${hy + 1}Z`
  const fullCap =
    `M${hx - rx - 5} ${hy + 18} C${hx - rx - 7} ${hy - ry * 0.8} ${hx - rx * 0.5} ${hy - ry - 7} ${hx + 2} ${hy - ry - 7} ` +
    `C${hx + rx * 0.62} ${hy - ry - 7} ${hx + rx + 7} ${hy - ry * 0.72} ${hx + rx + 5} ${hy + 18} ` +
    `C${hx + rx + 4} ${hy + ry + 14} ${hx - rx - 4} ${hy + ry + 14} ${hx - rx - 5} ${hy + 18}Z`
  if (s === 'buzz') return { cap: tight, capOpacity: 0.72, ears: true }
  if (s === 'short') return { cap: shortCap, ears: true, strands: true }
  if (s === 'ponytail' || s === 'bun') return { cap: tight, ears: true, [s]: true }
  if (s === 'bob')
    return {
      cap:
        `M${hx - rx - 9} ${hy + 30} C${hx - rx - 12} ${hy - 12} ${hx - rx - 4} ${hy - ry - 9} ${hx + 2} ${hy - ry - 9} ` +
        `C${hx + rx + 8} ${hy - ry - 9} ${hx + rx + 13} ${hy - 12} ${hx + rx + 10} ${hy + 30} Q${hx} ${hy + 40} ${hx - rx - 9} ${hy + 30}Z`,
      ears: false,
      bobShade: true,
    }
  if (s === 'long')
    return {
      cap: fullCap,
      ears: false,
      drape:
        `M${hx - rx - 5} ${hy + 4} C${hx - rx - 12} ${hy + 70} ${hx - rx - 16} -178 ${hx - rx - 10} -146 ` +
        `Q${hx - rx * 0.6} -134 ${hx - 10} -140 Q${hx} -132 ${hx + 10} -140 Q${hx + rx * 0.6} -134 ${hx + rx + 10} -146 ` +
        `C${hx + rx + 16} -178 ${hx + rx + 12} ${hy + 70} ${hx + rx + 5} ${hy + 4}Z`,
    }
  if (s === 'curly') {
    const blobs = []
    for (let i = 0; i <= 14; i++) {
      const t = Math.PI * (0.95 + (i / 14) * 1.1)
      blobs.push([hx + Math.cos(t) * (rx + 6), hy - 6 + Math.sin(t) * (ry + 4), 13])
    }
    for (let i = 0; i < 5; i++) blobs.push([hx - rx + 6 + i * ((rx * 2 - 12) / 4), hy + 26 - Math.abs(i - 2) * 2, 12])
    blobs.push([hx - rx - 4, hy + 14, 12], [hx + rx + 4, hy + 14, 12])
    return { cap: fullCap, blobs, ears: false }
  }
  if (s === 'hijab') {
    const { sw } = g.value
    return {
      wrap: true,
      ears: false,
      drape:
        `M${hx - rx - 7} ${hy - 6} C${hx - rx - 14} ${hy + 44} ${-sw - 4} -208 ${-sw} -180 ` +
        `Q${-sw * 0.4} -168 ${hx} -128 Q${sw * 0.4} -168 ${sw} -180 ` +
        `C${sw + 4} -208 ${hx + rx + 14} ${hy + 44} ${hx + rx + 7} ${hy - 6}Z`,
    }
  }
  return { cap: shortCap, ears: true }
})
// invisible boxes that put the centre of a group on its pivot (for CSS transform-origin: center)
const headPivot = { x: hx, y: hy + 40 }
</script>

<template>
  <g class="av" :data-hair="a.hair">
    <defs>
      <clipPath :id="uid + '-torso'"><path :d="g.torso" /></clipPath>
    </defs>

    <!-- notebook on the desk, under the writing hand -->
    <g>
      <path :d="`M${g.sw - 38} -126 L${g.sw - 30} -154 L${g.sw + 70} -154 L${g.sw + 64} -126Z`" fill="#6c5a8e" />
      <path :d="`M${g.sw - 34} -129 L${g.sw - 27} -153 L${g.sw + 16} -153 L${g.sw + 13} -129Z`" fill="#fbf6ec" />
      <path :d="`M${g.sw + 13} -129 L${g.sw + 16} -153 L${g.sw + 66} -153 L${g.sw + 61} -129Z`" fill="#f1e9da" />
      <path :d="`M${g.sw + 24} -146 h30 M${g.sw + 23} -141 h32 M${g.sw + 22} -136 h24`" stroke="#9a8fb5" stroke-width="1.6" opacity=".7" />
      <path class="av-page" :d="`M${g.sw + 13} -129 L${g.sw + 16} -153 L${g.sw + 66} -153 L${g.sw + 61} -129Z`" fill="#fffaf0" />
    </g>

    <g class="av-breathe">
      <!-- forearms resting on the desk, in front of the body (so mostly hidden by it) -->
      <g v-for="(arm, i) in [g.armL, g.armR]" :key="'f' + i" :class="i ? 'av-write' : ''">
        <path :d="seg(arm[1], arm[2])" :stroke="a.top === 'tshirt' ? skin[0] : top[1]" stroke-width="26" stroke-linecap="round" />
        <circle
          v-if="a.top !== 'tshirt'"
          :cx="lerp(arm[1], arm[2], 0.8)[0]"
          :cy="lerp(arm[1], arm[2], 0.8)[1]"
          r="12.5"
          :fill="a.top === 'sweater' ? topDD : top[1]"
        />
        <circle :cx="arm[2][0] + 1" :cy="arm[2][1] - 3" r="10" :fill="skin[0]" />
        <line
          v-if="i"
          :x1="arm[2][0] + 3"
          :y1="arm[2][1] - 6"
          :x2="arm[2][0] + 13"
          :y2="arm[2][1] - 25"
          stroke="#2f3b66"
          stroke-width="3.5"
          stroke-linecap="round"
        />
      </g>
      <!-- body -->
      <path :d="g.torso" :fill="top[0]" />
      <g :clip-path="`url(#${uid}-torso)`">
        <path :d="g.shadeSide" fill="#000" opacity=".13" />
        <path :d="`M${g.sw - 26} -206 Q${g.sw} -200 ${g.sw + 4} -160`" :stroke="'#fff'" stroke-width="10" opacity=".08" fill="none" />
        <template v-if="a.top === 'sweater'">
          <path
            v-for="x in [-24, 0, 24]"
            :key="x"
            :d="`M${x} -186 q5 10 0 20 t0 20 t0 20 t0 20 t0 20 t0 20`"
            :stroke="top[1]"
            stroke-width="3"
            fill="none"
            opacity=".45"
          />
        </template>
      </g>
      <path
        v-if="a.top === 'sweater'"
        :d="`M${-g.neck - 6} -207 Q0 -196 ${g.neck + 6} -207`"
        :stroke="top[1]"
        stroke-width="8"
        fill="none"
        stroke-linecap="round"
      />
      <path
        v-if="a.top === 'tshirt'"
        :d="`M${-g.neck - 4} -207 Q0 -199 ${g.neck + 4} -207`"
        :stroke="top[1]"
        stroke-width="4"
        fill="none"
        stroke-linecap="round"
      />

      <!-- upper arms -->
      <g v-for="(arm, i) in [g.armL, g.armR]" :key="'u' + i">
        <path :d="seg(arm[0], arm[1])" :stroke="topDD" stroke-width="34" stroke-linecap="round" opacity=".35" />
        <path :d="seg(arm[0], arm[1])" :stroke="a.top === 'tshirt' ? skin[0] : top[0]" stroke-width="30" stroke-linecap="round" />
        <path
          v-if="a.top === 'tshirt'"
          :d="seg(arm[0], lerp(arm[0], arm[1], 0.5))"
          :stroke="top[0]"
          stroke-width="34"
          stroke-linecap="round"
        />
      </g>

      <!-- hood lying on the back -->
      <g v-if="a.top === 'hoodie'">
        <path
          :d="`M${-g.sw * 0.62} -205 Q${-g.sw * 0.72} -150 0 -136 Q${g.sw * 0.72} -150 ${g.sw * 0.62} -205 Q0 -214 ${-g.sw * 0.62} -205Z`"
          :fill="top[1]"
        />
        <path :d="`M${-g.sw * 0.46} -205 Q0 -168 ${g.sw * 0.46} -205 Q0 -196 ${-g.sw * 0.46} -205Z`" :fill="topDD" opacity=".7" />
        <path d="M0 -176 V-140" :stroke="topDD" stroke-width="2" opacity=".35" />
      </g>

      <!-- hair or head covering falling over the back -->
      <path v-if="hair.drape" :d="hair.drape" :fill="hairC[0]" />
      <template v-if="hair.drape && a.hair === 'long'">
        <path
          :d="`M${hx - 18} -200 q-6 30 -4 56 M${hx + 20} -200 q6 30 2 56`"
          :stroke="hairDark"
          stroke-width="3"
          fill="none"
          opacity=".5"
        />
      </template>
      <template v-if="hair.wrap">
        <path
          :d="`M${hx - 24} ${hy + 44} Q${-g.sw * 0.55} -190 ${-g.sw * 0.6} -160`"
          :stroke="hairDark"
          stroke-width="3"
          fill="none"
          opacity=".45"
        />
        <path
          :d="`M${hx + 26} ${hy + 44} Q${g.sw * 0.55} -190 ${g.sw * 0.6} -160`"
          :stroke="hairDark"
          stroke-width="3"
          fill="none"
          opacity=".45"
        />
      </template>

      <!-- head -->
      <g class="av-nod">
        <rect :x="headPivot.x - 90" :y="headPivot.y - 130" width="180" height="260" fill="none" />
        <g class="av-tilt">
          <rect :x="headPivot.x - 90" :y="headPivot.y - 130" width="180" height="260" fill="none" />
          <rect v-if="!hair.drape" :x="hx - g.neck" :y="hy + 20" :width="g.neck * 2" height="40" rx="6" :fill="skin[1]" />
          <ellipse :cx="hx" :cy="hy" :rx="g.rx" :ry="g.ry" :fill="skin[0]" />
          <!-- cheek and jaw, just visible as the head turns to the right -->
          <path
            :d="`M${hx + g.rx - 8} ${hy + 4} Q${hx + g.rx + 3} ${hy + 24} ${hx + g.rx - 16} ${hy + 40} L${hx + 6} ${hy + 36}Z`"
            :fill="skin[0]"
          />
          <template v-if="hair.ears">
            <ellipse :cx="hx + g.rx - 1" :cy="hy + 4" rx="8" ry="12" :fill="skin[0]" />
            <ellipse :cx="hx + g.rx" :cy="hy + 4" rx="4" ry="7" :fill="skin[1]" />
            <ellipse :cx="hx - g.rx + 2" :cy="hy + 4" rx="7" ry="11" :fill="skin[0]" />
            <ellipse :cx="hx - g.rx + 1" :cy="hy + 4" rx="3.5" ry="6" :fill="skin[1]" />
          </template>

          <template v-if="hair.wrap">
            <ellipse :cx="hx" :cy="hy - 2" :rx="g.rx + 7" :ry="g.ry + 7" :fill="hairC[0]" />
            <path
              :d="`M${hx - g.rx * 0.6} ${hy - g.ry * 0.7} Q${hx} ${hy - g.ry - 12} ${hx + g.rx * 0.5} ${hy - g.ry * 0.75}`"
              :stroke="hairC[1]"
              stroke-width="5"
              fill="none"
              opacity=".6"
              stroke-linecap="round"
            />
            <path
              :d="`M${hx - g.rx - 2} ${hy + 10} Q${hx} ${hy + 30} ${hx + g.rx + 2} ${hy + 10}`"
              :stroke="hairDark"
              stroke-width="3"
              fill="none"
              opacity=".35"
            />
          </template>
          <template v-else>
            <path :d="hair.cap" :fill="hairC[0]" :opacity="hair.capOpacity || 1" />
            <g v-if="hair.ponytail" class="av-tail">
              <rect :x="hx - 60" :y="hy - 64" width="120" height="128" fill="none" />
              <path
                :d="`M${hx - 13} ${hy + 2} C${hx - 20} ${hy + 34} ${hx - 12} ${hy + 62} ${hx + 3} ${hy + 86} C${hx + 12} ${hy + 80} ${hx + 22} ${hy + 40} ${hx + 13} ${hy + 2}Z`"
                :fill="hairC[0]"
              />
              <path
                :d="`M${hx} ${hy + 12} C${hx - 2} ${hy + 40} ${hx + 2} ${hy + 60} ${hx + 7} ${hy + 80}`"
                :stroke="hairDark"
                stroke-width="2.5"
                fill="none"
                opacity=".6"
              />
            </g>
            <g v-if="hair.blobs" :fill="hairC[0]">
              <circle v-for="(c, i) in hair.blobs" :key="i" :cx="c[0]" :cy="c[1]" :r="c[2]" />
              <path
                v-for="(c, i) in hair.blobs.filter((_, k) => k % 3 === 1)"
                :key="'c' + i"
                :d="`M${c[0] - 5} ${c[1]} a5 5 0 1 1 5 5`"
                :stroke="hairC[1]"
                stroke-width="2.5"
                fill="none"
                opacity=".7"
              />
            </g>
            <path
              v-if="hair.bobShade"
              :d="`M${hx - g.rx - 6} ${hy + 22} Q${hx} ${hy + 34} ${hx + g.rx + 8} ${hy + 22}`"
              :stroke="hairDark"
              stroke-width="5"
              fill="none"
              opacity=".5"
            />
            <!-- crown highlight -->
            <path
              v-if="a.hair !== 'curly'"
              :d="`M${hx - g.rx * 0.55} ${hy - g.ry * 0.55} Q${hx - g.rx * 0.1} ${hy - g.ry - 2} ${hx + g.rx * 0.45} ${hy - g.ry * 0.8}`"
              :stroke="hairC[1]"
              stroke-width="5"
              fill="none"
              opacity=".55"
              stroke-linecap="round"
            />
            <path
              v-if="hair.strands"
              :d="`M${hx - 12} ${hy + 22} q2 -12 -2 -22 M${hx + 10} ${hy + 24} q4 -12 2 -24 M${hx - 26} ${hy + 10} q4 -10 2 -18`"
              :stroke="hairDark"
              stroke-width="2.4"
              fill="none"
              opacity=".5"
              stroke-linecap="round"
            />
            <g v-if="hair.bun">
              <circle :cx="hx + 2" :cy="hy - g.ry - 4" r="21" :fill="hairC[0]" />
              <path :d="`M${hx - 9} ${hy - g.ry - 8} a11 11 0 1 1 11 11`" :stroke="hairDark" stroke-width="2.5" fill="none" opacity=".6" />
              <path
                :d="`M${hx - 6} ${hy - g.ry - 14} q8 -6 16 0`"
                :stroke="hairC[1]"
                stroke-width="3"
                fill="none"
                opacity=".6"
                stroke-linecap="round"
              />
              <rect :x="hx - 13" :y="hy - g.ry + 13" width="30" height="6" rx="3" fill="#e56b6f" />
            </g>
            <ellipse v-if="hair.ponytail" :cx="hx + 1" :cy="hy + 1" rx="12" ry="7" fill="#e56b6f" />
          </template>

          <!-- glasses: the temple arms and a glint of the lens at the edge -->
          <g v-if="a.glasses" stroke="#2e2a36" stroke-linecap="round" fill="none">
            <path :d="`M${hx + g.rx - 16} ${hy - 3} L${hx + g.rx + 5} ${hy - 7}`" stroke-width="3.2" />
            <path :d="`M${hx - g.rx + 14} ${hy - 3} L${hx - g.rx - 4} ${hy - 7}`" stroke-width="3" />
            <path :d="`M${hx + g.rx + 5} ${hy - 16} v16`" stroke-width="3.5" />
          </g>
          <g v-if="a.headphones">
            <path
              :d="`M${hx - g.rx - 6} ${hy + 2} C${hx - g.rx - 8} ${hy - g.ry - 24} ${hx + g.rx + 8} ${hy - g.ry - 24} ${hx + g.rx + 6} ${hy + 2}`"
              stroke="#3a3342"
              stroke-width="9"
              fill="none"
              stroke-linecap="round"
            />
            <ellipse :cx="hx - g.rx - 5" :cy="hy + 6" rx="10" ry="16" fill="#3a3342" />
            <ellipse :cx="hx + g.rx + 5" :cy="hy + 6" rx="12" ry="18" fill="#3a3342" />
            <ellipse :cx="hx + g.rx + 7" :cy="hy + 6" rx="8" ry="13" fill="#e9e1d6" />
          </g>
        </g>
      </g>
    </g>

    <!-- chair -->
    <g>
      <path d="M-48 12 L-50 140 M48 12 L50 140" stroke="#553624" stroke-width="10" stroke-linecap="round" />
      <path d="M-66 12 L-71 172 M66 12 L71 172" stroke="#6a452e" stroke-width="12" stroke-linecap="round" />
      <path d="M-68 112 H68" stroke="#6a452e" stroke-width="7" />
      <rect x="-84" y="-6" width="168" height="22" rx="8" fill="#83573a" />
      <rect x="-84" y="-6" width="168" height="8" rx="4" fill="#a8754f" />
      <rect x="-46" y="-40" width="10" height="40" fill="#6a452e" />
      <rect x="36" y="-40" width="10" height="40" fill="#6a452e" />
      <path d="M-84 16 L-92 4 L-92 -8 L-84 -6Z" fill="#5d3c28" />
      <rect x="-70" y="-100" width="124" height="70" rx="24" fill="#94503b" />
      <rect x="-62" y="-104" width="124" height="72" rx="24" fill="#c56a4f" />
      <rect x="-62" y="-104" width="124" height="72" rx="24" fill="url(#av-chair-shine)" />
      <path d="M-44 -68 H44" stroke="#a9543d" stroke-width="3" stroke-linecap="round" opacity=".6" />
      <circle cx="-22" cy="-68" r="3" fill="#a9543d" />
      <circle cx="22" cy="-68" r="3" fill="#a9543d" />
    </g>
    <defs>
      <linearGradient id="av-chair-shine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".18" />
        <stop offset=".5" stop-color="#fff" stop-opacity="0" />
        <stop offset="1" stop-color="#000" stop-opacity=".15" />
      </linearGradient>
    </defs>
  </g>
</template>

<style scoped>
.av-breathe,
.av-nod,
.av-tilt,
.av-tail,
.av-write,
.av-page {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.av-breathe {
  transform-origin: 50% 100%;
  animation: av-breathe 4.2s ease-in-out infinite;
}
@keyframes av-breathe {
  50% {
    transform: translateY(-1.5px) scaleY(1.006);
  }
}
.av-nod {
  transform: rotate(calc(var(--nod, 0) * 2.4deg));
  transition: transform 0.14s ease-out;
}
.av-tilt {
  animation: av-tilt 13s ease-in-out infinite;
}
@keyframes av-tilt {
  0%,
  70%,
  100% {
    transform: rotate(0);
  }
  76%,
  88% {
    transform: rotate(-5deg);
  }
}
.av-tail {
  animation: av-tail 5s ease-in-out infinite;
}
@keyframes av-tail {
  50% {
    transform: rotate(3deg);
  }
}
.av-write {
  animation: av-write 1.1s ease-in-out infinite;
}
@keyframes av-write {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(1.5px, -0.6px);
  }
  50% {
    transform: translate(3px, 0);
  }
  75% {
    transform: translate(1.5px, 0.6px);
  }
}
.av-page {
  transform-origin: 0% 50%;
  opacity: 0;
  animation: av-page 16s ease-in-out infinite;
}
@keyframes av-page {
  0%,
  86% {
    opacity: 0;
    transform: scaleX(1);
  }
  87% {
    opacity: 1;
    transform: scaleX(1);
  }
  93% {
    opacity: 1;
    transform: scaleX(-0.95);
  }
  94%,
  100% {
    opacity: 0;
    transform: scaleX(-0.95);
  }
}
@media (prefers-reduced-motion: reduce) {
  .av-breathe,
  .av-tilt,
  .av-tail,
  .av-write,
  .av-page {
    animation: none;
  }
  .av-nod {
    transform: none;
    transition: none;
  }
}
</style>
