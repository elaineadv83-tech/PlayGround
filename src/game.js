import {
  TYPES, CREATURES, STARTERS, CARDS, STARTER_DECKS, REWARD_POOL, STATUS_INFO,
  RELICS, MAP_LAYOUT, NODE_INFO, EVENTS, enemyPoolForFloor, ELITE_POOL, CATCH_POOL,
} from './data.js';
import { beastArt, icon, orbArt } from './art.js';
import { sfx } from './audio.js';

const RUN_KEY = 'wildspire.run.v2';
const META_KEY = 'wildspire.meta.v2';
const STARTER_KEY = 'wildspire.starter.v2';

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast');

let screen = 'title';
let run = null;
let combat = null;
let busy = false;
let cardUid = 1;
let selectedStarter = localStorage.getItem(STARTER_KEY) || 'emberkit';
let introPending = true;
let meta = loadMeta();
let pendingFx = [];
let titleParticles = [];

const PASSIVE_KEY = {
  emberkit: 'kindling', mossprig: 'rooted', tidefin: 'river_hands',
  glimmerbat: 'first_light', thornhog: 'quill_coat', wisplet: 'cold_flame',
  boglet: 'deep_pockets', sablefang: 'night_runner', voltuff: 'static_fleece',
  frostfawn: 'first_frost', cragmaw: 'bedrock', emberlynx: 'solar_roar',
  mossbeast: 'old_growth',
};

const CARD_KIND = { attack: 'Attack', skill: 'Skill', power: 'Power', bind: 'Bind' };

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
const typeOf = (id) => TYPES[CREATURES[id]?.type] || TYPES.stone;
const pct = (n, d) => `${clamp(Math.round((n / Math.max(1, d)) * 100), 0, 100)}%`;

function loadMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    return { bestiary: Array.isArray(parsed.bestiary) ? parsed.bestiary : [], runs: parsed.runs || 0, wins: parsed.wins || 0 };
  } catch {
    return { bestiary: [], runs: 0, wins: 0 };
  }
}
function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
function loadRun() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RUN_KEY) || 'null');
    if (!parsed || parsed.version !== 2 || !parsed.map || parsed.hp <= 0 || parsed.won) return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveRun() {
  if (!run || run.hp <= 0 || run.won) return;
  try { localStorage.setItem(RUN_KEY, JSON.stringify(run)); } catch { /* storage can be full */ }
}
function clearRun() {
  try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ }
}

