// Retro Web Audio Sound Effects & 8-Bit Chiptune BGM for Pikachu Classic
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export type SoundType =
  | 'select'
  | 'match'
  | 'wrong'
  | 'shuffle'
  | 'hint'
  | 'win'
  | 'lose'
  | 'freeze'
  | 'fog'
  | 'scramble'
  | 'thunder'
  | 'water'
  | 'holy'
  | 'astral'
  | 'slash'
  | 'arrow'
  | 'cyber'

export const playSound = (type: SoundType, enabled = true) => {
  if (!enabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  if (type === 'select') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, now)
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.06)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.07)
  } else if (type === 'match') {
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    osc1.type = 'triangle'
    osc2.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    osc1.frequency.setValueAtTime(880, now + 0.08)
    osc2.frequency.setValueAtTime(1174.66, now + 0.08)
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)
    osc1.start(now)
    osc2.start(now + 0.08)
    osc1.stop(now + 0.3)
    osc2.stop(now + 0.3)
  } else if (type === 'wrong') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.setValueAtTime(180, now + 0.08)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.2)
  } else if (type === 'hint') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(987.77, now)
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.22)
  } else if (type === 'shuffle' || type === 'scramble') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.1)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)
  } else if (type === 'win') {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.1)
      gain.gain.setValueAtTime(0.15, now + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.1)
      osc.stop(now + idx * 0.1 + 0.26)
    })
  } else if (type === 'lose') {
    const notes = [440, 392, 349.23, 293.66]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now + idx * 0.12)
      gain.gain.setValueAtTime(0.12, now + idx * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.12)
      osc.stop(now + idx * 0.12 + 0.22)
    })
  } else if (type === 'freeze') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1400, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.3)
    gain.gain.setValueAtTime(0.16, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.33)
  } else if (type === 'fog') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(250, now)
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.3)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.36)
  } else if (type === 'thunder') {
    // 100,000 Volts Electric Thunder Crackle & Lightning Zap
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.28)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.36)
  } else if (type === 'water') {
    // Hydro Vortex Wave Sweep
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.15)
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)
  } else if (type === 'holy') {
    // Holy Aegis Divine Sacred Shimmer
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51]
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.05)
      gain.gain.setValueAtTime(0.12, now + idx * 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.05)
      osc.stop(now + idx * 0.05 + 0.38)
    })
  } else if (type === 'astral') {
    // Astral Singularity Cosmic Warp
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(80, now)
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.2)
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.4)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.43)
  } else if (type === 'slash') {
    // Shadow Shuriken Swift Ninja Slash
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(1400, now)
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.12)
    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.2)
  } else if (type === 'arrow') {
    // Arrow Tempest Whizz & Piercing Strike
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(950, now)
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.15)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)
  } else if (type === 'cyber') {
    // Cyber Overclock Matrix Laser Glitch
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.setValueAtTime(880, now + 0.05)
    osc.frequency.setValueAtTime(1760, now + 0.1)
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25)
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.32)
  }
}

/* ──────────────────────────────────────────────
   8-Bit Chiptune BGM Generator (Retro GameBoy / Arcade Theme)
   ────────────────────────────────────────────── */
let isBgmPlaying = false
let bgmTimer: any = null
let masterBgmGain: GainNode | null = null

// Frequency constants
const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, B3 = 246.94
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77
const C6 = 1046.50, D6 = 1174.66, E6 = 1318.51

// 32-step retro Pokémon adventure pattern (repeats seamlessly)
// Melody track (0 = rest)
const SEQ_MELODY = [
  // Measure 1
  E5, 0, G5, 0, C6, 0, B5, 0,
  A5, 0, G5, E5, D5, 0, E5, G5,
  // Measure 2
  A5, 0, C6, 0, B5, A5, G5, 0,
  F5, 0, E5, 0, D5, E5, D5, 0,
  // Measure 3
  E5, 0, G5, 0, C6, 0, D6, 0,
  E6, 0, D6, C6, B5, 0, A5, B5,
  // Measure 4
  C6, 0, G5, 0, E5, 0, G5, 0,
  C6, 0, 0, 0, 0, 0, 0, 0,
]

