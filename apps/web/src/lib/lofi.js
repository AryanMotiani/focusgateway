// Generative lofi + ambience, synthesized live with the Web Audio API.
// No audio files, no streaming, no copyright issues, and it keeps playing even
// when YouTube or Spotify are blocked.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12) // MIDI -> Hz

// Jazzy 7th/9th chord progressions (MIDI notes, voiced around middle C)
const PROGRESSIONS = [
  // Fmaj7 - Em7 - Dm7 - Cmaj7
  [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
  // Dm9 - G13 - Cmaj9 - Am9
  [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 48, 52, 55, 59]],
  // Ebmaj7 - Dm7 - Cm7 - Bb7
  [[51, 55, 58, 62], [50, 53, 57, 60], [48, 51, 55, 58], [46, 50, 53, 56]],
  // Am7 - D9 - Gmaj7 - Cmaj7
  [[45, 48, 52, 55], [50, 54, 57, 60, 64], [43, 47, 50, 54], [48, 52, 55, 59]],
]
const PENTA = [0, 2, 4, 7, 9]

function makeNoise(ctx, kind, seconds = 3) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') d[i] = w * 0.5
      else if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      } else {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      }
    }
  }
  return buf
}

function makeImpulse(ctx, seconds = 2.4, decay = 3) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