function makeCard(id, upgraded = false) {
  return { uid: `c${cardUid++}`, id, upgraded };
}
function makeDeck(ids) {
  return ids.map((id) => makeCard(id));
}
function restoreCardUid() {
  let highest = 0;
  (run?.deck || []).forEach((card) => {
    const match = /^c(\d+)$/.exec(card.uid || '');
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  cardUid = Math.max(cardUid, highest + 1);
}
function newRun(starterId) {
  const starter = CREATURES[starterId] ? starterId : 'emberkit';
  run = {
    version: 2,
    seed: Date.now(),
    starter,
    hp: 74,
    maxHp: 74,
    gold: 82,
    floor: 0,
    currentNode: null,
    deck: makeDeck(STARTER_DECKS[starter]),
    party: [starter],
    map: buildMap(),
    stats: { battles: 0, catches: 0, elites: 0, damage: 0 },
    won: false,
    startedAt: Date.now(),
  };
  meta.runs += 1;
  saveMeta();
  saveRun();
  return run;
}

function buildMap() {
  const nodes = [];
  let index = 0;
  MAP_LAYOUT.forEach((row, rowIndex) => {
    const floor = rowIndex + 1;
    row.forEach((spec) => {
      const node = {
        id: `n${index++}`,
        floor,
        lane: spec.lane,
        type: spec.type,
        visited: false,
        enemy: null,
        event: null,
      };
      if (spec.type === 'battle') node.enemy = pick(enemyPoolForFloor(floor));
      if (spec.type === 'catch') node.enemy = pick(CATCH_POOL);
      if (spec.type === 'elite') node.enemy = pick(ELITE_POOL);
      if (spec.type === 'boss') node.enemy = 'hollowwarden';
      if (spec.type === 'event') node.event = pick(EVENTS).id;
      nodes.push(node);
    });
  });
  const edges = {};
  nodes.forEach((node) => {
    edges[node.id] = nodes
      .filter((other) => other.floor === node.floor + 1 && Math.abs(other.lane - node.lane) <= 1)
      .map((other) => other.id);
  });
  return { nodes, edges };
}

function mapNode(id) {
  return run?.map?.nodes.find((node) => node.id === id) || null;
}
function availableNodes() {
  if (!run) return [];
  if (run.floor === 0 && !run.currentNode) return run.map.nodes.filter((n) => n.floor === 1);
  const current = mapNode(run.currentNode);
  if (!current) return run.map.nodes.filter((n) => n.floor === 1);
  const ids = run.map.edges[current.id] || [];
  return ids.map(mapNode).filter(Boolean);
}
function rowNodes(floor) {
  return run.map.nodes.filter((node) => node.floor === floor);
}
function isAvailable(node) {
  return availableNodes().some((n) => n.id === node.id);
}
function pathProgress() {
  if (!run) return 0;
  let best = 0;
  run.map.nodes.forEach((n) => { if (n.visited && n.floor > best) best = n.floor; });
  return best;
}

/* ------------------------------------------------------------------ */
/* Ambient canvas                                                      */
/* ------------------------------------------------------------------ */

function initMotes() {
  const canvas = document.querySelector('#motes');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dots = [];
  const resize = () => {
    width = canvas.width = Math.floor(window.innerWidth * window.devicePixelRatio);
    height = canvas.height = Math.floor(window.innerHeight * window.devicePixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    const count = clamp(Math.floor(window.innerWidth / 34), 18, 46);
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: (Math.random() * 1.7 + 0.5) * window.devicePixelRatio,
      speed: (Math.random() * 0.18 + 0.05) * window.devicePixelRatio,
      phase: Math.random() * Math.PI * 2,
      sway: Math.random() * 0.3 + 0.1,
      hue: Math.random() > 0.7 ? '255, 203, 117' : '126, 230, 201',
    }));
  };
  window.addEventListener('resize', resize);
  resize();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(38, now - last);
    last = now;
    ctx.clearRect(0, 0, width, height);
    dots.forEach((dot) => {
      dot.y -= dot.speed * dt * 0.06;
      dot.phase += dt * 0.001;
      dot.x += Math.sin(dot.phase) * dot.sway * 0.08;
      if (dot.y < -8) { dot.y = height + 8; dot.x = Math.random() * width; }
      const alpha = 0.12 + (Math.sin(dot.phase * 1.7) + 1) * 0.11;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${dot.hue}, ${alpha})`;
      ctx.shadowColor = `rgba(${dot.hue}, .9)`;
      ctx.shadowBlur = 8 * window.devicePixelRatio;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ */
/* Shared UI                                                           */
/* ------------------------------------------------------------------ */

function logo(size = '') {
  return `<div class="logo ${size}" aria-label="Wildspire">
    <span class="logo-mark">${icon('rune')}</span>
    <span class="logo-word">WILD<span>SPIRE</span></span>
  </div>`;
}

function hpBar(hp, max, cls = '') {
  const percent = clamp((hp / Math.max(1, max)) * 100, 0, 100);
  return `<div class="hp-bar ${cls}" title="${hp} / ${max} HP">
    <div class="hp-track"><span style="width:${percent}%"></span><i></i></div>
    <b>${hp}<small>/${max}</small></b>
  </div>`;
}

function statPill(iconName, value, label = '', extra = '') {
  return `<div class="stat-pill ${extra}" title="${label}">${icon(iconName)}<span>${value}</span></div>`;
}

function typeBadge(type) {
  const t = TYPES[type] || TYPES.stone;
  return `<span class="type-badge" style="--tc:${t.color}">${icon(t.icon)}${t.name}</span>`;
}

function beastMini(id, extra = '') {
  const c = CREATURES[id];
  if (!c) return '';
  return `<div class="beast-mini ${extra}" title="${c.name} — ${c.passive.name}">
    <span class="beast-mini-art">${beastArt(id, { className: 'mini-svg', glow: false })}</span>
    <span class="beast-mini-name">${c.name}</span>
  </div>`;
}

function showToast(text, kind = '') {
  if (!toastRoot) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon(kind === 'bad' ? 'down' : kind === 'gold' ? 'coin' : 'star')}<span>${esc(text)}</span>`;
  toastRoot.append(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function openModal(html, { className = '', dismissible = true } = {}) {
  modalRoot.innerHTML = `<div class="modal-backdrop ${className}" data-dismiss="${dismissible ? 'yes' : 'no'}">
    <div class="modal-shell" role="dialog" aria-modal="true">${html}</div>
  </div>`;
  if (dismissible) {
    modalRoot.querySelector('.modal-backdrop').addEventListener('mousedown', (event) => {
      if (event.target.classList.contains('modal-backdrop')) closeModal();
    });
  }
  const closer = modalRoot.querySelector('[data-close]');
  if (closer) closer.addEventListener('click', closeModal);
  const first = modalRoot.querySelector('button:not([disabled])');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 40);
}
function closeModal() {
  modalRoot.innerHTML = '';
}

function captureChance(threshold, bonus = 0, ratio = null) {
  const displayRatio = ratio === null ? threshold : ratio;
  const base = 0.14 + (1 - displayRatio) * 0.86 + (bonus || 0) * 0.08;
  if (!combat) return clamp(base, 0.04, 0.95);
  const hpRatio = ratio === null ? combat.enemy.hp / combat.enemy.maxHp : ratio;
  const maxThreshold = combat.enemy.isElite ? Math.min(threshold, 0.4) : threshold;
  if (combat.enemy.isBoss) return 0;
  if (hpRatio > maxThreshold) return 0;
  let chance = base + (combat.status.catch || 0) * 0.12;
  if (combat.enemy.isElite) chance -= 0.1;
  return clamp(chance, 0.04, 0.95);
}

function modifiedOps(def, upgraded) {
  return (def.ops || []).map((operation) => {
    if (!upgraded) return { ...operation };
    const next = { ...operation };
    if (operation.op === 'damage') next.amount = operation.amount + (operation.amount > 9 ? 3 : 2);
    if (operation.op === 'block') next.amount = operation.amount + 3;
    if (operation.op === 'heal') next.amount = operation.amount + 2;
    if (operation.op === 'draw') next.amount = operation.amount + 1;
    if (operation.op === 'self' || operation.op === 'status' || operation.op === 'add') next.amount = operation.amount + 1;
    if (operation.op === 'catch') { next.threshold = operation.threshold + 0.1; next.bonus = operation.bonus + 1; }
    if (operation.op === 'execute') next.amount = operation.amount + 2;
    return next;
  });
}

function cardNumbers(def, upgraded) {
  const ops = modifiedOps(def, upgraded);
  const find = (name) => ops.find((operation) => operation.op === name) || {};
  const damage = find('damage');
  const block = find('block');
  const draw = find('draw');
  const focus = ops.find((operation) => operation.op === 'self' && operation.status === 'focus') || {};
  const thorns = ops.find((operation) => operation.op === 'self' && operation.status === 'thorns') || {};
  const regen = ops.find((operation) => operation.op === 'self' && operation.status === 'regen') || {};
  const weak = ops.find((operation) => operation.op === 'status' && operation.status === 'weak') || {};
  const vulnerable = ops.find((operation) => operation.op === 'status' && operation.status === 'vulnerable') || {};
  const burn = ops.find((operation) => operation.op === 'status' && operation.status === 'burn') || {};
  const stun = ops.find((operation) => operation.op === 'status' && operation.status === 'stun') || {};
  const heal = find('heal');
  const execute = find('execute');
  const catchOp = find('catch');
  return {
    ops, damage: damage.amount || 0, block: block.amount || 0, draw: draw.amount || 0,
    focus: focus.amount || 0, thorns: thorns.amount || 0, regen: regen.amount || 0,
    weak: weak.amount || 0, vulnerable: vulnerable.amount || 0, burn: burn.amount || 0,
    stun: stun.amount || 0, heal: heal.amount || 0, bonus: execute.amount || 0,
    threshold: catchOp.threshold || 0, catchBonus: catchOp.bonus || 0,
    chance: catchOp.threshold ? captureChance(catchOp.threshold, catchOp.bonus, catchOp.threshold) : 0,
  };
}

function cardText(def, upgraded = false) {
  const n = cardNumbers(def, upgraded);
  return def.text
    .replace('{damage}', n.damage)
    .replace('{block}', n.block)
    .replace('{draw}', n.draw)
    .replace('{focus}', n.focus)
    .replace('{thorns}', n.thorns)
    .replace('{regen}', n.regen)
    .replace('{weak}', n.weak)
    .replace('{vulnerable}', n.vulnerable)
    .replace('{burn}', n.burn)
    .replace('{stun}', n.stun)
    .replace('{heal}', n.heal)
    .replace('{bonus}', n.bonus)
    .replace('{threshold}', Math.round(n.threshold * 100))
    .replace('{chance}', Math.round(n.chance * 100));
}

function cardHTML(card, { index = 0, count = 1, mode = 'hand', reward = false } = {}) {
  const def = CARDS[card.id];
  if (!def) return '';
  const type = TYPES[def.type] || TYPES.stone;
  const playable = mode === 'hand' ? canPlayCard(card) : true;
  const reason = mode === 'hand' ? cardBlockReason(card) : '';
  const isOrb = def.kind === 'bind';
  return `<button type="button" class="card kind-${def.kind} ${card.upgraded ? 'upgraded' : ''} ${playable ? 'playable' : 'unplayable'} ${isOrb ? 'orb-card' : ''}"
    data-card-uid="${reward ? '' : card.uid}" data-reward-index="${reward ? index : ''}" style="--i:${index};--n:${count};--tc:${type.color};--td:${type.deep};--ts:${type.soft}"
    title="${esc(reason || cardText(def, card.upgraded))}" ${mode === 'hand' && !playable ? 'aria-disabled="true"' : ''}>
    <span class="card-cost">${def.cost}</span>
    <span class="card-art">${isOrb ? orbArt() : icon(def.icon)}<i class="card-art-glow"></i></span>
    <span class="card-name">${def.name}${card.upgraded ? '<sup>+</sup>' : ''}</span>
    <span class="card-sub">${type.name} · ${CARD_KIND[def.kind] || def.kind}</span>
    <span class="card-rule"></span>
    <span class="card-text">${esc(cardText(def, card.upgraded))}</span>
    ${def.kind === 'attack' ? `<span class="card-strike">${icon('claw')}</span>` : ''}
    ${def.exhaust ? '<span class="card-exhaust">Exhaust</span>' : ''}
  </button>`;
}

function canPlayCard(card) {
  if (!combat || combat.phase !== 'player' || busy) return false;
  const def = CARDS[card.id];
  if (!def) return false;
  if ((combat.energy || 0) < def.cost) return false;
  const catchOp = modifiedOps(def, card.upgraded).find((operation) => operation.op === 'catch');
  if (catchOp) {
    if (combat.enemy.isBoss) return false;
    const threshold = combat.enemy.isElite ? Math.min(catchOp.threshold, 0.4) : catchOp.threshold;
    if (combat.enemy.hp / combat.enemy.maxHp > threshold) return false;
  }
  return true;
}
function cardBlockReason(card) {
  const def = CARDS[card.id];
  if (!def || !combat) return '';
  if (combat.phase !== 'player' || busy) return 'Wait for your turn.';
  if (combat.energy < def.cost) return 'Not enough energy.';
  const catchOp = modifiedOps(def, card.upgraded).find((operation) => operation.op === 'catch');
  if (catchOp) {
    if (combat.enemy.isBoss) return 'The Hollow Warden cannot be bound.';
    const threshold = combat.enemy.isElite ? Math.min(catchOp.threshold, 0.4) : catchOp.threshold;
    if (combat.enemy.hp / combat.enemy.maxHp > threshold) return `Weaken the beast below ${Math.round(threshold * 100)}% HP first.`;
  }
  return '';
}

/* ------------------------------------------------------------------ */
/* Title screen                                                        */
/* ------------------------------------------------------------------ */

function titleScenery() {
  const motes = Array.from({ length: 26 }, (_, i) => {
    const x = 4 + Math.random() * 92;
    const y = 8 + Math.random() * 80;
    const delay = (Math.random() * 9).toFixed(2);
    const duration = (5 + Math.random() * 8).toFixed(2);
    const size = (1 + Math.random() * 2.4).toFixed(1);
    return `<i class="title-mote" style="left:${x}%;top:${y}%;--d:${delay}s;--t:${duration}s;--s:${size}px"></i>`;
  }).join('');
  return `<svg class="title-scenery" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="tMoon" cx="38%" cy="34%" r="66%">
        <stop offset="0" stop-color="#fff9dd"/><stop offset=".38" stop-color="#f0d38f"/>
        <stop offset=".78" stop-color="#bc8d4f"/><stop offset="1" stop-color="#6d4b2a"/>
      </radialGradient>
      <radialGradient id="tMoonHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#f4d698" stop-opacity=".3"/><stop offset=".55" stop-color="#ae8656" stop-opacity=".1"/><stop offset="1" stop-color="#805d3a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="tMountain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#142a2d"/><stop offset="1" stop-color="#081214"/>
      </linearGradient>
      <linearGradient id="tMountain2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0e2022"/><stop offset="1" stop-color="#061011"/>
      </linearGradient>
      <linearGradient id="tSpire" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#173236"/><stop offset=".55" stop-color="#0c1a1d"/><stop offset="1" stop-color="#071011"/>
      </linearGradient>
      <linearGradient id="tMist" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#b8d5c9" stop-opacity="0"/><stop offset=".4" stop-color="#b8d5c9" stop-opacity=".12"/><stop offset=".7" stop-color="#b8d5c9" stop-opacity=".05"/><stop offset="1" stop-color="#b8d5c9" stop-opacity="0"/>
      </linearGradient>
      <filter id="tBlur"><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <rect width="1440" height="900" fill="#071011"/>
    <circle cx="1048" cy="242" r="250" fill="url(#tMoonHalo)"/>
    <circle cx="1048" cy="242" r="146" fill="url(#tMoon)"/>
    <g opacity=".55" fill="#d8c08d">
      <circle cx="980" cy="196" r="13" opacity=".24"/><circle cx="1092" cy="166" r="8" opacity=".2"/>
      <circle cx="1118" cy="292" r="19" opacity=".18"/><circle cx="978" cy="298" r="7" opacity=".2"/>
    </g>
    <g class="title-stars" fill="#f7e8b9">
      <circle cx="160" cy="100" r="1.4"/><circle cx="250" cy="180" r="1"/><circle cx="390" cy="75" r="1.8" opacity=".6"/>
      <circle cx="520" cy="140" r="1"/><circle cx="690" cy="70" r="1.2"/><circle cx="830" cy="150" r="1"/>
      <circle cx="1300" cy="90" r="1.7" opacity=".7"/><circle cx="1210" cy="320" r="1.1"/><circle cx="80" cy="300" r="1.3" opacity=".55"/>
    </g>
    <path d="M0 560 130 432l95 70 120-128 118 110 104-77 132 128 96-80 135 99 90-70 160 104 160-102 80 77v380H0Z" fill="url(#tMountain2)" opacity=".85"/>
    <path d="M0 650 120 516l112 77 102-109 137 119 115-84 148 110 92-70 126 92 112-71 140 90 166-87 60 58v260H0Z" fill="url(#tMountain)"/>
    <g opacity=".95">
      <path d="M1054 900 1030 600l-35-45 15-12-24-96 16-6-31-104 26-13-19-73 18-5-20-89 26-11-11-49 25-26 5-54 21 14 20-38 6 42 25 5-9 40 25 33-19 37 18 19-26 61 17 11-28 62 12 18-20 66 8 12-24 59 10 15-20 70 17 19-28 69 18 16-22 67 13 18-19 62 17 16-10 78 27 110Z" fill="#091618"/>
      <path d="M1049 900 1039 610l-19-39 10-25-16-81 11-19-18-70 14-16-14-77 15-17-16-63 18-15-7-44 15-16 12-59 12 13 17-35 9 29 12 2-11 41 15 19-19 38 11 17-22 54 8 12-24 57 9 15-21 59 9 14-23 60 9 17-19 59 11 15-20 64 12 17-19 57 9 12-14 55 9 18-7 62 20 93Z" fill="url(#tSpire)"/>
      <path d="m1044 514 19-30M1031 585l26-24M1050 652l-22-23M1040 742l24-25M1029 813l23-21" stroke="#d4a966" stroke-width="2" opacity=".18"/>
      <g fill="#d4a966" opacity=".45">
        <rect x="1040" y="461" width="9" height="13" rx="4"/><rect x="1033" y="541" width="8" height="11" rx="4"/>
        <rect x="1049" y="631" width="8" height="12" rx="4"/><rect x="1036" y="712" width="9" height="13" rx="4"/>
        <rect x="1041" y="802" width="8" height="11" rx="4"/>
      </g>
      <path d="M930 900 906 741l-28-26 10-10-17-45 12-9-21-51 21-13-18-63 15-9-13-44 14-10-6-34 20-13 4-39 18 13 17-24 3 36 19 3-8 31 16 20-15 29 9 13-18 38 8 11-16 38 7 11-12 41 4 10-10 40 10 12-13 41 9 10-7 45 10 14-5 68Z" fill="#0a181a"/>
      <path d="M1172 900 1194 756l24-20-8-12 14-38-10-12 16-43-16-14 14-45-12-11 9-31-13-13 4-31-15-12-7-29-14 11-14-22-1 27-17 1 6 26-15 17 11 24-9 11 15 34-7 10 13 33-6 9 10 34-4 10 9 35-8 10 10 33-8 11 6 35-9 12 7 58Z" fill="#0b191b"/>
    </g>
    <g fill="#041011" opacity=".95">
      <path d="M0 900V760l45 11 8-39 18 38 14-81 18 67 22-37 8 55 37 8 18-64 21 70 23-42 5 59 44 9 17-52 23 49 19-14 22 42 18-29 35 42 21-20 18 51 32-14 24 50 21-21 33 41v83Z"/>
      <path d="M1440 900V747l-53 19-12-53-21 47-15-75-20 63-21-34-12 62-38 2-22-48-25 45-18-27-12 60-41 7-18-36-22 40-20-12-24 48-31-35-20 56-26-16-22 51-33-30-16 49v72Z"/>
    </g>
    <rect x="-100" y="620" width="1640" height="100" fill="url(#tMist)" filter="url(#tBlur)" opacity=".7"/>
    <rect x="-100" y="730" width="1640" height="60" fill="url(#tMist)" filter="url(#tBlur)" opacity=".5"/>
    <path d="M0 900h1440v-30c-140-4-253 10-371 3-128-8-248 12-367 3-150-12-301 9-422-1-102-8-181 4-280 3Z" fill="#071113"/>
    ${motes}
  </svg>`;
}

function starterCardHTML(id) {
  const c = CREATURES[id];
  const t = TYPES[c.type];
  return `<button type="button" class="starter-choice ${selectedStarter === id ? 'selected' : ''}" data-starter="${id}" style="--tc:${t.color};--td:${t.deep};--ts:${t.soft}" aria-pressed="${selectedStarter === id}">
    <span class="starter-type">${icon(t.icon)}${t.name}</span>
    <span class="starter-art">${beastArt(id, { className: 'starter-svg' })}</span>
    <span class="starter-copy">
      <strong>${c.name}</strong>
      <em>${c.title}</em>
      <span class="starter-rule"></span>
      <span class="starter-passive">${icon('star')}${c.passive.name}</span>
    </span>
    <span class="starter-pick">${selectedStarter === id ? 'CHOSEN' : 'CHOOSE'}</span>
  </button>`;
}

function renderTitle() {
  screen = 'title';
  const saved = loadRun();
  const totalCaught = meta.bestiary.length;
  app.innerHTML = `<main class="screen title-screen active">
    ${titleScenery()}
    <div class="title-vignette"></div>
    <section class="title-content">
      <div class="title-kicker"><span></span>A ROGUELIKE DECKBUILDER<span></span></div>
      <h1 class="title-logo"><span>WILD</span><span>SPIRE</span></h1>
      <p class="title-pledge">Build your deck. Weaken the wild.<br><em>Bind it to your side.</em></p>
      <div class="starter-label"><span>CHOOSE YOUR FIRST BOND</span><i></i><span class="starter-count">${totalCaught} / 14 DISCOVERED</span></div>
      <div class="starter-rail">
        ${STARTERS.map(starterCardHTML).join('')}
      </div>
      <div class="title-actions">
        <button type="button" class="btn btn-primary btn-hero" id="start-game">${icon('rune')}Start Game</button>
        ${saved ? `<button type="button" class="btn btn-ghost" id="continue-run">${icon('map')}Continue Run</button>` : ''}
        <button type="button" class="btn btn-round" id="title-help" aria-label="How to play">${icon('help')}</button>
        <button type="button" class="btn btn-round" id="title-sound" aria-label="Toggle sound">${icon(sfx.isMuted() ? 'mute' : 'sound')}</button>
      </div>
      <p class="title-hint">A 30-minute ascent · 14 pocket beasts · one deck</p>
    </section>
    <aside class="title-note-card">
      <span class="note-eyebrow">${icon('paw')} FIELD NOTES</span>
      <p>Climb the Wildspire. Win cards. Weaken rare beasts below the bind line, then catch them with a Pocket Orb.</p>
      <span class="note-rule"></span>
      <p class="note-small">Every bond adds its signature card and passive to your run.</p>
    </aside>
    <footer class="title-footer">
      <span>${icon('cards')} DECKBUILDING</span>
      <span>${icon('orb')} CREATURE CATCHING</span>
      <span>${icon('crown')} BOSS ASCENT</span>
    </footer>
  </main>`;

  app.querySelectorAll('.starter-choice').forEach((el) => {
    el.addEventListener('click', () => {
      selectedStarter = el.dataset.starter;
      localStorage.setItem(STARTER_KEY, selectedStarter);
      sfx.click();
      renderTitle();
    });
    el.addEventListener('mouseenter', () => sfx.hover());
  });
  app.querySelector('#start-game').addEventListener('click', () => {
    sfx.click();
    newRun(selectedStarter);
    showMap();
  });
  const continueButton = app.querySelector('#continue-run');
  if (continueButton) {
    continueButton.addEventListener('click', () => {
      run = saved;
      restoreCardUid();
      sfx.click();
      showMap();
    });
  }
  app.querySelector('#title-help').addEventListener('click', () => openHelp());
  app.querySelector('#title-sound').addEventListener('click', () => {
    sfx.setMuted(!sfx.isMuted());
    renderTitle();
  });
  if (introPending) {
    introPending = false;
    // Let the first compositor frames settle before arming the main CTA on slow renderers.
    const startButton = app.querySelector('#start-game');
    startButton.disabled = true;
    setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (startButton.isConnected) startButton.disabled = false;
      }));
    }, 420);
  }
}

