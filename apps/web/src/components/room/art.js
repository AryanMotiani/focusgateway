// Drawings for every placeable decor item, keyed by the catalog id in
// packages/core/src/unlocks.js. Each drawing is SVG markup in a local box from (0, 0) to
// (w, h) of the catalog entry: the bottom middle (w / 2, h) touches the surface.
//   svg:  the item, lit by the room lighting
//   glow: optional light it gives off (bulbs, flames, screens), drawn unlit on top
//   flat: lies on the floor (rugs), drawn under everything else and without a shadow
// Animated parts use the sr-* classes defined in StudyRoom.vue.
import { C } from './palette.js'

const range = (n) => Array.from({ length: n }, (_, i) => i)
const wallShadow = (x, y, w, h, r = 4) =>
  `<rect x="${x + 4}" y="${y + 5}" width="${w}" height="${h}" rx="${r}" fill="${C.shadow}" opacity=".16"/>`
const pot = (x, y, w, h, fill = C.pot, dark = C.potD) =>
  `<path d="M${x} ${y} h${w} l-${w * 0.1} ${h} h-${w * 0.8} z" fill="${fill}"/>` +
  `<path d="M${x + w * 0.62} ${y} h${w * 0.38} l-${w * 0.1} ${h} h-${w * 0.3} z" fill="${dark}" opacity=".55"/>` +
  `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${Math.max(5, h * 0.2)}" rx="2" fill="${fill}"/>` +
  `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${Math.max(5, h * 0.2)}" rx="2" fill="#fff" opacity=".12"/>`
const leaf = (cx, cy, rx, ry, rot, fill) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="${fill}"/>`

// ---- books, used by a few items
const BOOK_COLORS = [C.blue, C.red, C.mustard, C.teal, C.pink, C.purple, C.leaf, C.navy, C.cream]
function bookRow(x0, base, maxW, seed = 1) {
  let r = seed
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647
  let x = x0
  let out = ''
  let i = 0
  while (x < x0 + maxW - 10) {
    const w = 9 + Math.round(rnd() * 8)
    const h = 44 + Math.round(rnd() * 26)
    const c = BOOK_COLORS[(i * 3 + seed) % BOOK_COLORS.length]
    if (i === 4 && maxW > 90) {
      // one book leaning on its neighbour
      out += `<g transform="rotate(18 ${x} ${base})"><rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="1.5" fill="${c}"/><rect x="${x}" y="${base - h + 8}" width="${w}" height="3" fill="#fff" opacity=".35"/></g>`
      x += w + 14
    } else {
      out += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="1.5" fill="${c}"/>`
      out += `<rect x="${x + w - 3}" y="${base - h}" width="3" height="${h}" fill="#000" opacity=".12"/>`
      out += `<rect x="${x}" y="${base - h + 8}" width="${w}" height="3" fill="#fff" opacity=".35"/>`
      out += `<rect x="${x}" y="${base - 12}" width="${w}" height="3" fill="#fff" opacity=".25"/>`
      x += w + 1
    }
    i++
  }
  return out
}

function clockTicks() {
  return range(12)
    .map((i) => {
      const a = (i / 12) * Math.PI * 2
      const big = i % 3 === 0
      const r = big ? 21 : 22
      const x = 37 + Math.sin(a) * r
      const y = 37 - Math.cos(a) * r
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${big ? 2.4 : 1.3}" fill="${C.ink}"/>`
    })
    .join('')
}

function lightsString(w, sag, bulbs) {
  const pts = range(bulbs).map((i) => {
    const t = (i + 0.5) / bulbs
    const x = 8 + t * (w - 16)
    const y = 10 + Math.sin(t * Math.PI * 2) * 0 + (1 - (2 * t - 1) ** 2) * sag + (i % 2 ? 3 : 0)
    return [x, y]
  })
  return pts
}
const LIGHT_COLORS = ['#ffd27a', '#ff9fb3', '#9fd6ff', '#b8ffb0', '#ffcf8a']
const lightPts = lightsString(380, 34, 14)

