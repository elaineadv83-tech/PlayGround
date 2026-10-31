export const TYPES = {
  ember:   { name: 'Ember',   color: '#ff8a5c', deep: '#b83f26', soft: '#ffd1b8', icon: 'flame' },
  verdant: { name: 'Verdant', color: '#73d69a', deep: '#2c7d55', soft: '#c9f5d6', icon: 'leaf' },
  tide:    { name: 'Tide',    color: '#65ccec', deep: '#236c95', soft: '#c4f0fb', icon: 'drop' },
  lumen:   { name: 'Lumen',   color: '#f5d879', deep: '#a66f1d', soft: '#fff0b9', icon: 'sun' },
  gloom:   { name: 'Gloom',   color: '#b79cff', deep: '#563f9c', soft: '#e6dcff', icon: 'moon' },
  stone:   { name: 'Stone',   color: '#d2a97b', deep: '#7b5736', soft: '#f1dec4', icon: 'gem' },
  storm:   { name: 'Storm',   color: '#ffe16b', deep: '#9a7611', soft: '#fff7c2', icon: 'bolt' },
  frost:   { name: 'Frost',   color: '#a9eaff', deep: '#3b7f9f', soft: '#e2f8ff', icon: 'snow' },
  hollow:  { name: 'Hollow',  color: '#f17f9b', deep: '#8f2948', soft: '#ffd4df', icon: 'mask' },
};

export const RARITY = {
  common:  { name: 'Common',  color: '#b9c4bd' },
  rare:    { name: 'Rare',    color: '#74d4ed' },
  elite:   { name: 'Elite',   color: '#f0c16d' },
  starter: { name: 'Starter', color: '#e9d6af' },
  boss:    { name: 'Boss',    color: '#f17f9b' },
};