/* ------------------------------------------------------------------ */
/* Map screen                                                          */
/* ------------------------------------------------------------------ */

const MAP_W = 640;
const MAP_H = 1330;
const LANE_X = [132, 320, 508];
const START_Y = 1238;
const ROW_Y = (floor) => 1148 - (floor - 1) * 92;

function nodePosition(node) {
  return { x: LANE_X[node.lane] ?? 320, y: ROW_Y(node.floor) };
}

function mapDecor() {
  return `<g class="map-decor" aria-hidden="true">
    <circle cx="516" cy="324" r="104" fill="#d8b875" opacity=".035"/>
    <circle cx="516" cy="324" r="66" fill="#d8b875" opacity=".03"/>
    <g fill="#04100f" opacity=".85">
      <path d="M0 420 40 260l34 74 30-120 28 98 27-62 34 132 40-32 25 80 32-58 32 102 30-40 38 110 35-59 36 118 30-45 48 92v-190H0Z" opacity=".6"/>
      <path d="M0 960V750l36 66 29-101 40 125 25-62 32 110 30-43 45 90 32-62 35 85 27-44 48 82 26-35 52 100 30-54 45 98 40-70 44 103v-330Z" opacity=".35"/>
    </g>
    <g fill="none" stroke="#7ea79b" opacity=".1">
      <path d="M40 610c110-50 180-30 270 10s190 36 290-4"/><path d="M20 700c100-40 190-20 260 14s210 30 340-20"/>
    </g>
    <g fill="#dfeee2" opacity=".35">
      <circle cx="96" cy="208" r="1.3"/><circle cx="203" cy="144" r="1"/><circle cx="577" cy="131" r="1.5"/>
      <circle cx="560" cy="690" r="1"/><circle cx="76" cy="990" r="1.1"/>
    </g>
  </g>`;
}

