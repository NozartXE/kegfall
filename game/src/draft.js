// Rolls the three-charm draft, applies each charm's run modifier and charges the spark reroll.

import { CHARMS, CHARM_CHOICES, REROLL_COST } from './config.js';

const DEFS = new Map(CHARMS.map((def) => [def.key, def]));
const owned = (state) => (Array.isArray(state.charms) ? state.charms : (state.charms = []));

export function applyCharm(state, key) {
  const def = DEFS.get(key);
  if (!state || !def) return false;
  const list = owned(state);
  if (!list.includes(key)) list.push(key);
  const mods = state.mods || (state.mods = {});
  switch (key) {
    case 'wideblast':
      mods.radiusMul = 1.2;
      break;
    case 'quickfuse':
      mods.fuseMul = 0.7;
      break;
    case 'sparkcoil':
      mods.strikeCooldownMul = 0.5;
      break;
    case 'chainledger':
      mods.sparkChainBonus = true;
      break;
    case 'tightbudget':
      mods.kegCostMul = 0.8;
      break;
    case 'emberseed':
      mods.frostBurns = true;
      break;
    case 'reinforced':
      state.vault = Math.min((state.vault || 0) + 3, 13);
      state.vaultMax = 13;
      break;
    case 'keenstrike':
      mods.strikeDamageMul = 2;
      break;
    case 'longchain':
      mods.chainWindowMul = 1.5;
      break;
    case 'salvage':
      mods.salvage = true;
      break;
    case 'nightmarket':
      mods.nightDouble = true;
      break;
    case 'colossusbane':
      mods.bossBane = true;
      break;
    default:
      break;
  }
  return true;
}

export function rollOffers(state) {
  if (!state) return [];
  const rng = state.rng;
  const have = owned(state);
  const fresh = CHARMS.filter((def) => !have.includes(def.key));
  const pool = fresh.slice();
  for (const def of CHARMS) if (!pool.includes(def) && !have.includes(def.key)) pool.push(def);

  const picks = [];
  while (picks.length < CHARM_CHOICES && pool.length > 0) {
    const index = rng ? rng.int(0, pool.length - 1) : 0;
    picks.push(pool.splice(index, 1)[0].key);
  }
  state.offers = picks;
  return picks;
}

// Every entry into draft must leave three offers; if stepRun finds the mode with none, roll here.
export function ensureOffers(state) {
  if (!state) return [];
  const offers = Array.isArray(state.offers) ? state.offers : (state.offers = []);
  if (offers.length !== CHARM_CHOICES) rollOffers(state);
  return state.offers;
}

export function rerollDraft(state) {
  if (!state || (state.spark || 0) < REROLL_COST) return false;
  state.spark -= REROLL_COST;
  rollOffers(state);
  return true;
}
