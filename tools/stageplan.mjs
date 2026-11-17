// Shared headless bots plus the density scorer that picks the cover tick for a staged screenshot.

import * as sim from '../game/src/sim.js';
import { CELL, KEGS, ROWS, REROLL_COST, STRIKE_RADIUS } from '../game/src/config.js';
import { gatesForShift } from '../game/src/grid.js';
import { blastRadiusCells } from '../game/src/blasts.js';

const KEG_DEFS = new Map(KEGS.map((def) => [def.key, def]));
const COLS = 12;
const VAULT_ROW = 6;
const VAULT_COLS = Object.freeze([5, 6]);
const DETONATION_WINDOW = 30;
const EVENT_CACHE = new WeakMap();

const isAlive = (enemy) => Boolean(enemy) && enemy.hp > 0;

function kegCost(state, def) {
  const mul = Number.isFinite(state.mods && state.mods.kegCostMul) ? state.mods.kegCostMul : 1;
  return Math.ceil(def.cost * mul);
}

function aliveEnemies(state) {
  return (state.enemies || []).filter(isAlive);
}

function enemyCount(state, x, y, radius) {
  let count = 0;
  for (const enemy of state.enemies || []) {
    if (isAlive(enemy) && Math.hypot(enemy.x - x, enemy.y - y) <= radius) count += 1;
  }
  return count;
}

function gateCols(state) {
  return gatesForShift(state.shift || 1).map((gate) => gate.col);
}

function emptyCells(state) {
  const taken = new Set((state.kegs || []).map((keg) => `${keg.col},${keg.row}`));
  const free = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (row === VAULT_ROW && VAULT_COLS.includes(col)) continue;
      if (taken.has(`${col},${row}`)) continue;
      free.push({ col, row });
    }
  }
  return free;
}

// Rows nearest the active gates: top rows while Sootkin still march in, bottom rows once they close on the Vault.
function gateRows(state) {
  const forward = (state.spawnQueue || []).length > 0;
  const start = forward ? 0 : ROWS - 3;
  return [start, start + 1];
}

function rankedSpots(state) {
  const cols = gateCols(state);
  const rows = gateRows(state);
  const spots = [];
  for (const cell of emptyCells(state)) {
    if (!rows.includes(cell.row)) continue;
    const gateDist = cols.length > 0 ? Math.min(...cols.map((gc) => Math.abs(gc - cell.col))) : Math.abs(cell.col - (COLS - 1) / 2);
    spots.push({ ...cell, gateDist });
  }
  spots.sort((a, b) => a.gateDist - b.gateDist || a.row - b.row || a.col - b.col);
  return spots;
}

function placeNearestGate(state, kind) {
  const def = KEG_DEFS.get(kind);
  if (!def) return false;
  if (def.unlockShift !== undefined && (state.shift || 1) < def.unlockShift + 1) return false;
  if ((state.spark || 0) < kegCost(state, def)) return false;
  for (const spot of rankedSpots(state)) {
    if (sim.placeKeg(state, kind, spot.col, spot.row)) return true;
  }
  return false;
}

function bestTarget(state) {
  let best = null;
  for (const keg of state.kegs || []) {
    const def = keg ? KEG_DEFS.get(keg.kind) : null;
    if (!def || !(keg.fuse < 0)) continue;
    const radius = blastRadiusCells(state, def, keg.level || 1) * CELL;
    const count = enemyCount(state, keg.x, keg.y, radius);
    if (!best || count > best.count || (count === best.count && keg.id < best.keg.id)) best = { keg, count };
  }
  return best;
}

function bestStrikeTarget(state) {
  const radius = STRIKE_RADIUS * CELL;
  let best = null;
  for (const enemy of aliveEnemies(state)) {
    const count = enemyCount(state, enemy.x, enemy.y, radius);
    if (!best || count > best.count || (count === best.count && enemy.id < best.enemy.id)) best = { enemy, count };
  }
  return best;
}

function pickOffer(state, priority) {
  const offers = Array.isArray(state.offers) ? state.offers : [];
  if (offers.length === 0) return -1;
  const preferred = priority.map((key) => offers.indexOf(key)).find((index) => index >= 0);
  return preferred === undefined ? 0 : preferred;
}

// Greedy: fires the keg with the most Sootkin inside its radius, forging chains while it stacks powder near the gates.
export const GREEDY_DRAFT = Object.freeze(['wideblast', 'longchain', 'quickfuse', 'tightbudget']);
export function greedyBot(state) {
  if (state.mode === 'draft') {
    const index = pickOffer(state, GREEDY_DRAFT);
    if (index >= 0) sim.chooseCharm(state, index);
    return;
  }
  if (state.mode !== 'play' || (state.tick || 0) % 30 !== 0) return;
  const powder = KEG_DEFS.get('powder');
  if ((state.spark || 0) >= kegCost(state, powder)) placeNearestGate(state, 'powder');
  const target = bestTarget(state);
  if (target && target.count >= 3) sim.igniteAt(state, target.keg.x, target.keg.y);
  const strike = bestStrikeTarget(state);
  if (strike && strike.count >= 4 && (state.strikeCooldown || 0) <= 0) sim.strikeAtPos(state, strike.enemy.x, strike.enemy.y);
}