export const ART = {
  'obj-clock': {
    svg:
      `<circle cx="41" cy="42" r="34" fill="${C.shadow}" opacity=".15"/>` +
      `<circle cx="37" cy="37" r="35" fill="${C.woodD}"/><circle cx="37" cy="37" r="31" fill="${C.wood}"/>` +
      `<circle cx="37" cy="37" r="27" fill="${C.paper}"/>` +
      clockTicks() +
      `<line x1="37" y1="37" x2="27" y2="30" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>` +
      `<g class="sr-clock"><circle cx="37" cy="37" r="24" fill="none"/><line x1="37" y1="39" x2="37" y2="17" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/></g>` +
      `<circle cx="37" cy="37" r="3" fill="${C.red}"/>` +
      `<path d="M16 22 A26 26 0 0 1 36 11" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>`,
  },
  'obj-poster-wave': {
    svg:
      wallShadow(4, 4, 112, 152, 2) +
      `<rect x="4" y="4" width="112" height="152" rx="2" fill="${C.paper}"/>` +
      `<rect x="12" y="12" width="96" height="112" fill="#f7d9b8"/>` +
      `<circle cx="78" cy="48" r="16" fill="#f2966b"/>` +
      `<path d="M12 84 q12 -12 24 0 t24 0 t24 0 t24 0 V124 H12z" fill="#7fb2d6"/>` +
      `<path d="M12 98 q12 -12 24 0 t24 0 t24 0 t24 0 V124 H12z" fill="${C.blue}"/>` +
      `<path d="M12 112 q12 -10 24 0 t24 0 t24 0 t24 0 V124 H12z" fill="${C.blueD}"/>` +
      `<rect x="22" y="134" width="50" height="5" rx="2" fill="${C.ink}" opacity=".7"/><rect x="22" y="143" width="32" height="4" rx="2" fill="${C.ink}" opacity=".35"/>` +
      `<rect x="46" y="0" width="28" height="10" fill="#f3e3a6" opacity=".85" transform="rotate(-4 60 5)"/>`,
  },
  'obj-books-row': { svg: bookRow(4, 84, 116, 3) },
  'obj-pencup': {
    svg:
      `<rect x="11" y="4" width="4" height="34" fill="${C.mustard}" transform="rotate(-10 13 30)"/><path d="M10.4 4.6 l2.6 -4.6 l2.2 4.8z" fill="${C.creamD}" transform="rotate(-10 13 30)"/>` +
      `<rect x="18" y="8" width="4" height="32" fill="${C.blue}" transform="rotate(6 20 30)"/><rect x="18" y="4" width="4" height="6" fill="${C.navy}" transform="rotate(6 20 30)"/>` +
      `<rect x="23" y="2" width="6" height="36" fill="${C.pink}" transform="rotate(14 26 30)"/>` +
      `<rect x="4" y="26" width="28" height="32" rx="5" fill="${C.teal}"/><rect x="21" y="26" width="11" height="32" rx="5" fill="${C.tealD}" opacity=".6"/>` +
      `<rect x="4" y="26" width="28" height="5" rx="2" fill="#fff" opacity=".2"/>`,
  },
  'obj-succulent': {
    svg:
      pot(9, 30, 28, 18) +
      leaf(23, 22, 6, 11, 0, C.leafD) +
      leaf(15, 25, 5, 10, -40, C.leaf) +
      leaf(31, 25, 5, 10, 40, C.leaf) +
      leaf(10, 29, 4, 8, -70, C.leafL) +
      leaf(36, 29, 4, 8, 70, C.leafL) +
      leaf(23, 25, 4, 8, 0, C.leafL),
  },
  'obj-rug-round': {
    flat: true,
    svg:
      `<ellipse cx="230" cy="32" rx="230" ry="32" fill="#b56d63"/>` +
      `<ellipse cx="230" cy="32" rx="210" ry="27" fill="none" stroke="${C.cream}" stroke-width="4" stroke-dasharray="14 8"/>` +
      `<ellipse cx="230" cy="32" rx="160" ry="19" fill="#c98476"/>` +
      `<ellipse cx="230" cy="32" rx="96" ry="11" fill="none" stroke="${C.mustard}" stroke-width="3"/>`,
  },
  'obj-mug': {
    svg:
      `<g class="sr-steam" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"><path d="M15 16 q-5 -6 0 -11 q4 -4 0 -8"/><path d="M25 14 q-5 -6 0 -10"/></g>` +
      `<path d="M31 25 h5 a8 8 0 0 1 0 16 h-5" fill="none" stroke="${C.cream}" stroke-width="5"/>` +
      `<rect x="4" y="18" width="30" height="32" rx="6" fill="${C.cream}"/><rect x="22" y="18" width="12" height="32" rx="6" fill="${C.creamD}" opacity=".7"/>` +
      `<rect x="4" y="30" width="30" height="6" fill="${C.red}" opacity=".85"/>` +
      `<ellipse cx="19" cy="19.5" rx="13" ry="2.4" fill="#6b4230"/>`,
  },
  'obj-plant': {
    svg:
      `<path d="M26 50 V18" stroke="${C.leafD}" stroke-width="3"/>` +
      leaf(14, 38, 13, 6, -30, C.leaf) +
      leaf(38, 34, 13, 6, 30, C.leaf) +
      leaf(16, 22, 11, 5, -40, C.leafL) +
      leaf(36, 20, 11, 5, 40, C.leafL) +
      leaf(26, 10, 5, 10, 0, C.leafL) +
      pot(12, 50, 28, 26),
  },
  'obj-corkboard': {
    svg:
      wallShadow(2, 2, 156, 106) +
      `<rect x="2" y="2" width="156" height="106" rx="4" fill="${C.woodD}"/><rect x="9" y="9" width="142" height="92" rx="2" fill="#c99a63"/>` +
      range(24)
        .map((i) => `<circle cx="${14 + ((i * 37) % 136)}" cy="${14 + ((i * 53) % 84)}" r="1.4" fill="${C.woodD}" opacity=".45"/>`)
        .join('') +
      `<g transform="rotate(-6 36 40)"><rect x="18" y="22" width="36" height="36" fill="#f6e27d"/><rect x="24" y="32" width="22" height="2.5" fill="${C.ink}" opacity=".4"/><rect x="24" y="39" width="16" height="2.5" fill="${C.ink}" opacity=".4"/></g>` +
      `<g transform="rotate(5 82 56)"><rect x="64" y="30" width="38" height="46" fill="#fff"/><rect x="68" y="34" width="30" height="30" fill="${C.sky}"/><path d="M68 64 l10 -12 l8 7 l5 -5 l7 10z" fill="${C.leaf}"/></g>` +
      `<g transform="rotate(-3 128 58)"><rect x="112" y="40" width="34" height="34" fill="${C.pink}"/><path d="M118 52 l5 5 l10 -11" stroke="#fff" stroke-width="3" fill="none"/></g>` +
      `<circle cx="36" cy="25" r="3.5" fill="${C.red}"/><circle cx="83" cy="33" r="3.5" fill="${C.blue}"/><circle cx="129" cy="43" r="3.5" fill="${C.leafD}"/>`,
  },
  'obj-photo': {
    svg:
      wallShadow(2, 2, 70, 86, 3) +
      `<rect x="2" y="2" width="70" height="86" rx="3" fill="${C.ink}"/><rect x="8" y="8" width="58" height="74" fill="${C.paper}"/>` +
      `<rect x="15" y="15" width="44" height="52" fill="#f3c9a8"/><circle cx="46" cy="30" r="7" fill="#fff4d6"/>` +
      `<path d="M15 67 V52 q10 -10 22 -2 q10 -8 22 0 V67z" fill="${C.leaf}"/><path d="M15 67 V58 q14 -6 44 2 V67z" fill="${C.leafD}"/>`,
  },
  'obj-lamp': {
    svg:
      `<ellipse cx="54" cy="127" rx="22" ry="5" fill="${C.ink}"/><rect x="34" y="118" width="40" height="10" rx="4" fill="${C.teal}"/>` +
      `<path d="M54 120 L40 70 L62 30" stroke="${C.tealD}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="40" cy="70" r="5" fill="${C.teal}"/><circle cx="62" cy="30" r="5" fill="${C.teal}"/>` +
      `<path d="M62 22 L34 8 L10 44 L40 58 Z" fill="${C.teal}"/><path d="M62 22 L40 58 L34 55 L56 20Z" fill="${C.tealD}" opacity=".5"/>`,
    glow:
      `<path d="M10 44 L40 58 L58 132 L-14 132 Z" fill="#ffd89a" opacity=".1"/><path d="M16 48 L36 56 L44 132 L2 132 Z" fill="#ffe3b0" opacity=".12"/>` +
      `<ellipse cx="25" cy="52" rx="15" ry="6" transform="rotate(25 25 52)" fill="#fff1c4"/>`,
  },
  'obj-poster-moon': {
    svg:
      wallShadow(4, 4, 112, 152, 2) +
      `<rect x="4" y="4" width="112" height="152" rx="2" fill="${C.paper}"/>` +
      `<rect x="12" y="12" width="96" height="120" fill="${C.navy}"/>` +
      `<circle cx="60" cy="58" r="26" fill="#f6e7b8"/><circle cx="72" cy="50" r="24" fill="${C.navy}"/>` +
      range(9)
        .map(
          (i) => `<circle cx="${18 + ((i * 29) % 86)}" cy="${18 + ((i * 41) % 70)}" r="${i % 3 ? 1.3 : 2.2}" fill="#fff" opacity=".85"/>`,
        )
        .join('') +
      `<path d="M12 132 L40 100 L58 116 L78 92 L108 132 Z" fill="#232c4d"/>` +
      `<rect x="34" y="140" width="52" height="5" rx="2" fill="${C.ink}" opacity=".6"/>`,
  },
  'obj-cat': {
    svg:
      `<g class="sr-breathe">` +
      `<path d="M100 40 q14 4 8 14 q-6 4 -30 2" stroke="#5d5870" stroke-width="9" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="62" cy="38" rx="42" ry="18" fill="#6f6a82"/>` +
      `<ellipse cx="62" cy="44" rx="30" ry="9" fill="#8c87a0"/>` +
      `<path d="M44 24 q10 -6 22 -2 M58 22 q8 -4 16 0" stroke="#5d5870" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<circle cx="26" cy="38" r="16" fill="#6f6a82"/>` +
      `<path d="M13 30 L14 14 L24 24 Z M28 23 L38 13 L39 29 Z" fill="#6f6a82"/><path d="M16 26 L16.5 18 L21 24Z" fill="${C.pink}" opacity=".7"/>` +
      `<path d="M17 38 q3 3 6 0 M28 38 q3 3 6 0" stroke="${C.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<circle cx="25.5" cy="43" r="1.6" fill="${C.pink}"/>` +
      `<ellipse cx="42" cy="52" rx="10" ry="4" fill="#8c87a0"/>` +
      `</g>`,
  },
  'obj-laptop': {
    svg:
      `<rect x="16" y="2" width="118" height="80" rx="6" fill="#c9c6d3"/><rect x="16" y="2" width="118" height="80" rx="6" fill="#fff" opacity=".12"/>` +
      `<rect x="96" y="2" width="38" height="80" rx="6" fill="#a9a5b8" opacity=".55"/>` +
      `<circle cx="75" cy="40" r="9" fill="#e9e6ef"/><path d="M75 34 q5 4 0 12 q-5 -4 0 -12" fill="${C.leaf}"/>` +
      `<rect x="30" y="58" width="16" height="12" rx="3" fill="${C.pink}" transform="rotate(-10 38 64)"/>` +
      `<path d="M112 16 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-6 3 l1 -6 l-4 -4 l6 -1z" fill="${C.mustard}"/>` +
      `<path d="M6 82 H144 L140 92 H10 Z" fill="#9f9bb0"/>`,
    glow: `<rect x="20" y="-2" width="110" height="4" rx="2" fill="#bcd4ff" opacity=".5"/><ellipse cx="75" cy="0" rx="62" ry="5" fill="#9fc0ff" opacity=".15"/>`,
  },
  'obj-plant-2': {
    svg:
      [
        [60, 20, 0, C.leafD],
        [42, 44, -12, C.leaf],
        [78, 40, 12, C.leaf],
        [28, 76, -24, C.leafD],
        [94, 70, 22, C.leafD],
        [52, 60, -5, C.leafL],
        [70, 64, 6, C.leaf],
      ]
        .map(
          ([x, top, rot, c]) =>
            `<path d="M${x - 9} 170 Q${x - 12} ${(170 + top) / 2} ${x} ${top} Q${x + 12} ${(170 + top) / 2} ${x + 9} 170 Z" fill="${c}" transform="rotate(${rot} ${x} 170)"/>` +
            `<path d="M${x - 5} ${top + 60} q5 -4 10 0 M${x - 6} ${top + 90} q6 -4 12 0" stroke="#d9e8b0" stroke-width="2" fill="none" opacity=".5" transform="rotate(${rot} ${x} 170)"/>`,
        )
        .join('') +
      `<path d="M26 166 H94 L86 230 H34 Z" fill="${C.cream}"/><path d="M68 166 H94 L86 230 H66 Z" fill="${C.creamD}"/>` +
      `<rect x="22" y="160" width="76" height="12" rx="4" fill="${C.cream}"/><rect x="30" y="192" width="60" height="4" fill="${C.teal}" opacity=".6"/>`,
  },
  'obj-beanbag': {
    svg:
      `<path d="M14 118 C-6 96 8 40 60 26 C88 18 120 20 150 30 C196 46 206 96 186 118 Z" fill="${C.mustard}"/>` +
      `<path d="M120 22 C150 26 196 46 190 118 H150 C170 90 160 50 120 22 Z" fill="${C.mustardD}" opacity=".6"/>` +
      `<path d="M50 64 C80 50 120 52 150 66 C130 78 80 80 50 64 Z" fill="${C.mustardD}" opacity=".7"/>` +
      `<path d="M78 70 C70 88 70 104 74 118 M126 70 C134 88 134 104 130 118" stroke="${C.mustardD}" stroke-width="2.5" fill="none" opacity=".55"/>` +
      `<path d="M40 44 q20 -12 46 -14" stroke="#fff" stroke-width="5" opacity=".3" fill="none" stroke-linecap="round"/>`,
  },
  'obj-books': {
    svg:
      `<rect x="4" y="50" width="68" height="14" rx="2" fill="${C.blue}"/><rect x="4" y="50" width="68" height="3" fill="#fff" opacity=".3"/>` +
      `<rect x="10" y="37" width="58" height="13" rx="2" fill="${C.red}"/><rect x="10" y="37" width="58" height="3" fill="#fff" opacity=".3"/>` +
      `<rect x="6" y="24" width="60" height="13" rx="2" fill="${C.mustard}"/><rect x="6" y="24" width="60" height="3" fill="#fff" opacity=".3"/>` +
      `<rect x="14" y="12" width="46" height="12" rx="2" fill="${C.teal}"/><rect x="14" y="12" width="46" height="3" fill="#fff" opacity=".3"/>` +
      `<path d="M50 12 v12 l3 -3 l3 3 v-12z" fill="${C.pink}"/>` +
      `<rect x="62" y="37" width="6" height="13" fill="${C.cream}"/><rect x="66" y="24" width="0" height="13"/>`,
  },
  'obj-record': {
    svg:
      `<rect x="4" y="36" width="116" height="34" rx="4" fill="${C.woodD}"/><rect x="4" y="36" width="116" height="8" rx="3" fill="${C.wood}"/>` +
      `<ellipse cx="52" cy="36" rx="44" ry="10" fill="#26222c"/><ellipse cx="52" cy="36" rx="30" ry="6.5" fill="none" stroke="#3b3542" stroke-width="1.5"/>` +
      `<ellipse cx="52" cy="36" rx="10" ry="2.8" fill="${C.red}"/>` +
      `<path d="M104 30 L100 20 L74 32" stroke="${C.metal}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="104" cy="31" r="5" fill="${C.metalD}"/>` +
      `<circle cx="96" cy="56" r="4" fill="${C.cream}"/><circle cx="108" cy="56" r="4" fill="${C.cream}"/>`,
  },
  'obj-poster-peaks': {
    svg:
      wallShadow(4, 4, 112, 152, 2) +
      `<rect x="4" y="4" width="112" height="152" rx="2" fill="${C.paper}"/>` +
      `<rect x="12" y="12" width="96" height="120" fill="#f4c7b4"/><circle cx="60" cy="50" r="18" fill="#fbe7c6"/>` +
      `<path d="M12 104 L42 56 L60 80 L78 50 L108 104 V132 H12Z" fill="${C.teal}"/>` +
      `<path d="M42 56 L50 69 L44 66 L38 72 L35 67Z M78 50 L87 64 L80 61 L74 66 L71 61Z" fill="#fff" opacity=".85"/>` +
      `<path d="M12 132 V112 q24 -10 48 0 t48 0 V132Z" fill="${C.tealD}"/>` +
      range(5)
        .map((i) => `<path d="M${20 + i * 20} 132 l7 -22 l7 22z" fill="#2f5f5c"/>`)
        .join('') +
      `<rect x="30" y="140" width="60" height="5" rx="2" fill="${C.ink}" opacity=".6"/>`,
  },
  'obj-lights': {
    svg:
      `<circle cx="8" cy="8" r="3" fill="${C.metalD}"/><circle cx="372" cy="8" r="3" fill="${C.metalD}"/>` +
      `<path d="M8 8 ${lightPts.map(([x, y]) => `L${x.toFixed(0)} ${(y - 4).toFixed(0)}`).join(' ')} L372 8" fill="none" stroke="#3a3040" stroke-width="1.6" stroke-linejoin="round"/>` +
      lightPts.map(([x, y]) => `<rect x="${x - 2}" y="${y - 5}" width="4" height="5" fill="#3a3040"/>`).join(''),
    glow: lightPts
      .map(
        ([x, y], i) =>
          `<g class="sr-twinkle" style="animation-delay:${(i % 5) * 0.7}s"><circle cx="${x}" cy="${y + 5}" r="11" fill="${LIGHT_COLORS[i % 5]}" opacity=".22"/><ellipse cx="${x}" cy="${y + 4}" rx="4" ry="5.5" fill="${LIGHT_COLORS[i % 5]}"/></g>`,
      )
      .join(''),
  },
  'obj-rug-stripe': {
    flat: true,
    svg:
      `<path d="M40 2 H460 L500 62 H0 Z" fill="${C.cream}"/>` +
      range(6)
        .map((i) => {
          const t0 = 0.12 + i * 0.14
          const x0 = 40 - 40 * 0 + t0 * 420
          return `<path d="M${x0} 2 H${x0 + 28} L${(t0 + 0.067) * 500} 62 H${t0 * 500 - 0} Z" fill="${[C.teal, C.mustard, C.red][i % 3]}" opacity=".85"/>`
        })
        .join('') +
      `<path d="M40 2 H460 L462 6 H38Z" fill="#000" opacity=".08"/>` +
      range(26)
        .map((i) => `<line x1="${8 + i * 19}" y1="62" x2="${6 + i * 19}" y2="68" stroke="${C.creamD}" stroke-width="2"/>`)
        .join(''),
  },
  'obj-guitar': {
    svg:
      `<g transform="rotate(-8 48 250)">` +
      `<rect x="42" y="18" width="12" height="130" fill="${C.woodDD}"/>` +
      `<path d="M38 2 h20 l-2 24 h-16z" fill="${C.woodDD}"/>` +
      range(3)
        .map(
          (i) =>
            `<circle cx="36" cy="${8 + i * 7}" r="2.4" fill="${C.metal}"/><circle cx="60" cy="${8 + i * 7}" r="2.4" fill="${C.metal}"/>`,
        )
        .join('') +
      `<path d="M48 120 C20 120 18 150 30 166 C8 178 4 222 26 238 C40 248 56 248 70 238 C92 222 88 178 66 166 C78 150 76 120 48 120 Z" fill="${C.mustard}"/>` +
      `<path d="M66 166 C78 150 76 120 48 120 C62 128 66 150 58 168 C80 184 84 226 60 244 C66 242 68 240 70 238 C92 222 88 178 66 166 Z" fill="${C.mustardD}" opacity=".7"/>` +
      `<circle cx="48" cy="176" r="12" fill="#3b2a24"/><rect x="36" y="216" width="24" height="6" rx="2" fill="${C.woodDD}"/>` +
      range(4)
        .map((i) => `<line x1="${44 + i * 2.7}" y1="10" x2="${44 + i * 2.7}" y2="219" stroke="#efe6d6" stroke-width=".8" opacity=".8"/>`)
        .join('') +
      `</g>`,
  },
  'obj-hanging-plant': {
    svg:
      `<circle cx="50" cy="4" r="4" fill="${C.metalD}"/>` +
      `<path d="M50 4 L22 92 M50 4 L50 92 M50 4 L78 92" stroke="${C.creamD}" stroke-width="2" fill="none"/>` +
      `<path d="M20 88 H80 Q78 120 50 122 Q22 120 20 88Z" fill="${C.cream}"/><path d="M60 88 H80 Q78 120 50 122 Q66 110 60 88Z" fill="${C.creamD}"/>` +
      `<path d="M26 96 C18 120 30 140 22 170 M40 110 C38 130 46 150 40 178 M72 98 C84 120 72 140 80 160" stroke="${C.leafD}" stroke-width="2" fill="none"/>` +
      [
        [22, 112],
        [26, 134],
        [22, 156],
        [24, 172],
        [42, 124],
        [44, 146],
        [40, 170],
        [78, 112],
        [76, 132],
        [80, 152],
      ]
        .map(([x, y], i) => leaf(x + (i % 2 ? 5 : -5), y, 7, 4, i % 2 ? 30 : -30, i % 3 ? C.leaf : C.leafL))
        .join('') +
      leaf(34, 84, 12, 6, -30, C.leaf) +
      leaf(64, 82, 12, 6, 30, C.leafL) +
      leaf(50, 78, 6, 11, 0, C.leaf),
  },
  'obj-plant-3': {
    svg:
      `<path d="M32 62 V22 M32 44 L18 30 M32 40 L46 26" stroke="${C.leafD}" stroke-width="3" fill="none"/>` +
      leaf(20, 52, 12, 6, -25, C.leaf) +
      leaf(44, 50, 12, 6, 25, C.leaf) +
      leaf(22, 38, 9, 5, -35, C.leafL) +
      leaf(42, 36, 9, 5, 35, C.leafL) +
      [
        [32, 16, C.pink],
        [16, 26, '#f5b6c8'],
        [48, 22, C.pink],
      ]
        .map(
          ([x, y, c]) =>
            range(5)
              .map((k) => `<circle cx="${x + Math.cos((k / 5) * 6.28) * 5}" cy="${y + Math.sin((k / 5) * 6.28) * 5}" r="4.5" fill="${c}"/>`)
              .join('') + `<circle cx="${x}" cy="${y}" r="3.2" fill="${C.mustard}"/>`,
        )
        .join('') +
      pot(16, 62, 32, 30, C.blue, C.blueD),
  },
  'obj-candle': {
    svg:
      `<rect x="6" y="24" width="22" height="40" rx="4" fill="${C.cream}"/><rect x="19" y="24" width="9" height="40" rx="4" fill="${C.creamD}"/>` +
      `<path d="M8 26 q3 8 0 12" stroke="${C.cream}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `<line x1="17" y1="24" x2="17" y2="18" stroke="${C.ink}" stroke-width="1.5"/>`,
    glow:
      `<circle cx="17" cy="12" r="16" fill="#ffcf6b" opacity=".22"/>` +
      `<path class="sr-flame" d="M17 2 q7 9 0 17 q-7 -8 0 -17" fill="#ffc34d"/><path d="M17 9 q3 4 0 8 q-3 -4 0 -8" fill="#fff4c9"/>`,
  },
  'obj-dog': {
    svg:
      `<ellipse cx="90" cy="64" rx="88" ry="20" fill="${C.red}"/><ellipse cx="90" cy="60" rx="72" ry="13" fill="#e8928a"/>` +
      `<g class="sr-breathe">` +
      `<ellipse cx="96" cy="48" rx="46" ry="20" fill="#b07a52"/><ellipse cx="104" cy="52" rx="30" ry="10" fill="#f2e2cc"/>` +
      `<path d="M138 52 q16 -2 12 -16" stroke="#b07a52" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="54" cy="50" rx="20" ry="16" fill="#b07a52"/><ellipse cx="42" cy="56" rx="10" ry="7" fill="#f2e2cc"/>` +
      `<ellipse cx="62" cy="40" rx="8" ry="14" fill="#7d5438" transform="rotate(30 62 40)"/>` +
      `<path d="M44 48 q3 3 7 0" stroke="${C.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="34" cy="55" r="3" fill="${C.ink}"/>` +
      `</g>` +
      `<path d="M4 64 q6 -24 30 -26 M176 64 q-6 -24 -30 -26" stroke="${C.red}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  },
  'obj-fishbowl': {
    svg:
      `<path d="M16 8 H56 Q72 24 70 44 Q68 70 36 72 Q4 70 2 44 Q0 24 16 8Z" fill="#cfe7f0" opacity=".55"/>` +
      `<path d="M8 28 H64 Q72 40 68 52 Q62 70 36 71 Q10 70 4 52 Q0 40 8 28Z" fill="#7fbfd8" opacity=".75"/>` +
      `<ellipse cx="36" cy="66" rx="24" ry="5" fill="${C.creamD}"/>` +
      `<path d="M24 66 q-4 -16 2 -26 M28 66 q4 -12 -2 -22" stroke="${C.leaf}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<g class="sr-fish"><ellipse cx="40" cy="44" rx="8" ry="5" fill="#f08a4b"/><path d="M47 44 l7 -5 v10z" fill="#f08a4b"/><circle cx="36" cy="43" r="1.2" fill="${C.ink}"/></g>` +
      `<rect x="14" y="4" width="44" height="6" rx="3" fill="#bcdbe6"/>` +
      `<path d="M12 30 q-4 12 2 26" stroke="#fff" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`,
  },
  'obj-globe': {
    svg:
      `<path d="M16 22 A24 24 0 0 0 44 62" stroke="${C.goldD}" stroke-width="3.5" fill="none"/>` +
      `<circle cx="32" cy="36" r="22" fill="${C.blue}"/>` +
      `<path d="M20 26 q8 -8 16 0 q-4 8 6 14 q-6 8 -16 2 q-2 -8 -6 -16z M40 52 q6 -4 10 2 q-4 6 -10 -2z" fill="${C.leafL}"/>` +
      `<path d="M44 20 A22 22 0 0 1 44 52" stroke="#000" stroke-width="8" fill="none" opacity=".12"/>` +
      `<path d="M32 58 V74" stroke="${C.goldD}" stroke-width="4"/><path d="M16 84 q16 -12 32 0 z" fill="${C.woodD}"/><rect x="14" y="80" width="36" height="6" rx="3" fill="${C.woodD}"/>`,
  },
  'obj-neon': {
    svg:
      `<rect x="4" y="4" width="142" height="92" rx="12" fill="#fff" opacity=".08"/><rect x="4" y="4" width="142" height="92" rx="12" fill="none" stroke="#fff" stroke-width="1.5" opacity=".2"/>` +
      `<circle cx="14" cy="14" r="3" fill="${C.metal}"/><circle cx="136" cy="14" r="3" fill="${C.metal}"/><circle cx="14" cy="86" r="3" fill="${C.metal}"/><circle cx="136" cy="86" r="3" fill="${C.metal}"/>`,
    glow:
      `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M62 20 A30 30 0 1 0 90 72 A24 24 0 1 1 62 20Z" stroke="#ff7ad9" stroke-width="12" opacity=".25"/>` +
      `<path d="M62 20 A30 30 0 1 0 90 72 A24 24 0 1 1 62 20Z" stroke="#ffc2ee" stroke-width="3.5"/>` +
      `<path d="M112 30 l4 10 l10 2 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -2z" stroke="#63e6ff" stroke-width="10" opacity=".25"/>` +
      `<path d="M112 30 l4 10 l10 2 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -2z" stroke="#c9f7ff" stroke-width="3"/>` +
      `</g>`,
  },
  'obj-bookcase': {
    svg:
      `<rect x="4" y="4" width="162" height="316" rx="4" fill="${C.woodD}"/><rect x="14" y="14" width="142" height="296" fill="${C.woodDD}"/>` +
      [84, 156, 228].map((y) => `<rect x="10" y="${y}" width="150" height="10" fill="${C.wood}"/>`).join('') +
      `<g transform="translate(14 0)">${bookRow(0, 84, 110, 2)}</g>` +
      `<g transform="translate(14 0)">${bookRow(0, 156, 142, 5)}</g>` +
      `<g transform="translate(40 0)">${bookRow(0, 228, 110, 7)}</g>` +
      `<g transform="translate(118 42)">${pot(4, 22, 26, 20) + leaf(17, 16, 6, 11, 0, C.leaf) + leaf(9, 20, 5, 9, -40, C.leafL) + leaf(25, 20, 5, 9, 40, C.leafL)}</g>` +
      `<rect x="30" y="268" width="100" height="36" rx="3" fill="${C.wood}"/><rect x="30" y="268" width="100" height="6" fill="#fff" opacity=".12"/><circle cx="80" cy="287" r="4" fill="${C.gold}"/>` +
      `<rect x="4" y="4" width="162" height="10" rx="3" fill="${C.woodL}"/>`,
  },
  'obj-armchair': {
    svg:
      `<rect x="30" y="160" width="10" height="20" fill="${C.woodDD}"/><rect x="170" y="160" width="10" height="20" fill="${C.woodDD}"/>` +
      `<path d="M40 20 Q105 -2 170 20 L176 120 H34 Z" fill="${C.teal}"/>` +
      `<path d="M140 12 Q160 16 170 20 L176 120 H150 Z" fill="${C.tealD}" opacity=".5"/>` +
      `<rect x="36" y="104" width="138" height="40" rx="14" fill="${C.teal}"/><rect x="36" y="104" width="138" height="10" rx="5" fill="#fff" opacity=".15"/>` +
      `<rect x="4" y="70" width="44" height="96" rx="20" fill="${C.teal}"/><rect x="162" y="70" width="44" height="96" rx="20" fill="${C.tealD}"/>` +
      `<rect x="4" y="70" width="44" height="14" rx="7" fill="#fff" opacity=".15"/>` +
      `<rect x="36" y="136" width="138" height="30" rx="8" fill="${C.tealD}"/>` +
      `<path d="M120 26 L150 30 L156 110 L126 104 Z" fill="${C.mustard}"/><path d="M120 26 L150 30 L152 44 L121 40Z" fill="#fff" opacity=".2"/>` +
      range(4)
        .map((i) => `<line x1="${128 + i * 7}" y1="104" x2="${130 + i * 7}" y2="114" stroke="${C.mustard}" stroke-width="2"/>`)
        .join('') +
      `<ellipse cx="80" cy="84" rx="26" ry="18" fill="${C.pink}"/><path d="M58 84 q22 -8 44 0" stroke="#fff" stroke-width="2" opacity=".3" fill="none"/>`,
  },
  'obj-telescope': {
    svg:
      `<path d="M66 110 L30 206 M66 110 L66 208 M66 110 L100 206" stroke="${C.woodD}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M44 170 H88" stroke="${C.woodD}" stroke-width="3"/>` +
      `<g transform="rotate(-32 66 100)">` +
      `<rect x="16" y="88" width="104" height="24" rx="8" fill="${C.navy}"/><rect x="16" y="88" width="104" height="7" rx="3" fill="#fff" opacity=".15"/>` +
      `<rect x="112" y="84" width="16" height="32" rx="4" fill="${C.gold}"/><rect x="2" y="92" width="16" height="16" rx="3" fill="${C.goldD}"/>` +
      `<rect x="50" y="80" width="30" height="8" rx="3" fill="${C.metalD}"/>` +
      `</g>` +
      `<circle cx="66" cy="110" r="7" fill="${C.goldD}"/>`,
  },
  'obj-bonsai': {
    svg:
      `<path d="M48 70 C44 54 36 50 30 42 C26 36 30 30 38 32 M46 58 C56 50 64 46 70 36" stroke="${C.woodDD}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="30" cy="30" rx="22" ry="11" fill="${C.leafD}"/><ellipse cx="28" cy="26" rx="16" ry="7" fill="${C.leaf}"/>` +
      `<ellipse cx="68" cy="28" rx="20" ry="10" fill="${C.leafD}"/><ellipse cx="66" cy="24" rx="14" ry="6" fill="${C.leaf}"/>` +
      `<ellipse cx="50" cy="14" rx="16" ry="9" fill="${C.leafD}"/><ellipse cx="49" cy="11" rx="11" ry="5" fill="${C.leafL}"/>` +
      `<path d="M8 70 H88 L82 84 H14 Z" fill="${C.navy}"/><rect x="4" y="66" width="88" height="8" rx="3" fill="#46568a"/>` +
      `<ellipse cx="48" cy="68" rx="38" ry="3" fill="#5d4a3a"/>`,
  },
  'obj-lava': {
    svg:
      `<path d="M8 96 L14 70 H26 L32 96Z" fill="${C.ink}"/><path d="M13 18 L7 70 H33 L27 18Z" fill="#ff8a5c" opacity=".35"/>` +
      `<path d="M14 18 L10 0 H30 L26 18Z" fill="${C.ink}"/><path d="M8 96 L14 70 H20 L16 96Z" fill="#fff" opacity=".12"/>`,
    glow:
      `<ellipse cx="20" cy="46" rx="26" ry="36" fill="#ff7a59" opacity=".18"/>` +
      `<path d="M13 18 L7 70 H33 L27 18Z" fill="#ff9a6b" opacity=".45"/>` +
      `<ellipse class="sr-lava" cx="18" cy="56" rx="6" ry="8" fill="#ffd166"/><ellipse class="sr-lava2" cx="23" cy="34" rx="4" ry="5" fill="#ffd166"/>`,
  },
  'obj-trophy': {
    svg:
      `<path d="M14 12 H4 a10 10 0 0 0 12 18 M50 12 H60 a10 10 0 0 1 -12 18" stroke="${C.gold}" stroke-width="5" fill="none"/>` +
      `<path d="M12 4 H52 V26 a20 20 0 0 1 -40 0 Z" fill="${C.gold}"/><path d="M36 4 H52 V26 a20 20 0 0 1 -18 20 Z" fill="${C.goldD}" opacity=".5"/>` +
      `<path d="M20 10 v16 a12 12 0 0 0 6 10" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>` +
      `<rect x="27" y="46" width="10" height="14" fill="${C.goldD}"/><rect x="16" y="58" width="32" height="8" rx="2" fill="${C.gold}"/>` +
      `<rect x="10" y="66" width="44" height="20" rx="3" fill="${C.woodDD}"/><rect x="20" y="72" width="24" height="8" rx="1" fill="${C.gold}"/>` +
      `<path d="M32 12 l2.5 5 l5.5 .8 l-4 3.8 l1 5.4 l-5 -2.6 l-5 2.6 l1 -5.4 l-4 -3.8 l5.5 -.8z" fill="#fff4c4"/>`,
  },
}

