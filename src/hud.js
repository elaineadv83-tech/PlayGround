export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id)
    this.el = {
      hud: $('hud'),
      waveNum: $('wave-num'),
      enemyCount: $('enemy-count'),
      score: $('score'),
      kills: $('kills'),
      accuracy: $('accuracy'),
      killfeed: $('killfeed'),
      combo: $('combo'),
      comboX: $('combo-x'),
      crosshair: $('crosshair'),
      hitmarker: $('hitmarker'),
      damageDirs: $('damage-dirs'),
      healthNum: $('health-num'),
      healthFill: $('health-fill'),
      statusText: $('status-text'),
      regenText: $('regen-text'),
      lowHealth: $('low-health'),
      banner: $('wave-banner'),
      bannerKicker: $('banner-kicker'),
      bannerTitle: $('banner-title'),
      bannerSub: $('banner-sub'),
      waveTimer: $('wave-timer'),
      waveTimerNum: $('wave-timer-num'),
      ammo: $('ammo'),
      reserve: $('reserve'),
      ammoPips: $('ammo-pips'),
      nadeCount: $('nade-count'),
      reloadHint: $('reload-hint'),
      reloadFill: $('reload-fill'),
      damageFlash: $('damage-flash'),
      menu: $('menu'),
      pause: $('pause'),
      gameover: $('gameover'),
      touchUI: $('touch-ui'),
      rotateHint: $('rotate-hint'),
      boot: $('boot'),
      pauseWave: $('pause-wave'),
      pauseScore: $('pause-score'),
      pauseKills: $('pause-kills'),
      overWave: $('over-wave'),
      overScore: $('over-score'),
      overKills: $('over-kills'),
      overAcc: $('over-acc'),
      overHeads: $('over-heads'),
      overStreak: $('over-streak'),
      menuClock: $('menu-clock'),
      sens: $('sens'),
      mute: $('btn-mute')
    }
    this.pips = []
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('i')
      this.el.ammoPips.appendChild(p)
      this.pips.push(p)
    }
    this.bannerTimer = null
    this.comboTimer = null
    this.flashTimer = null
    this.reloadTimer = null
    this.clockTimer = setInterval(() => this._clock(), 1000)
    this._clock()
  }

  _clock() {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    if (this.el.menuClock) this.el.menuClock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }

  showMenu() {
    this.el.menu.classList.remove('hidden')
    this.el.pause.classList.add('hidden')
    this.el.gameover.classList.add('hidden')
    this.el.hud.classList.add('hidden')
    this.el.touchUI.classList.add('hidden')
  }

  showHUD() {
    this.el.menu.classList.add('hidden')
    this.el.pause.classList.add('hidden')
    this.el.gameover.classList.add('hidden')
    this.el.hud.classList.remove('hidden')
  }

  showPause(wave, score, kills) {
    this.el.pauseWave.textContent = String(wave).padStart(2, '0')
    this.el.pauseScore.textContent = score.toLocaleString()
    this.el.pauseKills.textContent = kills
    this.el.pause.classList.remove('hidden')
  }

  hidePause() { this.el.pause.classList.add('hidden') }

  showGameOver(stats) {
    this.el.overWave.textContent = stats.wave
    this.el.overScore.textContent = stats.score.toLocaleString()
    this.el.overKills.textContent = stats.kills
    this.el.overAcc.textContent = stats.accuracy + '%'
    this.el.overHeads.textContent = stats.headshots
    this.el.overStreak.textContent = stats.bestStreak
    this.el.gameover.classList.remove('hidden')
    this.el.hud.classList.add('hidden')
    this.el.touchUI.classList.add('hidden')
  }

  hideGameOver() { this.el.gameover.classList.add('hidden') }

  showTouch() {
    this.el.touchUI.classList.remove('hidden')
    if (window.matchMedia('(orientation: portrait)').matches) this.el.rotateHint.classList.remove('hidden')
  }

  hideTouch() {
    this.el.touchUI.classList.add('hidden')
    this.el.rotateHint.classList.add('hidden')
  }

  setHealth(v, max, regenerating = false) {
    const pct = Math.max(0, Math.min(100, (v / max) * 100))
    this.el.healthFill.style.width = pct + '%'
    this.el.healthNum.textContent = Math.ceil(v)
    this.el.healthFill.classList.toggle('low', pct <= 34)
    this.el.lowHealth.classList.toggle('on', pct <= 30)
    if (pct > 65) this.el.statusText.textContent = 'OPERATIONAL'
    else if (pct > 30) this.el.statusText.textContent = 'WOUNDED'
    else this.el.statusText.textContent = 'CRITICAL'
    this.el.regenText.textContent = regenerating ? 'REGENERATING' : ''
  }

  setAmmo(ammo, reserve) {
    this.el.ammo.textContent = String(ammo).padStart(2, '0')
    this.el.reserve.textContent = reserve
    this.el.ammo.parentElement.classList.toggle('empty', ammo === 0)
    for (let i = 0; i < this.pips.length; i++) {
      const p = this.pips[i]
      p.classList.toggle('on', i < ammo)
      p.classList.toggle('low', i < ammo && ammo <= 8)
    }
  }

  flashAmmo() {
    const line = this.el.ammo.parentElement
    line.classList.remove('empty')
    void line.offsetWidth
    line.classList.add('empty')
  }

  setReloading(on, duration = 1.7) {
    clearTimeout(this.reloadTimer)
    if (!on) {
      this.el.reloadHint.classList.add('hidden')
      return
    }
    this.el.reloadHint.classList.remove('hidden')
    this.el.reloadFill.style.transition = 'none'
    this.el.reloadFill.style.width = '0%'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.el.reloadFill.style.transition = `width ${duration}s linear`
        this.el.reloadFill.style.width = '100%'
      })
    })
  }

  setSpread(v) {
    this.el.crosshair.style.setProperty('--spread', v.toFixed(3))
  }

  hitmarker(head = false, kill = false) {
    const h = this.el.hitmarker
    h.classList.remove('show', 'head', 'kill')
    void h.offsetWidth
    h.classList.toggle('head', head)
    h.classList.toggle('kill', kill)
    h.classList.add('show')
  }

  damageFlash() {
    const f = this.el.damageFlash
    f.classList.add('hit')
    clearTimeout(this.flashTimer)
    this.flashTimer = setTimeout(() => f.classList.remove('hit'), 90)
  }

  damageDir(angleRad) {
    const d = document.createElement('div')
    d.className = 'dmg-arc'
    d.style.setProperty('--rot', angleRad + 'rad')
    this.el.damageDirs.appendChild(d)
    setTimeout(() => d.remove(), 1200)
  }

  banner(kicker, title, sub, duration = 2600) {
    clearTimeout(this.bannerTimer)
    this.el.bannerKicker.textContent = kicker
    this.el.bannerTitle.textContent = title
    this.el.bannerSub.textContent = sub
    this.el.banner.classList.remove('hidden')
    // restart animation
    this.el.banner.style.animation = 'none'
    void this.el.banner.offsetWidth
    this.el.banner.style.animation = ''
    if (duration > 0) {
      this.bannerTimer = setTimeout(() => this.el.banner.classList.add('hidden'), duration)
    }
  }

  hideBanner() {
    clearTimeout(this.bannerTimer)
    this.el.banner.classList.add('hidden')
  }

  showWaveTimer(sec) {
    this.el.waveTimer.classList.remove('hidden')
    this.el.waveTimerNum.textContent = Math.max(0, Math.ceil(sec))
  }

  hideWaveTimer() { this.el.waveTimer.classList.add('hidden') }

  setWave(n) { this.el.waveNum.textContent = String(n).padStart(2, '0') }
  setEnemies(n) { this.el.enemyCount.textContent = n }
  setScore(n) { this.el.score.textContent = n.toLocaleString() }
  setKills(n) { this.el.kills.textContent = n }
  setAccuracy(p) { this.el.accuracy.textContent = Math.round(p) + '%' }
  setGrenades(n) { this.el.nadeCount.textContent = n }

  killfeed(name, headshot, points) {
    const row = document.createElement('div')
    row.className = 'kf-row' + (headshot ? ' head' : '')
    row.innerHTML = `<span class="kf-tag">${headshot ? 'HEADSHOT' : 'ELIMINATED'}</span>` +
      `<span class="kf-name">${name}</span><b>+${points}</b>`
    this.el.killfeed.appendChild(row)
    while (this.el.killfeed.children.length > 5) this.el.killfeed.firstChild.remove()
    setTimeout(() => {
      row.classList.add('out')
      setTimeout(() => row.remove(), 400)
    }, 3200)
  }

  combo(n) {
    if (n < 2) return
    clearTimeout(this.comboTimer)
    this.el.comboX.textContent = 'x' + n
    this.el.combo.classList.remove('hidden')
    this.el.combo.style.animation = 'none'
    void this.el.combo.offsetWidth
    this.el.combo.style.animation = ''
    this.comboTimer = setTimeout(() => this.el.combo.classList.add('hidden'), 1800)
  }

  clearFeed() {
    this.el.killfeed.innerHTML = ''
    this.el.combo.classList.add('hidden')
    this.el.damageDirs.innerHTML = ''
    this.el.banner.classList.add('hidden')
    this.el.waveTimer.classList.add('hidden')
    this.el.reloadHint.classList.add('hidden')
    this.el.lowHealth.classList.remove('on')
    this.el.damageFlash.classList.remove('hit')
  }

  setMuted(m) {
    if (this.el.mute) this.el.mute.textContent = m ? 'SOUND: OFF' : 'SOUND: ON'
  }
}