// Careful: oils the gate lanes, upgrades its best keg, saves spark for rerolls and drafts by a fixed wish list.
export const CAREFUL_DRAFT = Object.freeze(['wideblast', 'longchain', 'quickfuse', 'tightbudget']);
export function carefulBot(state) {
  if (state.mode === 'draft') {
    const index = pickOffer(state, CAREFUL_DRAFT);
    if (index >= 0) sim.chooseCharm(state, index);
    return;
  }
  if (state.mode !== 'play' || (state.tick || 0) % 30 !== 0) return;
  const oil = KEG_DEFS.get('oil');
  const powder = KEG_DEFS.get('powder');
  const oilCost = kegCost(state, oil);
  const hasKegs = (state.kegs || []).length > 0;
  if (!hasKegs || (state.spark || 0) >= oilCost + REROLL_COST) placeNearestGate(state, 'oil');
  else if ((state.spark || 0) >= kegCost(state, powder)) placeNearestGate(state, 'powder');
  const target = bestTarget(state);
  if (target && (target.count >= 3 || (state.spawnQueue || []).length === 0)) sim.igniteAt(state, target.keg.x, target.keg.y);
  const strike = bestStrikeTarget(state);
  if (strike && strike.count >= 4 && (state.strikeCooldown || 0) <= 0) sim.strikeAtPos(state, strike.enemy.x, strike.enemy.y);
  const best = bestTarget(state);
  if (best && (best.keg.level || 1) < 3 && (state.spark || 0) >= oilCost + REROLL_COST) sim.upgradeKeg(state, best.keg);
}

export const BOTS = Object.freeze({ greedy: greedyBot, careful: carefulBot });

export function botFor(name) {
  return BOTS[name] || null;
}

// One policy decision followed by one fixed sim tick; the only place bots touch the run.
export function botStep(state, bot = greedyBot) {
  markDetonations(state);
  bot(state);
  sim.stepRun(state);
}

export function playRun(seed, diffKey, bot = greedyBot, maxTicks = 30000) {
  const state = sim.createRun(seed, diffKey);
  while (state.mode !== 'won' && state.mode !== 'lost' && state.tick < maxTicks) botStep(state, bot);
  return state;
}

function unstampedAnchors(state) {
  let last = 0;
  for (const event of state.events || []) if (event && event.type === 'detonate' && event.tick === undefined) last += 1;
  return last;
}

function recentDetonations(state, ticks = DETONATION_WINDOW) {
  const events = state.events || [];
  let cache = EVENT_CACHE.get(state);
  if (!cache || cache.events !== events) {
    cache = { events, scanned: 0, dets: [], seen: unstampedAnchors(state) };
    EVENT_CACHE.set(state, cache);
  }
  const seen = unstampedAnchors(state);
  if (seen < cache.seen) {
    cache.scanned = 0;
    cache.dets = [];
  }
  for (let i = cache.scanned; i < events.length; i += 1) {
    if (events[i] && events[i].type === 'detonate') cache.dets.push(events[i].tick ?? -1);
  }
  cache.scanned = events.length;
  cache.seen = seen;
  const current = (state.tick || 0) - 1;
  let inWindow = 0;
  for (let i = cache.dets.length - 1; i >= 0; i -= 1) {
    if (cache.dets[i] > current - ticks) inWindow += 1;
  }
  return inWindow;
}

// Stamp detonations with the tick they fired on so the scorer can window them; the sim leaves events unstamped.
export function markDetonations(state) {
  const events = state.events || [];
  const stamp = (state.tick || 0) - 1;
  for (let i = events.consumed || 0; i < events.length; i += 1) {
    if (events[i] && events[i].type === 'detonate' && events[i].tick === undefined) events[i].tick = stamp;
  }
  events.consumed = events.length;
}

// Score a frame: enemies live x2, floaters x3, chain x6, detonations in the last 30 ticks x4.
export function scoreFrame(state) {
  if (!state) return 0;
  return aliveEnemies(state).length * 2
    + (state.floaters || []).length * 3
    + (state.chain || 0) * 6
    + recentDetonations(state, DETONATION_WINDOW) * 4;
}

export function findStageTick(makeState, bot, maxTicks = 30000) {
  const probe = makeState();
  let bestTick = 0;
  let bestScore = -1;
  while (probe.tick < maxTicks && probe.mode !== 'won' && probe.mode !== 'lost') {
    botStep(probe, bot);
    const score = scoreFrame(probe);
    if (score > bestScore) {
      bestScore = score;
      bestTick = probe.tick;
    }
  }

  const state = makeState();
  while (state.tick < bestTick && state.mode !== 'won' && state.mode !== 'lost') botStep(state, bot);
  const score = scoreFrame(state);
  return { tick: state.tick, state, score };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { tick, score, state } = findStageTick(() => sim.createRun(7, 'blaze'), greedyBot);
  console.log(`stageplan: tick ${tick} score ${score} (mode ${state.mode}, chain x${state.chain}, enemies ${aliveEnemies(state).length})`);
}
