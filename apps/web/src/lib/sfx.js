// Tiny synthesized sound effects (no files). Only used in game mode with sounds on.
let ctx = null
function ac() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx ||= new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function note(freq, start, dur, { type = 'sine', gain = 0.12 } = {}) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}
export const sfx = {
  tick() {
    note(880, 0, 0.12, { type: 'triangle', gain: 0.1 })
    note(1320, 0.06, 0.18, { type: 'sine', gain: 0.08 })
  },
  habit() {
    note(660, 0, 0.12, { type: 'triangle', gain: 0.09 })
    note(990, 0.05, 0.16, { gain: 0.07 })
  },
  levelUp() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.09, 0.5, { type: 'triangle', gain: 0.1 }))
  },
  /** a small coin clink, for coins ticking up */
  coin() {
    note(1567.98, 0, 0.09, { type: 'triangle', gain: 0.05 })
    note(2093, 0.04, 0.14, { gain: 0.04 })
  },
  /** a cash register style run, for buying something */
  purchase() {
    ;[1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => note(f, i * 0.05, 0.22, { type: 'triangle', gain: 0.07 }))
  },
  badge() {
    ;[783.99, 1046.5].forEach((f, i) => note(f, i * 0.1, 0.4, { gain: 0.09 }))
  },
}