export const CREATURES = {
  emberkit: {
    name: 'Emberkit', title: 'The Hearth Fox', type: 'ember', rarity: 'starter',
    baseHp: 30, tier: 1,
    lore: 'A coal-furred kitsune that carries the last warm ember of a fallen star. It curls around weary travellers and hums like a kettle.',
    passive: { name: 'Kindled Heart', text: 'Your first attack each combat deals +3 damage.' },
    signature: 'cinder_pounce',
    moves: [
      { name: 'Cinder Pounce', intent: 'attack', damage: 7, text: 'A bright, snapping bite.' },
      { name: 'Flare Guard', intent: 'block', block: 8, text: 'Wraps itself in a ring of flame.' },
      { name: 'Warm Up', intent: 'buff', focus: 2, text: 'Its ember grows fierce.' },
    ],
  },
  mossprig: {
    name: 'Mossprig', title: 'The Antlered Grove', type: 'verdant', rarity: 'starter',
    baseHp: 36, tier: 1,
    lore: 'A shy fawn grown from a seed that fell on an old shrine. Ferns sprout in its footprints; the forest listens when it stamps.',
    passive: { name: 'Rooted', text: 'Start each combat with 6 Block.' },
    signature: 'grove_guard',
    moves: [
      { name: 'Bramble Charge', intent: 'attack', damage: 6, text: 'A thorny, headlong rush.' },
      { name: 'Photosynth', intent: 'block', block: 10, text: 'Barkskin hardens in the moonlight.' },
      { name: 'Spore Song', intent: 'debuff', weak: 2, text: 'A sleepy cloud of spores.' },
    ],
  },
  tidefin: {
    name: 'Tidefin', title: 'The River Trickster', type: 'tide', rarity: 'starter',
    baseHp: 32, tier: 1,
    lore: 'An otter-shaped current given a mischievous face. It steals shiny things, then returns them with interest after a good scratch behind the ear.',
    passive: { name: 'River Hands', text: 'Draw 1 extra card on the first turn of each combat.' },
    signature: 'riptide',
    moves: [
      { name: 'Riptide', intent: 'attack', damage: 5, hits: 2, text: 'Two swift ribbons of water.' },
      { name: 'Mist Veil', intent: 'block', block: 9, text: 'The river hides its favourite child.' },
      { name: 'Undertow', intent: 'debuff', weak: 2, text: 'The ground turns to wet clay.' },
    ],
  },
  glimmerbat: {
    name: 'Glimmerbat', title: 'The Lantern Wing', type: 'lumen', rarity: 'common',
    baseHp: 28, tier: 1,
    lore: 'A dusk-winged bat whose wingbeats scatter little suns. It guides lost travellers to the nearest warm window.',
    passive: { name: 'First Light', text: 'Start each combat with 1 Focus.' },
    signature: 'prism_wing',
    moves: [
      { name: 'Prism Wing', intent: 'attack', damage: 4, hits: 2, text: 'Shards of coloured light.' },
      { name: 'Glimmer', intent: 'block', block: 8, text: 'Folds its wings into a lantern.' },
      { name: 'Dazzle', intent: 'debuff', weak: 2, text: 'A flash with no shadow.' },
    ],
  },
  thornhog: {
    name: 'Thornhog', title: 'The Bramble Bulwark', type: 'verdant', rarity: 'common',
    baseHp: 42, tier: 1,
    lore: 'A round, grumbling hedgehog that has never once been surprised. Its quills are prized by hedge-witches and regretted by wolves.',
    passive: { name: 'Quill Coat', text: 'Start each combat with 3 Thorns.' },
    signature: 'briar_roll',
    moves: [
      { name: 'Quill Rush', intent: 'attack', damage: 3, hits: 3, text: 'A bristling cannonball.' },
      { name: 'Bristle', intent: 'block', block: 11, thorns: 2, text: 'Every quill stands on end.' },
      { name: 'Mulch', intent: 'heal', heal: 6, text: 'Roots drink deep.' },
    ],
  },
  wisplet: {
    name: 'Wisplet', title: 'The Candle Ghost', type: 'gloom', rarity: 'common',
    baseHp: 26, tier: 1,
    lore: 'The unfinished thought of a forest spirit. It collects whispers and carries a candle that burns cold.',
    passive: { name: 'Cold Flame', text: 'Start each combat by applying 1 Weak to the foe.' },
    signature: 'haunt',
    moves: [
      { name: 'Haunt', intent: 'attack', damage: 6, weak: 1, text: 'A touch like a draft.' },
      { name: 'Fade', intent: 'block', block: 9, text: 'Becomes mostly suggestion.' },
      { name: 'Soul Sip', intent: 'attack', damage: 8, heal: 4, text: 'Borrows a little warmth.' },
    ],
  },
  boglet: {
    name: 'Boglet', title: 'The Bubble Toad', type: 'tide', rarity: 'common',
    baseHp: 38, tier: 1,
    lore: 'A pond toad with a pearl of swamp-air trapped in its throat. It can burp a bubble large enough to hide a cart.',
    passive: { name: 'Deep Pockets', text: '+8 max HP.' },
    signature: 'mire_bubble',
    moves: [
      { name: 'Bubble Burst', intent: 'attack', damage: 8, text: 'A wet, ringing pop.' },
      { name: 'Mire', intent: 'debuff', weak: 2, text: 'The air turns thick and green.' },
      { name: 'Croak', intent: 'block', block: 12, text: 'The swamp answers.' },
    ],
  },
  sablefang: {
    name: 'Sablefang', title: 'The Moonless Wolf', type: 'gloom', rarity: 'rare',
    baseHp: 48, tier: 2,
    lore: 'A wolf stitched from night and old oaths. It hunts only what has already been forgotten.',
    passive: { name: 'Night Runner', text: 'Gain 1 Energy on the first turn of each combat.' },
    signature: 'night_bite',
    moves: [
      { name: 'Night Bite', intent: 'attack', damage: 12, text: 'Teeth where there was only dark.' },
      { name: 'Howl', intent: 'buff', focus: 3, text: 'The pack that is not there answers.' },
      { name: 'Shadowstep', intent: 'block', block: 13, text: 'One shadow becomes many.' },
    ],
  },
  voltuff: {
    name: 'Voltuff', title: 'The Storm Cloud', type: 'storm', rarity: 'rare',
    baseHp: 40, tier: 2,
    lore: 'A sheep-shaped thunderhead. It grazes on lightning rods and sneezes in small, harmless storms.',
    passive: { name: 'Static Fleece', text: 'Draw 1 extra card on turn one.' },
    signature: 'static_snap',
    moves: [
      { name: 'Static Snap', intent: 'attack', damage: 6, weak: 1, text: 'A crackling headbutt.' },
      { name: 'Overcharge', intent: 'buff', focus: 2, text: 'The wool glows white.' },
      { name: 'Thunder Roll', intent: 'attack', damage: 9, text: 'A low, rolling boom.' },
    ],
  },
  frostfawn: {
    name: 'Frostfawn', title: 'The Winter Bell', type: 'frost', rarity: 'rare',
    baseHp: 54, tier: 2,
    lore: 'A fawn of blue glass that rings when snow falls. Its antlers remember every winter the mountain has forgotten.',
    passive: { name: 'First Frost', text: 'Start each combat by applying 2 Weak to the foe.' },
    signature: 'frost_antler',
    moves: [
      { name: 'Frost Antler', intent: 'attack', damage: 13, text: 'A chime, then impact.' },
      { name: 'Snowdrift', intent: 'block', block: 14, text: 'The blizzard gathers close.' },
      { name: 'Chill', intent: 'debuff', weak: 2, text: 'The air goes still and sharp.' },
    ],
  },
  cragmaw: {
    name: 'Cragmaw', title: 'The Waking Stone', type: 'stone', rarity: 'rare',
    baseHp: 62, tier: 2,
    lore: 'A boulder that got tired of being climbed. Its yawn rearranges valleys; its sneeze is a landslide.',
    passive: { name: 'Bedrock', text: 'Start each combat with 10 Block.' },
    signature: 'stonefall',
    moves: [
      { name: 'Stonefall', intent: 'attack', damage: 16, text: 'A fist the size of a door.' },
      { name: 'Harden', intent: 'block', block: 15, text: 'Becomes, briefly, a mountain.' },
      { name: 'Quake', intent: 'attack', damage: 7, hits: 2, text: 'The floor remembers it is stone.' },
    ],
  },
  emberlynx: {
    name: 'Emberlynx', title: 'The Sun-Crowned', type: 'ember', rarity: 'elite',
    baseHp: 96, tier: 3, elite: true,
    lore: 'A lynx with a mane of slow fireworks. It has never been tamed, only persuaded. Most of the mountain is still on fire.',
    passive: { name: 'Solar Roar', text: 'Start each combat with 2 Focus.' },
    signature: 'solar_fang',
    moves: [
      { name: 'Solar Fang', intent: 'attack', damage: 15, text: 'A bite with daylight behind it.' },
      { name: 'Crown Flare', intent: 'buff', focus: 3, block: 8, text: 'Its mane blooms into fire.' },
      { name: 'Pounce', intent: 'attack', damage: 8, hits: 2, text: 'All claws, no warning.' },
    ],
  },
  mossbeast: {
    name: 'Mossbeast', title: 'The Old Growth', type: 'verdant', rarity: 'elite',
    baseHp: 118, tier: 3, elite: true,
    lore: 'The oldest thing on the Wildspire. It wears a forest for a coat and has outlived every axe raised against it.',
    passive: { name: 'Old Growth', text: '+12 max HP.' },
    signature: 'ancient_root',
    moves: [
      { name: 'Timberfall', intent: 'attack', damage: 18, text: 'A branch like a falling mast.' },
      { name: 'Ancient Root', intent: 'block', block: 18, heal: 6, text: 'The hill itself defends it.' },
      { name: 'Pollen Haze', intent: 'debuff', weak: 3, text: 'A golden, drowning fog.' },
    ],
  },
  hollowwarden: {
    name: 'The Hollow Warden', title: 'Keeper of the Last Gate', type: 'hollow', rarity: 'boss',
    baseHp: 230, tier: 4, boss: true,
    lore: 'The first Warden, who tried to bind the entire mountain. The mountain kept the mask and put it on the empty thing left behind.',
    passive: { name: 'Hollow Crown', text: 'Cannot be bound.' },
    signature: null,
    moves: [
      { name: 'Gatefall', intent: 'attack', damage: 20, text: 'A blade made of closed doors.' },
      { name: 'Hollow Choir', intent: 'debuff', weak: 3, vulnerable: 2, text: 'Every lost voice at once.' },
      { name: 'Crown of Thorns', intent: 'block', block: 22, thorns: 4, text: 'The mask grows another ring.' },
      { name: 'Last Lesson', intent: 'attack', damage: 9, hits: 3, text: 'It remembers how you fight.' },
    ],
  },
};

