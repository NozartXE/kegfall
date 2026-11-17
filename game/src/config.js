// All of KEGFALL's tuning numbers, ids and display copy live here so every module reads one source of truth.

export const TICK = 1 / 60;
export const TICKS_PER_SECOND = 60;

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const COLS = 12;
export const ROWS = 7;
export const CELL = 92;
export const GRID_X = 88;
export const GRID_Y = 168;
export const GRID_W = COLS * CELL;
export const GRID_H = ROWS * CELL;
export const HUD_TOP = 0;
export const HUD_H = 160;
export const BUILD_Y = 704;
export const VAULT_MAX = 10;
export const START_SPARK = 90;
export const RUN_TICKS = 9 * 1800;

export const CHAIN_WINDOW_TICKS = 72;
export const FUSE_TICKS = 48;
export const CHAIN_ARM_TICKS = 15;
export const STRIKE_COOLDOWN_TICKS = 360;
export const STRIKE_RADIUS = 1.6;
export const STRIKE_DAMAGE = 14;
export const REROLL_COST = 25;
export const UPGRADE_COSTS = Object.freeze([35, 70]);
export const BLAST_LEVEL_MUL = Object.freeze([1, 1.35, 1.75]);
export const BARRAGE_COUNT = 9;
export const CHARM_CHOICES = 3;
export const SPARK_PER_CHAIN = 2;
export const SCORE_PER_CHAIN = 10;
export const MAX_SAVE_RUNS = 3;

export const SHIFTS = Object.freeze([
  { key: 'dawn', name: 'DAWN', gates: ['east'] },
  { key: 'noon', name: 'NOON', gates: ['west', 'east', 'centre'] },
  { key: 'dusk', name: 'DUSK', gates: ['west'] },
]);

export const KEGS = Object.freeze([
  {
    id: 'powder',
    key: 'powder',
    name: 'POWDER KEG',
    short: 'POWDER',
    cost: 20,
    level: 1,
    stagger: 0,
    radius: 1.9,
    damage: 42,
    armFuse: FUSE_TICKS,
    effect: 'Medium blast. Lit by neighbours: the reliable chain link.',
    damageType: 'blast',
    color: '#ff7a1a',
    trim: '#ffc21f',
  },
  {
    id: 'oil',
    key: 'oil',
    name: 'OIL DRUM',
    short: 'OIL',
    cost: 32,
    level: 1,
    stagger: 1,
    radius: 2.5,
    damage: 34,
    armFuse: FUSE_TICKS + 6,
    burnTicks: 240,
    burnDps: 6,
    effect: 'Large blast + burning ground for 4 s.',
    damageType: 'fire',
    color: '#d93a2b',
    trim: '#ffc21f',
  },
  {
    id: 'mine',
    key: 'mine',
    name: 'SPARK MINE',
    short: 'MINE',
    cost: 12,
    level: 1,
    stagger: 2,
    radius: 1.25,
    damage: 24,
    armFuse: 6,
    proximity: 1.1,
    effect: 'Cheap. Fires by itself when a Sootkin gets close.',
    damageType: 'blast',
    color: '#7fd4ff',
    trim: '#f7f3e8',
  },
  {
    id: 'frost',
    key: 'frost',
    name: 'FROST KEG',
    short: 'FROST',
    cost: 28,
    level: 1,
    stagger: 3,
    radius: 1.7,
    damage: 20,
    armFuse: FUSE_TICKS,
    slowTicks: 150,
    slowMul: 0.55,
    unlockShift: 1,
    effect: 'Small blast + slow field. Unlocks in shift 2 (NOON).',
    damageType: 'frost',
    color: '#7fd4ff',
    trim: '#0f5e63',
  },
]);

export const ENEMIES = Object.freeze([
  {
    id: 'sootling',
    key: 'sootling',
    name: 'SOOTLING',
    hp: 26,
    speed: 0.42,
    size: 0.30,
    spark: 2,
    score: 100,
    volatile: false,
    armor: 0,
    trait: 'Basic marcher',
    color: '#4a3f33',
  },
  {
    id: 'imp',
    key: 'imp',
    name: 'POWDER IMP',
    hp: 20,
    speed: 0.55,
    size: 0.28,
    spark: 3,
    score: 160,
    volatile: true,
    deathBlastRadius: 1.25,
    deathBlastDamage: 28,
    armor: 0,
    trait: 'Volatile: its death detonates any kegs nearby',
    color: '#ff7a1a',
  },
  {
    id: 'wisp',
    key: 'wisp',
    name: 'EMBERWISP',
    hp: 14,
    speed: 0.78,
    size: 0.24,
    spark: 2,
    score: 140,
    volatile: false,
    weave: 0.34,
    armor: 0,
    trait: 'Fast, weaves side to side',
    color: '#ffc21f',
  },
  {
    id: 'brute',
    key: 'brute',
    name: 'CINDERBRUTE',
    hp: 120,
    speed: 0.26,
    size: 0.42,
    spark: 5,
    score: 320,
    volatile: false,
    armor: 0.45,
    trait: 'Armoured: shrugs off part of every blast',
    color: '#5b5147',
  },
  {
    id: 'twinsack',
    key: 'twinsack',
    name: 'TWINSACK',
    hp: 46,
    speed: 0.36,
    size: 0.36,
    spark: 3,
    score: 220,
    volatile: false,
    splits: 2,
    armor: 0,
    trait: 'Splits into two Sootlings when killed',
    color: '#9c6b3f',
  },
  {
    id: 'colossus',
    key: 'colossus',
    name: 'CINDER COLOSSUS',
    hp: 3600,
    speed: 0.16,
    size: 0.85,
    spark: 80,
    score: 6000,
    volatile: false,
    boss: true,
    spawnEvery: 150,
    megaKegEvery: 420,
    megaKegRadius: 4.2,
    megaKegDamage: 120,
    armor: 0.2,
    trait: 'Boss: spawns imps, carries the MEGA KEG',
    color: '#23201b',
  },
]);

