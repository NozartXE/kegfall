// Spawns, marches and breaches the Sootkin one fixed tick at a time, reading fields and housing from combat.

import { CELL, TICKS_PER_SECOND, ENEMIES } from './config.js';
import { vaultMouth, fieldRect } from './grid.js';
import { damageEnemy } from './combat.js';

const DEFS = new Map(ENEMIES.map((def) => [def.key, def]));
const BREACH_Y = 728;
const FROST_MUL = 0.45;
const WEAVE_HZ = 0.45;
const LANE_DRIFT = 220;

const defFor = (kind) => DEFS.get(kind) || DEFS.get('sootling');

export function spawnEnemy(state, kind, gate) {
  const def = defFor(kind);
  const spawn = gate || { x: 640, y: fieldRect().y, col: 6 };
  const hpMul = state && Number.isFinite(state.hpMul) ? state.hpMul : 1;
  const hp = def.hp * hpMul;
  const id = state && Number.isFinite(state.nextEnemyId) ? state.nextEnemyId : 1;
  if (state) state.nextEnemyId = id + 1;
  const enemy = {
    id,
    kind: def.key,
    def,
    x: spawn.x,
    y: spawn.y,
    hp,
    maxHp: hp,
    lane: spawn.col,
    speed: def.speed * CELL,
    radius: def.size * CELL,
    score: def.score,
    vaultDamage: def.boss ? 4 : 1,
    slowTicks: 0,
    burnTicks: 0,
    weavePhase: (id * 0.618034) % 1,
    weaveAmp: (def.weave || 0) * CELL,
    gate: spawn.col,
    hitFlash: 0,
  };
  state.enemies.push(enemy);
  if (state.byId) state.byId.set(enemy.id, enemy);
  return enemy;
}

export function removeEnemy(state, enemy) {
  const list = state.enemies;
  const i = list.indexOf(enemy);
  if (i >= 0) list.splice(i, 1);
  if (state.byId) state.byId.delete(enemy.id);
}

export function stepEnemies(state) {
  const breaches = [];
  if (!state || !Array.isArray(state.enemies)) return breaches;
  sweepCorpses(state);
  const mouth = vaultMouth();
  const frost = state.frostFields || [];
  const burns = state.burnFields || [];
  const falling = [];

  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    e.hitFlash = Math.max(0, (e.hitFlash || 0) - 1);

    let mul = 1;
    if (e.slowTicks > 0) {
      e.slowTicks = Math.max(0, e.slowTicks - 1);
      mul = FROST_MUL;
    } else {
      for (const field of frost) {
        if (field.ttl > 0 && Math.hypot(field.x - e.x, field.y - e.y) <= field.radius) {
          mul = FROST_MUL;
          break;
        }
      }
    }

    const step = (e.speed * mul) / TICKS_PER_SECOND;
    const laneTarget = mouth.x + ((e.lane - 5.5) * CELL) / 2;
    const drift = Math.min(Math.abs(laneTarget - e.x), LANE_DRIFT * step);
    e.x += Math.sign(laneTarget - e.x) * drift;
    if (e.weaveAmp > 0) {
      e.weavePhase = ((e.weavePhase || 0) + WEAVE_HZ / TICKS_PER_SECOND) % 1;
      e.x += Math.sin(e.weavePhase * Math.PI * 2) * e.weaveAmp * (step / CELL);
    }
    e.y += step;

    if (burns.length > 0) {
      for (const field of burns) {
        if (field.ttl > 0 && Math.hypot(field.x - e.x, field.y - e.y) <= field.radius) {
          damageEnemy(state, e, field.dps / TICKS_PER_SECOND, { source: 'burn', tick: state.tick || 0 });
          break;
        }
      }
    }

    if (e.hp <= 0) {
      falling.push(e);
    } else if (e.y >= BREACH_Y) {
      const damage = e.vaultDamage || 1;
      state.vault = Math.max(0, (state.vault || 0) - damage);
      const event = { type: 'breach', kind: e.kind, damage };
      state.events.push(event);
      if (typeof state.floater === 'function') {
        state.floater(mouth.x, mouth.y, `VAULT -${damage}`, '#d93a2b');
      }
      breaches.push(event);
      falling.push(e);
    }
  }

  for (const e of falling) removeEnemy(state, e);
  return breaches;
}

function sweepCorpses(state) {
  const list = state.enemies;
  let kept = null;
  for (let i = 0; i < list.length; i += 1) {
    if (!list[i] || list[i].hp > 0) {
      if (kept) kept.push(list[i]);
      continue;
    }
    if (!kept) kept = list.slice(0, i);
    if (state.byId) state.byId.delete(list[i].id);
  }
  if (kept) state.enemies = kept;
}

export function aliveCount(state) {
  if (!state || !Array.isArray(state.enemies)) return 0;
  let n = 0;
  for (const e of state.enemies) if (e.hp > 0) n += 1;
  return n;
}

export function nearestEnemy(state, x, y, radius) {
  if (!state || !Array.isArray(state.enemies)) return null;
  const limit = Number.isFinite(radius) ? radius : Infinity;
  let best = null;
  let bestDist = limit;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const dist = Math.hypot(e.x - x, e.y - y);
    if (dist <= bestDist) {
      best = e;
      bestDist = dist;
    }
  }
  return best;
}
