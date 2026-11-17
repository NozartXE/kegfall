// Checks the six feat conditions after a run and reports only the newly earned ids.

import { FEATS } from './config.js';

const CLAIMS = Object.freeze({
  firstwin: (state) => Boolean(state.stats && state.stats.won),
  chain20: (state) => (state.bestChain || 0) >= 20,
  colossus: (state) => Boolean(state.stats && state.stats.bossKilled),
  nohit: (state) => Boolean(state.stats && state.stats.won && state.stats.vaultLostTotal === 0),
  inferno: (state) => Boolean(state.stats && state.stats.won && state.diffKey === 'inferno'),
  afterglow: (state) => Boolean(state.afterglowFell),
});

export function checkFeats(state) {
  if (!state) return [];
  const earned = state.feats || (state.feats = {});
  const fresh = [];
  for (const def of FEATS) {
    if (earned[def.id]) continue;
    const claim = CLAIMS[def.id];
    if (!claim || !claim(state)) continue;
    earned[def.id] = true;
    fresh.push(def.id);
    if (Array.isArray(state.events)) state.events.push({ type: 'feat', id: def.id });
  }
  return fresh;
}