export const STARTERS = ['emberkit', 'mossprig', 'tidefin'];

const op = {
  damage: (amount, times = 1) => ({ op: 'damage', amount, times }),
  block: (amount) => ({ op: 'block', amount }),
  draw: (amount) => ({ op: 'draw', amount }),
  energy: (amount) => ({ op: 'energy', amount }),
  status: (target, status, amount) => ({ op: 'status', target, status, amount }),
  self: (status, amount) => ({ op: 'self', status, amount }),
  heal: (amount) => ({ op: 'heal', amount }),
  catch: (threshold, bonus = 0) => ({ op: 'catch', threshold, bonus }),
  add: (status, amount) => ({ op: 'add', status, amount }),
};

// Card definitions. `ops` are interpreted by the combat engine.
export const CARDS = {
  talon_strike: {
    name: 'Talon Strike', kind: 'attack', type: 'verdant', cost: 1, rarity: 'common',
    icon: 'claw', text: 'Deal {damage} damage.',
    ops: [op.damage(6)],
  },
  brace: {
    name: 'Brace', kind: 'skill', type: 'stone', cost: 1, rarity: 'common',
    icon: 'shield', text: 'Gain {block} Block.',
    ops: [op.block(5)],
  },
  pocket_orb: {
    name: 'Pocket Orb', kind: 'bind', type: 'lumen', cost: 1, rarity: 'common', exhaust: true,
    icon: 'orb', text: 'Bind a wild beast below {threshold}% HP. Base chance {chance}%. Exhaust.',
    ops: [op.catch(0.55)],
  },
  cinder_pounce: {
    name: 'Cinder Pounce', kind: 'attack', type: 'ember', cost: 1, rarity: 'starter',
    icon: 'flame', text: 'Deal {damage} damage. Apply {burn} Burn.',
    ops: [op.damage(8), op.status('enemy', 'burn', 2)],
  },
  grove_guard: {
    name: 'Grove Guard', kind: 'skill', type: 'verdant', cost: 1, rarity: 'starter',
    icon: 'leaf', text: 'Gain {block} Block. Gain {regen} Regen.',
    ops: [op.block(7), op.self('regen', 2)],
  },
  riptide: {
    name: 'Riptide', kind: 'attack', type: 'tide', cost: 1, rarity: 'starter',
    icon: 'drop', text: 'Deal {damage} damage. Draw {draw} card.',
    ops: [op.damage(5), op.draw(2)],
  },
  feint: {
    name: 'Feint', kind: 'attack', type: 'gloom', cost: 0, rarity: 'common',
    icon: 'dagger', text: 'Deal {damage} damage. Draw {draw}.',
    ops: [op.damage(3), op.draw(1)],
  },
  focus: {
    name: 'Inner Ember', kind: 'skill', type: 'ember', cost: 1, rarity: 'common',
    icon: 'flame', text: 'Gain {focus} Focus.',
    ops: [op.self('focus', 2)],
  },
  smoke_veil: {
    name: 'Smoke Veil', kind: 'skill', type: 'gloom', cost: 1, rarity: 'common',
    icon: 'smoke', text: 'Gain {block} Block. Apply {weak} Weak.',
    ops: [op.block(7), op.status('enemy', 'weak', 1)],
  },
  snare: {
    name: 'Snare', kind: 'skill', type: 'verdant', cost: 1, rarity: 'common',
    icon: 'snare', text: 'Apply {vulnerable} Vulnerable and {weak} Weak.',
    ops: [op.status('enemy', 'vulnerable', 2), op.status('enemy', 'weak', 1)],
  },
  wild_call: {
    name: 'Wild Call', kind: 'skill', type: 'lumen', cost: 0, rarity: 'common',
    icon: 'sun', text: 'Draw {draw}.',
    ops: [op.draw(2)],
  },
  mend: {
    name: 'Mend', kind: 'skill', type: 'verdant', cost: 1, rarity: 'common', exhaust: true,
    icon: 'heart', text: 'Heal {heal} HP.',
    ops: [op.heal(5)],
  },
  hunter_mark: {
    name: "Hunter's Mark", kind: 'skill', type: 'ember', cost: 1, rarity: 'rare',
    icon: 'eye', text: 'Apply {vulnerable} Vulnerable. Gain {catch} Bind Focus.',
    ops: [op.status('enemy', 'vulnerable', 2), op.self('catch', 2)],
  },
  lullaby: {
    name: 'Lullaby', kind: 'skill', type: 'gloom', cost: 1, rarity: 'rare',
    icon: 'moon', text: 'Apply {stun} Stun and gain {catch} Bind Focus.',
    ops: [op.status('enemy', 'stun', 1), op.self('catch', 2)],
  },
  great_orb: {
    name: 'Great Orb', kind: 'bind', type: 'lumen', cost: 1, rarity: 'rare', exhaust: true,
    icon: 'orb', text: 'Bind a wild beast below {threshold}% HP. Base chance {chance}%. Exhaust.',
    ops: [op.catch(0.8, 2)],
  },
  bramble_aura: {
    name: 'Bramble Aura', kind: 'power', type: 'verdant', cost: 2, rarity: 'rare',
    icon: 'leaf', text: 'Gain {thorns} Thorns.',
    ops: [op.self('thorns', 3)],
  },
  instinct: {
    name: 'Instinct', kind: 'power', type: 'tide', cost: 1, rarity: 'rare',
    icon: 'eye', text: 'Draw {draw} extra card each turn.',
    ops: [op.self('instinct', 1)],
  },
  emberlash: {
    name: 'Emberlash', kind: 'attack', type: 'ember', cost: 2, rarity: 'common',
    icon: 'flame', text: 'Deal {damage} damage. Apply {burn} Burn.',
    ops: [op.damage(12), op.status('enemy', 'burn', 3)],
  },
  frostbite: {
    name: 'Frostbite', kind: 'attack', type: 'frost', cost: 1, rarity: 'common',
    icon: 'snow', text: 'Deal {damage} damage. Apply {weak} Weak.',
    ops: [op.damage(6), op.status('enemy', 'weak', 2)],
  },
  stonewall: {
    name: 'Stonewall', kind: 'skill', type: 'stone', cost: 2, rarity: 'rare',
    icon: 'shield', text: 'Gain {block} Block. Gain {thorns} Thorns.',
    ops: [op.block(12), op.self('thorns', 2)],
  },
  spark: {
    name: 'Spark', kind: 'attack', type: 'storm', cost: 0, rarity: 'common',
    icon: 'bolt', text: 'Deal {damage} damage. Draw {draw}.',
    ops: [op.damage(3), op.draw(1)],
  },
  prism_wing: {
    name: 'Prism Wing', kind: 'attack', type: 'lumen', cost: 1, rarity: 'starter',
    icon: 'sun', text: 'Deal {damage} damage twice. Gain {focus} Focus.',
    ops: [op.damage(4, 2), op.self('focus', 1)],
  },
  briar_roll: {
    name: 'Briar Roll', kind: 'attack', type: 'verdant', cost: 2, rarity: 'starter',
    icon: 'leaf', text: 'Deal {damage} damage. Gain {block} Block and {thorns} Thorns.',
    ops: [op.damage(8), op.block(8), op.self('thorns', 2)],
  },
  haunt: {
    name: 'Haunt', kind: 'skill', type: 'gloom', cost: 1, rarity: 'starter',
    icon: 'moon', text: 'Apply {vulnerable} Vulnerable and {weak} Weak.',
    ops: [op.status('enemy', 'vulnerable', 2), op.status('enemy', 'weak', 1)],
  },
  mire_bubble: {
    name: 'Mire Bubble', kind: 'skill', type: 'tide', cost: 1, rarity: 'starter',
    icon: 'drop', text: 'Gain {block} Block. Apply {weak} Weak.',
    ops: [op.block(6), op.status('enemy', 'weak', 2)],
  },
  night_bite: {
    name: 'Night Bite', kind: 'attack', type: 'gloom', cost: 1, rarity: 'starter',
    icon: 'fang', text: 'Deal {damage} damage. If the foe is below 50%, deal {bonus} more.',
    ops: [op.damage(7), { op: 'execute', amount: 7, threshold: 0.5 }],
  },
  static_snap: {
    name: 'Static Snap', kind: 'attack', type: 'storm', cost: 0, rarity: 'starter',
    icon: 'bolt', text: 'Deal {damage} damage. Draw {draw}.',
    ops: [op.damage(3), op.draw(1)],
  },
  frost_antler: {
    name: 'Frost Antler', kind: 'attack', type: 'frost', cost: 2, rarity: 'starter',
    icon: 'snow', text: 'Deal {damage} damage. Apply {weak} Weak.',
    ops: [op.damage(10), op.status('enemy', 'weak', 2)],
  },
  stonefall: {
    name: 'Stonefall', kind: 'attack', type: 'stone', cost: 2, rarity: 'starter',
    icon: 'gem', text: 'Deal {damage} damage. Gain {block} Block.',
    ops: [op.damage(14), op.block(4)],
  },
  solar_fang: {
    name: 'Solar Fang', kind: 'attack', type: 'ember', cost: 2, rarity: 'starter',
    icon: 'flame', text: 'Deal {damage} damage. If the foe is below 50%, deal {bonus} more.',
    ops: [op.damage(11), { op: 'execute', amount: 8, threshold: 0.5 }],
  },
  ancient_root: {
    name: 'Ancient Root', kind: 'skill', type: 'verdant', cost: 2, rarity: 'starter',
    icon: 'leaf', text: 'Gain {block} Block. Heal {heal} HP.',
    ops: [op.block(12), op.heal(3)],
  },
};

