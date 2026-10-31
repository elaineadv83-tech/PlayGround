import * as THREE from 'three'
import { glowTexture, sparkTexture } from './textures.js'

const _v = new THREE.Vector3()
const _v2 = new THREE.Vector3()

const TYPES = {
  grunt: {
    hp: 105, speed: 2.45, scale: 1, visor: 0xff2a2a, core: 0xff6a1e,
    damage: 6, interval: [2.2, 3.4], burst: 3, spread: 0.02, accuracy: 0.5,
    score: 100, preferred: 14, name: 'GRUNT'
  },
  scout: {
    hp: 72, speed: 3.45, scale: 0.92, visor: 0x38d8ff, core: 0x38d8ff,
    damage: 8, interval: [3.0, 4.4], burst: 1, spread: 0.004, accuracy: 0.74,
    score: 160, preferred: 21, name: 'STALKER'
  },
  heavy: {
    hp: 265, speed: 1.55, scale: 1.24, visor: 0xff9a1e, core: 0xff3a00,
    damage: 10, interval: [3.0, 4.2], burst: 3, spread: 0.032, accuracy: 0.6,
    score: 280, preferred: 10, name: 'JUGGERNAUT'
  }
}

function armorMat(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.88, roughness: 0.38, emissive: 0x000000 })
}

class Enemy {
  constructor(manager, type, pos, wave) {
    this.manager = manager
    this.type = type
    this.cfg = TYPES[type]
    this.scene = manager.scene
    this.world = manager.world
    this.effects = manager.effects
    this.audio = manager.audio
    this.player = manager.player

    const cfg = this.cfg
    this.maxHp = cfg.hp * (1 + Math.max(0, wave - 1) * 0.11)
    this.hp = this.maxHp
    this.speed = cfg.speed
    this.alive = true
    this.dying = false
    this.deathT = 0
    this.lastHeadshot = false
    this.spawnT = 0
    this.spawning = true
    this.phase = Math.random() * 10
    this.walk = 0
    this.flash = 0
    this.fireTimer = 1 + Math.random() * 2
    this.burstLeft = 0
    this.burstTimer = 0
    this.meleeTimer = 0
    this.los = false
    this.losTimer = 0
    this.strafeDir = Math.random() > 0.5 ? 1 : -1
    this.strafeTimer = 2 + Math.random() * 3
    this.stagger = 0
    this.hitMeshes = []

    this.group = new THREE.Group()
    this.group.position.copy(pos)
    this.group.position.y = 0
    this.group.scale.setScalar(0.01)
    this.scene.add(this.group)
    this._build()
    this.group.rotation.y = Math.atan2(
      this.player.pos.x - pos.x,
      this.player.pos.z - pos.z
    )

    // spawn fx
    this.effects.sparks(_v.copy(pos).setY(0.4), new THREE.Vector3(0, 1, 0), 26, cfg.visor, 8)
    this.effects.smoke(_v.copy(pos).setY(0.6), 3, 0x5c6470, 1.4)
    this.effects.muzzle(_v.copy(pos).setY(1), cfg.visor)
    this.audio.enemyShot(type === 'heavy')
  }