// ---- badges: every achieved milestone is a placeable item, drawn by group and tier
const TIERS = [
  { name: 'Bronze', main: '#c8834a', dark: '#9b5f31', light: '#e7b184' },
  { name: 'Silver', main: '#c3c7d2', dark: '#8f94a3', light: '#eef0f5' },
  { name: 'Gold', main: '#e8b73a', dark: '#b98a1f', light: '#fbe29a' },
  { name: 'Platinum', main: '#9fd8d2', dark: '#5fa9a2', light: '#e3fbf8' },
  { name: 'Diamond', main: '#8fc3ff', dark: '#5a8fd6', light: '#e3f1ff' },
  { name: 'Cosmic', main: '#b996ff', dark: '#7f5bd6', light: '#eee4ff' },
]
export const tierOf = (tier) => TIERS[Math.min(TIERS.length - 1, tier)]

const txt = (x, y, s, size = 9, fill = C.ink) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="800" font-family="ui-sans-serif,system-ui,sans-serif" fill="${fill}">${s}</text>`
const star = (cx, cy, r, fill) => {
  const pts = range(10)
    .map((i) => {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const rr = i % 2 ? r * 0.45 : r
      return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`
    })
    .join(' ')
  return `<polygon points="${pts}" fill="${fill}"/>`
}
const flame = (x, y, s, fill) =>
  `<path d="M${x} ${y - 12 * s} C${x + 8 * s} ${y - 4 * s} ${x + 7 * s} ${y + 4 * s} ${x} ${y + 6 * s} C${x - 7 * s} ${y + 4 * s} ${x - 8 * s} ${y - 4 * s} ${x - 2 * s} ${y - 6 * s} C${x - 1 * s} ${y - 2 * s} ${x + 1 * s} ${y - 1 * s} ${x} ${y - 12 * s}Z" fill="${fill}"/>`