export const REWARD_POOL = [
  'emberlash', 'frostbite', 'stonewall', 'spark', 'feint', 'focus', 'smoke_veil',
  'snare', 'wild_call', 'mend', 'hunter_mark', 'lullaby', 'great_orb',
  'bramble_aura', 'instinct',
];

export const STARTER_DECKS = {
  emberkit: ['talon_strike', 'talon_strike', 'talon_strike', 'talon_strike', 'talon_strike', 'brace', 'brace', 'brace', 'brace', 'pocket_orb', 'pocket_orb', 'cinder_pounce'],
  mossprig: ['talon_strike', 'talon_strike', 'talon_strike', 'talon_strike', 'talon_strike', 'brace', 'brace', 'brace', 'brace', 'pocket_orb', 'pocket_orb', 'grove_guard'],
  tidefin: ['talon_strike', 'talon_strike', 'talon_strike', 'talon_strike', 'talon_strike', 'brace', 'brace', 'brace', 'brace', 'pocket_orb', 'pocket_orb', 'riptide'],
};

export const TYPE_ORDER = ['ember', 'verdant', 'tide', 'lumen', 'gloom', 'stone', 'storm', 'frost', 'hollow'];

export const STATUS_INFO = {
  weak:       { name: 'Weak', icon: 'down', text: 'Deals 25% less attack damage.' },
  vulnerable: { name: 'Vulnerable', icon: 'target', text: 'Takes 50% more attack damage.' },
  focus:      { name: 'Focus', icon: 'up', text: 'Attacks deal extra damage.' },
  thorns:     { name: 'Thorns', icon: 'thorn', text: 'Deals damage back when hit.' },
  regen:      { name: 'Regen', icon: 'heart', text: 'Heals at the start of your turn.' },
  stun:       { name: 'Stunned', icon: 'stun', text: 'Skips its next action.' },
  burn:       { name: 'Burn', icon: 'flame', text: 'Takes damage at the start of its turn.' },
  poison:     { name: 'Poison', icon: 'drop', text: 'Takes damage at the start of its turn.' },
  instinct:   { name: 'Instinct', icon: 'eye', text: 'Draw extra cards each turn.' },
  catch:      { name: 'Bind Focus', icon: 'orb', text: 'Improves the next binding attempt.' },
  dex:        { name: 'Dexterity', icon: 'shield', text: 'Block cards grant extra Block.' },
};