  _build() {
    const cfg = this.cfg
    const armor = armorMat(0x39424d)
    const plate = armorMat(0x596471)
    const joint = new THREE.MeshStandardMaterial({ color: 0x101215, metalness: 0.35, roughness: 0.82 })
    const visor = new THREE.MeshStandardMaterial({
      color: 0x090909, emissive: cfg.visor, emissiveIntensity: 3.2, roughness: 0.2, metalness: 0.2
    })
    const trim = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, emissive: cfg.visor, emissiveIntensity: 2.2, roughness: 0.4
    })
    const core = new THREE.MeshStandardMaterial({
      color: 0x080808, emissive: cfg.core, emissiveIntensity: 2.6, roughness: 0.3
    })
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x191c20, metalness: 0.8, roughness: 0.42 })
    this.armorMat = armor
    this.plateMat = plate
    this.visorMat = visor
    this.coreMat = core

    const box = (w, h, d, m, x, y, z, parent = this.group) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }

    // torso group
    const torso = new THREE.Group()
    torso.position.y = 1.16
    this.group.add(torso)
    this.torso = torso

    box(0.58, 0.5, 0.34, armor, 0, 0.14, 0, torso)
    box(0.44, 0.26, 0.3, joint, 0, -0.19, 0, torso)
    const chest = box(0.46, 0.34, 0.09, plate, 0, 0.17, 0.19, torso)
    const chestL = box(0.18, 0.32, 0.07, plate, -0.15, 0.2, 0.225, torso)
    chestL.rotation.z = 0.16
    const chestR = box(0.18, 0.32, 0.07, plate, 0.15, 0.2, 0.225, torso)
    chestR.rotation.z = -0.16
    box(0.02, 0.26, 0.02, trim, -0.225, 0.2, 0.235, torso)
    box(0.02, 0.26, 0.02, trim, 0.225, 0.2, 0.235, torso)
    box(0.34, 0.07, 0.1, joint, 0, 0.36, 0.19, torso)
    chest.userData.enemy = this
    chest.userData.part = 'body'
    this.hitMeshes.push(chest)
    // shoulder pads
    box(0.22, 0.19, 0.36, plate, -0.41, 0.38, 0, torso)
    box(0.22, 0.19, 0.36, plate, 0.41, 0.38, 0, torso)
    box(0.18, 0.025, 0.3, trim, -0.41, 0.48, 0, torso)
    box(0.18, 0.025, 0.3, trim, 0.41, 0.48, 0, torso)
    // core
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), core)
    coreMesh.position.set(0, 0.17, 0.24)
    torso.add(coreMesh)
    this.coreMesh = coreMesh
    // back pack
    box(0.34, 0.4, 0.16, joint, 0, 0.14, -0.22, torso)
    box(0.03, 0.26, 0.02, trim, 0.1, 0.16, -0.31, torso)
    box(0.03, 0.26, 0.02, trim, -0.1, 0.16, -0.31, torso)
    box(0.05, 0.05, 0.03, trim, 0, 0.31, -0.31, torso)
    box(0.06, 0.3, 0.06, plate, 0.12, 0.2, -0.32, torso)

    // head
    const headGroup = new THREE.Group()
    headGroup.position.set(0, 0.48, 0.02)
    torso.add(headGroup)
    this.headGroup = headGroup
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 8), joint)
    neck.position.y = -0.02
    headGroup.add(neck)
    const head = box(0.27, 0.26, 0.29, armor, 0, 0.14, 0, headGroup)
    const crest = box(0.29, 0.07, 0.3, plate, 0, 0.285, -0.01, headGroup)
    crest.rotation.x = -0.12
    box(0.06, 0.1, 0.08, joint, 0.155, 0.13, -0.01, headGroup)
    box(0.06, 0.1, 0.08, joint, -0.155, 0.13, -0.01, headGroup)
    box(0.17, 0.055, 0.035, joint, 0, 0.065, 0.15, headGroup)
    head.userData.enemy = this
    head.userData.part = 'head'
    this.hitMeshes.push(head)
    const face = box(0.235, 0.075, 0.04, visor, 0, 0.155, 0.157, headGroup)
    face.userData.enemy = this
    face.userData.part = 'head'
    this.hitMeshes.push(face)
    box(0.06, 0.06, 0.06, plate, 0.14, 0.3, 0, headGroup)
    // antenna
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), joint)
    ant.position.set(-0.12, 0.38, -0.04)
    headGroup.add(ant)
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), visor)
    antTip.position.set(-0.12, 0.5, -0.04)
    headGroup.add(antTip)

    // arms
    const mkArm = (side) => {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.38, 0.36, 0)
      torso.add(pivot)
      const upper = box(0.14, 0.36, 0.15, joint, 0, -0.18, 0, pivot)
      upper.castShadow = true
      const elbow = new THREE.Group()
      elbow.position.y = -0.37
      pivot.add(elbow)
      box(0.13, 0.33, 0.14, armor, 0, -0.16, 0, elbow)
      const hand = box(0.11, 0.1, 0.12, joint, 0, -0.34, 0, elbow)
      return { pivot, elbow, hand }
    }
    this.armL = mkArm(-1)
    this.armR = mkArm(1)
    this.armL.pivot.rotation.x = -0.35
    this.armR.pivot.rotation.x = -0.75
    this.armR.elbow.rotation.x = -0.5
    this.armL.elbow.rotation.x = -0.55

    // rifle held in front
    const gun = new THREE.Group()
    gun.position.set(0.14, 0.04, 0.3)
    torso.add(gun)
    box(0.08, 0.11, 0.48, gunMat, 0, 0, 0, gun)
    box(0.06, 0.14, 0.07, gunMat, 0, -0.11, -0.02, gun)
    box(0.1, 0.1, 0.12, joint, 0, -0.09, -0.05, gun)
    box(0.09, 0.09, 0.12, joint, 0, -0.01, 0.24, gun)
    box(0.04, 0.04, 0.34, gunMat, 0, 0.02, 0.36, gun)
    box(0.05, 0.14, 0.08, gunMat, 0, -0.1, 0.02, gun)
    box(0.03, 0.03, 0.16, gunMat, 0, 0.08, -0.02, gun)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), visor)
    tip.position.set(0, 0.02, 0.54)
    gun.add(tip)
    this.gunMuzzle = new THREE.Object3D()
    this.gunMuzzle.position.set(0, 0.02, 0.6)
    gun.add(this.gunMuzzle)

    // legs
    const mkLeg = (side) => {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.16, 0.95, 0)
      this.group.add(pivot)
      box(0.17, 0.44, 0.19, armor, 0, -0.22, 0, pivot)
      const knee = new THREE.Group()
      knee.position.y = -0.45
      pivot.add(knee)
      box(0.15, 0.4, 0.17, joint, 0, -0.2, 0, knee)
      box(0.17, 0.1, 0.26, plate, 0, -0.4, 0.04, knee)
      return { pivot, knee }
    }
    this.legL = mkLeg(-1)
    this.legR = mkLeg(1)

    // knee pads / details
    box(0.2, 0.16, 0.06, plate, -0.16, 0.65, 0.1, this.group)
    box(0.2, 0.16, 0.06, plate, 0.16, 0.65, 0.1, this.group)
    // luminous trim
    box(0.02, 0.2, 0.02, trim, -0.255, 0.72, 0.06, this.group)
    box(0.02, 0.2, 0.02, trim, 0.255, 0.72, 0.06, this.group)
    box(0.02, 0.18, 0.02, trim, -0.46, 1.55, 0.08, this.group)
    box(0.02, 0.18, 0.02, trim, 0.46, 1.55, 0.08, this.group)
    box(0.02, 0.18, 0.02, trim, -0.18, 0.28, 0.09, this.group)
    box(0.02, 0.18, 0.02, trim, 0.18, 0.28, 0.09, this.group)

    this.group.scale.setScalar(0.01)
    this.group.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    this.targetScale = cfg.scale
  }

  update(dt, time) {
    const cfg = this.cfg
    this.flash = Math.max(0, this.flash - dt * 6)
    this.armorMat.emissive.setRGB(this.flash * 0.9, this.flash * 0.25, this.flash * 0.08)
    this.armorMat.emissiveIntensity = this.flash * 2.2

    if (this.spawning) {
      this.spawnT += dt
      const f = Math.min(1, this.spawnT / 0.45)
      const s = this.targetScale * (0.4 + 0.6 * (1 - Math.pow(1 - f, 3)))
      this.group.scale.setScalar(s)
      this.group.position.y = (1 - f) * 0.5
      if (f >= 1) {
        this.spawning = false
        this.group.scale.setScalar(this.targetScale)
        this.group.position.y = 0
        this.manager._rebuildHitMeshes()
      }
      return
    }

    if (this.dying) {
      this.deathT += dt
      const f = Math.min(1, this.deathT / 0.7)
      this.group.rotation.x = -f * Math.PI * 0.5
      this.group.position.y = -Math.max(0, this.deathT - 1.6) * 0.55
      this.visorMat.emissiveIntensity = Math.max(0, 3.2 - this.deathT * 4)
      this.coreMat.emissiveIntensity = Math.max(0, 2.6 - this.deathT * 3)
      if (this.deathT > 3.4) this.manager._remove(this)
      return
    }

    const p = this.player.pos
    const dx = p.x - this.group.position.x
    const dz = p.z - this.group.position.z
    const dist = Math.hypot(dx, dz)

    // face player
    const targetYaw = Math.atan2(dx, dz)
    let dyaw = targetYaw - this.group.rotation.y
    while (dyaw > Math.PI) dyaw -= Math.PI * 2
    while (dyaw < -Math.PI) dyaw += Math.PI * 2
    this.group.rotation.y += dyaw * Math.min(1, dt * 5)

    // line of sight
    this.losTimer -= dt
    if (this.losTimer <= 0) {
      this.losTimer = 0.22 + Math.random() * 0.12
      _v.copy(this.group.position).setY(1.55)
      _v2.copy(this.player.camera.position)
      this.los = this.world.lineOfSight(_v, _v2)
    }

    // movement
    let moveX = 0, moveZ = 0
    const pref = cfg.preferred
    const toPlayer = _v.set(dx, 0, dz).normalize()
    this.strafeTimer -= dt
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 2 + Math.random() * 2.5
      this.strafeDir *= -1
    }

    if (!this.los) {
      moveX = toPlayer.x
      moveZ = toPlayer.z
    } else if (dist > pref + 3) {
      moveX = toPlayer.x
      moveZ = toPlayer.z
    } else if (dist < pref - 4) {
      moveX = -toPlayer.x
      moveZ = -toPlayer.z
    } else {
      moveX = -toPlayer.z * this.strafeDir * 0.75
      moveZ = toPlayer.x * this.strafeDir * 0.75
    }

    // separation
    for (const other of this.manager.list) {
      if (other === this || !other.alive || other.dying) continue
      const ox = this.group.position.x - other.group.position.x
      const oz = this.group.position.z - other.group.position.z
      const d = Math.hypot(ox, oz)
      if (d > 0.001 && d < 1.9) {
        moveX += (ox / d) * (1.9 - d) * 0.8
        moveZ += (oz / d) * (1.9 - d) * 0.8
      }
    }

    const ml = Math.hypot(moveX, moveZ)
    if (ml > 0.01) {
      moveX /= ml; moveZ /= ml
      const sp = this.speed * (this.los ? 0.85 : 1.05)
      this.group.position.x += moveX * sp * dt
      this.group.position.z += moveZ * sp * dt
      this.walk += dt * sp * 3.4
      this.group.position.y = Math.abs(Math.sin(this.walk * 2)) * 0.035
      // walk animation
      const s = Math.sin(this.walk)
      this.legL.pivot.rotation.x = s * 0.62
      this.legR.pivot.rotation.x = -s * 0.62
      this.legL.knee.rotation.x = Math.max(0, -s) * 0.7
      this.legR.knee.rotation.x = Math.max(0, s) * 0.7
      this.armL.pivot.rotation.x = -0.35 - s * 0.2
      this.armR.pivot.rotation.x = -0.75 + s * 0.08
    } else {
      this.group.position.y *= Math.pow(0.01, dt)
      const idle = Math.sin(time * 2 + this.phase) * 0.02
      this.legL.pivot.rotation.x *= Math.pow(0.02, dt)
      this.legR.pivot.rotation.x *= Math.pow(0.02, dt)
      this.legL.knee.rotation.x *= Math.pow(0.02, dt)
      this.legR.knee.rotation.x *= Math.pow(0.02, dt)
      this.armL.pivot.rotation.x = -0.35 + idle
      this.armR.pivot.rotation.x = -0.75 + idle * 0.5
    }

    // keep out of props / walls
    this.manager.resolve(this.group.position, 0.45 * this.targetScale)

    // stagger
    if (this.stagger > 0) {
      this.stagger = Math.max(0, this.stagger - dt * 4)
      this.torso.rotation.z = Math.sin(time * 40) * 0.05 * this.stagger
    } else {
      this.torso.rotation.z *= Math.pow(0.02, dt)
    }
    this.torso.rotation.x = Math.sin(time * 2 + this.phase) * 0.015

    // combat
    this.meleeTimer -= dt
    if (dist < 2.3 * this.targetScale && this.meleeTimer <= 0) {
      this.meleeTimer = 1.3
      this.player.takeDamage(9 * (this.targetScale > 1.1 ? 1.4 : 1), this.group.position)
      this.effects.sparks(this.player.camera.position, new THREE.Vector3(0, 1, 0), 8, 0xff4030, 3)
      this.audio.hit()
    }

    this.fireTimer -= dt
    if (this.fireTimer <= 0 && this.los && dist < 42) {
      this.fireTimer = cfg.interval[0] + Math.random() * (cfg.interval[1] - cfg.interval[0])
      this.burstLeft = cfg.burst
      this.burstTimer = 0.4
    }
    if (this.burstLeft > 0) {
      this.burstTimer -= dt
      if (this.burstTimer <= 0) {
        this._shoot(dist)
        this.burstLeft--
        this.burstTimer = 0.13
      }
    }

    // visor glow telegraph
    const windup = this.burstLeft > 0 && this.burstTimer > 0.12
    const targetGlow = windup ? 9 : 3.2
    this.visorMat.emissiveIntensity += (targetGlow - this.visorMat.emissiveIntensity) * Math.min(1, dt * 12)
    this.coreMat.emissiveIntensity = 2.2 + Math.sin(time * 3 + this.phase) * 0.6 + this.flash * 3
  }

  _shoot(dist) {
    const cfg = this.cfg
    const muzzle = this.gunMuzzle.getWorldPosition(new THREE.Vector3())
    const eye = this.player.camera.position
    const chance = cfg.accuracy * Math.max(0.35, Math.min(1.15, 1.25 - dist / 50)) * (this.player.sprinting ? 0.82 : 1)
    const hit = Math.random() < chance
    const end = eye.clone()
    if (!hit) {
      end.x += (Math.random() - 0.5) * 2.6
      end.y += (Math.random() - 0.5) * 2.2
      end.z += (Math.random() - 0.5) * 2.6
    } else {
      end.x += (Math.random() - 0.5) * 0.25
      end.y += (Math.random() - 0.5) * 0.25
      end.z += (Math.random() - 0.5) * 0.25
    }
    this.effects.tracer(muzzle, end, cfg.visor, this.type === 'scout' ? 0.016 : 0.022, 0.09)
    this.effects.muzzle(muzzle, cfg.visor)
    this.audio.enemyShot(this.type === 'heavy')
    this.visorMat.emissiveIntensity = 10

    if (hit && this.player.alive) {
      this.player.takeDamage(cfg.damage * (0.9 + Math.random() * 0.2), this.group.position)
    }
  }

  hit(damage, point, headshot, weapon) {
    if (!this.alive || this.dying || this.spawning) return false
    this.hp -= damage
    this.flash = 1
    this.stagger = 1
    this.lastHeadshot = headshot
    this.effects.sparks(point, new THREE.Vector3(0, 1, 0), headshot ? 16 : 8, headshot ? 0xff3a2a : 0xffa050, 5)
    if (this.hp <= 0) {
      this.die(headshot)
      return true
    }
    return false
  }

  die(headshot) {
    if (this.dying) return
    this.alive = false
    this.dying = true
    this.deathT = 0
    this.manager._onDeath(this, headshot)
    this.effects.sparks(this.group.position.clone().setY(1.2), new THREE.Vector3(0, 1, 0), 40, this.cfg.visor, 8)
    this.effects.smoke(this.group.position.clone().setY(1.1), 4, 0x4d545d, 1.6)
    this.effects.muzzle(this.group.position.clone().setY(1.2), this.cfg.visor)
    this.effects.explosion(this.group.position.clone().setY(1.1), 0.35)
    this.audio.kill()
    this.audio.explosion()
    this.manager._rebuildHitMeshes()
  }
}

