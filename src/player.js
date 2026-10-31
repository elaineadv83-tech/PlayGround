import * as THREE from 'three'
import { resolveCircle } from './world.js'

const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _wish = new THREE.Vector3()

export class Player {
  constructor(camera, world, audio) {
    this.camera = camera
    this.world = world
    this.audio = audio
    this.pos = new THREE.Vector3(0, 0, 13)
    this.vel = new THREE.Vector3()
    this.yaw = 0
    this.pitch = 0
    this.recoilPitch = 0
    this.recoilYaw = 0
    this.roll = 0
    this.radius = 0.42
    this.health = 150
    this.maxHealth = 150
    this.alive = true
    this.onGround = true
    this.eye = 1.68
    this.crouch = 0
    this.bob = 0
    this.bobAmp = 0
    this.stepTimer = 0
    this.ads = 0
    this.adsTarget = 0
    this.sprinting = false
    this.moving = false
    this.speed = 0
    this.lastDamage = -100
    this.regenDelay = 5
    this.regenRate = 18
    this.shake = 0
    this.shakeTime = 0
    this.dip = 0
    this.lookDX = 0
    this.lookDY = 0
    this.sensitivity = 1
    this.onDamage = null
    this.onDeath = null
    this.time = 0
    this.wasOnGround = true
  }

  reset() {
    this.pos.set(0, 0, 13)
    this.vel.set(0, 0, 0)
    this.yaw = 0
    this.pitch = 0
    this.recoilPitch = 0
    this.recoilYaw = 0
    this.health = this.maxHealth
    this.alive = true
    this.crouch = 0
    this.ads = 0
    this.adsTarget = 0
    this.lastDamage = -100
    this.shake = 0
    this.dip = 0
    this.onGround = true
    this.wasOnGround = true
  }

