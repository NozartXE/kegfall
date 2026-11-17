// Applies damage, chain-scaled rewards, on-death side effects and the SPARK STRIKE; blasts arrive through a late-bound hook.

import { ENEMIES, STRIKE_RADIUS, STRIKE_DAMAGE, STRIKE_COOLDOWN_TICKS } from './config.js';
import { spawnEnemy, removeEnemy } from './enemies.js';

const ENEMY_DEFS = new Map(ENEMIES.map((def) => [def.key, def]));

const enemyDef = (enemy) => enemy.def || ENEMY_DEFS.get(enemy.kind) || ENEMY_DEFS.get('sootling');

let detonateFn = null;
let registerChainFn = null;

export function bindDetonate(fn) {
  detonateFn = typeof fn === 'function' ? fn : null;
}

export function bindRegisterChain(fn) {
  registerChainFn = typeof fn === 'function' ? fn : null;
}

const chainLen = (state) => Math.max(1, Number.isFinite(state.chain) ? state.chain : 0);

function pushEvent(state, event) {
  if (Array.isArray(state.events)) state.events.push(event);
}

function pushFloater(state, x, y, text, big) {
  if (Array.isArray(state.floaters)) state.floaters.push({ x, y, text, big: Boolean(big) });
  if (typeof state.floater === 'function') state.floater(x, y, text);
}

function blastAt(state, x, y, kind, radiusCells, damage, origin) {
  if (!detonateFn) return false;
  detonateFn(state, { x, y, kind, radiusCells, damage, origin });
  return true;
}

export function killEnemy(state, enemy) {
  const def = enemyDef(enemy);
  const chain = chainLen(state);
  const mul = Number.isFinite(state.scoreMul) ? state.scoreMul : 1;
  const score = Math.round((def.score || 0) * chain * mul);
  const mods = state.mods || {};
  const spark = (def.spark || 0) + (mods.sparkChainBonus ? Math.floor(chain / 5) : 0);
  const stats = state.stats || (state.stats = {});

  state.score = (state.score || 0) + score;
  state.spark = (state.spark || 0) + spark;
  stats.kills = (stats.kills || 0) + 1;
  stats.sparkEarned = (stats.sparkEarned || 0) + spark;
  pushFloater(state, enemy.x, enemy.y, `+${score}`, chain >= 5);
  pushEvent(state, { type: 'kill', kind: def.key, x: enemy.x, y: enemy.y, score, spark, chain });

  if (def.key === 'imp') {
    enemy.hp = 0;
    if (registerChainFn) registerChainFn(state);
    blastAt(state, enemy.x, enemy.y, 'imp', def.deathBlastRadius, def.deathBlastDamage, enemy);
  } else if (def.key === 'twinsack') {
    const splits = def.splits || 2;
    for (let i = 0; i < splits; i += 1) {
      const offset = splits === 2 ? (i === 0 ? -14 : 14) : (i - (splits - 1) / 2) * 14;
      spawnEnemy(state, 'sootling', { x: enemy.x + offset, y: enemy.y, col: enemy.lane ?? 0 });
    }
  } else if (def.key === 'colossus') {
    stats.bossKilled = true;
    pushEvent(state, { type: 'bossdown', x: enemy.x, y: enemy.y });
    blastAt(state, enemy.x, enemy.y, 'mega', def.megaKegRadius, def.megaKegDamage, enemy);
  }
}

export function damageEnemy(state, enemy, amount, source) {
  if (!state || !enemy || enemy.hp <= 0) return;
  const def = enemyDef(enemy);
  const sourceName = typeof source === 'string' ? source : (source && source.source) || 'blast';
  let dmg = Number.isFinite(amount) ? amount : 0;

  if (def.armor && (sourceName === 'blast' || sourceName === 'burn')) dmg *= 1 - def.armor;
  const mods = state.mods || {};
  if (def.key === 'colossus' && sourceName === 'blast' && mods.bossBane) dmg *= 1.5;
  dmg = Math.round(dmg * 10) / 10;

  enemy.hp -= dmg;
  enemy.hitFlash = 4;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    killEnemy(state, enemy);
    if (Array.isArray(state.deadEnemies) && !state.deadEnemies.includes(enemy)) state.deadEnemies.push(enemy);
  }
}

// Called once the blast that dealt the damage is done: corpses leave the array so later enemies in
// the same loop are untouched, and spawns from death side effects survive until the next blast.
export function sweepDead(state) {
  if (!state || !Array.isArray(state.deadEnemies)) return 0;
  const dead = state.deadEnemies;
  state.deadEnemies = [];
  let removed = 0;
  for (const enemy of dead) {
    if (!enemy || enemy.hp > 0) continue;
    removeEnemy(state, enemy);
    removed += 1;
  }
  return removed;
}

export function strikeAt(state, x, y) {
  if ((state.strikeCooldown || 0) > 0) return false;
  if (!detonateFn) return false;
  const mods = state.mods || {};
  detonateFn(state, {
    x,
    y,
    kind: 'strike',
    radiusCells: STRIKE_RADIUS,
    damage: STRIKE_DAMAGE * (Number.isFinite(mods.strikeDamageMul) ? mods.strikeDamageMul : 1),
  });
  state.strikeCooldown = Math.round(
    STRIKE_COOLDOWN_TICKS * (Number.isFinite(mods.strikeCooldownMul) ? mods.strikeCooldownMul : 1),
  );
  return true;
}

export function stepCombat(state) {
  if (state && state.strikeCooldown > 0) state.strikeCooldown -= 1;
}
