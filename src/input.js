export class Input {
  constructor(canvas) {
    this.canvas = canvas
    this.keys = new Set()
    this.pressed = new Set()
    this.mouseDX = 0
    this.mouseDY = 0
    this.fire = false
    this.ads = false
    this.sensitivity = 1
    this.locked = false
    this.hadLock = false
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window)
    this.touchMove = { x: 0, y: 0 }
    this.touchFire = false
    this.touchAds = false
    this.touchSprint = false
    this.lookPointer = null
    this.lookLast = { x: 0, y: 0 }
    this.onLockChange = null
    this.onFirstInteract = null

    this._bind()
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return
      this.keys.add(e.code)
      this.pressed.add(e.code)
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Tab'].includes(e.code)) e.preventDefault()
      if (this.onFirstInteract) this.onFirstInteract()
    })
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code)
    })
    window.addEventListener('blur', () => {
      this.keys.clear()
      this.fire = false
      this.ads = false
    })

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return
      this.mouseDX += e.movementX || 0
      this.mouseDY += e.movementY || 0
    })
    document.addEventListener('mousedown', (e) => {
      if (this.isTouch) return
      if (this.onFirstInteract) this.onFirstInteract()
      if (!this.locked) return
      if (e.button === 0) this.fire = true
      if (e.button === 2) this.ads = true
    })
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fire = false
      if (e.button === 2) this.ads = false
    })
    document.addEventListener('contextmenu', (e) => e.preventDefault())

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas
      if (this.onLockChange) this.onLockChange(this.locked)
    })
    document.addEventListener('pointerlockerror', () => {
      this.locked = false
      if (this.onLockChange) this.onLockChange(false)
    })

    this._bindTouch()
  }

  _bindTouch() {
    const zone = document.getElementById('look-zone')
    if (!zone) return

    const onDown = (e) => {
      if (this.lookPointer !== null) return
      this.lookPointer = e.pointerId
      this.lookLast.x = e.clientX
      this.lookLast.y = e.clientY
      zone.setPointerCapture(e.pointerId)
      if (this.onFirstInteract) this.onFirstInteract()
    }
    const onMove = (e) => {
      if (e.pointerId !== this.lookPointer) return
      const dx = e.clientX - this.lookLast.x
      const dy = e.clientY - this.lookLast.y
      this.lookLast.x = e.clientX
      this.lookLast.y = e.clientY
      this.mouseDX += dx * 1.35
      this.mouseDY += dy * 1.35
    }
    const onUp = (e) => {
      if (e.pointerId !== this.lookPointer) return
      this.lookPointer = null
    }
    zone.addEventListener('pointerdown', onDown)
    zone.addEventListener('pointermove', onMove)
    zone.addEventListener('pointerup', onUp)
    zone.addEventListener('pointercancel', onUp)

    // joystick
    const stick = document.getElementById('joystick')
    const knob = document.getElementById('joystick-knob')
    if (stick && knob) {
      let id = null
      const rect = () => stick.getBoundingClientRect()
      const setKnob = (x, y) => {
        knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`
      }
      const update = (e) => {
        const r = rect()
        let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
        let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
        const len = Math.hypot(dx, dy)
        if (len > 1) { dx /= len; dy /= len }
        this.touchMove.x = dx
        this.touchMove.y = dy
        setKnob(dx, dy)
        this.touchSprint = len > 0.88
      }
      stick.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault()
        id = e.pointerId
        stick.setPointerCapture(id)
        update(e)
        if (this.onFirstInteract) this.onFirstInteract()
      })
      stick.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id) return
        e.stopPropagation()
        update(e)
      })
      const end = (e) => {
        if (e.pointerId !== id) return
        id = null
        this.touchMove.x = 0; this.touchMove.y = 0
        this.touchSprint = false
        setKnob(0, 0)
      }
      stick.addEventListener('pointerup', end)
      stick.addEventListener('pointercancel', end)
    }

    const hold = (el, on, off) => {
      if (!el) return
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault()
        try { el.setPointerCapture(e.pointerId) } catch {}
        el.classList.add('active')
        on()
        if (this.onFirstInteract) this.onFirstInteract()
      })
      const up = (e) => {
        e.stopPropagation()
        try {
          if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
        } catch {}
        el.classList.remove('active')
        if (off) off()
      }
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
      el.addEventListener('pointerleave', (e) => {
        if (e.buttons === 0) return
        el.classList.remove('active')
        if (off) off()
      })
    }
    hold(document.getElementById('btn-fire'), () => { this.touchFire = true }, () => { this.touchFire = false })
    hold(document.getElementById('btn-ads'), () => { this.touchAds = true }, () => { this.touchAds = false })
    const tap = (el, code) => {
      if (!el) return
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault()
        el.classList.add('active')
        this.pressed.add(code)
        setTimeout(() => el.classList.remove('active'), 120)
        if (this.onFirstInteract) this.onFirstInteract()
      })
    }
    tap(document.getElementById('btn-reload'), 'KeyR')
    tap(document.getElementById('btn-jump'), 'Space')
    tap(document.getElementById('btn-grenade'), 'KeyG')
  }

  requestLock() {
    if (this.isTouch) return
    const p = this.canvas.requestPointerLock?.({ unadjustedMovement: true })
    if (p && p.catch) p.catch(() => this.canvas.requestPointerLock?.())
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock()
  }

  consume(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code)
      return true
    }
    return false
  }

  down(code) { return this.keys.has(code) }

  consumeLook() {
    const dx = this.mouseDX, dy = this.mouseDY
    this.mouseDX = 0
    this.mouseDY = 0
    return { dx, dy }
  }

  get moving() {
    return this.touchMove.x !== 0 || this.touchMove.y !== 0 ||
      this.down('KeyW') || this.down('KeyA') || this.down('KeyS') || this.down('KeyD')
  }

  endFrame() {
    this.pressed.clear()
  }
}
