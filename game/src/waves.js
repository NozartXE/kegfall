// Defines the nine barrages, their honest forecasts and the seeded, tick-sorted spawn queue the sim consumes.

import { TICKS_PER_SECOND } from './config.js';
import { gatesForShift, fieldRect } from './grid.js';

const GAP_TICKS = Math.round(0.625 * TICKS_PER_SECOND);
const ENTRY_TICKS = Math.round(3.25 * TICKS_PER_SECOND);

export const BARRAGES = Object.freeze([
  {
    name: 'FIRST KINDLE',
    shift: 1,
    banner: 'THE ASH GATES OPEN',
    spawns: [
      { kind: 'sootling', count: 6, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'imp', count: 1, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
    ],
  },
  {
    name: 'EMBER LINE',
    shift: 1,
    banner: 'THE SOOTKIN QUICKEN',
    spawns: [
      { kind: 'sootling', count: 10, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'imp', count: 3, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
      { kind: 'wisp', count: 2, gap: TICKS_PER_SECOND, delay: ENTRY_TICKS * 2, gate: 'any' },
    ],
  },
  {
    name: 'WISP GALE',
    shift: 1,
    banner: 'THE ASH GATES OPEN',
    spawns: [
      { kind: 'sootling', count: 8, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'imp', count: 5, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
      { kind: 'wisp', count: 6, gap: GAP_TICKS, delay: ENTRY_TICKS * 2, gate: 'any' },
    ],
  },
  {
    name: 'CINDERBRUTE WALL',
    shift: 1,
    banner: 'THE ASH GATES OPEN',
    spawns: [
      { kind: 'sootling', count: 10, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'imp', count: 6, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
      { kind: 'wisp', count: 4, gap: GAP_TICKS, delay: ENTRY_TICKS * 2, gate: 'any' },
      { kind: 'brute', count: 2, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 3, gate: 'any' },
    ],
  },
  {
    name: 'TWIN SACKS',
    shift: 1,
    banner: 'THE ASH GATES OPEN',
    spawns: [
      { kind: 'sootling', count: 12, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'imp', count: 8, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
      { kind: 'wisp', count: 6, gap: GAP_TICKS, delay: ENTRY_TICKS * 2, gate: 'any' },
      { kind: 'twinsack', count: 4, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 3, gate: 'any' },
      { kind: 'brute', count: 2, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 4, gate: 'any' },
    ],
  },
  {
    name: 'FROST FALL',
    shift: 2,
    banner: 'THE SHIFT TURNS - NOON',
    spawns: [
      { kind: 'sootling', count: 14, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'wisp', count: 10, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
      { kind: 'imp', count: 8, gap: GAP_TICKS, delay: ENTRY_TICKS * 2, gate: 'any' },
      { kind: 'twinsack', count: 5, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 3, gate: 'any' },
      { kind: 'brute', count: 2, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 4, gate: 'any' },
    ],
  },
  {
    name: 'FROST AND IRON',
    shift: 2,
    banner: 'THE ASH GATES OPEN',
    spawns: [
      { kind: 'sootling', count: 16, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'wisp', count: 12, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
      { kind: 'imp', count: 10, gap: GAP_TICKS, delay: ENTRY_TICKS * 2, gate: 'any' },
      { kind: 'twinsack', count: 6, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 3, gate: 'any' },
      { kind: 'brute', count: 4, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 4, gate: 'any' },
    ],
  },
  {
    name: 'DUSK AVALANCHE',
    shift: 3,
    banner: 'NIGHT FALLS ON EMBER QUAY',
    spawns: [
      { kind: 'sootling', count: 16, gap: GAP_TICKS, delay: 0, gate: 'any' },
      { kind: 'imp', count: 12, gap: GAP_TICKS, delay: ENTRY_TICKS, gate: 'any' },
      { kind: 'wisp', count: 10, gap: GAP_TICKS, delay: ENTRY_TICKS * 2, gate: 'any' },
      { kind: 'twinsack', count: 6, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 3, gate: 'any' },
      { kind: 'brute', count: 4, gap: TICKS_PER_SECOND * 2, delay: ENTRY_TICKS * 4, gate: 'any' },
    ],
  },
  {
    name: 'THE CINDER COLOSSUS',
    shift: 3,
    banner: 'THE CINDER COLOSSUS',
    spawns: [
      { kind: 'colossus', count: 1, gap: 0, delay: 0, gate: 'any' },
      { kind: 'sootling', count: 4, gap: TICKS_PER_SECOND, delay: ENTRY_TICKS * 2, gate: 'any' },
      { kind: 'imp', count: 4, gap: TICKS_PER_SECOND, delay: ENTRY_TICKS * 3, gate: 'any' },
      { kind: 'wisp', count: 3, gap: TICKS_PER_SECOND, delay: ENTRY_TICKS * 4, gate: 'any' },
    ],
  },
]);

const period = (entry) => Math.max(0, entry.count - 1) * entry.gap;

const entryEnd = (entry) => entry.delay + period(entry);

const anyGate = (state, shift) => {
  const gates = gatesForShift(shift);
  const gate = state && state.rng ? state.rng.pick(gates) : undefined;
  return gate || { x: fieldRect().x + fieldRect().w / 2, y: fieldRect().y, col: 6 };
};

const resolveGate = (state, shift, gate) => (gate === 'any' ? anyGate(state, shift) : gatesForShift(shift)[gate]);

export function barrageForecast(idx) {
  const barrage = BARRAGES[idx];
  if (!barrage) return [];
  const rows = [];
  for (const entry of barrage.spawns) {
    const row = rows.find((r) => r.kind === entry.kind);
    if (row) row.count += entry.count;
    else rows.push({ kind: entry.kind, count: entry.count });
  }
  return rows.filter((row) => row.count > 0);
}

export function barrageTicks(idx) {
  const barrage = BARRAGES[idx];
  if (!barrage) return 0;
  let ticks = 0;
  for (const entry of barrage.spawns) ticks = Math.max(ticks, entryEnd(entry));
  return ticks;
}

export function buildSpawnQueue(state, idx) {
  const barrage = BARRAGES[idx];
  if (!barrage) return [];
  const queue = [];
  for (const entry of barrage.spawns) {
    for (let i = 0; i < entry.count; i += 1) {
      const gate = resolveGate(state || {}, barrage.shift, entry.gate);
      queue.push({ tick: entry.delay + i * entry.gap, kind: entry.kind, gate, x: gate.x, y: gate.y, col: gate.col });
    }
  }
  return queue.sort((a, b) => a.tick - b.tick);
}