export const RELICS = {
  kindling: { name: 'Kindling', icon: 'flame', text: 'The first attack each combat deals +3 damage.' },
  rooted: { name: 'Rooted', icon: 'leaf', text: 'Start each combat with 6 Block.' },
  river_hands: { name: 'River Hands', icon: 'drop', text: 'Draw 1 extra card on turn one.' },
  first_light: { name: 'First Light', icon: 'sun', text: 'Start each combat with 1 Focus.' },
  quill_coat: { name: 'Quill Coat', icon: 'thorn', text: 'Start each combat with 3 Thorns.' },
  cold_flame: { name: 'Cold Flame', icon: 'moon', text: 'Start each combat by applying 1 Weak.' },
  deep_pockets: { name: 'Deep Pockets', icon: 'heart', text: '+8 max HP.' },
  night_runner: { name: 'Night Runner', icon: 'bolt', text: 'Gain 1 Energy on turn one.' },
  static_fleece: { name: 'Static Fleece', icon: 'bolt', text: 'Draw 1 extra card on turn one.' },
  first_frost: { name: 'First Frost', icon: 'snow', text: 'Start each combat by applying 2 Weak.' },
  bedrock: { name: 'Bedrock', icon: 'gem', text: 'Start each combat with 10 Block.' },
  solar_roar: { name: 'Solar Roar', icon: 'flame', text: 'Start each combat with 2 Focus.' },
  old_growth: { name: 'Old Growth', icon: 'leaf', text: '+12 max HP.' },
};

