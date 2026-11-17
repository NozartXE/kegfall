// Stages screenshots and exposes a debug handle: a deterministic bot policy over the headless sim, driven by ?shot= / ?test= URL params.

import * as sim from './sim.js';
import { CELL, KEGS, STRIKE_RADIUS } from './config.js';
import { gatesForShift } from './grid.js';
import { blastRadiusCells } from './blasts.js';
import { storeSave, recordRun, gradeFor } from './save.js';

const KEG_DEFS = new Map(KEGS.map((def) => [def.key, def]));
const COLS = 12;
const ROWS = 7;
const VAULT_ROW = 6;
const VAULT_COLS = Object.freeze([5, 6]);

const SEED = 7;
const DIFF = 'blaze';
const BOT_PERIOD = 20;
const IGNITE_MIN_HITS = 3;
const IGNITE_RADIUS_MUL = 1.1;
const STRIKE_HITS = 5;
const STRIKE_CELLS = STRIKE_RADIUS * CELL;
const MAX_SHOT_TICKS = 30000;
const MIN_DENSE_ENEMIES = 10;
const MIN_TRANSITION_AGE = 150;
const MIN_DENSE_CHAIN = 5;
const FALLBACK_MIN_ENEMIES = 6;
const DRAFT_PRIORITY = Object.freeze(['wideblast', 'longchain', 'quickfuse', 'tightbudget', 'chainledger']);

const isAlive = (enemy) => Boolean(enemy) && enemy.hp > 0;
const kegAt = (state, col, row) => (state.kegs || []).find((keg) => keg.col === col && keg.row === row) || null;
const kegDef = (keg) => (keg ? KEG_DEFS.get(keg.kind) : null) || null;

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

function gateRows(state) {
  const gates = gatesForShift(state.shift || 1);
  const cols = gates.map((gate) => gate.col);
  const forward = (state.spawnQueue || []).length > 0;
  const start = forward ? 0 : ROWS - 3;
  return { cols, rows: [start, start + 1] };
}

function placeKegAt(state, kind) {
  const def = KEG_DEFS.get(kind);
  if (!def) return false;
  if (def.unlockShift !== undefined && (state.shift || 1) < def.unlockShift + 1) return false;
  if ((state.spark || 0) < kegCost(state, def)) return false;
  const { cols, rows } = gateRows(state);
  const free = [];
  for (const row of rows) {
    for (let col = 0; col < COLS; col += 1) {
      if (row === VAULT_ROW && VAULT_COLS.includes(col)) continue;
      if (kegAt(state, col, row)) continue;
      const gateDist = cols.length > 0 ? Math.min(...cols.map((gc) => Math.abs(gc - col))) : Math.abs(col - (COLS - 1) / 2);
      free.push({ col, row, gateDist });
    }
  }
  free.sort((a, b) => a.gateDist - b.gateDist || a.row - b.row || a.col - b.col);
  return free.some((spot) => sim.placeKeg(state, kind, spot.col, spot.row));
}

function igniteBestKeg(state) {
  let best = null;
  let bestCount = 0;
  for (const keg of state.kegs || []) {
    if (!keg || !(keg.fuse < 0)) continue;
    const def = kegDef(keg);
    if (!def) continue;
    const radius = blastRadiusCells(state, def, keg.level || 1) * CELL * IGNITE_RADIUS_MUL;
    const count = enemyCount(state, keg.x, keg.y, radius);
    if (count > bestCount) {
      best = keg;
      bestCount = count;
    }
  }
  if (!best || bestCount < IGNITE_MIN_HITS) return false;
  return sim.igniteAt(state, best.x, best.y);
}

function strikeBestCluster(state) {
  if ((state.strikeCooldown || 0) > 0) return false;
  let best = null;
  let bestCount = 0;
  for (const enemy of aliveEnemies(state)) {
    const count = enemyCount(state, enemy.x, enemy.y, STRIKE_CELLS);
    if (count > bestCount) {
      best = enemy;
      bestCount = count;
    }
  }
  if (!best || bestCount < STRIKE_HITS) return false;
  return sim.strikeAtPos(state, best.x, best.y);
}

function chooseBestDraft(state) {
  const offers = Array.isArray(state.offers) ? state.offers : [];
  if (offers.length === 0) return false;
  const preferred = DRAFT_PRIORITY.map((key) => offers.indexOf(key)).find((index) => index >= 0);
  return sim.chooseCharm(state, preferred === undefined ? 0 : preferred);
}

function botAct(state, tick) {
  if (state.mode === 'draft') {
    if (!chooseBestDraft(state)) sim.skipDraft(state);
    return;
  }
  if (state.mode !== 'play' || tick % BOT_PERIOD !== 0) return;
  const oil = KEG_DEFS.get('oil');
  const powder = KEG_DEFS.get('powder');
  if (oil && (state.spark || 0) >= kegCost(state, oil)) placeKegAt(state, 'oil');
  else if (powder && (state.spark || 0) >= kegCost(state, powder)) placeKegAt(state, 'powder');
  igniteBestKeg(state);
  strikeBestCluster(state);
}

function botStep(state) {
  botAct(state, state.tick || 0);
  sim.stepRun(state);
}

function botPlay(seed, diffKey, stopAt = null) {
  const state = sim.createRun(seed, diffKey);
  while (!(stopAt && stopAt(state)) && state.mode !== 'won' && state.mode !== 'lost') botStep(state);
  return state;
}

function frameScore(state) {
  return aliveEnemies(state).length * 4
    + (state.chain || 0) * 6
    + (state.floaters || []).length * 3;
}