const BADGE_ART = {
  tasks: (t, m) => {
    const w = 56
    const h = 72 + Math.min(m.tier, 5) * 4
    const cup = h - 34
    const sparkle =
      m.tier >= 4
        ? `<path d="M22 12 l3 -6 l3 6 l-3 6z" fill="#fff" opacity=".8"/><path d="M40 20 l2 -4 l2 4 l-2 4z" fill="#fff" opacity=".7"/>`
        : ''
    return {
      w,
      h,
      surface: 'any',
      svg:
        `<path d="M12 10 H4 a9 9 0 0 0 10 16 M44 10 H52 a9 9 0 0 1 -10 16" stroke="${t.main}" stroke-width="4.5" fill="none"/>` +
        `<path d="M10 4 H46 V${cup - 16} a18 18 0 0 1 -36 0 Z" fill="${t.main}"/>` +
        `<path d="M32 4 H46 V${cup - 16} a18 18 0 0 1 -16 18 Z" fill="${t.dark}" opacity=".45"/>` +
        `<path d="M17 9 v${cup - 28} a10 10 0 0 0 4 8" stroke="${t.light}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
        sparkle +
        `<rect x="24" y="${cup + 2}" width="8" height="10" fill="${t.dark}"/><rect x="14" y="${cup + 10}" width="28" height="6" rx="2" fill="${t.main}"/>` +
        `<rect x="8" y="${h - 18}" width="40" height="18" rx="3" fill="${C.woodDD}"/><rect x="14" y="${h - 14}" width="28" height="10" rx="1" fill="${t.light}"/>` +
        txt(28, h - 6, m.target, 8),
    }
  },
  streak: (t, m) => ({
    w: 80,
    h: 100,
    surface: 'wall',
    svg:
      wallShadow(2, 2, 76, 96, 3) +
      `<rect x="2" y="2" width="76" height="96" rx="3" fill="${t.main}"/><rect x="2" y="2" width="76" height="6" rx="3" fill="${t.light}" opacity=".6"/>` +
      `<rect x="9" y="9" width="62" height="82" fill="${C.paper}"/>` +
      `<rect x="16" y="16" width="48" height="4" rx="2" fill="${C.ink}" opacity=".25"/>` +
      flame(40, 42, 1.6, '#f2894b') +
      flame(40, 46, 0.9, '#ffd166') +
      txt(40, 72, m.target, 13) +
      txt(40, 83, 'DAYS', 7, C.inkSoft) +
      `<circle cx="62" cy="80" r="6" fill="${t.dark}"/>`,
  }),
  habit: (t, m) => ({
    w: 48,
    h: 92,
    surface: 'wall',
    svg:
      `<circle cx="24" cy="3" r="2.5" fill="${C.metalD}"/>` +
      `<path d="M14 40 L6 88 L16 80 L22 90 L26 42Z" fill="${t.dark}"/><path d="M34 40 L42 88 L32 80 L26 90 L22 42Z" fill="${t.main}"/>` +
      range(12)
        .map((i) => {
          const a = (i / 12) * Math.PI * 2
          return `<circle cx="${(24 + Math.cos(a) * 16).toFixed(1)}" cy="${(28 + Math.sin(a) * 16).toFixed(1)}" r="6" fill="${t.main}"/>`
        })
        .join('') +
      `<circle cx="24" cy="28" r="15" fill="${t.dark}"/><circle cx="24" cy="28" r="11" fill="${C.paper}"/>` +
      txt(24, 32, m.target, 10),
  }),
  focus: (t, _m) => ({
    w: 52,
    h: 96,
    surface: 'wall',
    svg:
      `<circle cx="26" cy="4" r="2.5" fill="${C.metalD}"/>` +
      `<path d="M14 4 L26 50 L38 4 Z" fill="${C.blue}"/><path d="M20 4 L26 30 L32 4Z" fill="${C.red}"/>` +
      `<circle cx="26" cy="70" r="24" fill="${t.dark}"/><circle cx="26" cy="70" r="20" fill="${t.main}"/>` +
      `<circle cx="26" cy="70" r="13" fill="${t.light}"/><path d="M26 62 V70 L32 74" stroke="${C.ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<path d="M12 58 a18 18 0 0 1 12 -8" stroke="#fff" stroke-width="2.5" fill="none" opacity=".5" stroke-linecap="round"/>`,
  }),
  windows: (t, m) => {
    const keys = m.tier + 1
    return {
      w: 84,
      h: 76,
      surface: 'wall',
      svg:
        wallShadow(2, 2, 80, 22, 4) +
        `<rect x="2" y="2" width="80" height="22" rx="4" fill="${C.wood}"/><rect x="2" y="2" width="80" height="6" rx="3" fill="${C.woodL}"/>` +
        range(3)
          .map((i) => {
            const x = 18 + i * 24
            const hook = `<path d="M${x} 16 v10 a4 4 0 0 0 8 0" stroke="${C.metalD}" stroke-width="2.5" fill="none"/>`
            if (i >= keys) return hook
            return (
              hook +
              `<g transform="rotate(${i % 2 ? 6 : -6} ${x + 8} 30)"><circle cx="${x + 8}" cy="38" r="8" fill="${t.main}"/><circle cx="${x + 8}" cy="38" r="3" fill="${C.wood}"/>` +
              `<rect x="${x + 6.5}" y="44" width="3.5" height="24" fill="${t.main}"/><rect x="${x + 10}" y="58" width="5" height="3" fill="${t.main}"/><rect x="${x + 10}" y="64" width="4" height="3" fill="${t.main}"/></g>`
            )
          })
          .join(''),
    }
  },
  resisted: (t, m) => ({
    w: 72,
    h: 86,
    surface: 'wall',
    svg:
      wallShadow(2, 2, 68, 82, 10) +
      `<rect x="2" y="2" width="68" height="82" rx="10" fill="${C.woodD}"/><rect x="7" y="7" width="58" height="72" rx="7" fill="${C.wood}"/>` +
      `<path d="M36 14 L56 21 V40 C56 54 46 62 36 67 C26 62 16 54 16 40 V21Z" fill="${t.main}"/>` +
      `<path d="M36 14 L56 21 V40 C56 54 46 62 36 67Z" fill="${t.dark}" opacity=".45"/>` +
      `<path d="M28 40 l6 6 l11 -12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="20" y="70" width="32" height="7" rx="2" fill="${t.light}"/>` +
      txt(36, 76, m.target + 'x', 6),
  }),
  perfect: (t, m) => ({
    w: 84,
    h: 84,
    surface: 'wall',
    svg:
      `<circle cx="45" cy="46" r="39" fill="${C.shadow}" opacity=".15"/>` +
      `<circle cx="42" cy="42" r="40" fill="${t.dark}"/><circle cx="42" cy="42" r="35" fill="${t.main}"/><circle cx="42" cy="42" r="29" fill="${C.navy}"/>` +
      star(42, 42, 22, t.light) +
      star(42, 42, 12, '#fff') +
      range(m.tier + 1)
        .map((i) => star(42 + i * 12 - m.tier * 6, 77, 4, '#fff'))
        .join(''),
  }),
}

/** Drawing and size for a milestone badge item. */
export function badgeArt(m) {
  const make = BADGE_ART[m.group] || BADGE_ART.perfect
  return make(tierOf(m.tier), m)
}