export function passiveFor(id) {
  const c = CREATURES[id];
  return c ? c.passive : null;
}

export function enemyPoolForFloor(floor) {
  if (floor <= 2) return ['glimmerbat', 'thornhog', 'wisplet', 'boglet'];
  if (floor <= 4) return ['thornhog', 'wisplet', 'boglet', 'voltuff', 'sablefang'];
  if (floor <= 6) return ['sablefang', 'voltuff', 'frostfawn', 'glimmerbat'];
  return ['frostfawn', 'cragmaw', 'emberlynx', 'sablefang'];
}

export const ELITE_POOL = ['emberlynx', 'mossbeast'];
export const CATCH_POOL = ['glimmerbat', 'thornhog', 'wisplet', 'boglet', 'sablefang', 'voltuff', 'frostfawn', 'cragmaw'];

export const EVENTS = [
  {
    id: 'shrine',
    title: 'The Listening Shrine',
    text: 'A ring of standing stones leans close, as if eavesdropping. At the centre, a bowl of black water holds a single reflected star.',
    choices: [
      { label: 'Drink from the bowl', detail: 'Heal 18 HP. Lose 12 gold.', effect: { heal: 18, gold: -12 } },
      { label: 'Leave an offering', detail: 'Lose 25 gold. Gain a Great Orb.', effect: { gold: -25, card: 'great_orb' } },
      { label: 'Listen, then leave', detail: 'Gain 2 max HP.', effect: { maxHp: 2 } },
    ],
  },
  {
    id: 'cache',
    title: 'A Warden\'s Cache',
    text: 'A rusted lockbox hangs from a branch too high for any ordinary climber. The metal is warm. Something inside is breathing.',
    choices: [
      { label: 'Force it open', detail: 'Lose 7 HP. Gain 55 gold.', effect: { hp: -7, gold: 55 } },
      { label: 'Cut it down gently', detail: 'Gain a random rare card.', effect: { randomCard: 'rare' } },
      { label: 'Leave it sleeping', detail: 'Gain a Pocket Orb and 10 gold.', effect: { card: 'pocket_orb', gold: 10 } },
    ],
  },
  {
    id: 'moth',
    title: 'The Lantern Moth',
    text: 'A moth the size of a dinner plate settles on your pack. Its wings are maps of places that do not exist yet.',
    choices: [
      { label: 'Follow its flight', detail: 'Lose 5 HP. Upgrade a random card.', effect: { hp: -5, upgradeRandom: true } },
      { label: 'Feed it a spark', detail: 'Gain 1 Focus and 2 Thorns permanently? No—this is a dream.', effect: { heal: 10 } },
      { label: 'Shoo it away', detail: 'Gain 20 gold.', effect: { gold: 20 } },
    ],
  },
];

