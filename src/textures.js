import * as THREE from 'three'

// ---------- deterministic noise ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCanvas(size) {
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  return c
}

function toTexture(canvas, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

function addNoise(ctx, size, amount, rand, tint = [0, 0, 0]) {
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount
    d[i] = Math.max(0, Math.min(255, d[i] + n + tint[0]))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n + tint[1]))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n + tint[2]))
  }
  ctx.putImageData(img, 0, 0)
}

function blotches(ctx, size, count, rand, dark = true) {
  for (let i = 0; i < count; i++) {
    const x = rand() * size, y = rand() * size
    const r = 20 + rand() * size * 0.22
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const a = 0.03 + rand() * 0.1
    g.addColorStop(0, dark ? `rgba(8,9,10,${a})` : `rgba(220,220,205,${a * 0.6})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
}

function cracks(ctx, size, count, rand) {
  ctx.strokeStyle = 'rgba(14,15,16,0.5)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < count; i++) {
    let x = rand() * size, y = rand() * size
    ctx.beginPath(); ctx.moveTo(x, y)
    const steps = 8 + (rand() * 14) | 0
    for (let s = 0; s < steps; s++) {
      x += (rand() - 0.5) * 26
      y += (rand() - 0.5) * 26
      ctx.lineTo(x, y)
    }
    ctx.globalAlpha = 0.25 + rand() * 0.4
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

// ---------- concrete ----------
export function concreteTexture({ size = 512, base = '#6d6d66', repeat = [4, 4], grime = 0.9 } = {}) {
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const rand = mulberry32(1337)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  addNoise(ctx, size, 26, rand)
  blotches(ctx, size, 26 * grime, rand, true)
  blotches(ctx, size, 8 * grime, rand, false)
  cracks(ctx, size, 7 * grime, rand)

  // expansion seams
  ctx.strokeStyle = 'rgba(10,11,12,0.55)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2)
  ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(180,180,165,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, size / 2 + 3); ctx.lineTo(size, size / 2 + 3)
  ctx.moveTo(size / 2 + 3, 0); ctx.lineTo(size / 2 + 3, size)
  ctx.stroke()

  // tiny aggregate specks
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,245,0.05)' : 'rgba(0,0,0,0.09)'
    ctx.fillRect(rand() * size, rand() * size, 1.5, 1.5)
  }
  return c
}

export function concreteMap(opts = {}) {
  return toTexture(concreteTexture(opts), opts.repeat || [4, 4])
}

export function arenaFloorTexture() {
  const size = 1024
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const rand = mulberry32(99)
  ctx.drawImage(concreteTexture({ size: 512, base: '#5e5f5a', grime: 1.2 }), 0, 0, size, size)
  addNoise(ctx, size, 16, rand)

  // large slabs
  ctx.strokeStyle = 'rgba(9,10,11,0.55)'
  ctx.lineWidth = 5
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * size / 4, 0); ctx.lineTo(i * size / 4, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * size / 4); ctx.lineTo(size, i * size / 4); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(190,190,175,0.05)'
  ctx.lineWidth = 1.5
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * size / 4 + 5, 0); ctx.lineTo(i * size / 4 + 5, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * size / 4 + 5); ctx.lineTo(size, i * size / 4 + 5); ctx.stroke()
  }

  // painted landing circle
  const cx = size / 2, cy = size / 2
  ctx.save()
  ctx.strokeStyle = 'rgba(230,225,205,0.20)'
  ctx.lineWidth = 9
  ctx.beginPath(); ctx.arc(cx, cy, 300, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 3
  ctx.setLineDash([26, 20])
  ctx.beginPath(); ctx.arc(cx, cy, 330, 0, Math.PI * 2); ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(255,120,40,0.22)'
  ctx.lineWidth = 12
  ctx.beginPath(); ctx.arc(cx, cy, 268, 0, Math.PI * 2); ctx.stroke()

  // hazard chevrons near edges
  ctx.globalAlpha = 0.16
  for (let i = 0; i < 4; i++) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(i * Math.PI / 2)
    for (let s = 0; s < 5; s++) {
      ctx.fillStyle = s % 2 ? '#e8b33c' : '#1a1b1c'
      ctx.fillRect(-250 + s * 22, -438, 22, 26)
    }
    ctx.restore()
  }
  ctx.globalAlpha = 1

  // stenciled sector mark
  ctx.save()
  ctx.translate(cx, cy + 420)
  ctx.fillStyle = 'rgba(220,218,200,0.16)'
  ctx.font = '700 34px "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '10px'
  ctx.fillText('BLACKSITE 07', 0, 0)
  ctx.restore()

  // grime + tire scuffs
  blotches(ctx, size, 40, rand, true)
  ctx.strokeStyle = 'rgba(10,10,10,0.16)'
  for (let i = 0; i < 26; i++) {
    ctx.lineWidth = 1 + rand() * 3
    const x = rand() * size, y = rand() * size
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 160, y + (rand() - 0.5) * 160); ctx.stroke()
  }
  return toTexture(c, [1, 1])
}

// ---------- painted metal panels ----------
export function panelTexture({ base = '#3f464e', repeat = [3, 2], accent = '#5a626b' } = {}) {
  const size = 512
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const rand = mulberry32(4242)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  addNoise(ctx, size, 14, rand)

  // brushed streaks
  for (let i = 0; i < 420; i++) {
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)'
    ctx.lineWidth = 1
    const y = rand() * size
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y + (rand() - 0.5) * 4); ctx.stroke()
  }

  // panels
  const pw = size / 2, ph = size / 4
  for (let py = 0; py < 4; py++) {
    for (let px = 0; px < 2; px++) {
      const x = px * pw, y = py * ph
      ctx.strokeStyle = 'rgba(7,8,9,0.7)'
      ctx.lineWidth = 4
      ctx.strokeRect(x + 3, y + 3, pw - 6, ph - 6)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 7, y + 7, pw - 14, ph - 14)
      // rivets
      ctx.fillStyle = 'rgba(160,168,175,0.28)'
      for (const [rx, ry] of [[12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12]]) {
        ctx.beginPath(); ctx.arc(x + rx, y + ry, 2.6, 0, Math.PI * 2); ctx.fill()
      }
      // subtle scuffs
      ctx.globalAlpha = 0.08
      ctx.fillStyle = accent
      ctx.fillRect(x + 20, y + ph * 0.55, pw - 40, 3)
      ctx.globalAlpha = 1
    }
  }
  blotches(ctx, size, 18, rand, true)
  cracks(ctx, size, 3, rand)
  return toTexture(c, repeat)
}

export function containerTexture(tint = '#3d4a52') {
  const size = 512
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const rand = mulberry32(7)
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, size, size)
  // corrugation
  for (let x = 0; x < size; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0)
    g.addColorStop(0, 'rgba(0,0,0,0.28)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.06)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.02)')
    g.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = g
    ctx.fillRect(x, 0, 32, size)
  }
  addNoise(ctx, size, 18, rand)
  // frame
  ctx.strokeStyle = 'rgba(8,9,10,0.75)'
  ctx.lineWidth = 10
  ctx.strokeRect(5, 5, size - 10, size - 10)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 5
  ctx.strokeRect(16, 16, size - 32, size - 32)
  // rust
  for (let i = 0; i < 26; i++) {
    const x = rand() * size, y = rand() * size, r = 4 + rand() * 22
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(96,54,30,0.35)')
    g.addColorStop(1, 'rgba(96,54,30,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  blotches(ctx, size, 16, rand, true)
  // stencil
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = 'rgba(225,225,210,0.15)'
  ctx.font = '700 40px "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '8px'
  ctx.fillText('BLACKSITE', 0, 10)
  ctx.restore()
  return toTexture(c, [1, 1])
}

export function crateTexture() {
  const size = 512
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const rand = mulberry32(21)
  ctx.fillStyle = '#4a4f45'
  ctx.fillRect(0, 0, size, size)
  addNoise(ctx, size, 22, rand)
  ctx.strokeStyle = 'rgba(8,9,9,0.8)'
  ctx.lineWidth = 16
  ctx.strokeRect(8, 8, size - 16, size - 16)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 3
  ctx.strokeRect(28, 28, size - 56, size - 56)
  // diagonal brace
  ctx.strokeStyle = 'rgba(10,11,11,0.55)'
  ctx.lineWidth = 20
  ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(size - 40, size - 40); ctx.stroke()
  // label
  ctx.fillStyle = 'rgba(230,225,200,0.28)'
  ctx.font = '700 44px "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('MK-7', size / 2, size / 2 - 18)
  ctx.font = '500 24px monospace'
  ctx.fillText('7.62 // 840 RDS', size / 2, size / 2 + 26)
  blotches(ctx, size, 14, rand, true)
  return toTexture(c, [1, 1])
}

export function hazardTexture() {
  const size = 256
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#d9a52e'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#161616'
  ctx.lineWidth = 34
  for (let i = -size; i < size * 2; i += 68) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke()
  }
  const rand = mulberry32(5)
  addNoise(ctx, size, 26, rand)
  blotches(ctx, size, 12, rand, true)
  return toTexture(c, [2, 1])
}

// ---------- glow sprites ----------
export function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,190,120,0.55)') {
  const size = 128
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.25, mid)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(c, [1, 1])
}

export function sparkTexture() {
  const size = 64
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,220,160,0.9)')
  g.addColorStop(1, 'rgba(255,120,20,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(c, [1, 1])
}

export function smokeTexture() {
  const size = 128
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const rand = mulberry32(31)
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(120,124,130,0.5)')
  g.addColorStop(0.5, 'rgba(90,94,100,0.22)')
  g.addColorStop(1, 'rgba(60,64,70,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 40; i++) {
    const x = rand() * size, y = rand() * size, r = 6 + rand() * 20
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r)
    gg.addColorStop(0, 'rgba(150,154,160,0.06)')
    gg.addColorStop(1, 'rgba(150,154,160,0)')
    ctx.fillStyle = gg
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  return toTexture(c, [1, 1])
}

export function bulletHoleTexture() {
  const size = 64
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(5,5,6,0.95)')
  g.addColorStop(0.45, 'rgba(18,18,20,0.8)')
  g.addColorStop(0.75, 'rgba(60,60,60,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(c, [1, 1])
}

export function signTexture(text = 'SECTOR 07', sub = 'AUTHORIZED PERSONNEL ONLY') {
  const w = 512, h = 192
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#101317'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,122,26,0.8)'
  ctx.lineWidth = 4
  ctx.strokeRect(8, 8, w - 16, h - 16)
  ctx.fillStyle = 'rgba(255,138,48,0.95)'
  ctx.font = '700 62px "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '6px'
  ctx.fillText(text, w / 2, 92)
  ctx.fillStyle = 'rgba(190,198,205,0.55)'
  ctx.font = '500 22px monospace'
  ctx.letterSpacing = '4px'
  ctx.fillText(sub, w / 2, 136)
  ctx.fillStyle = 'rgba(255,122,26,0.9)'
  for (let i = 0; i < 3; i++) ctx.fillRect(w / 2 - 90 + i * 70, 154, 50, 6)
  return toTexture(c, [1, 1])
}

export function windowTexture() {
  const size = 256
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#05070a'
  ctx.fillRect(0, 0, size, size)
  const rand = mulberry32(88)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 10; x++) {
      if (rand() > 0.55) {
        const warm = rand() > 0.3
        ctx.fillStyle = warm
          ? `rgba(255,${150 + rand() * 60 | 0},${70 + rand() * 50 | 0},${0.25 + rand() * 0.55})`
          : `rgba(${110 + rand() * 40 | 0},${180 + rand() * 50 | 0},255,${0.2 + rand() * 0.4})`
        ctx.fillRect(x * 26 + 4, y * 16 + 3, 14 + rand() * 6, 7)
      }
    }
  }
  return toTexture(c, [1, 1])
}
