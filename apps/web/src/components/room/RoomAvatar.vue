<script setup>
// The student at the desk, seen from behind at a three-quarter angle, writing in a
// notebook. Drawn around (0, 0) = the middle of the chair seat, in room units.
// Idle motion is CSS only: breathing, writing, a page flip now and then, a head tilt,
// and a small nod on the music beat (the --nod variable is set by StudyRoom).
// `still` turns the motion off and `bare` leaves out the chair and notebook (for previews).
import { computed } from 'vue'
import { DEFAULT_AVATAR } from '@focusgateway/core'
import { SKIN, HAIR, WRAP, TOP, HEADWEAR, PHONES, GLASSES, EARRING } from './avatarStyle.js'
import { shade, luma, woodOf } from './roomStyle.js'

const props = defineProps({
  avatar: { type: Object, default: () => ({}) },
  uid: { type: String, default: 'av' },
  wood: { type: String, default: 'honey' },
  still: Boolean,
  bare: Boolean,
})
const a = computed(() => ({ ...DEFAULT_AVATAR, ...props.avatar }))

const BUILDS = {
  neutral: { sw: 68, ww: 54, neck: 14, rx: 40, ry: 45 },
  masc: { sw: 78, ww: 60, neck: 16, rx: 41, ry: 45 },
  fem: { sw: 60, ww: 48, neck: 12, rx: 38, ry: 44 },
}
const b = computed(() => BUILDS[a.value.build] || BUILDS.neutral)
const skin = computed(() => SKIN[a.value.skin] || SKIN.s3)
const hairC = computed(() => (HEADWEAR.has(a.value.hair) ? WRAP : HAIR)[a.value.hairColor] || HAIR.espresso)
const top = computed(() => TOP[a.value.topColor] || TOP.green)
const hairDark = computed(() => shade(hairC.value[0], -0.18))
const topDD = computed(() => shade(top.value[1], -0.2))
const w = computed(() => woodOf(props.wood))
const phones = computed(() => PHONES[a.value.headphonesColor] || PHONES.charcoal)
const specs = computed(() => GLASSES[a.value.glassesStyle] || GLASSES.classic)

// how the top is drawn: body and sleeve colours, and short or long sleeves
const CREAM = '#efe6d4'
const tp = computed(() => {
  const t = a.value.top
  const [c0, c1] = top.value
  const short = t === 'tshirt' || t === 'stripes'
  const body = t === 'stripes' ? '#f2ece0' : c0
  const sleeve = t === 'varsity' ? CREAM : body
  const sleeveD = t === 'varsity' ? '#d9ccb4' : t === 'stripes' ? '#e2dacb' : c1
  const cuff = t === 'sweater' || t === 'turtleneck' ? topDD.value : t === 'varsity' ? c1 : sleeveD
  return { t, short, body, sleeve, sleeveD, cuff, c0, c1 }
})

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
const dot = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`
/** A wavy line from (x0, y0) to (x1, y1) in n bends. */
function wave(x0, y0, x1, y1, n, amp) {
  let d = ''
  for (let i = 1; i <= n; i++) {
    const t0 = (i - 1) / n
    const t1 = i / n
    const mx = x0 + ((x1 - x0) * (t0 + t1)) / 2 + (i % 2 ? amp : -amp)
    const my = y0 + ((y1 - y0) * (t0 + t1)) / 2
    d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${(x0 + (x1 - x0) * t1).toFixed(1)} ${(y0 + (y1 - y0) * t1).toFixed(1)}`
  }
  return d
}