export const MAP_LAYOUT = [
  [{ type: 'battle', lane: 1 }],
  [{ type: 'battle', lane: 0 }, { type: 'catch', lane: 2 }],
  [{ type: 'elite', lane: 0 }, { type: 'rest', lane: 1 }, { type: 'battle', lane: 2 }],
  [{ type: 'catch', lane: 1 }, { type: 'shop', lane: 2 }],
  [{ type: 'event', lane: 1 }],
  [{ type: 'elite', lane: 0 }, { type: 'catch', lane: 2 }],
  [{ type: 'rest', lane: 1 }],
  [{ type: 'shop', lane: 0 }, { type: 'battle', lane: 2 }],
  [{ type: 'elite', lane: 1 }],
  [{ type: 'catch', lane: 0 }, { type: 'rest', lane: 2 }],
  [{ type: 'boss', lane: 1 }],
];

export const NODE_INFO = {
  battle: { name: 'Wilds', icon: 'swords', text: 'A feral beast blocks the trail.' },
  catch: { name: 'Rare Wild', icon: 'paw', text: 'A rare beast is drawn to the old stones.' },
  elite: { name: 'Apex', icon: 'crown', text: 'An apex predator guards the ascent.' },
  rest: { name: 'Campsite', icon: 'fire', text: 'A safe fire and a moment to breathe.' },
  shop: { name: 'Wandering Merchant', icon: 'bag', text: 'A lantern-lit cart and a suspicious smile.' },
  event: { name: 'Strange Sign', icon: 'rune', text: 'The mountain has a story for you.' },
  boss: { name: 'The Last Gate', icon: 'mask', text: 'The Hollow Warden waits at the summit.' },
};
