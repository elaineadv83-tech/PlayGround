import * as THREE from 'three'
import { sparkTexture, smokeTexture, bulletHoleTexture, glowTexture } from './textures.js'

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()

export class Effects {
  constructor(scene) {
    this.scene = scene
    this.time = 0

    // ---- sparks ----
    this.sparkCount = 900
    this.sparkPos = new Float32Array(this.sparkCount * 3)
    this.sparkCol = new Float32Array(this.sparkCount * 3)
    this.sparkBase = new Float32Array(this.sparkCount * 3)
    this.sparkVel = new Float32Array(this.sparkCount * 3)
    this.sparkLife = new Float32Array(this.sparkCount)
    this.sparkMax = new Float32Array(this.sparkCount)
    this.sparkCursor = 0
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3))
    sg.setAttribute('color', new THREE.BufferAttribute(this.sparkCol, 3))
    const sm = new THREE.PointsMaterial({
      size: 0.085, map: sparkTexture(), vertexColors: true, transparent: true,
      opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    })
    this.sparkPoints = new THREE.Points(sg, sm)
    this.sparkPoints.frustumCulled = false
    this.sparkPoints.renderOrder = 3
    this.scene.add(this.sparkPoints)
    for (let i = 0; i < this.sparkCount; i++) this.sparkPos[i * 3 + 1] = -999

    // ---- smoke ----
    this.smokePool = []
    this.smokeCursor = 0
    for (let i = 0; i < 30; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: smokeTexture(), transparent: true, opacity: 0, depthWrite: false, color: 0x8d949e
      }))
      s.visible = false
      s.userData = { life: 0, max: 1, vel: new THREE.Vector3(), grow: 1 }
      this.scene.add(s)
      this.smokePool.push(s)
    }

    // ---- tracers ----
    this.tracerPool = []
    this.tracerCursor = 0
    const tg = new THREE.BoxGeometry(1, 1, 1)
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({
        color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: false
      }))
      m.visible = false
      m.userData = { life: 0, max: 0.1 }
      this.scene.add(m)
      this.tracerPool.push(m)
    }

    // ---- decals ----
    this.decalPool = []
    this.decalCursor = 0
    const dg = new THREE.PlaneGeometry(0.16, 0.16)
    for (let i = 0; i < 64; i++) {
      const m = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({
        map: bulletHoleTexture(), transparent: true, opacity: 0.9,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4
      }))
      m.visible = false
      this.scene.add(m)
      this.decalPool.push(m)
    }

    // ---- shells ----
    this.shellPool = []
    this.shellCursor = 0
    const shg = new THREE.CylinderGeometry(0.018, 0.018, 0.06, 8)
    const shm = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.3 })
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(shg, shm)
      m.visible = false
      m.castShadow = false
      m.userData = { life: 0, vel: new THREE.Vector3(), spin: new THREE.Vector3(), grounded: false }
      this.scene.add(m)
      this.shellPool.push(m)
    }

    // ---- explosions ----
    this.explosions = []
    const eg = new THREE.IcosahedronGeometry(1, 2)
    this.explosionGeo = eg
    this.ringGeo = new THREE.RingGeometry(0.9, 1, 40)
    this.flashLight = new THREE.PointLight(0xffa040, 0, 22, 2)
    this.scene.add(this.flashLight)
    this.flashLife = 0
    this.flashMax = 0.12
    this.flashBase = 0

    // muzzle glow sprite
    this.muzzleSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,235,1)', 'rgba(255,170,70,0.7)'),
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    }))
    this.muzzleSprite.scale.set(1.1, 1.1, 1)
    this.scene.add(this.muzzleSprite)

    // dust motes for impacts
    this.impactSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,230,190,0.9)', 'rgba(255,150,50,0.5)'),
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    }))
    this.scene.add(this.impactSprite)
  }

  _nextSpark() {
    const i = this.sparkCursor
    this.sparkCursor = (this.sparkCursor + 1) % this.sparkCount
    return i
  }

  sparks(origin, normal, count = 12, color = 0xffb060, speed = 6) {
    const c = new THREE.Color(color)
    for (let k = 0; k < count; k++) {
      const i = this._nextSpark()
      const i3 = i * 3
      this.sparkPos[i3] = origin.x + (Math.random() - 0.5) * 0.08
      this.sparkPos[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.08
      this.sparkPos[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.08
      const sp = speed * (0.35 + Math.random() * 0.9)
      _v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
        .multiplyScalar(sp)
      if (normal) _v.addScaledVector(normal, sp * 0.9)
      this.sparkVel[i3] = _v.x
      this.sparkVel[i3 + 1] = _v.y + 1.2
      this.sparkVel[i3 + 2] = _v.z
      const tint = 0.75 + Math.random() * 0.25
      this.sparkCol[i3] = this.sparkBase[i3] = c.r * tint
      this.sparkCol[i3 + 1] = this.sparkBase[i3 + 1] = c.g * tint
      this.sparkCol[i3 + 2] = this.sparkBase[i3 + 2] = c.b * tint
      this.sparkLife[i] = this.sparkMax[i] = 0.25 + Math.random() * 0.55
    }
  }

  smoke(origin, count = 1, color = 0x8d949e, scale = 1) {
    for (let k = 0; k < count; k++) {
      const s = this.smokePool[this.smokeCursor]
      this.smokeCursor = (this.smokeCursor + 1) % this.smokePool.length
      s.visible = true
      s.position.copy(origin).add(_v.set((Math.random() - 0.5) * 0.2, Math.random() * 0.15, (Math.random() - 0.5) * 0.2))
      s.material.color.setHex(color)
      s.material.opacity = 0.35 + Math.random() * 0.2
      const sz = (0.5 + Math.random() * 0.5) * scale
      s.scale.set(sz, sz, 1)
      s.userData.life = s.userData.max = 0.9 + Math.random() * 1.1
      s.userData.vel.set((Math.random() - 0.5) * 0.3, 0.25 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3)
      s.userData.grow = 1.6 + Math.random() * 1.8
      s.userData.baseScale = sz
    }
  }

  tracer(from, to, color = 0xffc070, width = 0.028, life = 0.075) {
    const m = this.tracerPool[this.tracerCursor]
    this.tracerCursor = (this.tracerCursor + 1) % this.tracerPool.length
    const dist = from.distanceTo(to)
    if (dist < 0.01) return
    m.visible = true
    m.position.copy(from).lerp(to, 0.5)
    m.lookAt(to)
    m.scale.set(width, width, dist)
    m.material.color.setHex(color)
    m.material.opacity = 0.95
    m.userData.life = m.userData.max = life
  }

  decal(point, normal) {
    const m = this.decalPool[this.decalCursor]
    this.decalCursor = (this.decalCursor + 1) % this.decalPool.length
    m.visible = true
    m.position.copy(point).addScaledVector(normal, 0.008)
    _v.copy(point).add(normal)
    m.lookAt(_v)
    const s = 0.7 + Math.random() * 0.7
    m.scale.set(s, s, 1)
    m.rotation.z = Math.random() * Math.PI * 2
  }

  impact(point, normal, kind = 'metal') {
    const col = kind === 'metal' ? 0xffc070 : 0xd9c9a8
    this.sparks(point, normal, kind === 'metal' ? 14 : 8, col, 6)
    this.smoke(point, 1, kind === 'metal' ? 0x7d838c : 0x8a8171, 0.7)
    this.decal(point, normal)
    this.impactSprite.position.copy(point).addScaledVector(normal, 0.05)
    this.impactSprite.material.opacity = 0.9
    this.impactSprite.scale.set(0.5, 0.5, 1)
  }

  shell(position, direction) {
    const m = this.shellPool[this.shellCursor]
    this.shellCursor = (this.shellCursor + 1) % this.shellPool.length
    m.visible = true
    m.position.copy(position)
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
    const d = m.userData
    d.vel.copy(direction).multiplyScalar(1.4 + Math.random())
    d.vel.y += 1.6 + Math.random()
    d.vel.x += (Math.random() - 0.5) * 1.2
    d.vel.z += (Math.random() - 0.5) * 1.2
    d.spin.set(Math.random() * 14, Math.random() * 14, Math.random() * 14)
    d.life = 3
    d.grounded = false
  }

  muzzle(position, color = 0xffb060) {
    this.muzzleSprite.position.copy(position)
    this.muzzleSprite.material.color.setHex(color)
    this.muzzleSprite.material.opacity = 0.95
    this.muzzleSprite.scale.setScalar(0.8 + Math.random() * 0.5)
    this.flashLight.position.copy(position)
    this.flashLight.color.setHex(color)
    this.flashBase = 45
    this.flashLight.intensity = this.flashBase
    this.flashLife = this.flashMax = 0.07
  }

  explosion(point, scale = 1) {
    const mesh = new THREE.Mesh(this.explosionGeo, new THREE.MeshBasicMaterial({
      color: 0xffa040, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    mesh.position.copy(point)
    mesh.scale.setScalar(0.4 * scale)
    this.scene.add(mesh)
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({
      color: 0xffc070, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }))
    ring.position.copy(point)
    ring.position.y = 0.05
    ring.rotation.x = -Math.PI / 2
    ring.scale.setScalar(0.5 * scale)
    this.scene.add(ring)
    this.explosions.push({ mesh, ring, life: 0, max: 0.55, scale })
    this.sparks(point, new THREE.Vector3(0, 1, 0), 50 * scale, 0xffa040, 14 * scale)
    this.smoke(point, 6, 0x6d6a66, 3 * scale)
    this.flashLight.position.copy(point)
    this.flashLight.color.setHex(0xff8a30)
    this.flashBase = 160 * scale
    this.flashLight.intensity = this.flashBase
    this.flashLife = this.flashMax = 0.22
  }

  update(dt) {
    this.time += dt

    // sparks
    for (let i = 0; i < this.sparkCount; i++) {
      if (this.sparkLife[i] <= 0) continue
      this.sparkLife[i] -= dt
      const i3 = i * 3
      if (this.sparkLife[i] <= 0) {
        this.sparkCol[i3] = this.sparkCol[i3 + 1] = this.sparkCol[i3 + 2] = 0
        this.sparkPos[i3 + 1] = -999
        continue
      }
      this.sparkVel[i3 + 1] -= 13 * dt
      this.sparkPos[i3] += this.sparkVel[i3] * dt
      this.sparkPos[i3 + 1] += this.sparkVel[i3 + 1] * dt
      this.sparkPos[i3 + 2] += this.sparkVel[i3 + 2] * dt
      if (this.sparkPos[i3 + 1] < 0.02) {
        this.sparkPos[i3 + 1] = 0.02
        this.sparkVel[i3 + 1] *= -0.3
        this.sparkVel[i3] *= 0.7
        this.sparkVel[i3 + 2] *= 0.7
      }
      const f = this.sparkLife[i] / this.sparkMax[i]
      const s = f * f
      this.sparkCol[i3] = this.sparkBase[i3] * s
      this.sparkCol[i3 + 1] = this.sparkBase[i3 + 1] * s
      this.sparkCol[i3 + 2] = this.sparkBase[i3 + 2] * s
    }
    this.sparkPoints.geometry.attributes.position.needsUpdate = true
    this.sparkPoints.geometry.attributes.color.needsUpdate = true

    // smoke
    for (const s of this.smokePool) {
      if (!s.visible) continue
      const d = s.userData
      d.life -= dt
      if (d.life <= 0) { s.visible = false; continue }
      s.position.addScaledVector(d.vel, dt)
      d.vel.multiplyScalar(1 - dt * 0.6)
      const f = d.life / d.max
      s.material.opacity = 0.35 * f
      const sc = d.baseScale * (1 + (1 - f) * d.grow)
      s.scale.set(sc, sc, 1)
    }

    // tracers
    for (const m of this.tracerPool) {
      if (!m.visible) continue
      m.userData.life -= dt
      if (m.userData.life <= 0) { m.visible = false; continue }
      m.material.opacity = 0.95 * (m.userData.life / m.userData.max)
    }

    // shells
    for (const m of this.shellPool) {
      if (!m.visible) continue
      const d = m.userData
      d.life -= dt
      if (d.life <= 0) { m.visible = false; continue }
      if (!d.grounded) {
        d.vel.y -= 16 * dt
        m.position.addScaledVector(d.vel, dt)
        m.rotation.x += d.spin.x * dt
        m.rotation.y += d.spin.y * dt
        m.rotation.z += d.spin.z * dt
        if (m.position.y < 0.03) {
          m.position.y = 0.03
          d.vel.y *= -0.35
          d.vel.x *= 0.6
          d.vel.z *= 0.6
          d.spin.multiplyScalar(0.5)
          if (Math.abs(d.vel.y) < 0.4) d.grounded = true
        }
      }
    }

    // explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i]
      e.life += dt
      const f = e.life / e.max
      if (f >= 1) {
        this.scene.remove(e.mesh)
        this.scene.remove(e.ring)
        e.mesh.material.dispose()
        e.ring.material.dispose()
        this.explosions.splice(i, 1)
        continue
      }
      const s = e.scale * (0.4 + f * 3.2)
      e.mesh.scale.setScalar(s)
      e.mesh.material.opacity = (1 - f) * 0.9
      e.ring.scale.setScalar(e.scale * (0.6 + f * 7))
      e.ring.material.opacity = (1 - f) * 0.7
    }

    // muzzle / impact glows
    if (this.muzzleSprite.material.opacity > 0) {
      this.muzzleSprite.material.opacity = Math.max(0, this.muzzleSprite.material.opacity - dt * 18)
    }
    if (this.impactSprite.material.opacity > 0) {
      this.impactSprite.material.opacity = Math.max(0, this.impactSprite.material.opacity - dt * 7)
    }

    if (this.flashLife > 0) {
      this.flashLife -= dt
      const f = Math.max(0, this.flashLife / this.flashMax)
      this.flashLight.intensity = this.flashBase * f * f
    } else {
      this.flashLight.intensity = 0
    }
  }

  reset() {
    for (const m of this.tracerPool) m.visible = false
    for (const m of this.decalPool) m.visible = false
    for (const m of this.shellPool) m.visible = false
    for (const s of this.smokePool) s.visible = false
    for (let i = 0; i < this.sparkCount; i++) {
      this.sparkLife[i] = 0
      this.sparkPos[i * 3 + 1] = -999
      this.sparkCol[i * 3] = this.sparkCol[i * 3 + 1] = this.sparkCol[i * 3 + 2] = 0
    }
    this.sparkPoints.geometry.attributes.position.needsUpdate = true
    this.sparkPoints.geometry.attributes.color.needsUpdate = true
    for (const e of this.explosions) {
      this.scene.remove(e.mesh); this.scene.remove(e.ring)
    }
    this.explosions.length = 0
    this.muzzleSprite.material.opacity = 0
    this.impactSprite.material.opacity = 0
    this.flashLight.intensity = 0
  }
}