export const DIFFICULTIES = Object.freeze([
  {
    id: 'kindling',
    key: 'kindling',
    name: 'KINDLING',
    hpMul: 0.8,
    speedMul: 0.92,
    countMul: 0.8,
    sparkMul: 1.15,
    blurb: 'A fair first fuse. Sootkin march slower and thin.',
    color: '#ffc21f',
  },
  {
    id: 'blaze',
    key: 'blaze',
    name: 'BLAZE',
    hpMul: 1,
    speedMul: 1,
    countMul: 1,
    sparkMul: 1,
    blurb: 'The intended burn: full Sootkin, full reward.',
    color: '#ff7a1a',
  },
  {
    id: 'inferno',
    key: 'inferno',
    name: 'INFERNO',
    hpMul: 1.3,
    speedMul: 1.1,
    countMul: 1.2,
    sparkMul: 0.9,
    blurb: 'Tough, fast, stingy spark. For wardens with powder to spare.',
    color: '#d93a2b',
  },
]);

export const CHARMS = Object.freeze([
  {
    id: 'wideblast',
    key: 'wideblast',
    name: 'WIDE BLAST',
    icon: 'ring',
    color: '#ff7a1a',
    tag: 'radius',
    effect: 'Every blast radius +20%.',
    synergy: 'Chain with OIL DRUM: one lit drum then reaches the next row of kegs.',
  },
  {
    id: 'quickfuse',
    key: 'quickfuse',
    name: 'QUICK FUSE',
    icon: 'spark',
    color: '#ffc21f',
    tag: 'fuse',
    effect: 'Keg fuse -30%: chained kegs arm and fire sooner.',
    synergy: 'Chain with OIL DRUM + FROST KEG: longer chains fit inside one window.',
  },
  {
    id: 'sparkcoil',
    key: 'sparkcoil',
    name: 'SPARK COIL',
    icon: 'bolt',
    color: '#7fd4ff',
    tag: 'strike',
    effect: 'SPARK STRIKE cooldown halved (6 s to 3 s).',
    synergy: 'Chain with POWDER IMP packs: free ignitions to start big cascades.',
  },
  {
    id: 'chainledger',
    key: 'chainledger',
    name: 'CHAIN LEDGER',
    icon: 'ledger',
    color: '#f7f3e8',
    tag: 'spark',
    effect: 'Kills pay +1 extra SPARK per 5 CHAIN already banked.',
    synergy: 'Chain with long cascades: x20 chains pay triple spark per kill.',
  },
  {
    id: 'tightbudget',
    key: 'tightbudget',
    name: 'TIGHT BUDGET',
    icon: 'coin',
    color: '#ffc21f',
    tag: 'cost',
    effect: 'Kegs cost 20% less SPARK (rounded up).',
    synergy: 'Chain with SPARK MINE: the cheapest board becomes a carpet of mines.',
  },
  {
    id: 'emberseed',
    key: 'emberseed',
    name: 'EMBER SEED',
    icon: 'flame',
    color: '#d93a2b',
    tag: 'frost',
    effect: 'Frost fields also burn: slowed Sootkin take fire damage.',
    synergy: 'Chain with FROST KEG + OIL DRUM: slow fire across every lane.',
  },
  {
    id: 'reinforced',
    key: 'reinforced',
    name: 'REINFORCED VAULT',
    icon: 'vault',
    color: '#d93a2b',
    tag: 'vault',
    effect: 'Vault +3 HP (repairs too): 13 instead of 10.',
    synergy: 'Chain with TWINSACK swarms: room to let a few stragglers through.',
  },
  {
    id: 'keenstrike',
    key: 'keenstrike',
    name: 'KEEN STRIKE',
    icon: 'target',
    color: '#ff7a1a',
    tag: 'strike',
    effect: 'SPARK STRIKE damage x2.',
    synergy: 'Chain with SPARK COIL: a strike every 3 s that kills brutes alone.',
  },
  {
    id: 'longchain',
    key: 'longchain',
    name: 'LONG CHAIN',
    icon: 'link',
    color: '#ffc21f',
    tag: 'chain',
    effect: 'CHAIN window +50% (1.2 s to 1.8 s).',
    synergy: 'Chain with WIDE BLAST: detonations across the whole quay count.',
  },
  {
    id: 'salvage',
    key: 'salvage',
    name: 'SALVAGE',
    icon: 'refund',
    color: '#7fd4ff',
    tag: 'spark',
    effect: 'Refund 50% of keg cost for kegs that never fired.',
    synergy: 'Chain with SPARK MINE: re-place mines between barrages for half back.',
  },
  {
    id: 'nightmarket',
    key: 'nightmarket',
    name: 'NIGHT MARKET',
    icon: 'moon',
    color: '#7fd4ff',
    tag: 'score',
    effect: 'Night (DUSK) barrages pay double score.',
    synergy: 'Chain with LONG CHAIN: the last three barrages carry the run.',
  },
  {
    id: 'colossusbane',
    key: 'colossusbane',
    name: 'COLOSSUS BANE',
    icon: 'skull',
    color: '#f7f3e8',
    tag: 'boss',
    effect: 'The Colossus takes +50% blast damage.',
    synergy: 'Chain with REINFORCED VAULT: outlast it and out-burn it.',
  },
]);