function renderMap() {
  screen = 'map';
  if (!run) { renderTitle(); return; }
  const available = availableNodes();
  const p = pathProgress();
  const orbCount = run.deck.filter((card) => CARDS[card.id]?.kind === 'bind').length;
  const edges = [];
  run.map.nodes.forEach((node) => {
    const from = nodePosition(node);
    (run.map.edges[node.id] || []).forEach((toId) => {
      const toNode = mapNode(toId);
      const to = nodePosition(toNode);
      const active = node.visited && toNode.visited;
      const open = node.visited && available.some((n) => n.id === toNode.id);
      const mid = (from.y + to.y) / 2;
      edges.push(`<path class="map-edge ${active ? 'walked' : ''} ${open ? 'open' : ''}" d="M${from.x} ${from.y} C${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.y}" />`);
    });
  });
  const startEdge = available.map((node) => {
    const to = nodePosition(node);
    return `<path class="map-edge open" d="M320 ${START_Y - 33} C320 ${(START_Y + to.y) / 2}, ${to.x} ${(START_Y + to.y) / 2}, ${to.x} ${to.y + 30}" />`;
  }).join('');
  const nodesHTML = run.map.nodes.map((node) => {
    const info = NODE_INFO[node.type];
    const pos = nodePosition(node);
    const stateClass = node.visited ? 'visited' : isAvailable(node) ? 'available' : 'locked';
    return `<button type="button" class="map-node ${node.type} ${stateClass}" style="left:${(pos.x / MAP_W) * 100}%;top:${(pos.y / MAP_H) * 100}%" data-node="${node.id}" ${stateClass === 'locked' || stateClass === 'visited' ? 'disabled' : ''} title="${info.name}: ${info.text}" aria-label="${info.name}">
      <span class="node-ring"></span>
      <span class="node-face">${icon(info.icon)}</span>
      ${node.visited ? `<span class="node-check">${icon('check')}</span>` : ''}
    </button>`;
  }).join('');
  const rows = MAP_LAYOUT.map((_, rowIndex) => {
    const floor = rowIndex + 1;
    const y = ROW_Y(floor);
    return `<span class="map-row-label" style="top:${(y / MAP_H) * 100}%">${String(floor).padStart(2, '0')}</span>`;
  }).join('');
  const current = mapNode(run.currentNode);
  const currentPos = current ? nodePosition(current) : { x: 320, y: START_Y };
  const partyList = run.party.map((id) => beastMini(id)).join('');
  const nextPreview = available.length
    ? available.map((node) => {
      const info = NODE_INFO[node.type];
      return `<div class="next-preview type-${node.type}">
        <span class="next-icon">${icon(info.icon)}</span>
        <span><b>${info.name}</b><em>${info.text}</em></span>
      </div>`;
    }).join('')
    : '<p class="muted">The trail ends here.</p>';

  app.innerHTML = `<main class="screen map-screen active">
    <header class="hud">
      <div class="hud-brand">${logo('small')}<span class="hud-floor">ASCENT <b>${p}</b><i>/ 11</i></span></div>
      <div class="hud-stats">
        <div class="hud-hp">${icon('heart')}${hpBar(run.hp, run.maxHp, 'hud')}</div>
        ${statPill('coin', run.gold, 'Gold')}
        ${statPill('orb', orbCount, 'Binding cards in deck')}
        ${statPill('cards', run.deck.length, 'Deck size')}
      </div>
      <div class="hud-actions">
        <button type="button" class="hud-btn" data-action="deck">${icon('cards')}<span>Deck</span></button>
        <button type="button" class="hud-btn" data-action="bonds">${icon('paw')}<span>Bonds</span></button>
        <button type="button" class="hud-btn" data-action="sound" aria-label="Toggle sound">${icon(sfx.isMuted() ? 'mute' : 'sound')}</button>
        <button type="button" class="hud-btn" data-action="menu" aria-label="Menu">${icon('menu')}</button>
      </div>
    </header>
    <div class="map-layout">
      <aside class="run-aside">
        <div class="aside-heading"><span>THE ASCENT</span><em>${p === 0 ? 'BASE CAMP' : `FLOOR ${p}`}</em></div>
        <div class="ascent-track" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<i class="${i < p ? 'lit' : ''}"></i>`).join('')}</div>
        <div class="aside-section">
          <div class="aside-title">${icon('paw')} YOUR BONDS <span>${run.party.length}</span></div>
          <div class="party-list">${partyList}</div>
        </div>
        <div class="aside-section">
          <div class="aside-title">${icon('star')} PASSIVES</div>
          <div class="relic-list">${run.party.map((id) => {
            const c = CREATURES[id];
            return `<div class="relic-chip" title="${c.passive.name}: ${c.passive.text}">${beastMini(id)}<span><b>${c.passive.name}</b><em>${c.passive.text}</em></span></div>`;
          }).join('')}</div>
        </div>
        <div class="aside-foot">${icon('rune')} The mountain remembers every bargain.</div>
      </aside>
      <section class="map-stage" aria-label="Ascent map">
        <div class="map-caption"><span>${icon('map')}THE WILDSPIRE</span><em>Choose a lit path</em></div>
        <div class="map-scroll" id="map-scroll">
          <div class="map-canvas">
            ${mapDecor()}
            <svg class="map-lines" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none" aria-hidden="true">${edges.join('')}${startEdge}</svg>
            ${rows}
            <div class="map-start" style="left:${(320 / MAP_W) * 100}%;top:${(START_Y / MAP_H) * 100}%">
              <span class="camp-fire">${icon('fire')}</span><b>BASE CAMP</b>
            </div>
            ${nodesHTML}
            <div class="map-you" style="left:${(currentPos.x / MAP_W) * 100}%;top:${(currentPos.y / MAP_H) * 100}%">${icon('paw')}<span>YOU</span></div>
          </div>
        </div>
        <div class="map-bottom-hint">${available.length ? `${icon('arrow')} ${available.length} path${available.length > 1 ? 's' : ''} open` : `${icon('crown')} The last gate waits`}</div>
      </section>
      <aside class="route-aside">
        <div class="route-card">
          <span class="route-kicker">${icon('rune')} NEXT STEPS</span>
          <h2>${current ? 'The path continues' : 'Begin the ascent'}</h2>
          <p>${current ? 'The Wildspire opens another switchback. Pick a node to continue your climb.' : 'Three bonds are possible. Choose one, then follow the lit trail toward the summit.'}</p>
          <div class="next-list">${nextPreview}</div>
        </div>
        <div class="route-card quiet">
          <span class="route-kicker">${icon('help')} TRAIL WISDOM</span>
          <p>Softening a beast below <b>55% HP</b> makes it bindable. Orbs are precious; rare beasts resist more.</p>
          <p class="small">Elites can be caught at <b>40% HP</b> — if you dare.</p>
        </div>
        <div class="route-card quiet bestiary-teaser">
          <span class="route-kicker">${icon('paw')} BESTIARY</span>
          <div class="bestiary-count"><b>${meta.bestiary.length}</b><span>/ 14 bound<br>across all runs</span></div>
        </div>
      </aside>
    </div>
  </main>`;

  app.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      sfx.click();
      if (action === 'deck') openDeck();
      if (action === 'bonds') openBonds();
      if (action === 'menu') openMenu();
      if (action === 'sound') { sfx.setMuted(!sfx.isMuted()); renderMap(); }
    });
  });
  app.querySelectorAll('.map-node.available').forEach((el) => {
    el.addEventListener('click', () => enterNode(el.dataset.node));
    el.addEventListener('mouseenter', () => sfx.hover());
  });
  setTimeout(() => {
    const scroller = document.querySelector('#map-scroll');
    if (!scroller) return;
    const targetY = (currentPos.y / MAP_H) * scroller.scrollHeight;
    scroller.scrollTop = clamp(targetY - scroller.clientHeight * 0.64, 0, scroller.scrollHeight);
  }, 60);
  saveRun();
}

function enterNode(id) {
  const node = mapNode(id);
  if (!node || !isAvailable(node) || busy) return;
  sfx.click();
  node.visited = true;
  run.currentNode = node.id;
  run.floor = node.floor;
  run.stats.battles += node.type === 'battle' || node.type === 'catch' || node.type === 'elite' || node.type === 'boss' ? 1 : 0;
  if (node.type === 'battle' || node.type === 'catch' || node.type === 'elite' || node.type === 'boss') {
    startCombat(node);
  } else if (node.type === 'rest') {
    openRest(node);
  } else if (node.type === 'shop') {
    openShop(node);
  } else if (node.type === 'event') {
    openEvent(node);
  }
}

/* ------------------------------------------------------------------ */
/* Overlays: deck, bonds, help, menu                                   */
/* ------------------------------------------------------------------ */

function openDeck() {
  if (!run) return;
  const counts = {};
  run.deck.forEach((card) => { counts[card.id] = (counts[card.id] || 0) + 1; });
  const cards = [...run.deck].sort((a, b) => {
    const ca = CARDS[a.id];
    const cb = CARDS[b.id];
    return (ca.kind === cb.kind ? 0 : ca.kind.localeCompare(cb.kind)) || ca.name.localeCompare(cb.name);
  });
  openModal(`<div class="modal-head">
    <div><span class="modal-kicker">${icon('cards')} YOUR DECK</span><h2>${run.deck.length} cards, ${Object.keys(counts).length} lessons</h2></div>
    <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="deck-grid">${cards.map((card, index) => cardHTML(card, { index, count: cards.length, mode: 'display' })).join('')}</div>
  <div class="modal-foot"><span>${icon('orb')} ${run.deck.filter((c) => CARDS[c.id]?.kind === 'bind').length} binding cards</span><button type="button" class="btn btn-ghost" data-close>Close</button></div>`, { className: 'wide' });
}

function openBonds() {
  if (!run) return;
  const cards = run.party.map((id) => {
    const c = CREATURES[id];
    const t = TYPES[c.type];
    const sig = CARDS[c.signature];
    return `<article class="bond-card" style="--tc:${t.color};--td:${t.deep}">
      <div class="bond-art">${beastArt(id, { className: 'bond-svg' })}</div>
      <div class="bond-body">
        ${typeBadge(c.type)}
        <h3>${c.name}</h3>
        <em>${c.title}</em>
        <p>${c.lore}</p>
        <div class="bond-passive"><span>${icon('star')} ${c.passive.name}</span><b>${c.passive.text}</b></div>
        ${sig ? `<div class="bond-sig"><span>Signature card</span><b>${sig.name}</b></div>` : ''}
      </div>
    </article>`;
  }).join('');
  openModal(`<div class="modal-head">
    <div><span class="modal-kicker">${icon('paw')} BONDS</span><h2>${run.party.length} companions on the climb</h2></div>
    <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="bonds-grid">${cards}</div>
  <div class="modal-foot"><span>Bonds are permanent for this ascent. Duplicates deepen your bond.</span><button type="button" class="btn btn-ghost" data-close>Close</button></div>`, { className: 'wide' });
}

function openHelp() {
  openModal(`<div class="modal-head">
    <div><span class="modal-kicker">${icon('help')} HOW TO PLAY</span><h2>Climb. Weaken. Bind.</h2></div>
    <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="help-grid">
    <section><span class="help-icon">${icon('cards')}</span><h3>Build a deck</h3><p>Each turn draw 5 cards and spend 3 energy. Strike, guard, and stack Focus. Add a card after every victory.</p></section>
    <section><span class="help-icon">${icon('orb')}</span><h3>Soften to bind</h3><p>Get a wild beast below the bind line, then play a Pocket Orb. Lower HP and Bind Focus raise the chance. A successful catch ends the fight.</p></section>
    <section><span class="help-icon">${icon('paw')}</span><h3>Grow your pack</h3><p>Every caught beast adds its signature card to your deck and a passive bond. Duplicates grant +5 max HP instead.</p></section>
    <section><span class="help-icon">${icon('map')}</span><h3>Choose the ascent</h3><p>Battle, catch, camp, shop, and strange signs line the switchbacks. Elites guard the best rewards. The Hollow Warden waits at the summit.</p></section>
  </div>
  <div class="help-tips">
    <span>${icon('star')} Tip: <b>Lullaby</b> and <b>Hunter's Mark</b> add Bind Focus for the next orb.</span>
    <span>${icon('shield')} Block is cleared at the start of your turn.</span>
  </div>
  <div class="modal-foot"><span>Press <kbd>Space</kbd> to end turn · <kbd>Esc</kbd> closes panels</span><button type="button" class="btn btn-primary" data-close>Got it</button></div>`);
}

function openMenu() {
  if (!run) return;
  openModal(`<div class="modal-head">
    <div><span class="modal-kicker">${icon('menu')} PAUSED</span><h2>The mountain waits.</h2></div>
    <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="menu-stats">
    <div><span>ASCENT</span><b>${run.floor} / 11</b></div>
    <div><span>BATTLES</span><b>${run.stats.battles}</b></div>
    <div><span>BONDS</span><b>${run.party.length}</b></div>
    <div><span>GOLD</span><b>${run.gold}</b></div>
  </div>
  <div class="menu-actions">
    <button type="button" class="btn btn-primary" data-close>${icon('arrow')} Keep Climbing</button>
    <button type="button" class="btn btn-ghost" id="menu-help">${icon('help')} How to Play</button>
    <button type="button" class="btn btn-ghost" id="menu-sound">${icon(sfx.isMuted() ? 'mute' : 'sound')} Sound ${sfx.isMuted() ? 'Off' : 'On'}</button>
    <button type="button" class="btn btn-danger" id="abandon-run">${icon('trash')} Abandon Ascent</button>
  </div>
  <p class="modal-small">Abandoning ends this run. Your bestiary is kept.</p>`, { dismissible: true });
  const help = modalRoot.querySelector('#menu-help');
  if (help) help.addEventListener('click', () => { closeModal(); openHelp(); });
  const sound = modalRoot.querySelector('#menu-sound');
  if (sound) sound.addEventListener('click', () => { sfx.setMuted(!sfx.isMuted()); openMenu(); });
  const abandon = modalRoot.querySelector('#abandon-run');
  if (abandon) abandon.addEventListener('click', () => {
    clearRun(); run = null; closeModal(); sfx.defeat(); renderTitle();
  });
}

/* ------------------------------------------------------------------ */
/* Rest, shop, event                                                   */
/* ------------------------------------------------------------------ */

function openRest(node) {
  openModal(`<div class="event-hero rest-hero">
    <div class="camp-scene"><span class="camp-moon"></span><span class="camp-flame">${icon('fire')}</span></div>
    <span class="modal-kicker">${icon('fire')} CAMPSITE</span>
    <h2>The fire is warm.</h2>
    <p>A rare patch of quiet. The mountain leans close, but it does not strike.</p>
  </div>
  <div class="choice-grid">
    <button type="button" class="choice-card" id="rest-heal">
      <span class="choice-icon">${icon('heart')}</span>
      <strong>Rest</strong>
      <em>Heal ${Math.max(1, Math.round(run.maxHp * 0.28))} HP</em>
      <span>Wrap your hands around the ember and let the climb wait.</span>
    </button>
    <button type="button" class="choice-card" id="rest-study">
      <span class="choice-icon">${icon('star')}</span>
      <strong>Study</strong>
      <em>Upgrade a card</em>
      <span>Rehearse a move until it becomes muscle memory.</span>
    </button>
  </div>
  <div class="modal-foot"><span>One choice before the trail darkens.</span></div>`, { dismissible: false });
  modalRoot.querySelector('#rest-heal').addEventListener('click', () => {
    const heal = Math.max(1, Math.round(run.maxHp * 0.28));
    run.hp = Math.min(run.maxHp, run.hp + heal);
    sfx.heal();
    closeModal();
    saveRun();
    showMap();
    showToast(`Rested for ${heal} HP`, 'good');
  });
  modalRoot.querySelector('#rest-study').addEventListener('click', () => openUpgradePicker());
}

function openUpgradePicker() {
  const upgradable = run.deck.filter((card) => !card.upgraded);
  if (!upgradable.length) {
    showToast('Every card is already sharp.', 'bad');
    return;
  }
  openModal(`<div class="modal-head">
    <div><span class="modal-kicker">${icon('star')} STUDY</span><h2>Choose a card to upgrade</h2></div>
    <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="deck-grid upgrade-grid">${upgradable.map((card, index) => cardHTML(card, { index, count: upgradable.length, mode: 'display' })).join('')}</div>
  <div class="modal-foot"><span>Upgrades are permanent for this ascent.</span><button type="button" class="btn btn-ghost" data-close>Not now</button></div>`, { className: 'wide' });
  modalRoot.querySelectorAll('.upgrade-grid .card').forEach((el) => {
    el.addEventListener('click', () => {
      const card = run.deck.find((item) => item.uid === el.dataset.cardUid);
      if (!card) return;
      card.upgraded = true;
      sfx.upgrade();
      closeModal();
      saveRun();
      showMap();
      showToast(`${CARDS[card.id].name} upgraded`, 'good');
    });
  });
}

function shopStock(node) {
  if (!node.shop) {
    const cardPool = shuffle(['emberlash', 'frostbite', 'stonewall', 'spark', 'focus', 'smoke_veil', 'snare', 'wild_call', 'mend', 'hunter_mark', 'lullaby', 'bramble_aura', 'instinct']);
    const rarePool = shuffle(['great_orb', 'bramble_aura', 'instinct', 'stonewall', 'lullaby']);
    const stock = [
      { id: cardPool[0], price: 38, sold: false },
      { id: cardPool[1], price: 42, sold: false },
      { id: rarePool[0], price: 68, sold: false, rare: true },
      { id: 'pocket_orb', price: 30, sold: false },
      { id: 'great_orb', price: 62, sold: false },
    ];
    node.shop = { stock, removal: 45, removalSold: false };
  }
  return node.shop;
}

function openShop(node) {
  const shop = shopStock(node);
  const items = shop.stock.map((item, index) => {
    const card = makeCard(item.id);
    const def = CARDS[item.id];
    const type = TYPES[def.type];
    return `<div class="shop-item ${item.sold ? 'sold' : ''}">
      <div class="shop-card-wrap">${cardHTML(card, { index, count: shop.stock.length, mode: 'display' })}</div>
      <div class="shop-buy">
        <span class="shop-price">${icon('coin')}${item.price}</span>
        <button type="button" class="btn btn-small ${run.gold < item.price || item.sold ? 'disabled' : ''}" data-buy="${index}" ${item.sold || run.gold < item.price ? 'disabled' : ''}>${item.sold ? 'Sold' : 'Buy'}</button>
      </div>
    </div>`;
  }).join('');
  openModal(`<div class="shop-head">
    <div class="merchant-mark">${icon('bag')}</div>
    <div><span class="modal-kicker">${icon('coin')} WANDERING MERCHANT</span><h2>“Everything has a price. Most things have two.”</h2></div>
    <div class="shop-gold">${icon('coin')}<b>${run.gold}</b><span>gold</span></div>
  </div>
  <div class="shop-grid">${items}
    <div class="shop-item service ${shop.removalSold ? 'sold' : ''}">
      <div class="service-art">${icon('trash')}<span>A bad habit, removed.<br><em>Choose a card to forget.</em></span></div>
      <div class="shop-buy"><span class="shop-price">${icon('coin')}${shop.removal}</span><button type="button" class="btn btn-small ${run.gold < shop.removal || shop.removalSold ? 'disabled' : ''}" id="buy-removal" ${shop.removalSold || run.gold < shop.removal ? 'disabled' : ''}>${shop.removalSold ? 'Sold' : 'Buy'}</button></div>
    </div>
  </div>
  <div class="modal-foot"><span>${icon('orb')} Orbs are cards. They exhaust after a throw.</span><button type="button" class="btn btn-ghost" id="leave-shop">Leave the cart</button></div>`, { className: 'wide', dismissible: false });

  modalRoot.querySelectorAll('[data-buy]').forEach((el) => {
    el.addEventListener('click', () => {
      const item = shop.stock[Number(el.dataset.buy)];
      if (!item || item.sold || run.gold < item.price) return;
      item.sold = true;
      run.gold -= item.price;
      run.deck.push(makeCard(item.id));
      sfx.coin();
      saveRun();
      openShop(node);
      showToast(`${CARDS[item.id].name} purchased`, 'gold');
    });
  });
  const removal = modalRoot.querySelector('#buy-removal');
  if (removal) removal.addEventListener('click', () => {
    if (shop.removalSold || run.gold < shop.removal) return;
    run.gold -= shop.removal;
    shop.removalSold = true;
    saveRun();
    openRemovalPicker(node);
  });
  modalRoot.querySelector('#leave-shop').addEventListener('click', () => {
    closeModal();
    saveRun();
    showMap();
  });
}

function openRemovalPicker(node) {
  openModal(`<div class="modal-head">
    <div><span class="modal-kicker">${icon('trash')} FORGET</span><h2>Choose a card to remove</h2></div>
    <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="deck-grid removal-grid">${run.deck.map((card, index) => cardHTML(card, { index, count: run.deck.length, mode: 'display' })).join('')}</div>
  <div class="modal-foot"><span>The merchant will dispose of it. Probably responsibly.</span></div>`, { className: 'wide' });
  modalRoot.querySelectorAll('.removal-grid .card').forEach((el) => {
    el.addEventListener('click', () => {
      const index = run.deck.findIndex((card) => card.uid === el.dataset.cardUid);
      if (index < 0) return;
      const removed = run.deck.splice(index, 1)[0];
      sfx.coin();
      saveRun();
      closeModal();
      openShop(node);
      showToast(`${CARDS[removed.id].name} forgotten`, 'gold');
    });
  });
}

function openEvent(node) {
  const ev = EVENTS.find((event) => event.id === node.event) || EVENTS[0];
  openModal(`<div class="event-hero">
    <span class="modal-kicker">${icon('rune')} A STRANGE SIGN</span>
    <h2>${ev.title}</h2>
    <p>${ev.text}</p>
  </div>
  <div class="choice-grid">${ev.choices.map((choice, index) => `<button type="button" class="choice-card" data-choice="${index}">
    <span class="choice-icon">${icon(index === 0 ? 'star' : index === 1 ? 'rune' : 'leaf')}</span>
    <strong>${choice.label}</strong>
    <em>${choice.detail}</em>
    <span>The mountain is listening.</span>
  </button>`).join('')}</div>
  <div class="modal-foot"><span>Some bargains are remembered.</span></div>`, { dismissible: false });
  modalRoot.querySelectorAll('[data-choice]').forEach((el) => {
    el.addEventListener('click', () => {
      const choice = ev.choices[Number(el.dataset.choice)];
      const message = applyEventEffect(choice.effect);
      closeModal();
      saveRun();
      showMap();
      if (message) showToast(message, 'good');
    });
  });
}

function applyEventEffect(effect) {
  const messages = [];
  if (effect.hp) {
    run.hp = clamp(run.hp + effect.hp, 1, run.maxHp);
    messages.push(`${effect.hp > 0 ? '+' : ''}${effect.hp} HP`);
  }
  if (effect.heal) {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + effect.heal);
    messages.push(`+${run.hp - before} HP`);
  }
  if (effect.maxHp) {
    run.maxHp += effect.maxHp; run.hp += effect.maxHp;
    messages.push(`+${effect.maxHp} max HP`);
  }
  if (effect.gold) {
    run.gold = Math.max(0, run.gold + effect.gold);
    messages.push(`${effect.gold > 0 ? '+' : ''}${effect.gold} gold`);
  }
  if (effect.card) {
    run.deck.push(makeCard(effect.card));
    messages.push(`${CARDS[effect.card].name} added`);
  }
  if (effect.randomCard) {
    const pool = effect.randomCard === 'rare' ? ['great_orb', 'bramble_aura', 'instinct', 'stonewall', 'lullaby'] : REWARD_POOL;
    const cardId = pick(pool);
    run.deck.push(makeCard(cardId));
    messages.push(`${CARDS[cardId].name} added`);
  }
  if (effect.upgradeRandom) {
    const options = run.deck.filter((card) => !card.upgraded);
    if (options.length) {
      const card = pick(options);
      card.upgraded = true;
      messages.push(`${CARDS[card.id].name} upgraded`);
    }
  }
  sfx.upgrade();
  return messages.join(' · ');
}

/* ------------------------------------------------------------------ */
/* Combat setup                                                        */
/* ------------------------------------------------------------------ */

function scaledEnemy(node) {
  const c = CREATURES[node.enemy] || CREATURES.glimmerbat;
  const floor = node.floor || 1;
  const catchNode = node.type === 'catch';
  const elite = Boolean(c.elite);
  const boss = Boolean(c.boss);
  const hpScale = boss ? 1 : 1 + Math.max(0, floor - 1) * 0.075 + (catchNode ? 0.08 : 0) + (elite ? 0.06 : 0);
  const damageScale = boss ? 1 : 1 + Math.max(0, floor - 1) * 0.028;
  const moves = c.moves.map((move) => ({
    ...move,
    damage: move.damage ? Math.max(1, Math.round(move.damage * damageScale)) : undefined,
    block: move.block ? Math.round(move.block * (1 + Math.max(0, floor - 1) * 0.02)) : undefined,
    heal: move.heal ? Math.round(move.heal * (1 + Math.max(0, floor - 1) * 0.02)) : undefined,
  }));
  return {
    id: node.enemy,
    name: c.name,
    type: c.type,
    title: c.title,
    isElite: elite,
    isBoss: boss,
    maxHp: Math.round(c.baseHp * hpScale),
    hp: Math.round(c.baseHp * hpScale),
    block: 0,
    status: {},
    moves,
    moveIndex: Math.floor(Math.random() * moves.length),
    intent: null,
    cutscene: false,
  };
}

function chooseIntent() {
  if (!combat) return;
  const enemy = combat.enemy;
  const move = enemy.moves[enemy.moveIndex % enemy.moves.length];
  enemy.moveIndex += 1;
  enemy.intent = { ...move };
}

function startCombat(node) {
  const enemy = scaledEnemy(node);
  const deck = shuffle(run.deck.map((card) => ({ ...card })));
  combat = {
    node,
    enemy,
    drawPile: deck,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    playerBlock: 0,
    status: { focus: 0, dex: 0, thorns: 0, regen: 0, instinct: 0, weak: 0, vulnerable: 0, catch: 0 },
    energy: 3,
    maxEnergy: 3,
    turn: 1,
    phase: 'player',
    firstAttack: true,
    firstTurn: true,
    log: `${enemy.name} blocks the trail.`,
    catchResult: null,
    encounterType: node.type,
  };
  applyBonds();
  chooseIntent();
  screen = 'combat';
  busy = true;
  renderCombat();
  setTimeout(() => {
    beginPlayerTurn(true);
  }, 480);
}

function applyBonds() {
  const has = (id) => run.party.includes(id);
  if (has('emberkit')) combat.firstAttackBonus = 3;
  if (has('mossprig')) combat.playerBlock += 6;
  if (has('tidefin')) combat.firstTurnDraw = (combat.firstTurnDraw || 0) + 1;
  if (has('glimmerbat')) combat.status.focus += 1;
  if (has('thornhog')) combat.status.thorns += 3;
  if (has('wisplet')) combat.enemy.status.weak = (combat.enemy.status.weak || 0) + 1;
  if (has('sablefang')) combat.firstTurnEnergy = (combat.firstTurnEnergy || 0) + 1;
  if (has('voltuff')) combat.firstTurnDraw = (combat.firstTurnDraw || 0) + 1;
  if (has('frostfawn')) combat.enemy.status.weak = (combat.enemy.status.weak || 0) + 2;
  if (has('cragmaw')) combat.playerBlock += 10;
  if (has('emberlynx')) combat.status.focus += 2;
  if (has('mossbeast')) { /* Max HP handled when bound */ }
}

function beginPlayerTurn(first = false) {
  if (!combat) return;
  combat.phase = 'player';
  if (!first) combat.playerBlock = 0;
  combat.energy = combat.maxEnergy + (first && combat.firstTurnEnergy ? combat.firstTurnEnergy : 0);
  if (combat.status.regen > 0) {
    const amount = Math.min(combat.status.regen, run.maxHp - run.hp);
    if (amount > 0) {
      run.hp += amount;
      pendingFx.push({ target: 'player', text: `+${amount}`, kind: 'heal' });
      sfx.heal();
    }
    combat.status.regen -= 1;
  }
  if (combat.status.weak > 0) combat.status.weak -= 1;
  if (combat.status.vulnerable > 0) combat.status.vulnerable -= 1;
  const drawCount = 5 + (combat.status.instinct || 0) + (first ? (combat.firstTurnDraw || 0) : 0);
  drawCards(drawCount);
  combat.log = first ? 'The wild beast stirs.' : 'Your turn.';
  combat.turn = first ? 1 : combat.turn + 1;
  combat.firstTurn = false;
  busy = false;
  sfx.turn();
  renderCombat();
}

function drawCards(count) {
  for (let i = 0; i < count; i++) {
    if (combat.hand.length >= 10) break;
    if (!combat.drawPile.length) {
      if (!combat.discardPile.length) break;
      combat.drawPile = shuffle(combat.discardPile);
      combat.discardPile = [];
    }
    const card = combat.drawPile.pop();
    if (card) combat.hand.push(card);
  }
}

/* ------------------------------------------------------------------ */
/* Combat render                                                       */
/* ------------------------------------------------------------------ */

function statusChips(status, owner = 'enemy') {
  const keys = Object.keys(status).filter((key) => Number(status[key]) > 0 && STATUS_INFO[key]);
  if (!keys.length) return '<div class="status-empty">No conditions</div>';
  return `<div class="status-chips">${keys.map((key) => {
    const info = STATUS_INFO[key];
    return `<span class="status-chip status-${key}" title="${esc(info.text)}">${icon(info.icon)}<b>${status[key]}</b><em>${info.name}</em></span>`;
  }).join('')}</div>`;
}

function intentHTML(enemy) {
  if (enemy.status.stun > 0) {
    return `<div class="intent stunned"><span class="intent-icon">${icon('stun')}</span><div><b>Stunned</b><em>Will skip its action</em></div></div>`;
  }
  const intent = enemy.intent;
  if (!intent) return '';
  if (intent.intent === 'attack') {
    const damage = intentDamage(intent);
    const total = damage * (intent.hits || 1);
    return `<div class="intent attack"><span class="intent-icon">${icon('swords')}</span><div><b>${total}${intent.hits > 1 ? ` <em>(${damage} × ${intent.hits})</em>` : ''}</b><span>Incoming damage</span></div></div>`;
  }
  if (intent.intent === 'block') {
    return `<div class="intent defend"><span class="intent-icon">${icon('shield')}</span><div><b>${intent.block || 0}</b><span>Will gain Block</span></div></div>`;
  }
  if (intent.intent === 'buff') {
    return `<div class="intent buff"><span class="intent-icon">${icon('up')}</span><div><b>Powering up</b><span>Will grow stronger</span></div></div>`;
  }
  if (intent.intent === 'heal') {
    return `<div class="intent heal"><span class="intent-icon">${icon('heart')}</span><div><b>+${intent.heal || 0}</b><span>Will recover HP</span></div></div>`;
  }
  return `<div class="intent debuff"><span class="intent-icon">${icon('down')}</span><div><b>Hex</b><span>Will weaken you</span></div></div>`;
}

function intentDamage(intent) {
  let damage = (intent.damage || 0) + (combat.enemy.status.focus || 0);
  if (combat.enemy.status.weak > 0) damage = Math.floor(damage * 0.75);
  if (combat.status.vulnerable > 0) damage = Math.floor(damage * 1.5);
  return Math.max(0, damage);
}

function renderCombat() {
  if (!run || !combat) return;
  screen = 'combat';
  const enemy = combat.enemy;
  const type = TYPES[enemy.type] || TYPES.stone;
  const starter = CREATURES[run.starter];
  const hand = combat.hand.map((card, index) => cardHTML(card, { index, count: combat.hand.length })).join('');
  const bestOrb = combat.hand
    .flatMap((card) => (CARDS[card.id]?.ops || []).filter((operation) => operation.op === 'catch'))
    .sort((a, b) => (b.threshold + (b.bonus || 0) * 0.08) - (a.threshold + (a.bonus || 0) * 0.08))[0] || { threshold: 0.55, bonus: 0 };
  const threshold = Math.round(Math.min(bestOrb.threshold, enemy.isElite ? 0.4 : 1) * 100);
  const catchable = !enemy.isBoss && enemy.hp / enemy.maxHp <= threshold / 100;
  const chance = catchable ? Math.round(captureChance(bestOrb.threshold, bestOrb.bonus) * 100) : 0;
  const hpPercent = clamp((enemy.hp / enemy.maxHp) * 100, 0, 100);
  const companionIds = run.party.filter((id) => id !== run.starter).slice(0, 3);
  const isPlayerTurn = combat.phase === 'player' && !busy;
  const discardCount = combat.discardPile.length;
  const drawCount = combat.drawPile.length;
  const exhaustCount = combat.exhaustPile.length;

  app.innerHTML = `<main class="screen combat-screen active" data-phase="${combat.phase}">
    <div class="combat-world">
      <div class="combat-moon"></div>
      <div class="combat-ridge ridge-back"></div>
      <div class="combat-ridge ridge-mid"></div>
      <div class="combat-trees"></div>
      <div class="combat-fog fog-a"></div>
      <div class="combat-fog fog-b"></div>
      <div class="arena-floor"><span></span></div>
      <div class="arena-runes">${icon('rune')}${icon('rune')}${icon('rune')}</div>
    </div>
    <header class="combat-hud">
      <div class="combat-loc">
        <button type="button" class="hud-btn back-btn" data-action="menu" aria-label="Pause">${icon('menu')}</button>
        <div><span>ASCENT ${run.floor} / 11</span><b>${NODE_INFO[combat.node.type]?.name || 'Wilds'}</b></div>
      </div>
      <div class="combat-player-stat">
        ${icon('heart')}<div class="player-hp">${hpBar(run.hp, run.maxHp, 'combat')}</div>
        ${combat.playerBlock > 0 ? `<span class="block-badge" title="Block">${icon('shield')}<b>${combat.playerBlock}</b></span>` : ''}
      </div>
      <div class="combat-actions">
        <button type="button" class="hud-btn" data-action="deck" title="Deck">${icon('cards')}</button>
        <button type="button" class="hud-btn" data-action="bonds" title="Bonds">${icon('paw')}</button>
        <button type="button" class="hud-btn" data-action="sound" title="Sound">${icon(sfx.isMuted() ? 'mute' : 'sound')}</button>
      </div>
    </header>

    <section class="arena" aria-label="Combat arena">
      <div class="player-zone" id="player-zone">
        <div class="companion-spirits">${companionIds.map((id) => `<span class="spirit" title="${CREATURES[id].name}">${beastArt(id, { className: 'spirit-svg', glow: false })}</span>`).join('')}</div>
        <div class="combatant player-combatant">
          <div class="combatant-art">${beastArt(run.starter, { className: 'combat-svg player-svg' })}</div>
          <div class="combatant-plate">
            <span class="plate-kicker">YOUR BOND</span>
            <b>${starter.name}${combat.playerBlock > 0 ? `<span class="plate-block">${icon('shield')}${combat.playerBlock}</span>` : ''}</b>
            ${statusChips(combat.status, 'player')}
          </div>
        </div>
        ${combat.status.thorns > 0 ? `<span class="aura-badge thorns" title="Thorns">${icon('thorn')} ${combat.status.thorns}</span>` : ''}
        ${combat.status.focus > 0 ? `<span class="aura-badge focus" title="Focus">${icon('flame')} ${combat.status.focus}</span>` : ''}
      </div>

      <div class="arena-center">
        <div class="turn-banner ${isPlayerTurn ? 'active' : ''}">${isPlayerTurn ? 'YOUR TURN' : combat.phase === 'enemy' ? 'THE WILD ACTS' : '...'}</div>
        <div class="combat-log" aria-live="polite">${esc(combat.log)}</div>
      </div>

      <div class="enemy-zone" id="enemy-zone">
        <div class="intent-wrap">${intentHTML(enemy)}</div>
        <div class="combatant enemy-combatant">
          <div class="combatant-art">${beastArt(enemy.id, { className: 'combat-svg enemy-svg' })}</div>
          <div class="catch-aura ${catchable ? 'catchable' : ''}"></div>
          <div class="combatant-plate enemy-plate">
            <span class="plate-kicker">${enemy.isBoss ? 'THE LAST GATE' : enemy.isElite ? 'APEX PREDATOR' : 'WILD BEAST'} ${enemy.isBoss || enemy.isElite ? icon(enemy.isBoss ? 'mask' : 'crown') : ''}</span>
            <div class="enemy-name-row"><b>${enemy.name}</b>${typeBadge(enemy.type)}</div>
            <div class="enemy-hp-row">
              <div class="enemy-hp-track"><span style="width:${hpPercent}%"></span><i></i></div>
              <strong>${enemy.hp}<small>/${enemy.maxHp}</small></strong>
              ${enemy.block > 0 ? `<span class="enemy-block">${icon('shield')}${enemy.block}</span>` : ''}
            </div>
            ${statusChips(enemy.status, 'enemy')}
            <div class="bind-line ${catchable ? 'open' : ''}">
              <span>${enemy.isBoss ? 'UNBINDABLE' : catchable ? 'BIND WINDOW OPEN' : `BIND BELOW ${threshold}%`}</span>
              <div class="bind-track"><i style="width:${enemy.isBoss ? 0 : clamp((1 - enemy.hp / enemy.maxHp) * 100, 0, 100)}%"></i><b style="left:${threshold}%"></b></div>
              ${catchable ? `<strong>${chance}%</strong>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="fx-layer" id="fx-layer"></div>
    </section>

    <section class="combat-dock">
      <div class="piles">
        <button type="button" class="pile" title="Draw pile (${drawCount})">${icon('cards')}<b>${drawCount}</b><span>Draw</span></button>
        <button type="button" class="pile" title="Discard pile (${discardCount})">${icon('cards')}<b>${discardCount}</b><span>Discard</span></button>
        ${exhaustCount ? `<button type="button" class="pile exhausted" title="Exhausted (${exhaustCount})">${icon('trash')}<b>${exhaustCount}</b><span>Gone</span></button>` : ''}
      </div>
      <div class="energy-orb ${isPlayerTurn ? 'ready' : ''}">
        <span class="energy-core">${combat.energy}</span>
        <small>/${combat.maxEnergy}</small>
        <em>ENERGY</em>
      </div>
      <div class="hand-wrap">
        <div class="hand" id="hand">${hand || `<div class="empty-hand">${icon('cards')} <span>${combat.phase === 'player' ? 'No cards — end your turn.' : 'The wild is moving…'}</span></div>`}</div>
      </div>
      <div class="end-turn-wrap">
        <button type="button" class="btn btn-end ${isPlayerTurn ? '' : 'disabled'}" id="end-turn" ${isPlayerTurn ? '' : 'disabled'}>${combat.phase === 'enemy' ? 'Wild Acts…' : 'End Turn'} ${icon('arrow')}</button>
        <span class="key-hint"><kbd>Space</kbd></span>
      </div>
    </section>
    <div class="combat-help-strip">${icon('orb')} Weaken the beast to open its bind window. ${icon('shield')} Block vanishes at the start of your turn.</div>
  </main>`;

  app.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      sfx.click();
      if (action === 'deck') openDeck();
      if (action === 'bonds') openBonds();
      if (action === 'sound') { sfx.setMuted(!sfx.isMuted()); renderCombat(); }
      if (action === 'menu') openCombatMenu();
    });
  });
  app.querySelectorAll('#hand .card').forEach((el) => {
    el.addEventListener('click', () => playCard(el.dataset.cardUid));
    el.addEventListener('mouseenter', () => sfx.hover());
  });
  const endTurnButton = app.querySelector('#end-turn');
  if (endTurnButton) endTurnButton.addEventListener('click', endTurn);
  requestAnimationFrame(() => flushFx());
}

