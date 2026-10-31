// Fully synthesized audio — no external assets.
export class AudioSys {
  constructor() {
    this.ctx = null
    this.master = null
    this.muted = false
    this.started = false
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = this.ctx = new AC()
    const master = this.master = ctx.createGain()
    master.gain.value = this.muted ? 0 : 0.5
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 24
    comp.ratio.value = 4
    comp.attack.value = 0.003
    comp.release.value = 0.25
    master.connect(comp)
    comp.connect(ctx.destination)

    // noise buffer
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.noiseBuf = buf
    this.startAmbience()
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0 }

  _noise(dur, filterType, freq, q, gain, dest, t0 = 0, sweep = 0) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = filterType
    f.frequency.setValueAtTime(freq, this.t + t0)
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), this.t + t0 + dur)
    f.Q.value = q
    const g = ctx.createGain()
    const start = this.t + t0
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(gain, start + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    src.connect(f); f.connect(g); g.connect(dest || this.master)
    src.start(start)
    src.stop(start + dur + 0.05)
  }

  _tone(type, f0, f1, dur, gain, t0 = 0, dest) {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = type
    const start = this.t + t0
    o.frequency.setValueAtTime(f0, start)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    o.connect(g); g.connect(dest || this.master)
    o.start(start)
    o.stop(start + dur + 0.05)
  }

  startAmbience() {
    if (this.started) return
    this.started = true
    const ctx = this.ctx
    const amb = ctx.createGain()
    amb.gain.value = 0.55
    amb.connect(this.master)

    // wind
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 320
    lp.Q.value = 0.4
    const wg = ctx.createGain()
    wg.gain.value = 0.055
    src.connect(lp); lp.connect(wg); wg.connect(amb)
    src.start()

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain); lfoGain.connect(wg.gain)
    lfo.start()

    // drones
    for (const [f, g] of [[48, 0.035], [55.5, 0.025], [82.5, 0.012]]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const og = ctx.createGain()
      og.gain.value = g
      o.connect(og); og.connect(amb)
      o.start()
    }

    // distant machinery pulse
    const pulse = () => {
      if (!this.ctx) return
      this._tone('sine', 62, 40, 0.9, 0.03)
      this._noise(0.8, 'lowpass', 260, 0.5, 0.02)
      this.pulseTimer = setTimeout(pulse, 6000 + Math.random() * 7000)
    }
    this.pulseTimer = setTimeout(pulse, 5000)
  }

  shot() {
    if (!this.ctx) return
    const p = 0.94 + Math.random() * 0.12
    this._noise(0.13, 'bandpass', 1500 * p, 0.7, 0.55, null, 0, 400)
    this._noise(0.05, 'highpass', 3200, 0.5, 0.28)
    this._tone('sine', 150 * p, 44, 0.17, 0.5)
    this._tone('triangle', 320 * p, 80, 0.07, 0.16)
  }

  enemyShot(heavy = false) {
    if (!this.ctx) return
    this._tone('sawtooth', heavy ? 340 : 780, heavy ? 90 : 180, 0.16, heavy ? 0.16 : 0.09)
    this._noise(0.08, 'bandpass', heavy ? 900 : 2200, 1.2, heavy ? 0.2 : 0.1)
  }

  hit(head = false) {
    if (!this.ctx) return
    this._tone('square', head ? 1750 : 1250, head ? 1750 : 1150, 0.045, 0.08)
    if (head) this._tone('sine', 2600, 2400, 0.09, 0.06, 0.02)
  }

  kill() {
    if (!this.ctx) return
    this._tone('sine', 220, 70, 0.22, 0.18)
    this._noise(0.16, 'lowpass', 900, 0.6, 0.12)
  }

  reload(stage = 0) {
    if (!this.ctx) return
    if (stage === 0) {
      this._noise(0.05, 'highpass', 2400, 0.6, 0.14)
      this._noise(0.07, 'bandpass', 900, 1, 0.1, null, 0.08)
    } else if (stage === 1) {
      this._noise(0.05, 'highpass', 1800, 0.6, 0.12, null, 0.42)
      this._tone('square', 300, 200, 0.04, 0.05, 0.44)
    } else {
      this._noise(0.06, 'highpass', 3000, 0.7, 0.16, null, 0.98)
      this._noise(0.08, 'bandpass', 1200, 1.2, 0.1, null, 1.02)
    }
  }

  empty() {
    if (!this.ctx) return
    this._noise(0.04, 'highpass', 2800, 0.8, 0.12)
    this._tone('square', 420, 300, 0.03, 0.04)
  }

  explosion() {
    if (!this.ctx) return
    this._noise(1.2, 'lowpass', 900, 0.4, 0.75, null, 0, 60)
    this._tone('sine', 80, 26, 1.0, 0.6)
    this._noise(0.25, 'highpass', 2000, 0.4, 0.2)
  }

  footstep(sprint = false) {
    if (!this.ctx) return
    this._noise(0.07, 'lowpass', sprint ? 520 : 380, 0.8, sprint ? 0.075 : 0.05)
    this._tone('sine', 90, 55, 0.05, 0.03)
  }

  jump() {
    if (!this.ctx) return
    this._noise(0.09, 'lowpass', 600, 0.6, 0.06)
  }

  land() {
    if (!this.ctx) return
    this._noise(0.12, 'lowpass', 300, 0.6, 0.14)
    this._tone('sine', 80, 40, 0.1, 0.12)
  }

  damage() {
    if (!this.ctx) return
    this._noise(0.25, 'lowpass', 500, 0.6, 0.22)
    this._tone('sine', 110, 50, 0.3, 0.18)
  }

  waveHorn() {
    if (!this.ctx) return
    const ctx = this.ctx
    for (const f of [110, 165, 220]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(f, this.t)
      o.frequency.linearRampToValueAtTime(f * 1.5, this.t + 0.7)
      o.frequency.linearRampToValueAtTime(f, this.t + 1.6)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, this.t)
      g.gain.exponentialRampToValueAtTime(0.045, this.t + 0.25)
      g.gain.exponentialRampToValueAtTime(0.0001, this.t + 1.8)
      const f2 = ctx.createBiquadFilter()
      f2.type = 'lowpass'
      f2.frequency.value = 900
      o.connect(f2); f2.connect(g); g.connect(this.master)
      o.start(); o.stop(this.t + 1.9)
    }
  }

  pickup() {
    if (!this.ctx) return
    this._tone('sine', 660, 660, 0.08, 0.08)
    this._tone('sine', 990, 990, 0.12, 0.07, 0.07)
    this._tone('sine', 1320, 1320, 0.16, 0.05, 0.14)
  }

  uiClick() {
    if (!this.ctx) return
    this._tone('square', 700, 500, 0.03, 0.04)
    this._noise(0.03, 'highpass', 3000, 0.8, 0.03)
  }

  setMuted(m) {
    this.muted = m
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.t, 0.05)
  }

  dispose() {
    clearTimeout(this.pulseTimer)
    if (this.ctx) this.ctx.close()
    this.ctx = null
  }
}