// Bass track (Triangle wave)
const SEQ_BASS = [
  // Measure 1
  C3, 0, G3, 0, C4, 0, G3, 0,
  F3, 0, C4, 0, G3, 0, D3, 0,
  // Measure 2
  A3, 0, E3, 0, G3, 0, D3, 0,
  F3, 0, C4, 0, G3, 0, G3, 0,
  // Measure 3
  C3, 0, G3, 0, A3, 0, E3, 0,
  F3, 0, C4, 0, G3, 0, D3, 0,
  // Measure 4
  C3, 0, E3, 0, G3, 0, E3, 0,
  C4, 0, G3, 0, C3, 0, 0, 0,
]

// Percussion rhythm: 1 = HiHat, 2 = Snare/Burst, 0 = Rest
const SEQ_DRUM = [
  1, 0, 1, 0, 2, 0, 1, 0,
  1, 0, 1, 1, 2, 0, 1, 0,
  1, 0, 1, 0, 2, 0, 1, 0,
  1, 0, 1, 1, 2, 0, 2, 0,
]

// Pre-create 8-bit noise buffer for drum sounds
let noiseBuffer: AudioBuffer | null = null
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate * 0.08
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }
  return noiseBuffer
}

export const startBgm = () => {
  if (isBgmPlaying) return
  const ctx = getAudioContext()
  if (!ctx) return
  isBgmPlaying = true

  if (!masterBgmGain) {
    masterBgmGain = ctx.createGain()
    masterBgmGain.gain.setValueAtTime(0.25, ctx.currentTime)
    masterBgmGain.connect(ctx.destination)
  }

  const stepTime = 0.135 // ~111 BPM 16th notes
  let step = 0

  function tick() {
    if (!isBgmPlaying || !ctx || !masterBgmGain) return
    const now = ctx.currentTime

    // 1. Lead Chiptune Square Wave
    const melFreq = SEQ_MELODY[step % SEQ_MELODY.length]
    if (melFreq > 0) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(melFreq, now)

      gain.gain.setValueAtTime(0.045, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 1.3)

      osc.connect(gain)
      gain.connect(masterBgmGain)
      osc.start(now)
      osc.stop(now + stepTime * 1.35)
    }

    // 2. Retro Bass Triangle Wave
    const bassFreq = SEQ_BASS[step % SEQ_BASS.length]
    if (bassFreq > 0) {
      const bassOsc = ctx.createOscillator()
      const bassGain = ctx.createGain()
      bassOsc.type = 'triangle'
      bassOsc.frequency.setValueAtTime(bassFreq, now)

      bassGain.gain.setValueAtTime(0.07, now)
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 1.8)

      bassOsc.connect(bassGain)
      bassGain.connect(masterBgmGain)
      bassOsc.start(now)
      bassOsc.stop(now + stepTime * 1.85)
    }

    // 3. 8-Bit GameBoy Noise Channel Percussion
    const drumType = SEQ_DRUM[step % SEQ_DRUM.length]
    if (drumType > 0) {
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = getNoiseBuffer(ctx)

      const filter = ctx.createBiquadFilter()
      const drumGain = ctx.createGain()

      if (drumType === 1) {
        // Hi-hat (High pass)
        filter.type = 'highpass'
        filter.frequency.setValueAtTime(6500, now)
        drumGain.gain.setValueAtTime(0.02, now)
        drumGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)
      } else {
        // Snare / pop (Band pass)
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(1400, now)
        drumGain.gain.setValueAtTime(0.04, now)
        drumGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07)
      }

      noiseSource.connect(filter)
      filter.connect(drumGain)
      drumGain.connect(masterBgmGain)

      noiseSource.start(now)
      noiseSource.stop(now + 0.08)
    }

    step = (step + 1) % SEQ_MELODY.length
    bgmTimer = setTimeout(tick, stepTime * 1000)
  }

  tick()
}

export const stopBgm = () => {
  isBgmPlaying = false
  if (bgmTimer) {
    clearTimeout(bgmTimer)
    bgmTimer = null
  }
}

export const getIsBgmPlaying = () => isBgmPlaying
