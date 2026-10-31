let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, duration, type = 'sine', volume = 1, slide = 0, delay = 0) {
  if (muted) return;
  const audio = ensure();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18 * volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function noise(duration = 0.18, volume = 0.35, low = false) {
  if (muted) return;
  const audio = ensure();
  if (!audio) return;
  const size = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, size, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = low ? 'lowpass' : 'bandpass';
  filter.frequency.value = low ? 420 : 1600;
  filter.Q.value = 0.8;
  const gain = audio.createGain();
  gain.gain.value = volume;
  src.connect(filter); filter.connect(gain); gain.connect(master);
  src.start();
}

export const sfx = {
  click() { tone(540, 0.055, 'triangle', 0.6, -80); },
  hover() { tone(880, 0.035, 'sine', 0.18, 40); },
  card() { noise(0.10, 0.18); tone(330, 0.12, 'triangle', 0.55, 180); },
  hit() { noise(0.16, 0.5, true); tone(120, 0.16, 'sawtooth', 0.65, -60); },
  block() { noise(0.14, 0.28); tone(210, 0.18, 'square', 0.3, 40); },
  heal() { [523, 659, 784].forEach((f, i) => tone(f, 0.3, 'sine', 0.4, 0, i * 0.08)); },
  coin() { [1318, 1760].forEach((f, i) => tone(f, 0.12, 'triangle', 0.5, 0, i * 0.05)); },
  error() { tone(180, 0.14, 'square', 0.4, -40); },
  draw() { noise(0.07, 0.12); tone(700, 0.06, 'triangle', 0.25, 280); },
  catchStart() {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, 'sine', 0.42, 0, i * 0.06));
    noise(0.4, 0.14);
  },
  catchWin() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.55, 'triangle', 0.45, 0, i * 0.1));
    noise(0.5, 0.1);
  },
  victory() {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.5, 'sine', 0.5, 0, i * 0.13));
  },
  defeat() {
    [220, 174, 146, 110].forEach((f, i) => tone(f, 0.7, 'sine', 0.5, -15, i * 0.16));
  },
  turn() { tone(300, 0.25, 'sine', 0.35, 80); },
  enemyTurn() { tone(170, 0.3, 'triangle', 0.35, -30); },
  upgrade() {
    [659, 880, 1174].forEach((f, i) => tone(f, 0.35, 'triangle', 0.35, 0, i * 0.07));
  },
  setMuted(value) {
    muted = Boolean(value);
    if (master) master.gain.value = muted ? 0 : 0.18;
  },
  isMuted() { return muted; },
};