  look(dx, dy) {
    const sens = 0.0022 * this.sensitivity
    this.yaw -= dx * sens
    this.pitch -= dy * sens
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch))
    this.lookDX = dx
    this.lookDY = dy
  }

  applyRecoil(pitch, yaw) {
    this.recoilPitch += pitch
    this.recoilYaw += yaw
    this.shake = Math.min(0.12, this.shake + 0.015)
  }

  addShake(v) {
    this.shake = Math.min(0.35, this.shake + v)
    this.shakeTime = 0.3
  }

  takeDamage(amount, source) {
    if (!this.alive) return
    this.health = Math.max(0, this.health - amount)
    this.lastDamage = this.time
    this.addShake(0.1 + amount * 0.004)
    this.audio.damage()
    if (this.onDamage) this.onDamage(amount, source)
    if (this.health <= 0) {
      this.alive = false
      if (this.onDeath) this.onDeath()
    }
  }

  update(dt, input, canMove = true) {
    this.time += dt
    this.lookDX *= Math.pow(0.001, dt)
    this.lookDY *= Math.pow(0.001, dt)

    const crouching = input.down('ControlLeft') || input.down('KeyC') || input.down('ShiftRight')
    const wantSprint = (input.down('ShiftLeft') || input.touchSprint) && !crouching
    this.sprinting = wantSprint && this.moving && this.ads < 0.4

    this.adsTarget = (input.ads || input.touchAds) && !this.sprinting ? 1 : 0
    this.ads += (this.adsTarget - this.ads) * Math.min(1, dt * 11)

    // movement input
    let ix = 0, iz = 0
    if (canMove) {
      if (input.down('KeyW')) iz -= 1
      if (input.down('KeyS')) iz += 1
      if (input.down('KeyA')) ix -= 1
      if (input.down('KeyD')) ix += 1
      if (Math.abs(input.touchMove.x) > 0.08) ix += input.touchMove.x
      if (Math.abs(input.touchMove.y) > 0.08) iz += input.touchMove.y
    }
    const mag = Math.hypot(ix, iz)
    if (mag > 1) { ix /= mag; iz /= mag }

    const targetCrouch = crouching ? 1 : 0
    this.crouch += (targetCrouch - this.crouch) * Math.min(1, dt * 9)

    let maxSpeed = this.sprinting ? 8.2 : 5.0
    if (crouching) maxSpeed = 2.6
    if (this.ads > 0.5) maxSpeed = Math.min(maxSpeed, 3.4)

    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    _wish.set(0, 0, 0).addScaledVector(_fwd, -iz).addScaledVector(_right, ix)
    if (_wish.lengthSq() > 1) _wish.normalize()

    const accel = this.onGround ? 14 : 4.5
    const desiredX = _wish.x * maxSpeed
    const desiredZ = _wish.z * maxSpeed
    this.vel.x += (desiredX - this.vel.x) * Math.min(1, accel * dt)
    this.vel.z += (desiredZ - this.vel.z) * Math.min(1, accel * dt)
    if (mag < 0.01 && this.onGround) {
      const damp = Math.pow(0.0008, dt)
      this.vel.x *= damp
      this.vel.z *= damp
    }

    this.moving = Math.hypot(this.vel.x, this.vel.z) > 0.8
    this.speed = Math.hypot(this.vel.x, this.vel.z)

    // jump + gravity
    if (canMove && input.consume('Space') && this.onGround) {
      this.vel.y = 6.2
      this.onGround = false
      this.audio.jump()
    }
    this.vel.y -= 20 * dt
    this.pos.x += this.vel.x * dt
    this.pos.z += this.vel.z * dt
    this.pos.y += this.vel.y * dt

    if (this.pos.y <= 0) {
      if (!this.wasOnGround && this.vel.y < -4) {
        this.audio.land()
        this.dip = Math.min(0.16, -this.vel.y * 0.014)
      }
      this.pos.y = 0
      this.vel.y = 0
      this.onGround = true
    } else {
      this.onGround = false
    }
    this.wasOnGround = this.onGround

    // collisions
    resolveCircle(this.pos, this.radius, this.world.colliders, this.pos.y)
    const bound = 29.3
    this.pos.x = Math.max(-bound, Math.min(bound, this.pos.x))
    this.pos.z = Math.max(-bound, Math.min(bound, this.pos.z))

    // head bob + footsteps
    const bobSpeed = this.speed / 5
    if (this.onGround && this.moving) {
      this.bob += dt * (7.5 + bobSpeed * 3.5)
      this.stepTimer -= dt
      if (this.stepTimer <= 0) {
        this.audio.footstep(this.sprinting)
        this.stepTimer = this.sprinting ? 0.32 : 0.46
      }
    } else {
      this.stepTimer = Math.min(this.stepTimer, 0.15)
    }
    this.bobAmp += ((this.moving && this.onGround ? 1 : 0) - this.bobAmp) * Math.min(1, dt * 8)

    // health regen
    if (this.alive && this.time - this.lastDamage > this.regenDelay && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt)
    }

    // recoil recovery
    const rec = Math.pow(0.0009, dt)
    this.recoilPitch *= rec
    this.recoilYaw *= rec

    this.dip *= Math.pow(0.002, dt)
    this.shake *= Math.pow(0.0005, dt)

    // camera
    const bobY = Math.sin(this.bob * 2) * 0.035 * this.bobAmp * (1 - this.ads * 0.8)
    const bobX = Math.cos(this.bob) * 0.045 * this.bobAmp * (1 - this.ads * 0.8)
    const eyeH = this.eye - this.crouch * 0.62
    const shakeAmt = this.shake
    this.camera.position.set(
      this.pos.x + bobX + (Math.random() - 0.5) * shakeAmt,
      this.pos.y + eyeH + bobY - this.dip + (Math.random() - 0.5) * shakeAmt,
      this.pos.z + (Math.random() - 0.5) * shakeAmt
    )
    this.roll = -this.vel.x * 0.0025 * (1 - this.ads) + Math.sin(this.bob) * 0.004 * this.bobAmp

    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.set(
      this.pitch + this.recoilPitch,
      this.yaw + this.recoilYaw,
      this.roll
    )

    // fov
    const baseFov = this.sprinting ? 84 : 78
    const targetFov = baseFov - this.ads * 26
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 10)
      this.camera.updateProjectionMatrix()
    }
  }

  get eyePosition() {
    return this.camera.position
  }

  get forward() {
    return this.camera.getWorldDirection(_fwd)
  }
}
