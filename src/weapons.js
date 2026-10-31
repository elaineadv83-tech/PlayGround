import * as THREE from 'three'

const _v = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra })
}

export class Weapon {
  constructor(camera, scene, player, world, effects, audio, hud) {
    this.camera = camera
    this.scene = scene
    this.player = player
    this.world = world
    this.effects = effects
    this.audio = audio
    this.hud = hud
    this.game = null

    this.magSize = 30
    this.ammo = 30
    this.reserve = 210
    this.grenades = 3
    this.damage = 34
    this.headMult = 3.4
    this.fireDelay = 0.086
    this.reloadTime = 1.72
    this.reloading = false
    this.reloadT = 0
    this.reloadStage = 0
    this.nextFire = 0
    this.time = 0
    this.emptyClick = 0
    this.autoReload = 0
    this.kick = 0
    this.swayX = 0
    this.swayY = 0
    this.throwT = 0
    this.grenadeList = []
    this.stats = { shots: 0, hits: 0, headshots: 0 }
    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 220
    this.visible = true

    this._buildViewModel()
    this._buildGrenadeMesh()
    this.hud.setAmmo(this.ammo, this.reserve)
    this.hud.setGrenades(this.grenades)
  }

  bindGame(game) { this.game = game }

  _buildViewModel() {
    const g = this.group = new THREE.Group()
    this.camera.add(g)

    const body = mat(0x2a2e33, 0.92, 0.34)
    const body2 = mat(0x4d5762, 0.86, 0.3)
    const tan = mat(0x6f6049, 0.55, 0.62)
    const polymer = mat(0x15181b, 0.25, 0.82)
    const dark = mat(0x0d0f11, 0.7, 0.5)
    const accent = mat(0xff6a14, 0.4, 0.4, { emissive: 0xff5a00, emissiveIntensity: 0.9 })
    const lens = mat(0x061018, 0.92, 0.06, { emissive: 0x1a6a7a, emissiveIntensity: 0.45 })
    const glove = mat(0x24211d, 0.1, 0.92)
    const sleeve = mat(0x1b1f22, 0.1, 0.9)

    const box = (w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      mesh.position.set(x, y, z)
      mesh.rotation.set(rx, ry, rz)
      g.add(mesh)
      return mesh
    }
    const cyl = (r1, r2, len, m, x, y, z, axis = 'z', seg = 16) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), m)
      mesh.position.set(x, y, z)
      if (axis === 'z') mesh.rotation.x = Math.PI / 2
      if (axis === 'x') mesh.rotation.z = Math.PI / 2
      g.add(mesh)
      return mesh
    }

    // receiver
    box(0.095, 0.115, 0.4, body, 0, 0, 0.02)
    box(0.1, 0.035, 0.34, body2, 0, 0.072, 0.03)
    // upper rail
    box(0.058, 0.028, 0.42, dark, 0, 0.1, 0.0)
    for (let i = 0; i < 9; i++) {
      box(0.052, 0.014, 0.024, body2, 0, 0.12, -0.18 + i * 0.045)
    }
    // handguard
    box(0.078, 0.085, 0.3, tan, 0, 0.012, -0.32)
    for (let i = 0; i < 5; i++) {
      box(0.086, 0.018, 0.02, dark, 0, -0.018, -0.24 - i * 0.045)
    }
    // side accent
    box(0.012, 0.03, 0.26, accent, 0.052, 0.01, -0.3)
    box(0.012, 0.03, 0.26, accent, -0.052, 0.01, -0.3)
    // barrel + brake
    cyl(0.016, 0.016, 0.32, dark, 0, 0.012, -0.62, 'z', 12)
    cyl(0.03, 0.026, 0.1, body2, 0, 0.012, -0.78, 'z', 12)
    for (let i = 0; i < 3; i++) {
      box(0.068, 0.012, 0.018, dark, 0, 0.012, -0.76 - i * 0.025)
    }
    // gas block
    box(0.05, 0.05, 0.08, body, 0, 0.045, -0.46)
    // grip
    box(0.055, 0.15, 0.075, polymer, 0, -0.12, 0.13, 0.28)
    // trigger guard
    box(0.05, 0.008, 0.12, dark, 0, -0.08, 0.02)
    box(0.008, 0.045, 0.008, dark, 0, -0.06, 0.08)
    // magazine
    this.mag = box(0.06, 0.19, 0.105, body2, 0, -0.145, -0.07, -0.16)
    box(0.062, 0.03, 0.11, dark, 0, -0.23, -0.085, -0.16)
    // scope
    const scope = cyl(0.034, 0.034, 0.2, dark, 0, 0.155, -0.06, 'z', 18)
    cyl(0.04, 0.034, 0.05, body2, 0, 0.155, 0.045, 'z', 18)
    cyl(0.04, 0.034, 0.05, body2, 0, 0.155, -0.165, 'z', 18)
    this.scopeLens = cyl(0.028, 0.028, 0.006, lens, 0, 0.155, 0.072, 'z', 18)
    box(0.03, 0.05, 0.03, body, 0.045, 0.125, 0.0)
    box(0.03, 0.05, 0.03, body, -0.045, 0.125, 0.0)
    // charging handle
    box(0.015, 0.03, 0.06, body2, 0.058, 0.055, 0.11)
    // ejection port
    box(0.002, 0.04, 0.08, dark, 0.049, 0.03, 0.03)

    // right hand / grip
    const palmR = box(0.075, 0.11, 0.1, glove, 0.012, -0.155, 0.14, 0.25)
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.055, 3, 6), glove)
      f.position.set(0.045, -0.1 - i * 0.02, 0.115 + i * 0.008)
      f.rotation.z = 0.9
      g.add(f)
    }
    const thumbR = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 3, 6), glove)
    thumbR.position.set(-0.02, -0.11, 0.1)
    thumbR.rotation.x = 0.5
    g.add(thumbR)

    // left hand / handguard
    box(0.075, 0.06, 0.13, glove, -0.005, -0.035, -0.3)
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.05, 3, 6), glove)
      f.position.set(-0.055, 0.005, -0.27 - i * 0.025)
      f.rotation.z = Math.PI / 2
      f.rotation.y = 0.3
      g.add(f)
    }
    const thumbL = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 3, 6), glove)
    thumbL.position.set(0.045, -0.01, -0.26)
    thumbL.rotation.z = -1.1
    g.add(thumbL)

    // small status light
    const led = box(0.008, 0.012, 0.012, accent, 0.05, -0.03, -0.02)
    this.led = led

    // muzzle anchor
    this.muzzle = new THREE.Object3D()
    this.muzzle.position.set(0, 0.012, -0.85)
    g.add(this.muzzle)

    // base transform
    this.hipPos = new THREE.Vector3(0.26, -0.30, -0.82)
    this.hipRot = new THREE.Euler(0.02, 0.045, 0.035)
    this.adsPos = new THREE.Vector3(0, -0.143, -0.58)
    this.adsRot = new THREE.Euler(0, 0, 0)
    g.scale.setScalar(0.92)