// Hair: `cap` covers the back of the head, `drape` falls over the back (behind the head),
// `back` and `front` are extra shapes behind and on top of the head:
// { d, fill } or { d, stroke, sw, dash, op }.
const hair = computed(() => {
  const { rx, ry, sw } = g.value
  const s = a.value.hair
  const [c0, c1] = hairC.value
  const dk = hairDark.value
  const back = []
  const front = []
  const fill = (list, d, f, op) => list.push({ d, fill: f, op })
  const line = (list, d, stroke, sw, more) => list.push({ d, fill: 'none', stroke, sw, ...more })

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
  const longDrape =
    `M${hx - rx - 5} ${hy + 4} C${hx - rx - 12} ${hy + 70} ${hx - rx - 16} -178 ${hx - rx - 10} -146 ` +
    `Q${hx - rx * 0.6} -134 ${hx - 10} -140 Q${hx} -132 ${hx + 10} -140 Q${hx + rx * 0.6} -134 ${hx + rx + 10} -146 ` +
    `C${hx + rx + 16} -178 ${hx + rx + 12} ${hy + 70} ${hx + rx + 5} ${hy + 4}Z`
  // a hat or wrap shape: the back of the head down to `low`, `up` above the crown
  const dome = (up, low, spread = 4) =>
    `M${hx - rx - spread} ${low} C${hx - rx - spread - 2} ${hy - ry - 2} ${hx - rx * 0.5} ${hy - ry - up} ${hx + 2} ${hy - ry - up} ` +
    `C${hx + rx * 0.6} ${hy - ry - up} ${hx + rx + spread + 2} ${hy - ry - 2} ${hx + rx + spread} ${low} Q${hx} ${low + 10} ${hx - rx - spread} ${low}Z`
  // hanging strands (braids, locs): n of them from the nape down the back
  const strands = (n, spread, len, width) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1)
      const x0 = hx - rx + 8 + t * (rx * 2 - 16)
      const y0 = hy + 20 + Math.sin(t * Math.PI) * 8
      const x1 = hx + (x0 - hx) * spread + (t - 0.5) * 8
      const y1 = len + ((i * 7) % 3) * 7
      const cx = (x0 + x1) / 2 + (t - 0.5) * 14
      return {
        d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${((y0 + y1) / 2).toFixed(1)} ${x1.toFixed(1)} ${y1}`,
        x1,
        y1,
        width,
      }
    })

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
  if (s === 'long') {
    line(back, `M${hx - 18} -200 q-6 30 -4 56 M${hx + 20} -200 q6 30 2 56`, dk, 3, { op: 0.5 })
    return { cap: fullCap, ears: false, drape: longDrape, back }
  }
  if (s === 'curly') {
    const blobs = []
    for (let i = 0; i <= 14; i++) {
      const t = Math.PI * (0.95 + (i / 14) * 1.1)
      blobs.push([hx + Math.cos(t) * (rx + 6), hy - 6 + Math.sin(t) * (ry + 4), 13])
    }
    for (let i = 0; i < 5; i++) blobs.push([hx - rx + 6 + i * ((rx * 2 - 12) / 4), hy + 26 - Math.abs(i - 2) * 2, 12])
    blobs.push([hx - rx - 4, hy + 14, 12], [hx + rx + 4, hy + 14, 12])
    return { cap: fullCap, blobs, ears: false, noShine: true }
  }
  if (s === 'afro') {
    const R = rx + 24
    const V = ry + 18
    const cy = hy - 10
    const cap =
      `M${hx - R} ${cy} C${hx - R} ${cy - V * 0.75} ${hx - R * 0.58} ${cy - V} ${hx} ${cy - V} ` +
      `C${hx + R * 0.58} ${cy - V} ${hx + R} ${cy - V * 0.75} ${hx + R} ${cy} ` +
      `C${hx + R} ${hy + 26} ${hx + R * 0.55} ${hy + 40} ${hx} ${hy + 38} C${hx - R * 0.55} ${hy + 40} ${hx - R} ${hy + 26} ${hx - R} ${cy}Z`
    const blobs = []
    for (let i = 0; i <= 20; i++) {
      const t = Math.PI * (0.9 + (i / 20) * 1.2)
      blobs.push([hx + Math.cos(t) * (R - 5), cy + Math.sin(t) * (V - 5), 9.5])
    }
    // soft coily texture
    for (let y = cy - V + 16; y < hy + 30; y += 14)
      for (let x = hx - R + 14 + (Math.round(y) % 28 ? 7 : 0); x < hx + R - 10; x += 16) {
        const e = ((x - hx) / (R - 8)) ** 2 + ((y - cy) / (V - 8)) ** 2
        const j = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
        const jx = (j - Math.floor(j) - 0.5) * 8
        if (e < 1)
          line(front, `M${(x + jx).toFixed(1)} ${(y + jx * 0.5).toFixed(1)} a4 4 0 0 ${jx > 0 ? 1 : 0} 6 ${jx > 0 ? 1 : -1}`, c1, 2, {
            op: 0.35,
          })
      }
    line(front, `M${hx - R + 10} ${hy + 18} Q${hx} ${hy + 44} ${hx + R - 10} ${hy + 18}`, dk, 6, { op: 0.3 })
    return { cap, blobs, blobCurls: false, ears: false, noShine: true, front }
  }
  if (s === 'braids' || s === 'locs') {
    const locs = s === 'locs'
    for (const st of strands(locs ? 8 : 11, locs ? 1.3 : 1.4, locs ? -164 : -142, locs ? 12 : 8.5)) {
      line(back, st.d, c0, st.width)
      if (locs) line(back, st.d, c1, 4, { dash: '1.5 9', op: 0.45 })
      else {
        line(back, st.d, dk, st.width, { dash: '3 5', op: 0.5 })
        line(back, st.d, c1, 3, { dash: '2 6', op: 0.3 })
      }
    }
    if (!locs)
      strands(11, 1.4, -142, 8.5).forEach((st, i) => {
        if (i % 4 === 1) fill(back, dot(st.x1, st.y1 - 6, 4.6), '#e8b73a')
      })
    // parts on the scalp, or locs running from the crown
    if (locs)
      for (const k of [-2, -1, 0, 1, 2])
        line(front, `M${hx + k * 12} ${hy - ry + 4} Q${hx + k * 16} ${hy} ${hx + k * 18} ${hy + ry - 4}`, dk, 3, { op: 0.4 })
    else {
      for (const k of [-0.55, 0, 0.55])
        line(
          front,
          `M${hx + k * rx} ${hy - ry * (1 - Math.abs(k) * 0.5)} Q${hx + k * rx * 1.05} ${hy} ${hx + k * rx * 0.9} ${hy + 30}`,
          dk,
          2,
          {
            op: 0.5,
          },
        )
      for (const y of [hy - 14, hy + 8]) line(front, `M${hx - rx + 6} ${y} Q${hx} ${y + 9} ${hx + rx - 6} ${y}`, dk, 2, { op: 0.45 })
    }
    return { cap: fullCap, ears: false, back, front, noShine: locs, noNeck: true }
  }
  if (s === 'pixie') {
    let tufts = `M${hx - rx + 7} ${hy + 8}`
    const n = 7
    for (let i = 0; i < n; i++) {
      const x = hx - rx + 7 + ((rx * 2 - 14) * (i + 0.5)) / n
      const x2 = hx - rx + 7 + ((rx * 2 - 14) * (i + 1)) / n
      tufts += ` L${x.toFixed(1)} ${hy + 30 - Math.abs(i - 3) * 2} L${x2.toFixed(1)} ${hy + 18}`
    }
    tufts += ` L${hx + rx - 7} ${hy + 4}Z`
    fill(front, tufts, c0)
    fill(
      front,
      `M${hx - rx * 0.75} ${hy - ry * 0.6} C${hx - rx * 0.4} ${hy - ry - 16} ${hx + rx * 0.5} ${hy - ry - 14} ${hx + rx * 0.9} ${hy - ry * 0.5} ` +
        `C${hx + rx * 0.4} ${hy - ry - 2} ${hx - rx * 0.2} ${hy - ry - 3} ${hx - rx * 0.75} ${hy - ry * 0.6}Z`,
      c0,
    )
    line(front, `M${hx - 20} ${hy - 6} q10 14 6 28 M${hx + 4} ${hy - 12} q8 16 4 34 M${hx + 24} ${hy - 6} q4 14 -2 26`, dk, 2.4, {
      op: 0.45,
    })
    return { cap: tight, ears: true, front }
  }
  if (s === 'undercut') {
    fill(
      front,
      `M${hx - rx + 1} ${hy - 4} C${hx - rx - 4} ${hy - ry - 6} ${hx - rx * 0.4} ${hy - ry - 13} ${hx + 2} ${hy - ry - 13} ` +
        `C${hx + rx * 0.6} ${hy - ry - 13} ${hx + rx + 5} ${hy - ry - 4} ${hx + rx} ${hy - 6} C${hx + rx * 0.5} ${hy + 6} ${hx - rx * 0.5} ${hy + 8} ${hx - rx + 1} ${hy - 4}Z`,
      c0,
    )
    line(front, `M${hx - 18} ${hy - ry} q6 22 4 42 M${hx + 4} ${hy - ry - 6} q6 26 2 50 M${hx + 24} ${hy - ry} q2 22 -4 40`, dk, 2.4, {
      op: 0.5,
    })
    return { cap: tight, capOpacity: 0.45, ears: true, front }
  }
  if (s === 'wavy' || s === 'halfup') {
    const drape =
      `M${hx - rx - 5} ${hy + 4}` +
      wave(hx - rx - 5, hy + 4, hx - rx - 16, -128, 4, 8) +
      wave(hx - rx - 16, -128, hx + rx + 16, -128, 5, 0).replace(/Q([\d.-]+) ([\d.-]+)/g, (m, x) => `Q${x} -114`) +
      wave(hx + rx + 16, -128, hx + rx + 5, hy + 4, 4, -8) +
      'Z'
    line(back, `M${hx - 22} -206 q-8 16 0 32 t0 32 t0 26 M${hx + 24} -206 q8 16 0 32 t0 32 t0 26`, dk, 3, { op: 0.45 })
    if (s === 'halfup') {
      line(front, `M${hx - rx + 4} ${hy - 2} Q${hx - 18} ${hy - ry * 0.35} ${hx - 6} ${hy - ry * 0.38}`, dk, 2.5, { op: 0.5 })
      line(front, `M${hx + rx - 4} ${hy - 2} Q${hx + 20} ${hy - ry * 0.35} ${hx + 10} ${hy - ry * 0.38}`, dk, 2.5, { op: 0.5 })
      fill(front, `M${hx - 9} ${hy - ry * 0.42} h22 v6 h-22z`, '#e56b6f')
      fill(front, dot(hx + 2, hy - ry * 0.72, 15), c0)
      line(front, dot(hx + 2, hy - ry * 0.72, 15), dk, 2.5, { op: 0.45 })
      line(front, `M${hx - 7} ${hy - ry * 0.76} a9 9 0 1 1 9 9`, dk, 2.4, { op: 0.6 })
      line(front, `M${hx - 5} ${hy - ry * 0.92} q7 -5 13 0`, c1, 3, { op: 0.6 })
    }
    return { cap: fullCap, ears: false, drape, back, front }
  }
  if (s === 'buns') {
    line(front, `M${hx + 2} ${hy - ry - 2} Q${hx + 3} ${hy} ${hx + 3} ${hy + 26}`, dk, 2.2, { op: 0.45 })
    for (const [bx, by] of [
      [hx - rx * 0.62, hy - ry * 0.8],
      [hx + rx * 0.68, hy - ry * 0.74],
    ]) {
      fill(front, dot(bx, by, 18), c0)
      line(front, `M${bx - 8} ${by - 2} a9 9 0 1 1 9 9`, dk, 2.4, { op: 0.6 })
      line(front, `M${bx - 6} ${by - 10} q7 -5 13 0`, c1, 3, { op: 0.6 })
      line(front, `M${bx - 11} ${by + 13} q11 6 22 0`, '#e56b6f', 4)
    }
    return { cap: tight, ears: true, front }
  }
  if (s === 'sidepart') {
    fill(
      front,
      `M${hx - rx - 5} ${hy - 6} C${hx - rx - 8} ${hy - ry - 4} ${hx - rx * 0.4} ${hy - ry - 14} ${hx + rx * 0.2} ${hy - ry - 10} ` +
        `C${hx - rx * 0.1} ${hy - ry * 0.5} ${hx - rx * 0.5} ${hy - 8} ${hx - rx - 5} ${hy - 6}Z`,
      c0,
    )
    line(
      front,
      `M${hx - rx * 0.32} ${hy - ry - 6} Q${hx - rx * 0.36} ${hy - ry * 0.6} ${hx - rx * 0.3} ${hy - ry * 0.3}`,
      skin.value[1],
      2.4,
    )
    line(
      front,
      `M${hx - 4} ${hy - ry * 0.6} q18 10 30 32 M${hx - 14} ${hy - ry * 0.2} q16 12 24 36 M${hx - 30} ${hy - 10} q10 12 14 32`,
      dk,
      2.4,
      {
        op: 0.45,
      },
    )
    return { cap: shortCap, ears: true, front }
  }
  if (s === 'mohawk') {
    fill(
      front,
      `M${hx - 13} ${hy + 26} L${hx - 15} ${hy - ry + 6} L${hx + 17} ${hy - ry + 6} L${hx + 15} ${hy + 26} Q${hx + 1} ${hy + 31} ${hx - 13} ${hy + 26}Z`,
      c0,
    )
    fill(
      front,
      `M${hx - 15} ${hy - ry + 10} L${hx - 24} ${hy - ry - 14} L${hx - 8} ${hy - ry - 4} L${hx - 4} ${hy - ry - 32} L${hx + 5} ${hy - ry - 7} ` +
        `L${hx + 15} ${hy - ry - 28} L${hx + 15} ${hy - ry - 4} L${hx + 27} ${hy - ry - 12} L${hx + 17} ${hy - ry + 10}Z`,
      c0,
    )
    line(front, `M${hx + 1} ${hy - ry - 4} V${hy + 24}`, dk, 2.4, { op: 0.45 })
    line(front, `M${hx - 8} ${hy - ry - 2} l3 -16 M${hx + 9} ${hy - ry - 2} l4 -14`, c1, 2.5, { op: 0.6 })
    return { cap: tight, capOpacity: 0.3, ears: true, front, noShine: true }
  }
  if (s === 'bald') {
    line(front, `M${hx - rx * 0.5} ${hy - ry * 0.62} Q${hx - rx * 0.05} ${hy - ry - 1} ${hx + rx * 0.45} ${hy - ry * 0.78}`, '#fff', 6, {
      op: 0.16,
    })
    return { cap: null, ears: true, front, noShine: true }
  }
  if (s === 'beanie') {
    for (const k of [-0.6, -0.3, 0, 0.3, 0.6])
      line(
        front,
        `M${hx + k * rx} ${hy - ry - 8 + Math.abs(k) * 14} Q${hx + k * rx * 1.12} ${hy - 20} ${hx + k * rx * 1.08} ${hy + 2}`,
        dk,
        2.5,
        {
          op: 0.35,
        },
      )
    fill(
      front,
      `M${hx - rx - 7} ${hy - 4} Q${hx} ${hy + 6} ${hx + rx + 7} ${hy - 4} L${hx + rx + 6} ${hy + 12} Q${hx} ${hy + 24} ${hx - rx - 6} ${hy + 12}Z`,
      dk,
    )
    for (let i = 1; i < 10; i++) {
      const x = hx - rx - 6 + ((rx * 2 + 12) * i) / 10
      line(front, `M${x.toFixed(1)} ${hy + 1 + Math.abs(i - 5) * -0.6} v12`, c0, 2, { op: 0.35 })
    }
    fill(front, dot(hx + 2, hy - ry - 20, 14), c1)
    line(front, `M${hx - 6} ${hy - ry - 24} l4 4 M${hx + 6} ${hy - ry - 26} l-3 5 M${hx + 2} ${hy - ry - 14} l2 -5`, dk, 2, { op: 0.4 })
    return { cap: dome(16, hy + 8, 5), ears: true, front, noShine: true }
  }
  if (s === 'cap') {
    for (const k of [-0.45, 0.5])
      line(front, `M${hx + 2} ${hy - ry - 9} Q${hx + k * rx * 1.1} ${hy - ry * 0.6} ${hx + k * rx * 1.05} ${hy + 2}`, dk, 2, { op: 0.4 })
    fill(front, dot(hx + 2, hy - ry - 9, 4.5), dk)
    // the brim points back, towards us, and down over the neck
    fill(front, `M${hx - 24} ${hy + 8} C${hx - 30} ${hy + 64} ${hx + 36} ${hy + 64} ${hx + 32} ${hy + 8}Z`, dk)
    fill(front, `M${hx - 24} ${hy + 4} C${hx - 29} ${hy + 57} ${hx + 35} ${hy + 57} ${hx + 32} ${hy + 4}Z`, c0)
    line(front, `M${hx - 17} ${hy + 12} C${hx - 20} ${hy + 46} ${hx + 26} ${hy + 46} ${hx + 25} ${hy + 12}`, c1, 1.6, {
      op: 0.6,
      dash: '3 4',
    })
    line(front, `M${hx - rx - 4} ${hy + 1} Q${hx} ${hy + 10} ${hx + rx + 4} ${hy + 1}`, dk, 3, { op: 0.5 })
    return { cap: dome(10, hy + 2, 4), ears: true, front, noShine: true }
  }
  if (s === 'bandana') {
    for (let y = hy - ry + 2; y < hy + 16; y += 14)
      for (let x = hx - rx + 4 + (Math.round(y - hy) % 28 ? 0 : 7); x < hx + rx; x += 14) {
        const e = ((x - hx) / (rx + 2)) ** 2 + ((y - hy) / (ry + 4)) ** 2
        if (e < 1) fill(front, dot(x, y, 1.8), c1, 0.9)
      }
    fill(
      front,
      `M${hx - 2} ${hy + 16} Q${hx - 16} ${hy + 34} ${hx - 12} ${hy + 50} L${hx - 1} ${hy + 46} Q${hx - 2} ${hy + 30} ${hx + 5} ${hy + 18}Z`,
      c0,
    )
    fill(
      front,
      `M${hx + 8} ${hy + 16} Q${hx + 22} ${hy + 30} ${hx + 24} ${hy + 44} L${hx + 14} ${hy + 44} Q${hx + 12} ${hy + 30} ${hx + 3} ${hy + 18}Z`,
      dk,
    )
    fill(front, dot(hx + 4, hy + 15, 8.5), dk)
    return { cap: dome(7, hy + 8, 3), ears: true, front, noShine: true }
  }
  if (s === 'hijab') {
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
const ear = computed(() => ({ r: [hx + g.value.rx + 1, hy + 15], l: [hx - g.value.rx + 2, hy + 15] }))
</script>
<template>
  <g class="av" :class="{ 'av-still': still }" :data-hair="a.hair">
    <defs>
      <clipPath :id="uid + '-torso'"><path :d="g.torso" /></clipPath>
    </defs>

    <!-- notebook on the desk, under the writing hand -->
    <g v-if="!bare">
      <path :d="`M${g.sw - 38} -126 L${g.sw - 30} -154 L${g.sw + 70} -154 L${g.sw + 64} -126Z`" fill="#6c5a8e" />
      <path :d="`M${g.sw - 34} -129 L${g.sw - 27} -153 L${g.sw + 16} -153 L${g.sw + 13} -129Z`" fill="#fbf6ec" />
      <path :d="`M${g.sw + 13} -129 L${g.sw + 16} -153 L${g.sw + 66} -153 L${g.sw + 61} -129Z`" fill="#f1e9da" />
      <path :d="`M${g.sw + 24} -146 h30 M${g.sw + 23} -141 h32 M${g.sw + 22} -136 h24`" stroke="#9a8fb5" stroke-width="1.6" opacity=".7" />
      <path class="av-page" :d="`M${g.sw + 13} -129 L${g.sw + 16} -153 L${g.sw + 66} -153 L${g.sw + 61} -129Z`" fill="#fffaf0" />
    </g>

    <g class="av-breathe">
      <!-- forearms resting on the desk, in front of the body (so mostly hidden by it) -->
      <g v-for="(arm, i) in [g.armL, g.armR]" :key="'f' + i" :class="i ? 'av-write' : ''">
        <path :d="seg(arm[1], arm[2])" :stroke="tp.short ? skin[0] : tp.sleeveD" stroke-width="26" stroke-linecap="round" />
        <circle v-if="!tp.short" :cx="lerp(arm[1], arm[2], 0.8)[0]" :cy="lerp(arm[1], arm[2], 0.8)[1]" r="12.5" :fill="tp.cuff" />
        <circle :cx="arm[2][0] + 1" :cy="arm[2][1] - 3" r="10" :fill="skin[0]" />
        <line
          v-if="i && !bare"
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
      <path :d="g.torso" :fill="tp.body" />
      <g :clip-path="`url(#${uid}-torso)`">
        <template v-if="a.top === 'stripes'">
          <path
            v-for="y in [-192, -174, -156, -138, -120, -102, -84, -66, -48, -30, -12]"
            :key="y"
            :d="`M-100 ${y} H100`"
            :stroke="tp.c0"
            stroke-width="7"
          />
        </template>
        <template v-if="a.top === 'flannel'">
          <path v-for="x in [-66, -34, -2, 30, 62]" :key="'v' + x" :d="`M${x} -214 V10`" :stroke="topDD" stroke-width="12" opacity=".38" />
          <path
            v-for="y in [-194, -162, -130, -98, -66, -34, -2]"
            :key="'h' + y"
            :d="`M-100 ${y} H100`"
            :stroke="topDD"
            stroke-width="12"
            opacity=".32"
          />
          <path v-for="x in [-50, -18, 14, 46]" :key="'lv' + x" :d="`M${x} -214 V10`" stroke="#fff" stroke-width="1.6" opacity=".22" />
          <path
            v-for="y in [-178, -146, -114, -82, -50, -18]"
            :key="'lh' + y"
            :d="`M-100 ${y} H100`"
            stroke="#fff"
            stroke-width="1.6"
            opacity=".2"
          />
        </template>
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
        <template v-if="a.top === 'jacket'">
          <path :d="`M${-g.sw} -176 Q0 -166 ${g.sw} -176`" :stroke="topDD" stroke-width="2.5" fill="none" opacity=".6" />
          <path
            :d="`M${-g.sw} -170 Q0 -160 ${g.sw} -170`"
            stroke="#e8c46a"
            stroke-width="1.6"
            stroke-dasharray="3 4"
            fill="none"
            opacity=".55"
          />
          <path d="M-22 -168 V0 M24 -168 V0" :stroke="topDD" stroke-width="2.2" opacity=".45" />
          <path d="M-17 -164 V-18 M19 -164 V-18" stroke="#e8c46a" stroke-width="1.4" stroke-dasharray="3 4" opacity=".5" />
          <rect :x="-g.ww - 10" y="-18" :width="g.ww * 2 + 20" height="26" :fill="topDD" opacity=".45" />
        </template>
        <template v-if="a.top === 'varsity'">
          <rect :x="-g.ww - 10" y="-20" :width="g.ww * 2 + 20" height="28" :fill="top[1]" />
          <path d="M-80 -13 H80 M-80 -6 H80" :stroke="CREAM" stroke-width="2.5" />
          <path
            d="M-12 -152 h30 v10 h-19 v7 h15 v10 h-15 v17 h-11z"
            :fill="luma(top[0]) > 0.7 ? '#34466e' : CREAM"
            :stroke="top[1]"
            stroke-width="3"
            stroke-linejoin="round"
            paint-order="stroke"
          />
        </template>
        <template v-if="a.top === 'kurta'">
          <path
            :d="`M${-g.neck - 12} -201 Q0 -182 ${g.neck + 12} -201`"
            stroke="#ecc66a"
            stroke-width="3.2"
            stroke-linecap="round"
            stroke-dasharray="0.1 6.5"
            fill="none"
          />
          <path d="M1 -186 V-120" stroke="#ecc66a" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.1 6.5" />
        </template>
      </g>
      <!-- necklines and collars -->
      <path
        v-if="a.top === 'sweater' || a.top === 'kurta'"
        :d="`M${-g.neck - 6} -207 Q0 -196 ${g.neck + 6} -207`"
        :stroke="top[1]"
        :stroke-width="a.top === 'kurta' ? 7 : 8"
        fill="none"
        stroke-linecap="round"
      />
      <path
        v-if="tp.short"
        :d="`M${-g.neck - 4} -207 Q0 -199 ${g.neck + 4} -207`"
        :stroke="a.top === 'stripes' ? tp.c0 : top[1]"
        stroke-width="4"
        fill="none"
        stroke-linecap="round"
      />
      <template v-if="a.top === 'varsity'">
        <path
          :d="`M${-g.neck - 6} -207 Q0 -196 ${g.neck + 6} -207`"
          :stroke="top[1]"
          stroke-width="10"
          fill="none"
          stroke-linecap="round"
        />
        <path :d="`M${-g.neck - 6} -205 Q0 -194 ${g.neck + 6} -205`" :stroke="CREAM" stroke-width="2" fill="none" stroke-linecap="round" />
      </template>
      <path
        v-if="a.top === 'flannel' || a.top === 'jacket'"
        :d="
          a.top === 'jacket'
            ? `M${-g.neck - 24} -203 Q0 -184 ${g.neck + 26} -203 L${g.neck + 14} -219 Q0 -206 ${-g.neck - 12} -219Z`
            : `M${-g.neck - 12} -206 Q0 -190 ${g.neck + 12} -206 L${g.neck + 6} -215 Q0 -204 ${-g.neck - 6} -215Z`
        "
        :fill="a.top === 'jacket' ? top[1] : topDD"
      />

      <!-- upper arms -->
      <g v-for="(arm, i) in [g.armL, g.armR]" :key="'u' + i">
        <path :d="seg(arm[0], arm[1])" :stroke="topDD" stroke-width="34" stroke-linecap="round" opacity=".35" />
        <path :d="seg(arm[0], arm[1])" :stroke="tp.short ? skin[0] : tp.sleeve" stroke-width="30" stroke-linecap="round" />
        <path
          v-if="a.top === 'flannel'"
          :d="seg(arm[0], arm[1])"
          :stroke="topDD"
          stroke-width="30"
          stroke-dasharray="10 22"
          opacity=".35"
        />
        <template v-if="tp.short">
          <path :d="seg(arm[0], lerp(arm[0], arm[1], 0.5))" :stroke="tp.body" stroke-width="34" stroke-linecap="round" />
          <path
            v-if="a.top === 'stripes'"
            :d="seg(arm[0], lerp(arm[0], arm[1], 0.5))"
            :stroke="tp.c0"
            stroke-width="34"
            stroke-dasharray="7 11"
          />
        </template>
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
      <!-- turtleneck collar, rolled around the neck -->
      <g v-if="a.top === 'turtleneck'">
        <rect :x="hx - g.neck - 12" y="-238" :width="g.neck * 2 + 24" height="36" rx="11" :fill="top[1]" />
        <path
          v-for="k in 6"
          :key="k"
          :d="`M${hx - g.neck - 12 + ((g.neck * 2 + 24) * k) / 7} -234 v28`"
          :stroke="topDD"
          stroke-width="2"
          opacity=".35"
        />
      </g>

      <!-- hair or head covering falling over the back -->
      <path v-if="hair.drape" :d="hair.drape" :fill="hairC[0]" />
      <path
        v-for="(p, i) in hair.back || []"
        :key="'hb' + i"
        :d="p.d"
        :fill="p.fill"
        :stroke="p.stroke"
        :stroke-width="p.sw"
        :stroke-dasharray="p.dash"
        :opacity="p.op"
        stroke-linecap="round"
      />
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
          <rect
            v-if="!hair.drape && !hair.noNeck && a.top !== 'turtleneck'"
            :x="hx - g.neck"
            :y="hy + 20"
            :width="g.neck * 2"
            height="40"
            rx="6"
            :fill="skin[1]"
          />
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
            <path v-if="hair.cap" :d="hair.cap" :fill="hairC[0]" :opacity="hair.capOpacity || 1" />
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
              <template v-if="hair.blobCurls !== false">
                <path
                  v-for="(c, i) in hair.blobs.filter((_, k) => k % 3 === 1)"
                  :key="'c' + i"
                  :d="`M${c[0] - 5} ${c[1]} a5 5 0 1 1 5 5`"
                  :stroke="hairC[1]"
                  stroke-width="2.5"
                  fill="none"
                  opacity=".7"
                />
              </template>
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
              v-if="!hair.noShine"
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
            <path
              v-for="(p, i) in hair.front || []"
              :key="'hf' + i"
              :d="p.d"
              :fill="p.fill"
              :stroke="p.stroke"
              :stroke-width="p.sw"
              :stroke-dasharray="p.dash"
              :opacity="p.op"
              stroke-linecap="round"
              stroke-linejoin="round"
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

          <!-- earrings, where the ears show -->
          <g v-if="hair.ears && a.earrings !== 'none'">
            <template v-for="(p, k) in [ear.r, ear.l]" :key="k">
              <circle v-if="a.earrings === 'studs'" :cx="p[0]" :cy="p[1]" :r="k ? 2.2 : 2.8" :fill="EARRING.gold" />
              <circle
                v-else-if="a.earrings === 'hoops'"
                :cx="p[0]"
                :cy="p[1] + 6"
                :r="k ? 5 : 6.5"
                fill="none"
                :stroke="EARRING.gold"
                stroke-width="2.2"
              />
              <g v-else>
                <path :d="`M${p[0]} ${p[1]} v6`" :stroke="EARRING.gold" stroke-width="1.6" />
                <circle :cx="p[0]" :cy="p[1] + 9" :r="k ? 2.8 : 3.6" :fill="EARRING.pearl" />
              </g>
            </template>
          </g>

          <!-- glasses: the temple arms and the edge of the frame -->
          <g v-if="a.glasses" :stroke="specs.c" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path :d="`M${hx + g.rx - 16} ${hy - 3} L${hx + g.rx + 5} ${hy - 7}`" :stroke-width="specs.w" />
            <path :d="`M${hx - g.rx + 14} ${hy - 3} L${hx - g.rx - 4} ${hy - 7}`" :stroke-width="specs.w - 0.2" />
            <path v-if="a.glassesStyle === 'round'" :d="`M${hx + g.rx + 3} ${hy - 21} a7 9 0 0 1 0 18`" stroke-width="2.4" />
            <path v-else-if="a.glassesStyle === 'square'" :d="`M${hx + g.rx + 2} ${hy - 20} h5 v18 h-5`" stroke-width="3.6" />
            <path v-else :d="`M${hx + g.rx + 5} ${hy - 16} v16`" :stroke-width="specs.w + 0.3" />
            <path
              v-if="specs.spots"
              :d="`M${hx + g.rx - 14} ${hy - 3.5} L${hx + g.rx + 4} ${hy - 7} M${hx + g.rx + 5} ${hy - 16} v16`"
              :stroke="specs.spots"
              stroke-width="2"
              stroke-dasharray="2 5"
            />
          </g>
          <g v-if="a.headphones">
            <path
              :d="`M${hx - g.rx - 6} ${hy + 2} C${hx - g.rx - 8} ${hy - g.ry - 24} ${hx + g.rx + 8} ${hy - g.ry - 24} ${hx + g.rx + 6} ${hy + 2}`"
              :stroke="phones[0]"
              stroke-width="9"
              fill="none"
              stroke-linecap="round"
            />
            <path
              :d="`M${hx - g.rx * 0.45} ${hy - g.ry * 0.75 - 13} Q${hx} ${hy - g.ry * 0.75 - 21} ${hx + g.rx * 0.45} ${hy - g.ry * 0.75 - 13}`"
              stroke="#fff"
              stroke-width="2.5"
              fill="none"
              opacity=".25"
              stroke-linecap="round"
            />
            <ellipse :cx="hx - g.rx - 5" :cy="hy + 6" rx="10" ry="16" :fill="phones[0]" />
            <ellipse :cx="hx + g.rx + 5" :cy="hy + 6" rx="12" ry="18" :fill="phones[0]" />
            <ellipse :cx="hx + g.rx + 7" :cy="hy + 6" rx="8" ry="13" :fill="phones[1]" />
          </g>
        </g>
      </g>
    </g>

    <!-- chair -->
    <g v-if="!bare">
      <path d="M-48 12 L-50 140 M48 12 L50 140" :stroke="w.xd" stroke-width="10" stroke-linecap="round" />
      <path d="M-66 12 L-71 172 M66 12 L71 172" :stroke="w.d" stroke-width="12" stroke-linecap="round" />
      <path d="M-68 112 H68" :stroke="w.d" stroke-width="7" />
      <rect x="-84" y="-6" width="168" height="22" rx="8" :fill="w.n" />
      <rect x="-84" y="-6" width="168" height="8" rx="4" :fill="w.l" />
      <rect x="-46" y="-40" width="10" height="40" :fill="w.d" />
      <rect x="36" y="-40" width="10" height="40" :fill="w.d" />
      <path d="M-84 16 L-92 4 L-92 -8 L-84 -6Z" :fill="w.dd" />
      <rect x="-70" y="-100" width="124" height="70" rx="24" fill="#94503b" />
      <rect x="-62" y="-104" width="124" height="72" rx="24" fill="#c56a4f" />
      <rect x="-62" y="-104" width="124" height="72" rx="24" fill="url(#av-chair-shine)" />
      <path d="M-44 -68 H44" stroke="#a9543d" stroke-width="3" stroke-linecap="round" opacity=".6" />
      <circle cx="-22" cy="-68" r="3" fill="#a9543d" />
      <circle cx="22" cy="-68" r="3" fill="#a9543d" />
    </g>
    <defs v-if="!bare">
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
.av-still .av-breathe,
.av-still .av-tilt,
.av-still .av-tail,
.av-still .av-write,
.av-still .av-page {
  animation: none;
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