function openCombatMenu() {
  openModal(`<div class="modal-head">
    <div><span class="modal-kicker">${icon('menu')} PAUSED</span><h2>The wild waits.</h2></div>
    <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="menu-actions">
    <button type="button" class="btn btn-primary" data-close>${icon('arrow')} Return to Battle</button>
    <button type="button" class="btn btn-ghost" id="combat-help">${icon('help')} How to Play</button>
    <button type="button" class="btn btn-ghost" id="combat-deck">${icon('cards')} Inspect Deck</button>
    <button type="button" class="btn btn-ghost" id="combat-bonds">${icon('paw')} View Bonds</button>
    <button type="button" class="btn btn-danger" id="combat-abandon">${icon('trash')} Abandon Ascent</button>
  </div>
  <p class="modal-small">Leaving the battle abandons this run.</p>`);
  modalRoot.querySelector('#combat-help').addEventListener('click', () => { closeModal(); openHelp(); });
  modalRoot.querySelector('#combat-deck').addEventListener('click', () => { closeModal(); openDeck(); });
  modalRoot.querySelector('#combat-bonds').addEventListener('click', () => { closeModal(); openBonds(); });
  modalRoot.querySelector('#combat-abandon').addEventListener('click', () => {
    clearRun(); run = null; combat = null; closeModal(); sfx.defeat(); renderTitle();
  });
}