export function createLofi() {
  const AC = window.AudioContext || window.webkitAudioContext
  let ctx = null
  let nodes = null
  let timer = null
  let playing = false
  let musicOn = true
  let volume = 0.6
  let mix = { rain: 0.5, cafe: 0, fire: 0, noise: 0 }
  const listeners = new Set()

  // sequencer state
  const bpm = 74
  const step = 60 / bpm / 4 // 16th note
  let nextTime = 0
  let stepIndex = 0
  let progression = PROGRESSIONS[0]
  let bar = 0

  function build() {
    ctx = new AC()
    const master = ctx.createGain()
    master.gain.value = volume
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3
    master.connect(comp).connect(ctx.destination)

    const reverb = ctx.createConvolver()
    reverb.buffer = makeImpulse(ctx)
    const reverbGain = ctx.createGain()
    reverbGain.gain.value = 0.28
    reverb.connect(reverbGain).connect(master)

    const music = ctx.createGain()
    music.gain.value = musicOn ? 0.9 : 0
    const tape = ctx.createBiquadFilter()
    tape.type = 'lowpass'
    tape.frequency.value = 2600
    tape.Q.value = 0.4
    music.connect(tape)
    tape.connect(master)
    tape.connect(reverb)

    const white = makeNoise(ctx, 'white')
    const pink = makeNoise(ctx, 'pink')
    const brown = makeNoise(ctx, 'brown')

    // vinyl crackle: sparse clicks on the music bus
    const crackle = ctx.createBufferSource()
    const cbuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
    const cd = cbuf.getChannelData(0)
    for (let i = 0; i < cd.length; i++) cd[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.006
    crackle.buffer = cbuf
    crackle.loop = true
    const crackleGain = ctx.createGain()
    crackleGain.gain.value = 0.35
    crackle.connect(crackleGain).connect(music)
    crackle.start()

    const loop = (buf, rate = 1) => {
      const s = ctx.createBufferSource()
      s.buffer = buf
      s.loop = true
      s.playbackRate.value = rate
      s.start(0, Math.random() * 2)
      return s
    }
    const bed = (name, chain) => {
      const g = ctx.createGain()
      g.gain.value = 0
      chain.connect(g).connect(master)
      return g
    }

    // Rain: pink noise, band-limited, plus a softer high "sheen"
    const rainSrc = loop(pink)
    const rainLp = ctx.createBiquadFilter()
    rainLp.type = 'lowpass'
    rainLp.frequency.value = 5200
    const rainHp = ctx.createBiquadFilter()
    rainHp.type = 'highpass'
    rainHp.frequency.value = 350
    rainSrc.connect(rainHp).connect(rainLp)
    const rain = bed('rain', rainLp)

    // Cafe: low murmur (brown noise band-passed around voice range)
    const cafeSrc = loop(brown, 1.1)
    const cafeBp = ctx.createBiquadFilter()
    cafeBp.type = 'bandpass'
    cafeBp.frequency.value = 450
    cafeBp.Q.value = 0.7
    cafeSrc.connect(cafeBp)
    const cafe = bed('cafe', cafeBp)

    // Fire: deep brown rumble; crackle pops are scheduled in the loop
    const fireSrc = loop(brown, 0.6)
    const fireLp = ctx.createBiquadFilter()
    fireLp.type = 'lowpass'
    fireLp.frequency.value = 900
    fireSrc.connect(fireLp)
    const fire = bed('fire', fireLp)

    // Plain focus noise (brown)
    const noiseSrc = loop(brown)
    const noiseLp = ctx.createBiquadFilter()
    noiseLp.type = 'lowpass'
    noiseLp.frequency.value = 600
    noiseSrc.connect(noiseLp)
    const noise = bed('noise', noiseLp)

    nodes = { master, music, reverb, white, beds: { rain, cafe, fire, noise } }
    applyMix()
  }

  function applyMix() {
    if (!nodes) return
    const t = ctx.currentTime
    const scale = { rain: 0.7, cafe: 0.9, fire: 1.1, noise: 0.8 }
    for (const k of Object.keys(nodes.beds)) nodes.beds[k].gain.setTargetAtTime((mix[k] || 0) * scale[k], t, 0.4)
  }

  // --- instruments ---
  function keys(midi, time, dur, vel = 0.12) {
    const out = ctx.createGain()
    out.gain.setValueAtTime(0, time)
    out.gain.linearRampToValueAtTime(vel, time + 0.02)
    out.gain.exponentialRampToValueAtTime(vel * 0.45, time + 0.4)
    out.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(1800, time)
    f.frequency.exponentialRampToValueAtTime(700, time + dur)
    for (const [type, detune, g] of [['sine', 0, 1], ['triangle', 6, 0.35], ['sine', 1200, 0.08]]) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = NOTE(midi)
      o.detune.value = detune + (Math.random() * 6 - 3)
      const og = ctx.createGain()
      og.gain.value = g
      o.connect(og).connect(f)
      o.start(time)
      o.stop(time + dur + 0.05)
    }
    f.connect(out).connect(nodes.music)
  }

  function bass(midi, time, dur) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = NOTE(midi - 12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, time)
    g.gain.linearRampToValueAtTime(0.28, time + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    o.connect(g).connect(nodes.music)
    o.start(time)
    o.stop(time + dur + 0.05)
  }

  function kick(time) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(140, time)
    o.frequency.exponentialRampToValueAtTime(42, time + 0.18)
    g.gain.setValueAtTime(0.55, time)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.35)
    o.connect(g).connect(nodes.music)
    o.start(time)
    o.stop(time + 0.4)
  }

  function noiseHit(time, { freq, q = 1, type = 'bandpass', gain, decay }) {
    const s = ctx.createBufferSource()
    s.buffer = nodes.white
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, time)
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay)
    s.connect(f).connect(g).connect(nodes.music)
    s.start(time, Math.random())
    s.stop(time + decay + 0.02)
  }

  function firePop(time) {
    const s = ctx.createBufferSource()
    s.buffer = nodes.white
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 1500 + Math.random() * 3000
    const g = ctx.createGain()
    const v = 0.25 * (mix.fire || 0)
    g.gain.setValueAtTime(v, time)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.03 + Math.random() * 0.05)
    s.connect(f).connect(g).connect(nodes.master)
    s.start(time, Math.random() * 2)
    s.stop(time + 0.1)
  }

  function scheduleStep(i, time) {
    const s16 = i % 16
    const swing = s16 % 2 === 1 ? step * 0.18 : 0
    const t = time + swing
    if (s16 === 0) {
      bar++
      if (bar % 8 === 0) progression = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)]
    }
    const chord = progression[Math.floor(i / 16) % progression.length]
    if (musicOn) {
      if (s16 === 0) chord.forEach((n, k) => keys(n, t + k * 0.018, step * 15, 0.07))
      if (s16 === 10 && Math.random() < 0.5) chord.slice(1).forEach((n, k) => keys(n, t + k * 0.015, step * 6, 0.04))
      if (s16 === 0 || s16 === 10) bass(chord[0], t, step * (s16 === 0 ? 8 : 5))
      if (s16 === 0 || s16 === 7 || (s16 === 10 && Math.random() < 0.4)) kick(t)
      if (s16 === 4 || s16 === 12) noiseHit(t, { freq: 1800, q: 0.8, gain: 0.16, decay: 0.18 })
      if (s16 % 2 === 0) noiseHit(t, { freq: 8000, type: 'highpass', gain: s16 % 4 === 0 ? 0.05 : 0.03, decay: 0.05 })
      if (Math.random() < 0.09 && s16 % 2 === 0) {
        const root = chord[0] + 24
        const n = root + PENTA[Math.floor(Math.random() * PENTA.length)] + (Math.random() < 0.3 ? 12 : 0)
        keys(n, t, step * (2 + Math.floor(Math.random() * 4)), 0.05)
      }
    }
    if (mix.fire > 0 && Math.random() < 0.18) firePop(t + Math.random() * step)
    if (s16 % 4 === 0) listeners.forEach((cb) => cb({ step: s16, bar }))
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(stepIndex, nextTime)
      nextTime += step
      stepIndex++
    }
  }

  return {
    async start() {
      if (!ctx) build()
      if (ctx.state === 'suspended') await ctx.resume()
      nodes.master.gain.setTargetAtTime(volume, ctx.currentTime, 0.3)
      if (!timer) {
        nextTime = ctx.currentTime + 0.1
        timer = setInterval(scheduler, 25)
      }
      playing = true
    },
    async stop() {
      if (!ctx) return
      nodes.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
      clearInterval(timer)
      timer = null
      playing = false
      setTimeout(() => !playing && ctx.suspend(), 900)
    },
    setVolume(v) {
      volume = v
      if (ctx && playing) nodes.master.gain.setTargetAtTime(v, ctx.currentTime, 0.1)
    },
    setMusic(on) {
      musicOn = on
      if (ctx) nodes.music.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.2)
    },
    setMix(m) {
      mix = { ...mix, ...m }
      applyMix()
    },
    onBeat(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    get playing() {
      return playing
    },
    chime() {
      if (!ctx) build()
      const t = ctx.currentTime + 0.05
      ;[76, 79, 84].forEach((n, i) => keys(n, t + i * 0.18, 1.6, 0.12))
    },
  }
}

// One shared instance so music keeps playing while you move between pages.
let shared = null
export function lofi() {
  return (shared ||= createLofi())
}