export class EnemyManager {
  constructor(scene, world, effects, audio, player) {
    this.scene = scene
    this.world = world
    this.effects = effects
    this.audio = audio
    this.player = player
    this.list = []
    this.hitMeshes = []
    this.onKill = null
    this.beams = []
    this.time = 0
  }

  spawn(type, pos, wave) {
    const e = new Enemy(this, type, pos, wave)
    this.list.push(e)
    this._rebuildHitMeshes()

    // spawn beam
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 7, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: e.cfg.visor, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    )
    beam.position.copy(pos).setY(3.5)
    this.scene.add(beam)
    this.beams.push({ mesh: beam, life: 0.7, max: 0.7 })
    return e
  }

  resolve(pos, radius) {
    const beforeX = pos.x, beforeZ = pos.z
    // manual circle resolve for XZ only
    for (const c of this.world.colliders) {
      if (c.top <= 0.4) continue
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX))
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ))
      let dx = pos.x - cx
      let dz = pos.z - cz
      const d2 = dx * dx + dz * dz
      if (d2 < radius * radius) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2)
          pos.x = cx + (dx / d) * radius
          pos.z = cz + (dz / d) * radius
        } else {
          pos.x = beforeX
          pos.z = beforeZ
        }
      }
    }
    const b = 29.2
    pos.x = Math.max(-b, Math.min(b, pos.x))
    pos.z = Math.max(-b, Math.min(b, pos.z))
  }

  _rebuildHitMeshes() {
    this.hitMeshes.length = 0
    for (const e of this.list) {
      if (e.alive && !e.dying && !e.spawning) this.hitMeshes.push(...e.hitMeshes)
    }
  }

  _onDeath(enemy, headshot) {
    this._rebuildHitMeshes()
    if (this.onKill) this.onKill(enemy, headshot)
  }

  _remove(enemy) {
    this.scene.remove(enemy.group)
    enemy.group.traverse(o => {
      if (o.isMesh) {
        o.geometry.dispose()
      }
    })
    const i = this.list.indexOf(enemy)
    if (i >= 0) this.list.splice(i, 1)
  }

  get aliveCount() {
    return this.list.filter(e => e.alive && !e.dying).length
  }

  get totalActive() {
    return this.list.filter(e => e.alive).length
  }

  update(dt, time) {
    this.time = time
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i]
      e.update(dt, time)
      e.group.updateMatrixWorld(true)
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]
      b.life -= dt
      const f = b.life / b.max
      if (f <= 0) {
        this.scene.remove(b.mesh)
        b.mesh.geometry.dispose()
        b.mesh.material.dispose()
        this.beams.splice(i, 1)
        continue
      }
      b.mesh.material.opacity = f * 0.4
      b.mesh.scale.set(1 + (1 - f) * 0.6, 1, 1 + (1 - f) * 0.6)
    }
  }

  clear() {
    for (const e of this.list) {
      this.scene.remove(e.group)
      e.group.traverse(o => { if (o.isMesh) o.geometry.dispose() })
    }
    this.list.length = 0
    this.hitMeshes.length = 0
    for (const b of this.beams) {
      this.scene.remove(b.mesh)
      b.mesh.geometry.dispose()
      b.mesh.material.dispose()
    }
    this.beams.length = 0
  }
}