function flushFx() {
  if (!pendingFx.length) return;
  const layer = document.querySelector('#fx-layer');
  if (!layer) { pendingFx = []; return; }
  const fx = [...pendingFx];
  pendingFx = [];
  fx.forEach((item, index) => {
    const el = document.createElement('span');
    el.className = `float-text ${item.kind}`;
    el.textContent = item.text;
    const zone = item.target === 'player' ? document.querySelector('#player-zone') : document.querySelector('#enemy-zone');
    const rect = zone?.getBoundingClientRect();
    if (!rect) return;
    el.style.left = `${rect.left + rect.width * (item.target === 'player' ? 0.54 : 0.48) - 20}px`;
    el.style.top = `${rect.top + rect.height * (item.target === 'player' ? 0.37 : 0.30)}px`;
    el.style.animationDelay = `${index * 0.05}s`;
    layer.append(el);
    setTimeout(() => el.remove(), 1100);
  });
}

function shakeZone(target) {
  const el = document.querySelector(target === 'player' ? '#player-zone' : '#enemy-zone');
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 360);
}

/* ------------------------------------------------------------------ */
/* Playing cards                                                       */
/* ------------------------------------------------------------------ */

async function playCard(uid) {
  if (!combat || busy || combat.phase !== 'player') return;
  const card = combat.hand.find((item) => item.uid === uid);
  if (!card) return;
  if (!canPlayCard(card)) {
    sfx.error();
    showToast(cardBlockReason(card) || 'That card cannot be played.', 'bad');
    return;
  }
  const def = CARDS[card.id];
  const el = document.querySelector(`#hand .card[data-card-uid="${uid}"]`);
  busy = true;
  combat.log = `${def.name}.`;
  await animateCardPlay(el);
  combat.energy -= def.cost;
  combat.hand = combat.hand.filter((item) => item.uid !== uid);
  const ops = modifiedOps(def, card.upgraded);
  let caught = false;
  for (const operation of ops) {
    const result = resolveOperation(operation, card);
    if (result === 'caught') { caught = true; break; }
    if (result === 'dead') break;
  }
  if (def.exhaust || caught) combat.exhaustPile.push(card);
  else combat.discardPile.push(card);
  if (caught) {
    busy = true;
    await sleep(620);
    finishCombat(true);
    return;
  }
  if (combat.enemy.hp <= 0) {
    combat.phase = 'won';
    combat.log = `${combat.enemy.name} falls.`;
    sfx.victory();
    renderCombat();
    busy = true;
    await sleep(620);
    finishCombat(false);
    return;
  }
  if (run.hp <= 0) {
    defeat();
    return;
  }
  busy = false;
  renderCombat();
}

