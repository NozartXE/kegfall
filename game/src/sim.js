// The run state machine: barrage schedule, keg placement, drafting and a deterministic fixed-tick step.

import {
  START_SPARK,
  VAULT_MAX,
  UPGRADE_COSTS,
  KEGS,
  DIFFICULTIES,
  BARRAGE_COUNT,
} from './config.js';
import { cellCenter, fieldRect, gatesForShift } from './grid.js';
import { makeRng, hashState } from './rng.js';
import { BARRAGES, buildSpawnQueue } from './waves.js';
import { spawnEnemy, stepEnemies, aliveCount } from './enemies.js';
import { detonate, igniteKeg, stepBlasts } from './blasts.js';
import { strikeAt, bindDetonate } from './combat.js';
import { rollOffers, applyCharm, ensureOffers } from './draft.js';
import { checkFeats } from './feats.js';

bindDetonate(detonate);

const DEFAULT_DIFF = { hpMul: 1, speedMul: 1, sparkMul: 1 };
const FLOAT_TICKS = 50;
const IGNITE_RANGE = 40;
const SALVAGE_RATE = 0.5;
const VAULT_MOUTH_ROW = 6;
const VAULT_MOUTH_COLS = Object.freeze([5, 6]);

const KEG_DEFS = new Map(KEGS.map((def) => [def.key, def]));
const DIFF_DEFS = new Map(DIFFICULTIES.map((def) => [def.key, def]));

export function shiftForBarrage(index) {
  const shift = BARRAGES[index] ? BARRAGES[index].shift : 1;
  return Math.max(1, Math.min(3, Math.floor(Number(shift) || 1)));
}

const isFieldCell = (col, row) => {
  const rect = fieldRect();
  const c = Number(col);
  const r = Number(row);
  if (!Number.isInteger(c) || !Number.isInteger(r)) return false;
  const cell = cellCenter(c, r);
  return cell.col === c && cell.row === r && cell.x >= rect.x && cell.x < rect.x + rect.w && cell.y >= rect.y && cell.y < rect.y + rect.h;
};

const kegAt = (state, col, row) => state.kegs.find((keg) => keg.col === col && keg.row === row);

const kegCost = (state, def) => {
  const mul = Number.isFinite(state.mods.kegCostMul) ? state.mods.kegCostMul : 1;
  return Math.ceil(def.cost * mul);
};

const pushEvent = (state, event) => {
  if (Array.isArray(state.events)) state.events.push(event);
};

const bannerLine = (index) => {
  const barrage = BARRAGES[index] || {};
  const name = barrage.name || 'THE SHIFT';
  return barrage.banner ? `${barrage.banner} - ${name}` : name;
};

export function createRun(seed, diffKey) {
  const rng = makeRng(seed);
  const diff = DIFF_DEFS.get(diffKey) || DEFAULT_DIFF;
  const state = {
    seed,
    diffKey: DIFF_DEFS.has(diffKey) ? diffKey : 'blaze',
    mode: 'play',
    tick: 0,
    barrage: 0,
    shift: shiftForBarrage(0),
    hpMul: diff.hpMul,
    speedMul: diff.speedMul,
    score: 0,
    scoreMul: 1,
    spark: Math.round(START_SPARK * diff.sparkMul),
    vault: VAULT_MAX,
    vaultMax: VAULT_MAX,
    mods: {},
    charms: [],
    offers: [],
    feats: {},
    stats: {
      kills: 0,
      detonations: 0,
      barragesCleared: 0,
      flawlessStreak: 0,
      sparkEarned: 0,
      sparkSpent: 0,
      vaultLostTotal: 0,
      reinforcements: 0,
      bossKilled: false,
      won: false,
    },
    log: [`SORREL BRAND takes the quay.`, bannerLine(0)],
    events: [],
    rng,
    kegs: [],
    enemies: [],
    byId: new Map(),
    fields: [],
    floaters: [],
    spawnQueue: [],
    nextKegId: 1,
    nextEnemyId: 1,
    chain: 0,
    chainTimer: 0,
    bestChain: 0,
    strikeCooldown: 0,
    barrageStartScore: 0,
    barrageStartVault: VAULT_MAX,
    afterglowFell: false,
  };
  state.spawnQueue = buildSpawnQueue(state, 0);
  return state;
}

function stepFloaters(state) {
  if (!Array.isArray(state.floaters)) return;
  const keep = [];
  for (const floater of state.floaters) {
    floater.ttl = (floater.ttl ?? FLOAT_TICKS) - 1;
    if (floater.ttl > 0) keep.push(floater);
  }
  state.floaters = keep;
}

