// Runs the fuse and chain engine: ignition, proximity mines, chained detonations, fields and the CHAIN window.

import {
  CELL,
  KEGS,
  CHAIN_WINDOW_TICKS,
  CHAIN_ARM_TICKS,
  FUSE_TICKS,
  TICKS_PER_SECOND,
  BLAST_LEVEL_MUL,
} from './config.js';
import { damageEnemy } from './combat.js';

const DEFS = new Map(KEGS.map((def) => [def.key, def]));
const defFor = (keg) => keg.def || DEFS.get(keg.kind) || DEFS.get('powder');
const modsFor = (state) => state.mods || {};

const pushEvent = (state, event) => {
  if (Array.isArray(state.events)) state.events.push(event);
};

const fuseFor = (state, def) => {
  const mul = Number.isFinite(modsFor(state).fuseMul) ? modsFor(state).fuseMul : 1;
  return Math.max(1, Math.round((def.armFuse || FUSE_TICKS) * mul));
};

export const blastRadiusCells = (state, def, level) => {
  const levelMul = BLAST_LEVEL_MUL[Math.max(0, Math.min(BLAST_LEVEL_MUL.length - 1, (level || 1) - 1))];
  const modMul = Number.isFinite(modsFor(state).radiusMul) ? modsFor(state).radiusMul : 1;
  return def.radius * levelMul * modMul;
};

function removeKeg(state, keg) {
  const list = state.kegs;
  if (!Array.isArray(list)) return;
  const i = list.indexOf(keg);
  if (i >= 0) list.splice(i, 1);
}

export function igniteKeg(state, keg) {
  if (!state || !keg || !(keg.fuse < 0)) return false;
  keg.fuse = fuseFor(state, defFor(keg));
  pushEvent(state, { type: 'ignite', x: keg.x, y: keg.y, kind: keg.kind });
  return true;
}

export function armKeg(state, keg) {
  if (!state || !keg) return false;
  if (keg.fuse < 0 || keg.fuse > CHAIN_ARM_TICKS) {
    keg.fuse = CHAIN_ARM_TICKS;
    return true;
  }
  return false;
}

export function registerChain(state) {
  const mods = modsFor(state);
  const windowMul = Number.isFinite(mods.chainWindowMul) ? mods.chainWindowMul : 1;
  state.chain = state.chainTimer > 0 ? (state.chain || 0) + 1 : 1;
  state.chainTimer = Math.max(1, Math.round(CHAIN_WINDOW_TICKS * windowMul));
  state.bestChain = Math.max(state.bestChain || 0, state.chain);
  return state.chain;
}

function addField(state, field) {
  if (!Array.isArray(state.fields)) state.fields = [];
  state.fields.push(field);
}

export function detonate(state, src) {
  if (!state || !src) return 0;
  const x = src.x;
  const y = src.y;
  const radiusPx = (Number.isFinite(src.radiusCells) ? src.radiusCells : 0) * CELL;
  const damage = Number.isFinite(src.damage) ? src.damage : 0;
  const chain = registerChain(state);

  const stats = state.stats || (state.stats = {});
  stats.detonations = (stats.detonations || 0) + 1;
  pushEvent(state, { type: 'detonate', x, y, radiusPx, chain, kind: src.kind });

  let hits = 0;
  if (Array.isArray(state.enemies)) {
    for (const enemy of state.enemies) {
      if (!enemy || enemy.hp <= 0) continue;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist > radiusPx) continue;
      const falloff = dist <= radiusPx * 0.6 ? 1 : 0.5;
      damageEnemy(state, enemy, damage * falloff, 'blast');
      hits += 1;
    }
  }

  if (Array.isArray(state.kegs)) {
    for (const keg of state.kegs.slice()) {
      if (keg === src || keg.fuse === 0) continue;
      if (Math.hypot(keg.x - x, keg.y - y) <= radiusPx) armKeg(state, keg);
    }
  }

  const def = DEFS.get(src.kind);
  if (def && (def.key === 'oil' || def.key === 'frost')) {
    const fieldKind = def.key === 'oil' ? 'burn' : 'frost';
    const ticks = fieldKind === 'burn' ? def.burnTicks : def.slowTicks;
    if (ticks > 0) addField(state, { kind: fieldKind, x, y, radiusPx, ticksLeft: ticks });
  }

  return hits;
}

export function stepFuses(state) {
  if (!state || !Array.isArray(state.kegs)) return;
  checkProximity(state);
  const due = tickArmedFuses(state);
  for (const keg of due) fireKeg(state, keg);
}

function checkProximity(state) {
  const kegs = state.kegs;
  for (const keg of kegs) {
    if (!keg) continue;
    if (!(keg.fuse < 0)) continue;
    const def = defFor(keg);
    const proximity = def.proximity;
    if (!(proximity > 0) || !Array.isArray(state.enemies)) continue;
    const reach = proximity * CELL;
    for (const enemy of state.enemies) {
      if (!enemy || enemy.hp <= 0) continue;
      if (Math.hypot(enemy.x - keg.x, enemy.y - keg.y) <= reach) {
        igniteKeg(state, keg);
        break;
      }
    }
  }
}

function tickArmedFuses(state) {
  const due = [];
  for (const keg of state.kegs) {
    if (!keg || !(keg.fuse > 0)) continue;
    keg.fuse -= 1;
    if (keg.fuse <= 0) {
      keg.fuse = 0;
      due.push(keg);
    }
  }
  return due;
}

function fireKeg(state, keg) {
  const def = defFor(keg);
  const level = keg.level || 1;
  const levelMul = BLAST_LEVEL_MUL[Math.max(0, Math.min(BLAST_LEVEL_MUL.length - 1, level - 1))];
  const src = {
    x: keg.x,
    y: keg.y,
    kind: keg.kind,
    radiusCells: blastRadiusCells(state, def, level),
    damage: def.damage * levelMul,
    level,
  };
  removeKeg(state, keg);
  detonate(state, src);
}

export function stepChain(state) {
  if (!state || !(state.chainTimer > 0)) return;
  state.chainTimer -= 1;
  if (state.chainTimer <= 0) {
    state.chainTimer = 0;
    state.chain = 0;
  }
}

function burnDpsOf(state) {
  const oil = DEFS.get('oil');
  return oil && Number.isFinite(oil.burnDps) ? oil.burnDps : 6;
}

export function stepFields(state) {
  if (!state || !Array.isArray(state.fields)) return;
  const perTick = burnDpsOf(state) / TICKS_PER_SECOND;
  const frostBurns = Boolean(modsFor(state).frostBurns);
  const keep = [];
  for (const field of state.fields) {
    if (!field || !(field.ticksLeft > 0)) continue;
    const burns = field.kind === 'burn' || (field.kind === 'frost' && frostBurns);
    if (burns && Array.isArray(state.enemies)) {
      for (const enemy of state.enemies) {
        if (!enemy || enemy.hp <= 0) continue;
        if (Math.hypot(enemy.x - field.x, enemy.y - field.y) <= field.radiusPx) {
          damageEnemy(state, enemy, perTick, 'burn');
        }
      }
    }
    field.ticksLeft -= 1;
    if (field.ticksLeft > 0) keep.push(field);
  }
  state.fields = keep;
}

export function stepBlasts(state) {
  stepFuses(state);
  stepFields(state);
  stepChain(state);
}

export { fuseFor };