async function animateCardPlay(el) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.querySelector('#enemy-zone');
  if (!target) return;
  const from = el.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.className += ' card-ghost';
  ghost.removeAttribute('data-card-uid');
  ghost.style.position = 'fixed';
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  ghost.style.margin = '0';
  ghost.style.zIndex = '80';
  ghost.style.transform = 'none';
  document.body.append(ghost);
  const dx = to.left + to.width * 0.45 - (from.left + from.width / 2);
  const dy = to.top + to.height * 0.4 - (from.top + from.height / 2);
  const anim = ghost.animate([
    { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(${dx * 0.38}px, ${dy * 0.15 - 30}px) scale(1.12) rotate(-3deg)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(.28) rotate(9deg)`, opacity: 0 },
  ], { duration: 360, easing: 'cubic-bezier(.18,.82,.24,1)' });
  await anim.finished.catch(() => {});
  ghost.remove();
}

function resolveOperation(operation, card) {
  const def = CARDS[card.id];
  switch (operation.op) {
    case 'damage': {
      hitEnemy(operation.amount, { times: operation.times || 1, source: 'card' });
      if (combat.enemy.hp <= 0) return 'dead';
      break;
    }
    case 'execute': {
      if (combat.enemy.hp / combat.enemy.maxHp < operation.threshold) {
        hitEnemy(operation.amount, { source: 'card' });
        if (combat.enemy.hp <= 0) return 'dead';
      }
      break;
    }
    case 'block': {
      const amount = operation.amount + (combat.status.dex || 0);
      combat.playerBlock += amount;
      pendingFx.push({ target: 'player', text: `+${amount}`, kind: 'block' });
      sfx.block();
      break;
    }
    case 'draw': {
      drawCards(operation.amount);
      sfx.draw();
      break;
    }
    case 'energy': {
      combat.energy += operation.amount;
      pendingFx.push({ target: 'player', text: `+${operation.amount} energy`, kind: 'energy' });
      break;
    }
    case 'status': {
      const target = operation.target === 'player' ? combat.status : combat.enemy.status;
      target[operation.status] = (target[operation.status] || 0) + operation.amount;
      pendingFx.push({ target: operation.target === 'player' ? 'player' : 'enemy', text: `${STATUS_INFO[operation.status]?.name || operation.status} ${operation.amount}`, kind: 'status' });
      break;
    }
    case 'self': {
      combat.status[operation.status] = (combat.status[operation.status] || 0) + operation.amount;
      pendingFx.push({ target: 'player', text: `${STATUS_INFO[operation.status]?.name || operation.status} ${operation.amount}`, kind: 'status' });
      break;
    }
    case 'heal': {
      const before = run.hp;
      run.hp = Math.min(run.maxHp, run.hp + operation.amount);
      pendingFx.push({ target: 'player', text: `+${run.hp - before}`, kind: 'heal' });
      sfx.heal();
      break;
    }
    case 'catch': {
      return attemptCatch(operation.threshold, operation.bonus || 0);
    }
    case 'add': {
      combat.status[operation.status] = (combat.status[operation.status] || 0) + operation.amount;
      break;
    }
    default: break;
  }
  void def;
  return '';
}

function hitEnemy(base, { times = 1, source = 'card', ignoreBlock = false } = {}) {
  for (let i = 0; i < times; i++) {
    let amount = base + (combat.status.focus || 0);
    if (source === 'card' && combat.firstAttack && combat.firstAttackBonus) {
      amount += combat.firstAttackBonus;
      combat.firstAttack = false;
    } else if (source === 'card') {
      combat.firstAttack = false;
    }
    if (combat.status.weak > 0) amount = Math.floor(amount * 0.75);
    if (combat.enemy.status.vulnerable > 0) amount = Math.floor(amount * 1.5);
    amount = Math.max(0, amount);
    let lost = amount;
    if (!ignoreBlock) {
      const blocked = Math.min(combat.enemy.block, lost);
      combat.enemy.block -= blocked;
      lost -= blocked;
    }
    combat.enemy.hp = Math.max(0, combat.enemy.hp - lost);
    run.stats.damage += lost;
    if (lost > 0) {
      pendingFx.push({ target: 'enemy', text: `-${lost}`, kind: 'damage' });
      sfx.hit();
      shakeZone('enemy');
    } else {
      pendingFx.push({ target: 'enemy', text: 'BLOCKED', kind: 'blocked' });
      sfx.block();
    }
    combat.log = `${combat.enemy.name} takes ${lost} damage.`;
    if (combat.enemy.status.thorns > 0 && lost > 0) {
      damagePlayer(combat.enemy.status.thorns, { ignoreBlock: true, source: 'thorns' });
    }
    if (combat.enemy.hp <= 0) break;
  }
}

function damagePlayer(amount, { ignoreBlock = false, source = 'enemy' } = {}) {
  let lost = Math.max(0, amount);
  if (!ignoreBlock) {
    const blocked = Math.min(combat.playerBlock, lost);
    combat.playerBlock -= blocked;
    lost -= blocked;
    if (blocked > 0) pendingFx.push({ target: 'player', text: `BLOCKED ${blocked}`, kind: 'blocked' });
  }
  run.hp = Math.max(0, run.hp - lost);
  if (lost > 0) {
    pendingFx.push({ target: 'player', text: `-${lost}`, kind: 'damage' });
    sfx.hit();
    shakeZone('player');
    combat.log = source === 'thorns' ? `Thorns bite back for ${lost}.` : `You take ${lost} damage.`;
  }
  if (run.hp <= 0) combat.log = 'The mountain grows quiet.';
}

function attemptCatch(threshold, bonus) {
  const enemy = combat.enemy;
  if (enemy.isBoss) {
    pendingFx.push({ target: 'enemy', text: 'UNBINDABLE', kind: 'blocked' });
    sfx.error();
    return '';
  }
  if (enemy.hp / enemy.maxHp > threshold) {
    pendingFx.push({ target: 'enemy', text: 'TOO STRONG', kind: 'blocked' });
    sfx.error();
    return '';
  }
  const chance = captureChance(threshold, bonus);
  const success = Math.random() < chance;
  combat.log = `Pocket Orb — ${Math.round(chance * 100)}% to bind.`;
  if (success) {
    enemy.hp = 0;
    combat.phase = 'won';
    combat.log = `${enemy.name} is bound.`;
    pendingFx.push({ target: 'enemy', text: 'BOUND', kind: 'catch' });
    playCatchBurst();
    sfx.catchStart();
    setTimeout(() => sfx.catchWin(), 430);
    return 'caught';
  }
  enemy.status.focus = (enemy.status.focus || 0) + 1;
  combat.status.catch = 0;
  pendingFx.push({ target: 'enemy', text: 'BROKE FREE', kind: 'blocked' });
  pendingFx.push({ target: 'enemy', text: '+1 Focus', kind: 'status' });
  combat.log = `${enemy.name} breaks free and grows fierce.`;
  sfx.error();
  shakeZone('enemy');
  return '';
}

function playCatchBurst() {
  const el = document.createElement('div');
  el.className = 'catch-burst';
  el.innerHTML = `<div class="catch-ring r1"></div><div class="catch-ring r2"></div><div class="catch-orb">${orbArt()}</div><div class="catch-flash"></div>`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1400);
}

/* ------------------------------------------------------------------ */
/* Enemy turn                                                          */
/* ------------------------------------------------------------------ */

async function endTurn() {
  if (!combat || combat.phase !== 'player' || busy) return;
  busy = true;
  combat.phase = 'enemy';
  combat.discardPile.push(...combat.hand);
  combat.hand = [];
  combat.log = 'You brace for the wild.';
  sfx.enemyTurn();
  renderCombat();
  await sleep(540);
  await enemyTurn();
}

async function enemyTurn() {
  if (!combat) return;
  const enemy = combat.enemy;
  enemy.block = 0;
  combat.phase = 'enemy';
  if (enemy.status.burn > 0) {
    const damage = enemy.status.burn;
    enemy.hp = Math.max(0, enemy.hp - damage);
    pendingFx.push({ target: 'enemy', text: `-${damage} burn`, kind: 'burn' });
    enemy.status.burn -= 1;
    combat.log = `${enemy.name} smoulders for ${damage}.`;
    sfx.hit();
    renderCombat();
    await sleep(500);
    if (enemy.hp <= 0) { await winFromStatus(); return; }
  }
  if (enemy.status.poison > 0) {
    const damage = enemy.status.poison;
    enemy.hp = Math.max(0, enemy.hp - damage);
    pendingFx.push({ target: 'enemy', text: `-${damage} poison`, kind: 'burn' });
    enemy.status.poison -= 1;
    combat.log = `${enemy.name} sickens for ${damage}.`;
    renderCombat();
    await sleep(450);
    if (enemy.hp <= 0) { await winFromStatus(); return; }
  }
  if (enemy.status.stun > 0) {
    enemy.status.stun -= 1;
    combat.log = `${enemy.name} is stunned and loses its action.`;
    pendingFx.push({ target: 'enemy', text: 'STUNNED', kind: 'status' });
    renderCombat();
    await sleep(850);
    chooseIntent();
    await sleep(420);
    beginPlayerTurn();
    return;
  }
  const intent = enemy.intent;
  if (!intent) { beginPlayerTurn(); return; }
  combat.log = `${enemy.name} uses ${intent.name}.`;
  renderCombat();
  await sleep(600);

  if (intent.intent === 'attack') {
    const hits = intent.hits || 1;
    for (let i = 0; i < hits; i++) {
      const damage = intentDamage(intent);
      damagePlayer(damage);
      if (combat.enemy.status.thorns > 0) void 0;
      renderCombat();
      await sleep(420);
      if (run.hp <= 0) { defeat(); return; }
    }
    if (combat.status.thorns > 0) {
      const thorns = combat.status.thorns;
      combat.enemy.hp = Math.max(0, combat.enemy.hp - thorns);
      pendingFx.push({ target: 'enemy', text: `-${thorns} thorns`, kind: 'damage' });
      combat.log = `Your thorns cut ${enemy.name} for ${thorns}.`;
      renderCombat();
      await sleep(400);
      if (combat.enemy.hp <= 0) { await winFromStatus(); return; }
    }
  } else if (intent.intent === 'block') {
    const amount = intent.block || 0;
    enemy.block += amount;
    pendingFx.push({ target: 'enemy', text: `+${amount} block`, kind: 'block' });
    sfx.block();
    renderCombat();
    await sleep(650);
  } else if (intent.intent === 'buff') {
    if (intent.focus) enemy.status.focus = (enemy.status.focus || 0) + intent.focus;
    if (intent.block) enemy.block += intent.block;
    if (intent.thorns) enemy.status.thorns = (enemy.status.thorns || 0) + intent.thorns;
    pendingFx.push({ target: 'enemy', text: 'POWER UP', kind: 'status' });
    sfx.upgrade();
    renderCombat();
    await sleep(650);
  } else if (intent.intent === 'debuff') {
    if (intent.weak) combat.status.weak = (combat.status.weak || 0) + intent.weak;
    if (intent.vulnerable) combat.status.vulnerable = (combat.status.vulnerable || 0) + intent.vulnerable;
    pendingFx.push({ target: 'player', text: 'HEXED', kind: 'status' });
    sfx.error();
    renderCombat();
    await sleep(650);
  } else if (intent.intent === 'heal') {
    const amount = Math.min(intent.heal || 0, enemy.maxHp - enemy.hp);
    enemy.hp += amount;
    pendingFx.push({ target: 'enemy', text: `+${amount}`, kind: 'heal' });
    sfx.heal();
    renderCombat();
    await sleep(650);
  }

  if (enemy.status.weak > 0) enemy.status.weak -= 1;
  if (enemy.status.vulnerable > 0) enemy.status.vulnerable -= 1;
  if (enemy.status.stun > 0) enemy.status.stun -= 1;
  chooseIntent();
  await sleep(460);
  beginPlayerTurn();
}

async function winFromStatus() {
  if (!combat) return;
  combat.phase = 'won';
  combat.log = `${combat.enemy.name} falls to its wounds.`;
  sfx.victory();
  renderCombat();
  busy = true;
  await sleep(600);
  finishCombat(false);
}

/* ------------------------------------------------------------------ */
/* Victory and rewards                                                 */
/* ------------------------------------------------------------------ */

function finishCombat(caught) {
  if (!combat) return;
  const node = combat.node;
  const enemyId = combat.enemy.id;
  const wasElite = combat.enemy.isElite;
  const wasBoss = combat.enemy.isBoss;
  const gold = wasBoss ? 120 : wasElite ? 62 : caught ? 34 : 22 + Math.max(0, node.floor) * 2;
  run.gold += gold;
  if (wasElite || wasBoss) run.stats.elites += 1;
  run.hp = Math.max(1, run.hp);
  saveRun();
  if (wasBoss) {
    combat = null;
    winRun();
    return;
  }
  if (caught) {
    const bond = captureCreature(enemyId);
    combat = null;
    openCatchReward(bond, gold);
    return;
  }
  const options = rewardCards(3);
  combat = null;
  openBattleReward(options, gold, wasElite);
}

function captureCreature(id) {
  const c = CREATURES[id];
  const duplicate = run.party.includes(id);
  let extra = '';
  if (duplicate) {
    run.maxHp += 5;
    run.hp = Math.min(run.maxHp, run.hp + 5);
    const sig = run.deck.find((card) => card.id === c.signature && !card.upgraded);
    if (sig) {
      sig.upgraded = true;
      extra = `${CARDS[c.signature].name} upgraded`;
    } else if (c.signature) {
      run.deck.push(makeCard(c.signature));
    }
  } else {
    run.party.push(id);
    if (c.signature) run.deck.push(makeCard(c.signature));
    if (id === 'boglet') { run.maxHp += 8; run.hp += 8; }
    if (id === 'mossbeast') { run.maxHp += 12; run.hp += 12; }
  }
  if (!meta.bestiary.includes(id)) meta.bestiary.push(id);
  saveMeta();
  run.stats.catches += 1;
  saveRun();
  return { creature: c, duplicate, extra, gold: 0 };
}

function rewardCards(count) {
  const pool = shuffle(REWARD_POOL.filter((id) => CARDS[id]));
  const result = [];
  const rareWant = Math.random() < 0.4;
  const rare = pool.find((id) => CARDS[id].rarity === 'rare');
  if (rareWant && rare) result.push(rare);
  for (const id of pool) {
    if (result.length >= count) break;
    if (!result.includes(id)) result.push(id);
  }
  return result.slice(0, count).map((id) => makeCard(id));
}

function openBattleReward(options, gold, wasElite) {
  const eliteBonus = wasElite ? `<div class="reward-extra">${icon('crown')} Apex trophy: <b>+6 max HP</b></div>` : '';
  if (wasElite) { run.maxHp += 6; run.hp = Math.min(run.maxHp, run.hp + 6); saveRun(); }
  openModal(`<div class="reward-head">
    <div class="reward-seal">${icon(wasElite ? 'crown' : 'star')}</div>
    <span class="modal-kicker">${icon('check')} ${wasElite ? 'APEX FELLED' : 'TRAIL CLEARED'}</span>
    <h2>${wasElite ? 'The mountain exhales.' : 'The path is quiet again.'}</h2>
    <p>Choose one lesson to carry upward.</p>
    <div class="reward-gold">${icon('coin')} +${gold} gold</div>
    ${eliteBonus}
  </div>
  <div class="reward-cards">${options.map((card, index) => `<div class="reward-option">${cardHTML(card, { index, count: options.length, reward: true })}<button type="button" class="btn btn-small btn-take" data-take="${index}">Take</button></div>`).join('')}</div>
  <div class="modal-foot"><span>Your deck grows. So does the mountain's attention.</span><button type="button" class="btn btn-ghost" id="skip-reward">Skip card · keep climbing</button></div>
  <div class="reward-flavor">${icon('rune')} ${wasElite ? 'An apex bond could have been yours. The trail remembers.' : 'Softened beasts can still be bound in later fights.'}</div>`, { className: 'reward-modal', dismissible: false });

  modalRoot.querySelectorAll('[data-take]').forEach((el) => {
    el.addEventListener('click', () => {
      const card = options[Number(el.dataset.take)];
      run.deck.push(card);
      sfx.upgrade();
      closeModal();
      showMap();
      showToast(`${CARDS[card.id].name} added to deck`, 'good');
    });
  });
  modalRoot.querySelector('#skip-reward').addEventListener('click', () => {
    closeModal();
    showMap();
  });
}

function openCatchReward(bond, gold) {
  const c = bond.creature;
  const t = TYPES[c.type];
  const sig = c.signature ? CARDS[c.signature] : null;
  openModal(`<div class="catch-modal" style="--tc:${t.color};--td:${t.deep};--ts:${t.soft}">
    <div class="catch-portrait">${beastArt(c.id, { className: 'catch-svg' })}
      <span class="catch-stamp">BOUND</span>
      <span class="catch-rings"></span>
    </div>
    <div class="catch-copy">
      <span class="modal-kicker">${icon('paw')} A NEW BOND</span>
      <h2>${c.name}</h2>
      <em>${c.title}</em>
      <div class="catch-meta">${typeBadge(c.type)}<span class="reward-gold">${icon('coin')} +${gold} gold</span></div>
      <p>${c.lore}</p>
      <div class="catch-passive"><span>${icon('star')} ${c.passive.name}</span><b>${c.passive.text}</b></div>
      ${sig ? `<div class="catch-card"><span>Signature card added</span>${cardHTML(makeCard(c.signature), { index: 0, count: 1, mode: 'display' })}</div>` : ''}
      ${bond.duplicate ? `<div class="catch-duplicate">${icon('star')} Bond deepened: +5 max HP${bond.extra ? ` · ${bond.extra}` : ''}</div>` : ''}
    </div>
  </div>
  <div class="modal-foot catch-foot"><span>The bestiary remembers this bond.</span><button type="button" class="btn btn-primary" id="catch-continue">${icon('paw')} Welcome to the pack</button></div>`, { className: 'catch-reward', dismissible: false });
  modalRoot.querySelector('#catch-continue').addEventListener('click', () => {
    closeModal();
    showMap();
    showToast(`${c.name} joined your pack`, 'good');
  });
}

function winRun() {
  run.won = true;
  run.hp = Math.max(1, run.hp);
  meta.wins += 1;
  saveMeta();
  clearRun();
  sfx.victory();
  const duration = Math.max(1, Math.round((Date.now() - run.startedAt) / 60000));
  openModal(`<div class="ending-hero victory">
    <div class="ending-moon"></div>
    <span class="modal-kicker">${icon('crown')} THE LAST GATE OPENS</span>
    <h2>The mountain remembers your name.</h2>
    <p>Beyond the gate, dawn spills through the pines. The Hollow Warden's mask is only a mask. Somewhere below, fourteen small hearts beat in time with yours.</p>
    <div class="ending-stats">
      <div><span>ASCENT</span><b>${run.floor} / 11</b></div>
      <div><span>BONDS</span><b>${run.party.length}</b></div>
      <div><span>CATCHES</span><b>${run.stats.catches}</b></div>
      <div><span>TIME</span><b>${duration} min</b></div>
    </div>
    <div class="ending-team">${run.party.map((id) => beastMini(id)).join('')}</div>
  </div>
  <div class="modal-foot ending-foot"><span>Bestiary: ${meta.bestiary.length} / 14 discovered</span><div class="ending-actions"><button type="button" class="btn btn-ghost" id="ending-bonds">${icon('paw')} View Bonds</button><button type="button" class="btn btn-primary" id="ending-again">${icon('rune')} Begin New Ascent</button></div></div>`, { className: 'ending-modal', dismissible: false });
  modalRoot.querySelector('#ending-again').addEventListener('click', () => {
    closeModal(); run = null; combat = null; renderTitle();
  });
  modalRoot.querySelector('#ending-bonds').addEventListener('click', () => { closeModal(); openBonds(); });
}

function defeat() {
  if (!run) return;
  run.hp = 0;
  clearRun();
  sfx.defeat();
  const starter = run.starter;
  const floor = run.floor;
  const party = run.party.length;
  const catches = run.stats.catches;
  combat = null;
  openModal(`<div class="ending-hero defeat">
    <div class="ending-moon"></div>
    <span class="modal-kicker">${icon('mask')} THE ASCENT ENDS</span>
    <h2>The wild keeps its mountain.</h2>
    <p>Your deck scatters into the leaves. Somewhere above, a lantern is still burning. The Wildspire will wait.</p>
    <div class="ending-stats">
      <div><span>REACHED</span><b>Floor ${floor}</b></div>
      <div><span>BONDS</span><b>${party}</b></div>
      <div><span>CATCHES</span><b>${catches}</b></div>
      <div><span>BESTIARY</span><b>${meta.bestiary.length} / 14</b></div>
    </div>
  </div>
  <div class="modal-foot ending-foot"><span>The bestiary and bonds you discovered are kept.</span><div class="ending-actions"><button type="button" class="btn btn-ghost" id="defeat-title">${icon('map')} Return to Title</button><button type="button" class="btn btn-primary" id="defeat-retry">${icon('rune')} Rise Again</button></div></div>`, { className: 'ending-modal', dismissible: false });
  modalRoot.querySelector('#defeat-retry').addEventListener('click', () => {
    closeModal(); newRun(starter); showMap();
  });
  modalRoot.querySelector('#defeat-title').addEventListener('click', () => {
    closeModal(); run = null; renderTitle();
  });
}

function showMap() {
  combat = null;
  busy = false;
  pendingFx = [];
  screen = 'map';
  if (!run) { renderTitle(); return; }
  renderMap();
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

if (!CREATURES[selectedStarter]) selectedStarter = 'emberkit';
initMotes();
renderTitle();
// Warm the first two compositor frames so input becomes actionable immediately on slow software renderers.
const warmFrames = () => requestAnimationFrame(() => requestAnimationFrame(() => {}));
warmFrames();
if (document.fonts?.ready) document.fonts.ready.then(warmFrames);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (modalRoot.innerHTML) closeModal();
    return;
  }
  if (event.code === 'Space' && screen === 'combat' && !modalRoot.innerHTML) {
    event.preventDefault();
    endTurn();
  }
  if (screen === 'title' && ['1', '2', '3'].includes(event.key)) {
    selectedStarter = STARTERS[Number(event.key) - 1];
    localStorage.setItem(STARTER_KEY, selectedStarter);
    renderTitle();
  }
});

modalRoot.addEventListener('click', (event) => {
  if (event.target.closest('[data-close]')) closeModal();
});