// Dense mid-cascade only: no barrage-clear / shift-change peaks, no empty-field blast rings.
function isDenseFrame(state, ticksSinceTransition) {
  return state.mode === 'play'
    && aliveEnemies(state).length >= MIN_DENSE_ENEMIES
    && ticksSinceTransition >= MIN_TRANSITION_AGE
    && (state.chain || 0) >= MIN_DENSE_CHAIN;
}

function stagePlay(seed, diffKey) {
  const probe = sim.createRun(seed, diffKey);
  let bestTick = 0;
  let bestScore = -1;
  let bestFallbackTick = 0;
  let bestFallbackScore = -1;
  let lastMode = probe.mode;
  let lastTransitionTick = 0;
  while (probe.tick < MAX_SHOT_TICKS && probe.mode !== 'won' && probe.mode !== 'lost') {
    botStep(probe);
    if (probe.mode !== lastMode) {
      lastMode = probe.mode;
      lastTransitionTick = probe.tick;
    }
    const ticksSinceTransition = probe.tick - lastTransitionTick;
    const enemiesAlive = aliveEnemies(probe).length;
    const score = frameScore(probe);
    if (isDenseFrame(probe, ticksSinceTransition) && score > bestScore) {
      bestScore = score;
      bestTick = probe.tick;
    }
    if (enemiesAlive >= FALLBACK_MIN_ENEMIES && score > bestFallbackScore) {
      bestFallbackScore = score;
      bestFallbackTick = probe.tick;
    }
  }

  const chosenTick = bestTick > 0 ? bestTick : bestFallbackTick;
  const state = sim.createRun(seed, diffKey);
  while (state.tick < chosenTick && state.mode !== 'won' && state.mode !== 'lost') botStep(state);
  return state;
}

function stageDraft() {
  return botPlay(SEED, DIFF, (state) => state.mode === 'draft' && (state.barrage || 0) >= 3);
}

function stageResults(app) {
  const seeded = {
    best: 12980,
    history: [
      { score: 8450, grade: 'C', won: false, diffKey: 'blaze', seed: 3 },
      { score: 12980, grade: 'B', won: false, diffKey: 'blaze', seed: 5 },
    ],
    feats: {},
    settings: { ...(app.save && app.save.settings) },
    afterglowUnlocked: false,
  };
  storeSave(seeded);

  const finished = botPlay(11, 'kindling');
  const stats = finished.stats || {};
  const won = finished.mode === 'won' || Boolean(stats.won);
  const score = Math.max(0, Math.round(Number(finished.score) || 0));
  const nextSave = recordRun(seeded, { score, won, diffKey: finished.diffKey, seed: finished.seed });
  const history = [
    { score, grade: gradeFor(score), won, diffKey: finished.diffKey, seed: finished.seed },
    ...seeded.history,
  ].slice(0, 3);
  const save = { ...nextSave, best: Math.max(seeded.best, score), history };
  storeSave(save);

  app.save = save;
  app.settings = save.settings;
  if (app.view) app.view.history = save.history;
  finished.best = save.best;
  return finished;
}

function parseParams() {
  const defaults = { seed: SEED, diff: DIFF, shot: null, test: false };
  if (typeof location === 'undefined' || !location.search) return defaults;
  try {
    const params = new URLSearchParams(location.search);
    const seed = Number(params.get('seed'));
    return {
      seed: params.get('seed') !== null && Number.isFinite(seed) ? seed : defaults.seed,
      diff: params.get('diff') || defaults.diff,
      shot: params.get('shot') || null,
      test: params.get('test') === '1' || params.get('test') === 'true',
    };
  } catch {
    return defaults;
  }
}

export function stateSummary(state) {
  const stats = (state && state.stats) || {};
  return {
    score: Math.max(0, Math.round(Number(state && state.score) || 0)),
    spark: Math.max(0, Math.round(Number(state && state.spark) || 0)),
    vault: Math.max(0, Math.round(Number(state && state.vault) || 0)),
    chain: Math.max(0, Math.round(Number(state && state.chain) || 0)),
    bestChain: Math.max(0, Math.round(Number(state && state.bestChain) || 0)),
    barrage: Math.max(0, Math.round(Number(state && state.barrage) || 0)),
    kills: Math.max(0, Math.round(Number(stats.kills) || 0)),
    tick: Math.max(0, Math.round(Number(state && state.tick) || 0)),
    mode: state && typeof state.mode === 'string' ? state.mode : 'idle',
  };
}

function pitchStage(state, shot) {
  if (!state) return;
  if (shot !== 'draft') igniteBestKeg(state);
}

function showHint(lines) {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const node = document.getElementById('start-hint');
  if (node) node.textContent = lines.join(' - ');
}

export function installTesthook(app) {
  if (!app || typeof app !== 'object') return;
  const params = parseParams();
  app.staged = false;
  if (params.test) app.test = true;

  if (params.shot === 'play') {
    app.state = stagePlay(params.seed, params.diff);
    app.view.tool = 'powder';
    app.mode = 'play';
    app.staged = true;
  } else if (params.shot === 'title') {
    app.mode = 'title';
    app.staged = true;
  } else if (params.shot === 'draft') {
    app.state = stageDraft();
    app.mode = 'draft';
    app.staged = true;
  } else if (params.shot === 'results') {
    app.state = stageResults(app);
    app.mode = 'results';
    app.staged = true;
  }

  app.difficulty = params.diff;
  app.view.paused = false;
  app.view.fast = false;

  if (!app.staged) showHint(['BOT STAGE', params.shot ? `shot=${params.shot} FAILED` : 'no shot param']);
  else if (app.state) pitchStage(app.state, params.shot);

  if (typeof window !== 'undefined') {
    if (params.test) window.__KEGFALL = { app, sim };
    window.__SHOT_READY = Boolean(app.staged);
  }
}
