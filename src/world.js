import * as THREE from 'three'
import {
  arenaFloorTexture, panelTexture, containerTexture, crateTexture,
  hazardTexture, glowTexture, smokeTexture, signTexture, windowTexture, concreteMap
} from './textures.js'

const UP = new THREE.Vector3(0, 1, 0)

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function resolveCircle(pos, radius, colliders, feetY = 0) {
  for (const c of colliders) {
    if (c.top <= feetY + 0.35) continue
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
        const left = pos.x - c.minX, right = c.maxX - pos.x
        const near = pos.z - c.minZ, far = c.maxZ - pos.z
        const m = Math.min(left, right, near, far)
        if (m === left) pos.x = c.minX - radius
        else if (m === right) pos.x = c.maxX + radius
        else if (m === near) pos.z = c.minZ - radius
        else pos.z = c.maxZ + radius
      }
    }
  }
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene
    this.renderer = renderer
    this.colliders = []
    this.solids = []
    this.lights = []
    this.flickers = []
    this.dust = null
    this.time = 0
    this.spawnPoints = [
      new THREE.Vector3(-25, 0, -25), new THREE.Vector3(25, 0, -25),
      new THREE.Vector3(-25, 0, 25), new THREE.Vector3(25, 0, 25),
      new THREE.Vector3(0, 0, -27), new THREE.Vector3(0, 0, 27),
      new THREE.Vector3(-27, 0, 0), new THREE.Vector3(27, 0, 0),
      new THREE.Vector3(-12, 0, -24), new THREE.Vector3(13, 0, 24)
    ]
    this.raycaster = new THREE.Raycaster()
    this._build()
  }

  _build() {
    const rand = mulberry32(2024)
    this.scene.fog = new THREE.FogExp2(0x070b11, 0.0135)
    this.scene.background = new THREE.Color(0x05070b)

    this._sky()
    this._ground()
    this._walls()
    this._catwalk()
    this._props(rand)
    this._lighting()
    this._dust()
    this._skyline(rand)
  }

  _sky() {
    const geo = new THREE.SphereGeometry(150, 32, 20)
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vDir;
        uniform float uTime;
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        void main() {
          float h = clamp(vDir.y * 1.4, -0.2, 1.0);
          vec3 horizon = vec3(0.055, 0.075, 0.105);
          vec3 mid = vec3(0.022, 0.032, 0.052);
          vec3 zenith = vec3(0.004, 0.008, 0.018);
          vec3 col = mix(horizon, mid, smoothstep(0.0, 0.35, h));
          col = mix(col, zenith, smoothstep(0.3, 1.0, h));
          // low warm haze
          col += vec3(0.16, 0.07, 0.025) * pow(max(0.0, 1.0 - abs(vDir.y) * 5.0), 3.0) * 0.5;
          // stars
          vec3 sp = floor(vDir * 260.0);
          float star = hash(sp);
          float tw = 0.6 + 0.4 * sin(uTime * 1.3 + star * 60.0);
          col += vec3(0.65, 0.75, 1.0) * smoothstep(0.9975, 1.0, star) * smoothstep(0.06, 0.3, vDir.y) * tw;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
    this.skyMat = mat
    const sky = new THREE.Mesh(geo, mat)
    sky.frustumCulled = false
    this.scene.add(sky)

    // moon
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(235,242,255,1)', 'rgba(170,195,255,0.5)'),
      color: 0xcfe0ff, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }))
    moonGlow.scale.set(46, 46, 1)
    moonGlow.position.set(-52, 46, -104)
    this.scene.add(moonGlow)
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 40),
      new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false })
    )
    moon.position.copy(moonGlow.position).add(new THREE.Vector3(52, -46, 104).normalize())
    moon.lookAt(0, 2, 0)
    this.scene.add(moon)
  }

  _ground() {
    const floorTex = arenaFloorTexture()
    const mat = new THREE.MeshStandardMaterial({
      map: floorTex, bumpMap: floorTex, bumpScale: 0.055,
      roughness: 0.9, metalness: 0.06, color: 0xe2e2da
    })
    const geo = new THREE.PlaneGeometry(80, 80, 1, 1)
    const floor = new THREE.Mesh(geo, mat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)
    this.floor = floor
    this.solids.push(floor)

    // surrounding darker apron
    const apron = new THREE.Mesh(
      new THREE.RingGeometry(40, 120, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 1 })
    )
    apron.rotation.x = -Math.PI / 2
    apron.position.y = -0.02
    this.scene.add(apron)
  }

  _walls() {
    const tex = panelTexture({ base: '#3b424a', repeat: [5, 2] })
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.55, color: 0xd2dae2 })
    const capMat = new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.6, metalness: 0.7 })
    const stripMat = new THREE.MeshStandardMaterial({ color: 0x120a04, emissive: 0xff6a14, emissiveIntensity: 2.2, roughness: 0.4 })
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x04121a, emissive: 0x33c8ff, emissiveIntensity: 1.6, roughness: 0.4 })

    const H = 9, T = 1.4, S = 30.7
    const defs = [
      { w: S * 2, x: 0, z: -S, ry: 0 },
      { w: S * 2, x: 0, z: S, ry: 0 },
      { w: S * 2, x: -S, z: 0, ry: Math.PI / 2 },
      { w: S * 2, x: S, z: 0, ry: Math.PI / 2 }
    ]
    for (const d of defs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(d.w, H, T), mat)
      wall.position.set(d.x, H / 2, d.z)
      wall.rotation.y = d.ry
      wall.castShadow = true
      wall.receiveShadow = true
      this.scene.add(wall)
      this.solids.push(wall)
      this._collider(d.x, d.z, d.w, T, d.ry, H)

      // top cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(d.w, 0.28, T + 0.5), capMat)
      cap.position.set(d.x, H + 0.1, d.z)
      cap.rotation.y = d.ry
      this.scene.add(cap)

      // emissive strips
      for (const y of [2.5, 6.6]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(d.w - 1, 0.09, 0.06), y > 4 ? cyanMat : stripMat)
        strip.position.set(d.x, y, d.z)
        strip.rotation.y = d.ry
        strip.translateZ(T / 2 + 0.035)
        this.scene.add(strip)
      }
    }

    // inner corner braces
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9, 0.7), capMat)
        brace.position.set(sx * 29.2, 4.5, sz * 29.2)
        brace.castShadow = true
        this.scene.add(brace)
        this._collider(sx * 29.2, sz * 29.2, 0.7, 0.7, 0, 9)
      }
    }

    // wall signage
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 2.7),
      new THREE.MeshBasicMaterial({ map: signTexture(), transparent: true, color: 0xffffff })
    )
    sign.position.set(0, 5.2, -29.9)
    this.scene.add(sign)
    const sign2 = sign.clone()
    sign2.position.set(-29.9, 5.2, 6)
    sign2.rotation.y = Math.PI / 2
    this.scene.add(sign2)

    // pipes along the east wall
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2e, metalness: 0.85, roughness: 0.5 })
    for (let i = 0; i < 3; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 26, 10), pipeMat)
      pipe.rotation.z = Math.PI / 2
      pipe.position.set(18 + i * 0.01, 7.4 - i * 0.42, 28.4)
      pipe.castShadow = true
      this.scene.add(pipe)
    }
  }

  _catwalk() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x33383e, metalness: 0.8, roughness: 0.55 })
    const grate = new THREE.MeshStandardMaterial({ color: 0x2b3036, metalness: 0.7, roughness: 0.7 })
    const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 0.22, 2.6), grate)
    deck.position.set(-2, 4.35, -28.2)
    deck.castShadow = true
    deck.receiveShadow = true
    this.scene.add(deck)

    const railMat = metal
    for (let x = -16; x <= 12; x += 2.4) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.09), railMat)
      post.position.set(x, 5.05, -27.0)
      this.scene.add(post)
    }
    for (const y of [4.9, 5.55]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(30, 0.06, 0.06), railMat)
      bar.position.set(-2, y, -27.0)
      this.scene.add(bar)
    }
    // ladder
    for (let i = 0; i < 8; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), railMat)
      rung.position.set(13.4, 0.6 + i * 0.5, -29.4)
      this.scene.add(rung)
    }
    for (const x of [13.05, 13.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.4, 0.05), railMat)
      rail.position.set(x, 2.2, -29.4)
      this.scene.add(rail)
    }

    // stair light
    const l = new THREE.PointLight(0x77ccff, 14, 12, 2)
    l.position.set(8, 5.2, -27)
    this.scene.add(l)
    this.lights.push(l)
  }

  _props(rand) {
    const containerColors = ['#3c4b53', '#4b3d35', '#39464a', '#463f3a']
    const containerTex = containerColors.map(c => containerTexture(c))
    const containerMats = containerTex.map(t => new THREE.MeshStandardMaterial({
      map: t, roughness: 0.72, metalness: 0.55, color: 0xaab0b4
    }))
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1d2125, metalness: 0.8, roughness: 0.5 })

    const containers = [
      { x: -17, z: -10, ry: 0.22, i: 0, stack: true },
      { x: 14.5, z: -16.5, ry: -0.14, i: 1 },
      { x: -14, z: 15.5, ry: -0.5, i: 2 },
      { x: 17, z: 11.5, ry: 0.08, i: 3 },
      { x: 7, z: 21.5, ry: 1.52, i: 1 }
    ]
    const cw = 6.2, ch = 2.65, cd = 2.5
    for (const c of containers) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), containerMats[c.i])
      m.position.set(c.x, ch / 2, c.z)
      m.rotation.y = c.ry
      m.castShadow = true
      m.receiveShadow = true
      this.scene.add(m)
      this.solids.push(m)
      this._collider(c.x, c.z, cw, cd, c.ry, ch)

      // door end frame
      for (const s of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, ch, 0.12), trimMat)
        edge.position.set(s * (cw / 2 - 0.06), ch / 2, cd / 2 + 0.03)
        edge.rotation.y = c.ry
        edge.position.applyAxisAngle(UP, c.ry)
        edge.position.add(new THREE.Vector3(c.x, 0, c.z))
        this.scene.add(edge)
      }

      if (c.stack) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.92, ch, cd), containerMats[(c.i + 2) % 4])
        top.position.set(c.x + 0.4, ch * 1.5 + 0.02, c.z - 0.2)
        top.rotation.y = 0.06
        top.castShadow = true
        top.receiveShadow = true
        this.scene.add(top)
        this.solids.push(top)
        this._collider(c.x + 0.4, c.z - 0.2, cw * 0.92, cd, 0.06, ch * 2)
      }

      // hazard placard
      const plac = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.6),
        new THREE.MeshStandardMaterial({ map: hazardTexture(), emissive: 0x2a1c00, emissiveIntensity: 0.4, roughness: 0.8 })
      )
      plac.position.set(c.x, 1.7, c.z)
      plac.rotation.y = c.ry
      plac.translateZ(cd / 2 + 0.02)
      this.scene.add(plac)
    }

    // crates
    const crateTex = crateTexture()
    const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.85, metalness: 0.15 })
    const crateGroups = [
      [-23, -1.5], [10.5, 19.5], [21, -4], [-6.5, -21.5], [4.5, 7.5], [-22, 8]
    ]
    for (const [gx, gz] of crateGroups) {
      const n = 2 + (rand() * 3 | 0)
      for (let i = 0; i < n; i++) {
        const s = 1.15 + rand() * 0.3
        const cx = gx + (rand() - 0.5) * 1.8
        const cz = gz + (rand() - 0.5) * 1.8
        const level = i % 2
        const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat)
        crate.position.set(cx, s / 2 + level * s, cz)
        crate.rotation.y = (rand() - 0.5) * 0.7
        crate.castShadow = true
        crate.receiveShadow = true
        this.scene.add(crate)
        this.solids.push(crate)
        this._collider(cx, cz, s, s, crate.rotation.y, s * (level + 1))
      }
    }

    // barrels
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x4a4034, metalness: 0.8, roughness: 0.55 })
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x151719, metalness: 0.6, roughness: 0.6 })
    const hazardMat = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.8 })
    const barrelSpots = [[-19, -5], [-18, -3.4], [16, 17], [17.4, 17.4], [22, 6], [-9, 22], [8, -23]]
    for (const [bx, bz] of barrelSpots) {
      const g = new THREE.Group()
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.12, 16), barrelMat)
      b.castShadow = true; b.receiveShadow = true
      g.add(b)
      for (const y of [-0.42, 0.42]) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 6, 18), ringMat)
        r.rotation.x = Math.PI / 2
        r.position.y = y
        g.add(r)
      }
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.22, 16), hazardMat)
      band.position.y = 0.05
      g.add(band)
      g.position.set(bx, 0.56, bz)
      this.scene.add(g)
      this._collider(bx, bz, 0.9, 0.9, 0, 1.12)
    }

    // pillars
    const pillarTex = concreteMap({ base: '#5a5a54', repeat: [1, 3] })
    const pillarMat = new THREE.MeshStandardMaterial({ map: pillarTex, roughness: 0.9, color: 0xcfcfc6 })
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 9, 1.5), pillarMat)
        p.position.set(sx * 23, 4.5, sz * 23)
        p.castShadow = true; p.receiveShadow = true
        this.scene.add(p)
        this.solids.push(p)
        this._collider(sx * 23, sz * 23, 1.5, 1.5, 0, 9)
        const band = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.18, 1.62), hazardMat)
        band.position.set(sx * 23, 1.2, sz * 23)
        this.scene.add(band)
      }
    }

    // central beacon
    const beaconBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.7, 24),
      new THREE.MeshStandardMaterial({ color: 0x24292f, metalness: 0.8, roughness: 0.45 })
    )
    beaconBase.position.y = 0.35
    beaconBase.castShadow = true; beaconBase.receiveShadow = true
    this.scene.add(beaconBase)
    this._collider(0, 0, 2.4, 2.4, 0, 0.7)
    const beaconCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 1.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x0a2530, emissive: 0x38d8ff, emissiveIntensity: 2.0 })
    )
    beaconCore.position.y = 1.5
    this.scene.add(beaconCore)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.62, 9, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2ec8ff, transparent: true, opacity: 0.028, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    )
    beam.position.y = 5.2
    this.scene.add(beam)
    this.beacon = beaconCore
    this.beaconBeam = beam

    // jersey barriers (mid-field cover)
    const barrierMat = new THREE.MeshStandardMaterial({ map: concreteMap({ base: '#6b6b63', repeat: [2, 1] }), roughness: 0.88, color: 0xd2d2c9 })
    const barrierSpots = [[6.5, -2.5, 0.45], [-7.5, 5.5, -0.35], [11, 4.5, 1.15]]
    for (const [bx, bz, ry] of barrierSpots) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 0.6), barrierMat)
      b.position.set(bx, 0.5, bz)
      b.rotation.y = ry
      b.castShadow = true
      b.receiveShadow = true
      this.scene.add(b)
      this.solids.push(b)
      this._collider(bx, bz, 3.0, 0.6, ry, 1.0)
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.18, 0.62), hazardMat)
      stripe.position.set(bx, 0.86, bz)
      stripe.rotation.y = ry
      this.scene.add(stripe)
      // feet
      for (const s of [-1, 1]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.8), barrierMat)
        foot.position.set(bx + Math.cos(ry) * s * 1.2, 0.11, bz - Math.sin(ry) * s * 1.2)
        foot.rotation.y = ry
        this.scene.add(foot)
      }
    }

    // ground debris
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x3b3d3c, metalness: 0.6, roughness: 0.7 })
    for (let i = 0; i < 34; i++) {
      const w = 0.15 + rand() * 0.5
      const d = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04 + rand() * 0.06, w * (0.4 + rand())), debrisMat)
      d.position.set((rand() - 0.5) * 52, 0.03, (rand() - 0.5) * 52)
      d.rotation.y = rand() * Math.PI
      d.castShadow = true
      this.scene.add(d)
    }

    // low ground haze
    const hazeMat = new THREE.SpriteMaterial({
      map: smokeTexture(), color: 0x7d8fa3, transparent: true,
      opacity: 0.045, depthWrite: false
    })
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(hazeMat.clone())
      s.position.set((rand() - 0.5) * 46, 0.6 + rand() * 1.4, (rand() - 0.5) * 46)
      s.scale.set(16 + rand() * 14, 8 + rand() * 6, 1)
      s.material.opacity = 0.03 + rand() * 0.035
      this.scene.add(s)
    }
  }

  _lighting() {
    const hemi = new THREE.HemisphereLight(0x5d789c, 0x11151a, 1.3)
    this.scene.add(hemi)

    const dir = new THREE.DirectionalLight(0xb2c8f2, 2.9)
    dir.position.set(-24, 34, -18)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    dir.shadow.camera.left = -38
    dir.shadow.camera.right = 38
    dir.shadow.camera.top = 38
    dir.shadow.camera.bottom = -38
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 90
    dir.shadow.bias = -0.0006
    dir.shadow.normalBias = 0.035
    this.scene.add(dir)
    this.sun = dir

    const fill = new THREE.DirectionalLight(0x3a74a8, 0.95)
    fill.position.set(30, 12, 24)
    this.scene.add(fill)

    const lampSpots = [
      [-12, 7.2, -8], [12, 7.2, 7], [0, 7.2, 19], [-19, 7.2, 15]
    ]
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.9, roughness: 0.35 })
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffb15a, emissiveIntensity: 4 })
    for (const [x, y, z] of lampSpots) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 6), shadeMat)
      cable.position.set(x, y + 1.1, z)
      this.scene.add(cable)
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, 0.35, 16, 1, true), shadeMat)
      shade.position.set(x, y + 0.25, z)
      this.scene.add(shade)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), bulbMat)
      bulb.position.set(x, y, z)
      this.scene.add(bulb)
      const light = new THREE.PointLight(0xffa352, 68, 22, 2)
      light.position.set(x, y - 0.15, z)
      light.castShadow = false
      this.scene.add(light)
      this.lights.push(light)
      this.flickers.push({ light, bulb, base: 68, phase: Math.random() * 100, speed: 1 + Math.random() * 2 })

      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 3.4, 6.4, 18, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffb060, transparent: true, opacity: 0.035,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        })
      )
      cone.position.set(x, y - 3.2, z)
      this.scene.add(cone)
    }

    // cool rim lights
    for (const [x, z] of [[-28, -12], [28, 12], [0, -28], [0, 28]]) {
      const l = new THREE.PointLight(0x2b7fae, 28, 18, 2)
      l.position.set(x, 4, z)
      this.scene.add(l)
      this.lights.push(l)
    }

    // ambient orange bounce
    const bounce = new THREE.PointLight(0xff5a14, 30, 28, 2)
    bounce.position.set(0, 1.2, 0)
    this.scene.add(bounce)
    this.bounce = bounce
  }

  _dust() {
    const N = 520
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 58
      pos[i * 3 + 1] = Math.random() * 8
      pos[i * 3 + 2] = (Math.random() - 0.5) * 58
      seed[i] = Math.random() * 100
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.045, map: glowTexture(), color: 0x9fb6cc, transparent: true,
      opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    })
    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    this.scene.add(points)
    this.dust = { points, seed, pos }
  }

  _skyline(rand) {
    const winTex = windowTexture()
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a2028, map: winTex, emissiveMap: winTex,
      emissive: 0x8899bb, emissiveIntensity: 0.9, roughness: 0.9, metalness: 0.1
    })
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 1 })
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + rand() * 0.08
      const r = 52 + rand() * 30
      const h = 7 + rand() * 24
      const w = 4 + rand() * 7
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), rand() > 0.3 ? mat : dark)
      b.position.set(Math.cos(a) * r, h / 2 - 1.5, Math.sin(a) * r)
      b.rotation.y = rand() * Math.PI
      this.scene.add(b)
    }
    // antenna beacons
    for (const [x, z, h] of [[-58, -40, 26], [62, 20, 31], [10, -70, 22]]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 5), dark)
      mast.position.set(x, h / 2, z)
      this.scene.add(mast)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a }))
      bulb.position.set(x, h, z)
      this.scene.add(bulb)
      this.flickers.push({ light: null, bulb, base: 1, phase: Math.random() * 10, speed: 0.7, beacon: true })
    }
  }

  _collider(x, z, w, d, ry, top) {
    const hw = w / 2, hd = d / 2
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry))
    const ex = hw * c + hd * s
    const ez = hw * s + hd * c
    this.colliders.push({ minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez, top })
  }

  lineOfSight(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from)
    const dist = dir.length()
    dir.normalize()
    this.raycaster.set(from, dir)
    this.raycaster.far = dist
    const hits = this.raycaster.intersectObjects(this.solids, false)
    return hits.length === 0
  }

  update(dt, t) {
    this.time = t
    if (this.skyMat) this.skyMat.uniforms.uTime.value = t

    for (const f of this.flickers) {
      if (f.beacon) {
        const on = (Math.sin(t * 2.2 + f.phase) > 0.2) ? 1 : 0.12
        f.bulb.material.color.setRGB(on, on * 0.08, on * 0.08)
        continue
      }
      const n = Math.sin(t * f.speed * 3.1 + f.phase) * 0.5 + Math.sin(t * f.speed * 9.7 + f.phase * 2) * 0.2
      const v = f.base * (0.88 + n * 0.12)
      f.light.intensity = v
      f.bulb.material.emissiveIntensity = 3.2 + n * 0.8
    }

    if (this.beacon) {
      const p = 0.7 + Math.sin(t * 2.4) * 0.25
      this.beacon.material.emissiveIntensity = 1.5 + p * 0.9
      this.beaconBeam.material.opacity = 0.018 + p * 0.016
      this.bounce.intensity = 24 + p * 10
    }

    if (this.dust) {
      const { pos, seed } = this.dust
      for (let i = 0; i < seed.length; i++) {
        const i3 = i * 3
        pos[i3] += Math.sin(t * 0.3 + seed[i]) * dt * 0.25
        pos[i3 + 1] += (0.08 + Math.sin(t * 0.5 + seed[i]) * 0.05) * dt
        pos[i3 + 2] += Math.cos(t * 0.24 + seed[i] * 1.3) * dt * 0.2
        if (pos[i3 + 1] > 8) pos[i3 + 1] = 0.2
        if (pos[i3] > 29) pos[i3] = -29
        if (pos[i3] < -29) pos[i3] = 29
        if (pos[i3 + 2] > 29) pos[i3 + 2] = -29
        if (pos[i3 + 2] < -29) pos[i3 + 2] = 29
      }
      this.dust.points.geometry.attributes.position.needsUpdate = true
    }
  }
}
