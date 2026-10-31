import * as THREE from 'three'
import { World } from './world.js'
import { Effects } from './effects.js'
import { AudioSys } from './audio.js'
import { Input } from './input.js'
import { Player } from './player.js'
import { Weapon } from './weapons.js'
import { EnemyManager } from './enemies.js'
import { HUD } from './hud.js'
import { glowTexture } from './textures.js'
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js'
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js'

const canvas = document.getElementById('scene')

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance', stencil: false
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.06, 260)
    this.camera.position.set(0, 1.7, 13)
    this.scene.add(this.camera)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.5, 0.92)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    const lamp = new THREE.SpotLight(0xcfe2ff, 22, 42, 0.5, 0.75, 1.55)
    lamp.position.set(0, 0, 0)
    lamp.target.position.set(0, -0.04, -1)
    lamp.castShadow = false
    this.camera.add(lamp)
    this.camera.add(lamp.target)
    this.tacticalLight = lamp

    this.hud = new HUD()
    this.audio = new AudioSys()
    this.input = new Input(canvas)
    this.world = new World(this.scene, this.renderer)
    this.effects = new Effects(this.scene)
    this.player = new Player(this.camera, this.world, this.audio)
    this.weapon = new Weapon(this.camera, this.scene, this.player, this.world, this.effects, this.audio, this.hud)
    this.enemies = new EnemyManager(this.scene, this.world, this.effects, this.audio, this.player)

    this.state = 'menu'
    this.time = 0
    this.menuT = 0
    this.wave = 0
    this.spawnQueue = []
    this.spawnTimer = 0
    this.intermission = 0
    this.maxAlive = 5
    this.pickups = []
    this.comboCount = 0
    this.lastKillTime = -10
    this.stats = { shots: 0, hits: 0, headshots: 0, kills: 0, score: 0, bestStreak: 0 }
    this.streak = 0
    this.clock = new THREE.Clock()
    this.weapon.bindGame(this)
    this.weapon.visible = false
    this.enemies.onKill = (e, head) => this.onKill(e, head)

    this._bindUI()
    this._bindState()
    this._resize()
    // Pre-warm shaders and post-processing so the first frame does not block input.
    this.renderer.compile(this.scene, this.camera)
    this.composer.render()
    window.addEventListener('resize', () => this._resize())
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause()
    })

    setTimeout(() => {
      this.hud.el.boot.classList.add('done')
    }, 500)
  }

  _bindUI() {
    const $ = (id) => document.getElementById(id)
    $('btn-deploy').addEventListener('click', () => {
      this.audio.init()
      this.audio.uiClick()
      this.startGame()
    })
    $('btn-resume').addEventListener('click', () => this.resume())
    $('btn-restart').addEventListener('click', () => { this.audio.uiClick(); this.startGame() })
    $('btn-quit').addEventListener('click', () => { this.audio.uiClick(); this.toMenu() })
    $('btn-redeploy').addEventListener('click', () => { this.audio.uiClick(); this.startGame() })
    $('btn-menu').addEventListener('click', () => { this.audio.uiClick(); this.toMenu() })

    const sens = $('sens')
    const stored = parseFloat(localStorage.getItem('blacksite.sens') || '1')
    if (!Number.isNaN(stored)) {
      sens.value = stored
      this.input.sensitivity = this.player.sensitivity = stored
    }
    sens.addEventListener('input', () => {
      const v = parseFloat(sens.value)
      this.input.sensitivity = this.player.sensitivity = v
      localStorage.setItem('blacksite.sens', String(v))
    })

    const mute = $('btn-mute')
    const setMuted = (m) => {
      this.audio.setMuted(m)
      this.hud.setMuted(m)
      localStorage.setItem('blacksite.muted', m ? '1' : '0')
    }
    setMuted(localStorage.getItem('blacksite.muted') === '1')
    mute.addEventListener('click', () => {
      this.audio.init()
      setMuted(!this.audio.muted)
      this.audio.uiClick()
    })

    canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.isTouch && !this.input.locked) {
        this.input.requestLock()
      }
    })

    if (this.input.isTouch) {
      document.body.classList.add('touch')
      window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 250))
    }

    const pauseBtn = document.getElementById('btn-pause')
    if (pauseBtn) {
      pauseBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation()
        e.preventDefault()
        this.pause()
      })
    }
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyP' && e.code !== 'Escape') return
      if (this.state === 'playing') this.pause()
      else if (this.state === 'paused') this.resume()
    })
  }

  _bindState() {
    this.input.onFirstInteract = () => this.audio.init()
    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'playing' && !this.input.isTouch && this.input.hadLock) this.pause()
      this.input.hadLock = locked
    }
    this.player.onDamage = (amount, source) => {
      this.hud.damageFlash()
      if (source) {
        const dx = source.x - this.player.pos.x
        const dz = source.z - this.player.pos.z
        const fx = -Math.sin(this.player.yaw)
        const fz = -Math.cos(this.player.yaw)
        const rx = Math.cos(this.player.yaw)
        const rz = -Math.sin(this.player.yaw)
        const f = dx * fx + dz * fz
        const r = dx * rx + dz * rz
        this.hud.damageDir(Math.atan2(r, f))
      }
      this.audio.damage()
    }
    this.player.onDeath = () => this.gameOver()
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    if (this.input.isTouch) {
      if (window.matchMedia('(orientation: portrait)').matches && this.state === 'playing') {
        this.hud.el.rotateHint.classList.remove('hidden')
      } else {
        this.hud.el.rotateHint.classList.add('hidden')
      }
    }
  }

  startGame() {
    this.state = 'playing'
    this.hud.clearFeed()
    this.hud.showHUD()
    this.hud.hideGameOver()
    this.hud.hidePause()
    this.hud.setScore(0)
    this.hud.setKills(0)
    this.hud.setAccuracy(0)
    this.hud.setWave(1)
    this.hud.setEnemies(0)
    this.hud.setHealth(this.player.maxHealth, this.player.maxHealth)
    this.player.reset()
    this.weapon.reset()
    this.weapon.visible = true
    this.enemies.clear()
    this.effects.reset()
    this._clearPickups()
    this.wave = 0
    this.spawnQueue = []
    this.intermission = 0
    this.stats = { shots: 0, hits: 0, headshots: 0, kills: 0, score: 0, bestStreak: 0 }
    this.streak = 0
    this.comboCount = 0
    this.lastKillTime = -10
    this.camera.fov = 78
    this.camera.updateProjectionMatrix()
    this.camera.rotation.order = 'YXZ'
    if (this.input.isTouch) this.hud.showTouch()
    else this.input.requestLock()
    this.startWave(1)
  }

  startWave(n) {
    this.wave = n
    this.hud.setWave(n)
    const count = 4 + Math.round((n - 1) * 1.8)
    const queue = []
    for (let i = 0; i < count; i++) {
      let type = 'grunt'
      if (n >= 2 && Math.random() < 0.28) type = 'scout'
      if (n >= 4 && Math.random() < 0.16) type = 'heavy'
      queue.push(type)
    }
    if (n === 1) queue.fill('grunt')
    this.spawnQueue = queue
    this.maxAlive = Math.min(4 + Math.floor(n / 2), 10)
    this.spawnTimer = 0.7
    this.hud.setEnemies(count)
    this.hud.hideWaveTimer()
    const pad = String(n).padStart(2, '0')
    this.hud.banner('INCOMING', `WAVE ${pad}`, `${count} HOSTILE SIGNATURES DETECTED`, 2800)
    this.audio.waveHorn()
  }

  updateWave(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt
      this.hud.showWaveTimer(this.intermission)
      if (this.intermission <= 0) {
        this.hud.hideWaveTimer()
        this.startWave(this.wave + 1)
      }
      return
    }

    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt
      if (this.spawnTimer <= 0 && this.enemies.aliveCount < this.maxAlive) {
        const type = this.spawnQueue.shift()
        const pos = this._pickSpawn()
        this.enemies.spawn(type, pos, this.wave)
        this.spawnTimer = 0.55 + Math.random() * 0.55
      }
    }

    const remaining = this.enemies.aliveCount + this.spawnQueue.length
    this.hud.setEnemies(remaining)

    if (this.spawnQueue.length === 0 && this.enemies.aliveCount === 0 && this.wave > 0) {
      const bonus = 500 * this.wave
      this.stats.score += bonus
      this.hud.setScore(this.stats.score)
      this.hud.banner('SECTOR CLEAR', 'WAVE CLEARED', `+${bonus} BONUS // RESUPPLY INBOUND`, 3200)
      this.audio.waveHorn()
      this.weapon.reserve += 60
      this.weapon.addGrenades(1)
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 25)
      this.hud.setAmmo(this.weapon.ammo, this.weapon.reserve)
      this.intermission = 7
      this.hud.showWaveTimer(this.intermission)
    }
  }

  _pickSpawn() {
    const pts = this.world.spawnPoints
    let best = pts[0]
    let bestScore = -1
    for (let i = 0; i < 10; i++) {
      const p = pts[(Math.random() * pts.length) | 0]
      const d = p.distanceTo(this.player.pos)
      let crowd = 0
      for (const e of this.enemies.list) {
        if (e.alive && e.group.position.distanceTo(p) < 4) crowd += 1
      }
      const score = d - crowd * 6
      if (score > bestScore) { bestScore = score; best = p }
    }
    return best
  }

  onKill(enemy, headshot) {
    const cfg = enemy.cfg
    if (this.time - this.lastKillTime < 2.6) this.comboCount++
    else this.comboCount = 1
    this.lastKillTime = this.time
    const mult = 1 + (this.comboCount - 1) * 0.25
    const points = Math.round(cfg.score * (headshot ? 1.5 : 1) * mult)
    this.stats.kills++
    this.stats.score += points
    this.streak++
    this.stats.bestStreak = Math.max(this.stats.bestStreak, this.streak)
    this.hud.setScore(this.stats.score)
    this.hud.setKills(this.stats.kills)
    this.hud.killfeed(cfg.name, headshot, points)
    if (this.comboCount >= 2) this.hud.combo(this.comboCount)
    this.audio.kill()

    // pickup drop
    if (Math.random() < 0.3) {
      const type = Math.random() < 0.55 ? 'ammo' : 'health'
      this._spawnPickup(enemy.group.position.clone().setY(0.55), type)
    }
  }

  _spawnPickup(pos, type) {
    const color = type === 'ammo' ? 0x48d6ff : 0x59ff9a
    const g = new THREE.Group()
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({ color: 0x0a1014, emissive: color, emissiveIntensity: 2.4, metalness: 0.4, roughness: 0.3 })
    )
    g.add(core)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.012, 5, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    ring.rotation.x = Math.PI / 2
    g.add(ring)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    halo.scale.set(1.5, 1.5, 1)
    g.add(halo)
    g.position.copy(pos)
    this.scene.add(g)
    this.pickups.push({ group: g, core, ring, type, t: 0, life: 26, baseY: pos.y })
  }

  _updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]
      p.t += dt
      p.life -= dt
      p.group.position.y = p.baseY + Math.sin(p.t * 2.4) * 0.12
      p.core.rotation.y += dt * 1.8
      p.core.rotation.x += dt * 0.9
      p.ring.rotation.z += dt * 1.2
      p.group.scale.setScalar(1 + Math.sin(p.t * 3) * 0.06)
      if (p.life <= 0) {
        this.scene.remove(p.group)
        this.pickups.splice(i, 1)
        continue
      }
      const d = p.group.position.distanceTo(this.player.pos)
      if (d < 1.5) {
        if (p.type === 'ammo') {
          this.weapon.reserve += 45
          this.hud.setAmmo(this.weapon.ammo, this.weapon.reserve)
        } else {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 32)
        }
        this.audio.pickup()
        this.effects.sparks(p.group.position, new THREE.Vector3(0, 1, 0), 16, p.type === 'ammo' ? 0x48d6ff : 0x59ff9a, 4)
        this.scene.remove(p.group)
        this.pickups.splice(i, 1)
      }
    }
  }

  _clearPickups() {
    for (const p of this.pickups) this.scene.remove(p.group)
    this.pickups.length = 0
  }

  pause() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.input.fire = false
    this.input.ads = false
    this.input.touchFire = false
    this.input.touchAds = false
    this.input.touchMove.x = 0
    this.input.touchMove.y = 0
    this.input.keys.clear()
    this.input.exitLock()
    this.hud.showPause(this.wave, this.stats.score, this.stats.kills)
    this.hud.hideTouch()
    this.hud.el.rotateHint.classList.add('hidden')
    this.weapon.visible = false
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    this.hud.hidePause()
    this.weapon.visible = true
    if (this.input.isTouch) this.hud.showTouch()
    else this.input.requestLock()
  }

  gameOver() {
    if (this.state === 'over') return
    this.state = 'over'
    this.input.fire = false
    this.input.ads = false
    this.input.touchFire = false
    this.input.touchAds = false
    this.input.touchMove.x = 0
    this.input.touchMove.y = 0
    this.input.keys.clear()
    this.input.exitLock()
    this.weapon.visible = false
    this.hud.hideTouch()
    this.hud.el.rotateHint.classList.add('hidden')
    this.hud.hideBanner()
    const acc = this.stats.shots > 0 ? Math.round((this.stats.hits / this.stats.shots) * 100) : 0
    this.hud.showGameOver({
      wave: this.wave,
      score: this.stats.score,
      kills: this.stats.kills,
      accuracy: acc,
      headshots: this.stats.headshots,
      bestStreak: this.stats.bestStreak
    })
    this.hud.setAccuracy(acc)
  }

  toMenu() {
    this.state = 'menu'
    this.input.fire = false
    this.input.ads = false
    this.input.touchFire = false
    this.input.touchAds = false
    this.input.touchMove.x = 0
    this.input.touchMove.y = 0
    this.input.keys.clear()
    this.input.exitLock()
    this.hud.showMenu()
    this.hud.hideTouch()
    this.hud.el.rotateHint.classList.add('hidden')
    this.weapon.visible = false
    this.enemies.clear()
    this._clearPickups()
    this.effects.reset()
    this.player.reset()
    this.menuT = 0
  }

  _update(dt) {
    this.time += dt
    this.world.update(dt, this.time)
    this.effects.update(dt)

    if (this.state === 'playing') {
      const look = this.input.consumeLook()
      this.player.look(look.dx, look.dy)
      this.player.update(dt, this.input, true)
      this.enemies.update(dt, this.time)
      this.weapon.update(dt, this.input)
      this.updateWave(dt)
      this._updatePickups(dt)

      const regenerating = this.time - this.player.lastDamage > this.player.regenDelay && this.player.health < this.player.maxHealth
      this.hud.setHealth(this.player.health, this.player.maxHealth, regenerating)
      this.hud.setAccuracy(this.stats.shots > 0 ? (this.stats.hits / this.stats.shots) * 100 : 0)
      this.input.endFrame()
    } else if (this.state === 'menu') {
      this.menuT += dt
      const a = this.menuT * 0.055 + 0.6
      const r = 17 + Math.sin(this.menuT * 0.12) * 2.5
      this.camera.position.set(Math.cos(a) * r, 5.6 + Math.sin(this.menuT * 0.17) * 0.8, Math.sin(a) * r)
      this.camera.lookAt(0, 2.4, 0)
      this.camera.fov += (58 - this.camera.fov) * Math.min(1, dt * 3)
      this.camera.updateProjectionMatrix()
    } else if (this.state === 'paused') {
      this.input.endFrame()
    } else if (this.state === 'over') {
      this.input.endFrame()
    }
  }

  _loop() {
    const dt = Math.min(0.05, this.clock.getDelta())
    this._update(dt)
    // The menu is a static backdrop; skip the bloom chain there to keep it light.
    if (this.state === 'menu') this.renderer.render(this.scene, this.camera)
    else this.composer.render()
    requestAnimationFrame(() => this._loop())
  }
}

window.game = new Game()
window.game._loop()