function consumeSpawns(state) {
  const queue = state.spawnQueue;
  if (!Array.isArray(queue) || queue.length === 0) return;
  while (queue.length > 0 && queue[0].tick <= state.tick) {
    const entry = queue.shift();
    spawnEnemy(state, entry.kind, entry.gate || { x: entry.x, y: entry.y, col: entry.col });
  }
}

function refundUnfired(state) {
  if (!state.mods || !state.mods.salvage) return;
  let refunded = 0;
  const keep = [];
  for (const keg of state.kegs) {
    if (keg.fuse < 0 || keg.fuse > 0) {
      const def = KEG_DEFS.get(keg.kind);
      if (keg.fuse < 0 && def) refunded += Math.floor(kegCost(state, def) * SALVAGE_RATE);
      if (keg.fuse <= 0) continue;
      keep.push(keg);
    }
  }
  state.kegs = keep;
  if (refunded > 0) {
    state.spark += refunded;
    pushEvent(state, { type: 'salvage', amount: refunded });
  }
}

function barrageCleared(state) {
  return state.spawnQueue.length === 0 && aliveCount(state) === 0;
}

function finishBarrage(state) {
  const stats = state.stats;
  stats.barragesCleared = (stats.barragesCleared || 0) + 1;
  const lostThisBarrage = Math.max(0, (state.barrageStartVault || 0) - state.vault);
  stats.vaultLostTotal = (stats.vaultLostTotal || 0) + lostThisBarrage;
  if (lostThisBarrage === 0) stats.flawlessStreak = (stats.flawlessStreak || 0) + 1;
  else stats.flawlessStreak = 0;

  pushEvent(state, { type: 'barrageCleared', barrage: state.barrage, name: BARRAGES[state.barrage]?.name || '' });
  refundUnfired(state);

  const lastBarrage = BARRAGE_COUNT - 1;
  if (state.barrage >= lastBarrage) {
    state.mode = 'won';
    const bonus = Math.max(0, state.vault) * 100;
    state.score += bonus;
    stats.won = true;
    checkFeats(state);
    pushEvent(state, { type: 'won', score: state.score, bonus });
    return;
  }

  state.mode = 'draft';
  rollOffers(state);
  pushEvent(state, { type: 'draft', offers: state.offers.slice(), barrage: state.barrage });
  checkFeats(state);
}

function startBarrage(state, index, eventType) {
  state.barrage = index;
  state.shift = shiftForBarrage(index);
  state.scoreMul = state.mods.nightDouble && state.shift === 3 ? 2 : 1;
  state.spawnQueue = buildSpawnQueue(state, index);
  state.mode = 'play';
  state.barrageStartScore = state.score;
  state.barrageStartVault = state.vault;
  consumeSpawns(state);
  const lastLine = `${bannerLine(index)}`;
  if (Array.isArray(state.log)) {
    state.log.push(lastLine);
    if (state.log.length > 8) state.log.splice(0, state.log.length - 8);
  }
  pushEvent(state, { type: eventType || 'barrage', barrage: index, name: BARRAGES[index]?.name || '' });
}

export function stepRun(state) {
  if (!state || typeof state !== 'object') return;
  state.tick = (state.tick || 0) + 1;

  if (state.mode === 'won' || state.mode === 'lost') {
    stepFloaters(state);
    return;
  }

  if (state.mode === 'draft') {
    ensureOffers(state);
    stepFloaters(state);
    return;
  }

  if (state.mode !== 'play') return;

  consumeSpawns(state);
  stepBlasts(state);
  stepEnemies(state);
  consumeSpawns(state);
  if (state.strikeCooldown > 0) state.strikeCooldown -= 1;
  stepFloaters(state);

  if (state.vault <= 0) {
    state.vault = 0;
    state.mode = 'lost';
    state.stats.vaultLostTotal = (state.stats.vaultLostTotal || 0) + 1;
    pushEvent(state, { type: 'gameover', score: state.score });
    checkFeats(state);
    return;
  }

  if (barrageCleared(state)) finishBarrage(state);
}