g.position.copy(this.hipPos)
    g.rotation.copy(this.hipRot)

    g.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false
        o.castShadow = false
        o.receiveShadow = false
        o.renderOrder = 10
      }
    })

    // dedicated viewmodel light so the gun reads well in dark corners
    const gunLight = new THREE.PointLight(0xbfd4ff, 2.2, 2.6, 2)
    gunLight.position.set(0.3, 0.1, 0.2)
    this.camera.add(gunLight)
    this.gunLight = gunLight
  }

  _buildGrenadeMesh() {
    this.grenadeGeo = new THREE.IcosahedronGeometry(0.11, 1)
    this.grenadeMat = mat(0x2d3a2e, 0.7, 0.55)
    this.grenadeBandMat = mat(0x0a120c, 0.4, 0.4, { emissive: 0x44ff66, emissiveIntensity: 1.2 })
  }

  get muzzleWorld() {
    return this.muzzle.getWorldPosition(_v2)
  }

  update(dt, input) {
    this.time += dt
    const p = this.player
    const t = this.time

    // visibility
    this.group.visible = this.visible && p.alive

    // ads interpolation handled by player; mirror
    const ads = p.ads

    // sway & bob
    const swayScale = (1 - ads * 0.8)
    const targetSwayX = clamp(-p.lookDX * 0.00085, -0.03, 0.03) * swayScale
    const targetSwayY = clamp(p.lookDY * 0.00085, -0.03, 0.03) * swayScale
    this.swayX += (targetSwayX - this.swayX) * Math.min(1, dt * 9)
    this.swayY += (targetSwayY - this.swayY) * Math.min(1, dt * 9)

    const bobX = Math.cos(p.bob) * 0.014 * p.bobAmp * swayScale
    const bobY = Math.sin(p.bob * 2) * 0.012 * p.bobAmp * swayScale

    // recoil kick
    this.kick *= Math.pow(0.0005, dt)
    const kick = this.kick

    // reload animation
    let reloadPose = 0
    if (this.reloading) {
      this.reloadT += dt
      const f = this.reloadT / this.reloadTime
      reloadPose = Math.sin(Math.min(1, f) * Math.PI)
      if (this.reloadStage === 0 && this.reloadT > 0.12) {
        this.reloadStage = 1
        this.audio.reload(1)
      } else if (this.reloadStage === 1 && this.reloadT > 0.95) {
        this.reloadStage = 2
        this.audio.reload(2)
      }
      if (this.reloadT >= this.reloadTime) {
        const need = this.magSize - this.ammo
        const take = Math.min(need, this.reserve)
        this.ammo += take
        this.reserve -= take
        this.reloading = false
        this.reloadT = 0
        this.hud.setAmmo(this.ammo, this.reserve)
        this.hud.setReloading(false)
      }
    }

    // throw animation
    this.throwT = Math.max(0, this.throwT - dt)

    // position / rotation
    const targetPos = _v.copy(this.hipPos).lerp(this.adsPos, ads)
    targetPos.x += this.swayX + bobX
    targetPos.y += this.swayY + bobY - reloadPose * 0.13 - this.throwT * 0.18
    targetPos.z += kick * 0.045 + reloadPose * 0.05

    const targetRot = this.hipRot
    this.group.position.lerp(targetPos, Math.min(1, dt * 16))
    this.group.rotation.x += ((targetRot.x + kick * 0.09 + reloadPose * 0.5 - this.throwT * 0.5) - this.group.rotation.x) * Math.min(1, dt * 14)
    this.group.rotation.y += ((targetRot.y * (1 - ads) + reloadPose * 0.16) - this.group.rotation.y) * Math.min(1, dt * 14)
    this.group.rotation.z += ((targetRot.z * (1 - ads) + reloadPose * 0.55 + this.swayX * 0.9) - this.group.rotation.z) * Math.min(1, dt * 14)

    // magazine drop during reload
    if (this.reloading) {
      const f = this.reloadT / this.reloadTime
      let my = -0.145
      if (f > 0.1 && f < 0.42) my = -0.145 - Math.sin((f - 0.1) / 0.32 * Math.PI) * 0.22
      else if (f >= 0.42 && f < 0.62) my = -0.36
      else if (f >= 0.62 && f < 0.8) my = -0.145 - Math.sin((0.8 - f) / 0.18 * Math.PI) * 0.22
      this.mag.position.y = my
    } else {
      this.mag.position.y += (-0.145 - this.mag.position.y) * Math.min(1, dt * 20)
    }

    this.led.material.emissiveIntensity = this.ammo > 6 ? 0.7 : (Math.sin(t * 14) > 0 ? 2.5 : 0.2)

    // firing
    const wantFire = input.fire || input.touchFire
    const canFire = p.alive && !this.reloading && t >= this.nextFire
    if (wantFire && canFire) {
      if (this.ammo > 0) {
        this._shoot(input)
        this.nextFire = t + this.fireDelay
        this.autoReload = 0
      } else {
        if (t > this.emptyClick) {
          this.audio.empty()
          this.emptyClick = t + 0.35
          this.hud.flashAmmo()
        }
        if (this.reserve > 0) this.autoReload += dt
        if (this.autoReload > 0.3) this.startReload()
      }
    }
    if (!wantFire) this.autoReload = 0

    // reload input
    if (input.consume('KeyR') && !this.reloading && this.ammo < this.magSize && this.reserve > 0 && p.alive) {
      this.startReload()
    }
    // grenade
    if (input.consume('KeyG') && p.alive && this.grenades > 0 && this.throwT <= 0) {
      this.throwGrenade()
    }

    // crosshair spread
    const moveSpread = clamp(p.speed / 8.2, 0, 1)
    const airSpread = p.onGround ? 0 : 0.35
    const spread = 0.12 + moveSpread * 0.55 + airSpread + kick * 2.2 - ads * 0.55
    this.hud.setSpread(clamp(spread, 0.02, 1.4))

    // grenades
    this._updateGrenades(dt)
  }

  startReload() {
    if (this.reloading || this.ammo >= this.magSize || this.reserve <= 0) return
    this.reloading = true
    this.reloadT = 0
    this.reloadStage = 0
    this.audio.reload(0)
    this.hud.setReloading(true, this.reloadTime)
  }

  _shoot(input) {
    const p = this.player
    this.ammo--
    this.stats.shots++
    if (this.game) this.game.stats.shots++
    this.hud.setAmmo(this.ammo, this.reserve)
    this.audio.shot()
    this.kick = Math.min(1.4, this.kick + 0.62)
    const ads = p.ads
    p.applyRecoil(0.014 + (1 - ads) * 0.006, (Math.random() - 0.5) * 0.009)
    p.addShake(0.025)

    // direction with spread
    const spread = (0.0022 + (p.moving ? 0.011 : 0.0015) + (p.onGround ? 0 : 0.028)) * (1 - ads * 0.78)
    this.camera.updateMatrixWorld()
    this.camera.getWorldDirection(_dir)
    _right.setFromMatrixColumn(this.camera.matrixWorld, 0)
    _up.setFromMatrixColumn(this.camera.matrixWorld, 1)
    const r = (Math.random() - 0.5) * 2 * spread
    const u = (Math.random() - 0.5) * 2 * spread
    _dir.addScaledVector(_right, r).addScaledVector(_up, u).normalize()

    const origin = this.camera.getWorldPosition(new THREE.Vector3())
    this.raycaster.set(origin, _dir)

    const targets = this.world.solids.slice()
    if (this.game) targets.push(...this.game.enemies.hitMeshes)
    const hits = this.raycaster.intersectObjects(targets, false)
    const hit = hits.length ? hits[0] : null

    const muzzlePos = this.muzzleWorld.clone()
    const end = hit ? hit.point.clone() : origin.clone().addScaledVector(_dir, 120)

    if (hit && hit.object.userData.enemy) {
      const enemy = hit.object.userData.enemy
      const part = hit.object.userData.part
      const isHead = part === 'head'
      const dmg = this.damage * (isHead ? this.headMult : 1)
      const killed = enemy.hit(dmg, hit.point, isHead, this)
      this.stats.hits++
      if (this.game) this.game.stats.hits++
      if (isHead) { this.stats.headshots++; if (this.game) this.game.stats.headshots++ }
      this.hud.hitmarker(isHead, killed)
      this.audio.hit(isHead)
      this.effects.sparks(hit.point, hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : _up, isHead ? 18 : 10, isHead ? 0xff4a3a : 0xffa050, 5)
      this.effects.smoke(hit.point, 1, 0x555b63, 0.6)
    } else if (hit) {
      let n = _up.clone()
      if (hit.face) {
        n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
      }
      this.effects.impact(hit.point, n, hit.object === this.world.floor ? 'concrete' : 'metal')
    }

    this.effects.tracer(muzzlePos, end, 0xffd49a, 0.024, 0.06)
    this.effects.muzzle(muzzlePos, 0xffb060)
    this.effects.smoke(muzzlePos, 1, 0x8a8f96, 0.35)
    // shell eject
    _v.copy(muzzlePos).addScaledVector(_right, -0.08)
    _v.y += 0.02
    this.effects.shell(_v, _right)
  }

  throwGrenade() {
    this.grenades--
    this.hud.setGrenades(this.grenades)
    this.throwT = 0.45
    this.audio.uiClick()
    const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat)
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.012, 5, 14), this.grenadeBandMat)
    band.rotation.x = Math.PI / 2
    mesh.add(band)
    const pos = this.camera.getWorldPosition(new THREE.Vector3())
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    mesh.position.copy(pos).addScaledVector(dir, 0.7)
    this.scene.add(mesh)
    const vel = dir.clone().multiplyScalar(15).add(new THREE.Vector3(0, 4.2, 0))
    this.grenadeList.push({ mesh, vel, fuse: 1.65, t: 0, trail: 0 })
  }

  _updateGrenades(dt) {
    for (let i = this.grenadeList.length - 1; i >= 0; i--) {
      const gr = this.grenadeList[i]
      gr.t += dt
      gr.fuse -= dt
      gr.vel.y -= 20 * dt
      gr.mesh.position.addScaledVector(gr.vel, dt)
      gr.mesh.rotation.x += dt * 9
      gr.mesh.rotation.z += dt * 5
      if (gr.mesh.position.y < 0.11) {
        gr.mesh.position.y = 0.11
        gr.vel.y = Math.abs(gr.vel.y) * 0.42
        gr.vel.x *= 0.72
        gr.vel.z *= 0.72
      }
      const b = 29
      if (Math.abs(gr.mesh.position.x) > b) { gr.mesh.position.x = Math.sign(gr.mesh.position.x) * b; gr.vel.x *= -0.5 }
      if (Math.abs(gr.mesh.position.z) > b) { gr.mesh.position.z = Math.sign(gr.mesh.position.z) * b; gr.vel.z *= -0.5 }

      gr.trail -= dt
      if (gr.trail <= 0) {
        gr.trail = 0.06
        this.effects.smoke(gr.mesh.position, 1, 0x777c84, 0.4)
      }
      // blink
      const band = gr.mesh.children[0]
      if (band) band.material.emissiveIntensity = (Math.sin(gr.t * 22) > 0 ? 2.6 : 0.3)

      if (gr.fuse <= 0) {
        this._explode(gr.mesh.position)
        this.scene.remove(gr.mesh)
        this.grenadeList.splice(i, 1)
      }
    }
  }

  _explode(pos) {
    this.effects.explosion(pos, 1.15)
    this.audio.explosion()
    this.player.addShake(0.32)
    const p = this.player
    const pd = p.pos.distanceTo(pos)
    if (pd < 5.5) {
      const dmg = 34 * (1 - pd / 5.5)
      if (dmg > 2) p.takeDamage(dmg, pos)
    }
    if (this.game) {
      for (const e of this.game.enemies.list) {
        if (!e.alive) continue
        const d = e.group.position.distanceTo(pos)
        if (d < 7.5) {
          const dmg = 190 * (1 - d / 7.5)
          e.hit(dmg, e.group.position.clone().setY(1.2), false, this)
        }
      }
    }
  }

  addGrenades(n) {
    this.grenades = Math.min(6, this.grenades + n)
    this.hud.setGrenades(this.grenades)
  }

  reset() {
    this.ammo = this.magSize
    this.reserve = 210
    this.grenades = 3
    this.reloading = false
    this.reloadT = 0
    this.nextFire = 0
    this.kick = 0
    this.throwT = 0
    this.stats = { shots: 0, hits: 0, headshots: 0 }
    for (const gr of this.grenadeList) this.scene.remove(gr.mesh)
    this.grenadeList.length = 0
    this.hud.setAmmo(this.ammo, this.reserve)
    this.hud.setGrenades(this.grenades)
    this.hud.setReloading(false)
  }
}
