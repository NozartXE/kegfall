// Runs a deterministic bot through the sim behind the title screen so the demo always looks like a real, chained game.

import { CELL, KEGS } from './config.js';
import { createRun, stepRun, placeKeg, chooseCharm } from './sim.js';
import { igniteKeg } from './blasts.js';
import { gatesForShift } from './grid.js';

const COLS = 12;
const ROWS = 7;
const MAX_DEMO_STEPS = 60 * 60 * 20;
const IGNITE_COUNT = 3;
const IGNITE_RADIUS = 2.4 * CELL;
const STRIKE_AT = 5;
const PLAN = Object.freeze([
  /*       0    1    2    3    4    5    6    7    8    9   10   11 */
  /* 0 */ [0,   0,   1,   0,   0,   0,   0,   0,   0,   1,   0,   0],
  /* 1 */ [0,   1,   0,   0,   2,   0,   0,   2,   0,   0,   1,   0],
  /* 2 */ [0,   0,   1,   0,   0,   2,   2,   0,   0,   1,   0,   0],
  /* 3 */ [0,   0,   0,   1,   0,   0,   0,   0,   1,   0,   0,   0],
  /* 4 */ [0,   0,   2,   0,   1,   1,   1,   1,   0,   2,   0,   0],
  /* 5 */ [0,   0,   0,   1,   0,   0,   0,   0,   1,   0,   0,   0],
  /* 6 */ [0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
]);
const DEFAULT_COST = Math.min(...KEGS.map((def) => def.cost));
const KIND_FOR = Object.freeze({ 1: 'powder', 2: 'oil' });

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

function candidates(state) {
  const list = [];
  const gateCols = gatesForShift(state.shift || 1).map((gate) => gate.col);
  for (let row = 0; row < ROWS - 1; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const kind = KIND_FOR[PLAN[row][col]];
      if (!kind) continue;
      if (row === 6 && (col === 5 || col === 6)) continue;
      const nearGate = gateCols.some((gc) => Math.abs(gc - col) <= 2);
      const centerBias = Math.abs(col - 5.5) < 3 ? 0 : 2;
      list.push({ col, row, kind, rank: (nearGate ? 0 : 2) + centerBias + row * 0.1 });
    }
  }
  return list.sort((a, b) => a.rank - b.rank);
}

function nearestGateCol(state) {
  const gates = gatesForShift(state.shift || 1);
  const avg = gates.reduce((sum, gate) => sum + (gate.col ?? 6), 0) / Math.max(1, gates.length);
  return Math.round(avg);
}

function freeCellNear(state, col, row) {
  const c = clamp(col, 0, COLS - 1);
  for (let ring = 0; ring < 4; ring += 1) {
    for (let dr = -ring; dr <= ring; dr += 1) {
      for (let dc = -ring; dc <= ring; dc += 1) {
        const r = row + dr;
        const cc = c + dc;
        if (r < 0 || r >= ROWS - 1 || cc < 0 || cc >= COLS) continue;
        if (r === 6 && (cc === 5 || cc === 6)) continue;
        if ((state.kegs || []).some((keg) => keg.col === cc && keg.row === r)) continue;
        return { col: cc, row: r };
      }
    }
  }
  return null;
}

function tryIgnite(state) {
  const armed = (state.kegs || []).filter((keg) => keg && keg.fuse < 0);
  let best = null;
  let bestCount = 1;
  for (const keg of armed) {
    let count = 0;
    for (const enemy of state.enemies || []) {
      if (enemy.hp > 0 && Math.hypot(enemy.x - keg.x, enemy.y - keg.y) <= IGNITE_RADIUS) count += 1;
    }
    if (count > bestCount) {
      best = keg;
      bestCount = count;
    }
  }
  if (!best) return false;
  return igniteKeg(state, best);
}

function chooseOffer(state) {
  const offers = Array.isArray(state.offers) ? state.offers : [];
  if (offers.length === 0) return false;
  const order = ['wideblast', 'quickfuse', 'longchain'];
  const pick = order.map((key) => offers.indexOf(key)).find((i) => i >= 0) ?? 0;
  return chooseCharm(state, pick);
}

function placeSome(state) {
  const plan = candidates(state);
  let placed = 0;
  for (const spot of plan) {
    if (placed >= 2) break;
    if ((state.kegs || []).some((keg) => keg.col === spot.col && keg.row === spot.row)) continue;
    if (placeKeg(state, spot.kind, spot.col, spot.row)) placed += 1;
  }
  if (placed === 0 && state.spark >= DEFAULT_COST) {
    const near = freeCellNear(state, nearestGateCol(state), 3);
    if (near && placeKeg(state, 'powder', near.col, near.row)) placed += 1;
  }
  return placed;
}

export function buildDemo(seed = 4242) {
  let state = null;
  let steps = 0;

  const restart = () => {
    state = createRun(seed, 'blaze');
    steps = 0;
  };
  restart();

  const step = () => {
    if (!state) restart();
    if (state.mode === 'won' || state.mode === 'lost') {
      restart();
      return state;
    }
    if (state.mode === 'draft') {
      const pending = Array.isArray(state.offers) ? state.offers.slice() : [];
      if (!chooseOffer(state)) {
        restart();
        return state;
      }
      state.previewOffers = pending;
      return state;
    }
    if (state.mode !== 'play') return state;

    steps += 1;
    if (steps > MAX_DEMO_STEPS) restart();
    if (!state) return null;

    if (steps % (STRIKE_AT * 2) === 0) placeSome(state);
    if (steps % IGNITE_COUNT === 0) tryIgnite(state);
    state.previewOffers = Array.isArray(state.offers) ? state.offers.slice() : state.previewOffers || [];
    stepRun(state);
    return state;
  };

  const placeAt = (col, row) => {
    if (!state || state.mode !== 'play') return false;
    if ((state.kegs || []).some((keg) => keg.col === col && keg.row === row)) return false;
    const options = col <= 4 ? ['powder', 'oil', 'mine'] : ['powder', 'oil'];
    for (const kind of options) if (placeKeg(state, kind, col, row)) return true;
    return false;
  };

  const ignite = (keg) => (state ? igniteKeg(state, keg) : false);

  return {
    get state() {
      return state;
    },
    step,
    placeAt,
    ignite,
    restart,
  };
}