export const FEATS = Object.freeze([
  { id: 'firstwin', key: 'firstwin', name: 'FIRST SPARK', text: 'Win a run.' },
  { id: 'chain20', key: 'chain20', name: 'COURT OF CINDERS', text: 'Reach CHAIN x20.' },
  { id: 'colossus', key: 'colossus', name: 'COLOSSUS DOWN', text: 'Drop the Cinder Colossus.' },
  { id: 'nohit', key: 'nohit', name: 'DRY VAULT', text: 'Win without losing a single Vault HP.' },
  { id: 'inferno', key: 'inferno', name: 'INFERNO WARDEN', text: 'Win on INFERNO.' },
  { id: 'afterglow', key: 'afterglow', name: 'AFTERGLOW', text: 'Fall off the 9th barrage in endless mode.' },
]);

export const NAMES = Object.freeze({
  game: 'KEGFALL',
  subtitle: 'ONE SPARK, FORTY KEGS',
  warden: 'SORREL BRAND',
  works: 'THE LAST POWDERWORKS',
  quay: 'EMBER QUAY',
  currency: 'SPARK',
  vault: 'VAULT',
  badge: 'CHAIN',
  grace: 'AFTERGLOW',
  shifts: SHIFTS.map((shift) => shift.name),
  gateHints: Object.freeze({ west: 'WEST ASH GATE', east: 'EAST ASH GATE', centre: 'CENTRE ASH GATE' }),
});

export const BOARD = Object.freeze({
  cols: COLS,
  rows: ROWS,
  cell: CELL,
  x: GRID_X,
  y: GRID_Y,
  width: GRID_W,
  height: GRID_H,
});

export const GRID = Object.freeze({
  cols: COLS,
  rows: ROWS,
  cell: CELL,
  originX: GRID_X,
  originY: GRID_Y,
});

export const CONFIG = Object.freeze({
  tick: TICK,
  view: { width: VIEW_W, height: VIEW_H },
  grid: GRID,
  vaultMax: VAULT_MAX,
  startSpark: START_SPARK,
  runTicks: RUN_TICKS,
  barrageCount: BARRAGE_COUNT,
  chainWindowTicks: CHAIN_WINDOW_TICKS,
  fuseTicks: FUSE_TICKS,
  chainArmTicks: CHAIN_ARM_TICKS,
  strikeCooldownTicks: STRIKE_COOLDOWN_TICKS,
  strikeRadius: STRIKE_RADIUS,
  strikeDamage: STRIKE_DAMAGE,
  rerollCost: REROLL_COST,
  upgradeCosts: UPGRADE_COSTS,
  blastLevelMul: BLAST_LEVEL_MUL,
  sparkPerChain: SPARK_PER_CHAIN,
  scorePerChain: SCORE_PER_CHAIN,
  kegs: KEGS,
  enemies: ENEMIES,
  difficulties: DIFFICULTIES,
  charms: CHARMS,
  feats: FEATS,
  shifts: SHIFTS,
});

export const palette = Object.freeze({
  chalk: '#f7f3e8',
  stone: '#d9c9a3',
  ink: '#23201b',
  ember: '#ff7a1a',
  blast: '#ffc21f',
  teal: '#0f5e63',
  vault: '#d93a2b',
  frost: '#7fd4ff',
});