export function placeKeg(state, kind, col, row) {
  if (!state || state.mode !== 'play') return false;
  const def = KEG_DEFS.get(kind);
  if (!def) return false;
  if (!isFieldCell(col, row)) return false;
  if (kegAt(state, col, row)) return false;
  if (row === VAULT_MOUTH_ROW && VAULT_MOUTH_COLS.includes(col)) return false;
  if (def.unlockShift !== undefined && state.shift < def.unlockShift + 1) return false;
  const cost = kegCost(state, def);
  if ((state.spark || 0) < cost) return false;

  state.spark -= cost;
  state.stats.sparkSpent = (state.stats.sparkSpent || 0) + cost;
  const center = cellCenter(col, row);
  const keg = {
    id: state.nextKegId || 1,
    kind: def.key,
    col: center.col,
    row: center.row,
    x: center.x,
    y: center.y,
    level: 1,
    fuse: -1,
  };
  state.nextKegId = keg.id + 1;
  state.kegs.push(keg);
  pushEvent(state, { type: 'place', keg: keg.id, kind: keg.kind, col: keg.col, row: keg.row, cost });
  return true;
}

export function upgradeKeg(state, keg) {
  if (!state || state.mode !== 'play' || !keg) return false;
  if (!Array.isArray(state.kegs) || !state.kegs.includes(keg)) return false;
  const level = keg.level || 1;
  if (level >= 3) return false;
  const cost = UPGRADE_COSTS[Math.max(0, Math.min(UPGRADE_COSTS.length - 1, level - 1))];
  if ((state.spark || 0) < cost) return false;
  state.spark -= cost;
  state.stats.sparkSpent = (state.stats.sparkSpent || 0) + cost;
  keg.level = level + 1;
  pushEvent(state, { type: 'upgrade', keg: keg.id, kind: keg.kind, level: keg.level, cost });
  return true;
}

export function igniteAt(state, x, y) {
  if (!state || state.mode !== 'play' || !Array.isArray(state.kegs)) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  let best = null;
  let bestDist = IGNITE_RANGE;
  for (const keg of state.kegs) {
    if (!(keg.fuse < 0)) continue;
    const dist = Math.hypot(keg.x - x, keg.y - y);
    if (dist <= bestDist) {
      best = keg;
      bestDist = dist;
    }
  }
  if (!best) return false;
  return igniteKeg(state, best);
}

export function strikeAtPos(state, x, y) {
  if (!state || state.mode !== 'play') return false;
  return strikeAt(state, x, y);
}

export function chooseCharm(state, offerIndex) {
  if (!state || state.mode !== 'draft') return false;
  const offers = ensureOffers(state);
  const idx = Math.floor(Number(offerIndex));
  if (!Number.isInteger(idx) || idx < 0 || idx >= offers.length) return false;
  applyCharm(state, offers[idx]);
  state.offers = [];
  startBarrage(state, (state.barrage || 0) + 1, 'barrage');
  return true;
}

// A draft always resolves into a charm: skipping takes the first offer rather than stranding the run.
export function skipDraft(state) {
  return chooseCharm(state, 0);
}

export function hashRun(state) {
  if (!state) return hashState({});
  const stats = state.stats || {};
  return hashState({
    score: state.score || 0,
    spark: state.spark || 0,
    vault: state.vault || 0,
    tick: state.tick || 0,
    chain: state.chain || 0,
    bestChain: state.bestChain || 0,
    kills: stats.kills || 0,
    det: stats.detonations || 0,
  });
}

export function snapshot(state) {
  if (!state) return null;
  const stats = state.stats || {};
  return {
    seed: state.seed,
    diffKey: state.diffKey,
    mode: state.mode,
    tick: state.tick,
    barrage: state.barrage,
    shift: state.shift,
    score: state.score,
    scoreMul: state.scoreMul,
    spark: state.spark,
    vault: state.vault,
    vaultMax: state.vaultMax,
    bestChain: state.bestChain,
    kills: stats.kills || 0,
    detonations: stats.detonations || 0,
    barragesCleared: stats.barragesCleared || 0,
    flawlessStreak: stats.flawlessStreak || 0,
    kegs: Array.isArray(state.kegs) ? state.kegs.length : 0,
    enemies: Array.isArray(state.enemies) ? aliveCount(state) : 0,
    queued: Array.isArray(state.spawnQueue) ? state.spawnQueue.length : 0,
    charms: Array.isArray(state.charms) ? state.charms.slice() : [],
    offers: Array.isArray(state.offers) ? state.offers.slice() : [],
    feats: Object.keys(state.feats || {}).filter((key) => state.feats[key]),
    won: Boolean(stats.won),
    hash: hashRun(state),
  };
}
