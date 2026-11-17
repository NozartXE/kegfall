// Turns sim events into banners and a rolling three-line log. Pure string work: no DOM, no state kept here.

import { FEATS } from './config.js';
import { BARRAGES } from './waves.js';

const FEAT_NAMES = new Map(FEATS.map((def) => [def.id, def.name]));
const BANNER_TICKS = 150;
const MAX_LOG = 3;
const CHAIN_BANNER_MIN = 8;

const pad = (n) => String(n).padStart(2, '0');

function wordsFor(event, state) {
  switch (event.type) {
    case 'detonate': {
      const chain = Number(event.chain) || 0;
      if (chain >= CHAIN_BANNER_MIN) {
        return { banner: { title: `CHAIN x${chain}`, sub: 'the quay roars', ticks: BANNER_TICKS } };
      }
      return {};
    }
    case 'barrage': {
      const index = Number.isInteger(event.barrage) ? event.barrage : ((state && state.barrage) || 0);
      const name = event.name || BARRAGES[index]?.name || 'BARRAGE';
      return { banner: { title: `BARRAGE ${pad(index + 1)}`, sub: name, ticks: BANNER_TICKS } };
    }
    case 'breach': {
      return { log: [`A ${event.kind} cracked the Vault (-${Number(event.damage) || 0})`] };
    }
    case 'bossdown':
      return { banner: { title: 'THE COLOSSUS FALLS', sub: 'its mega keg lights the sky', ticks: BANNER_TICKS } };
    case 'feat': {
      const name = FEAT_NAMES.get(event.id) || event.name || String(event.id || 'UNKNOWN');
      return { log: [`FEAT: ${name}`] };
    }
    case 'draft':
      return { banner: { title: 'THE SHIFT TURNS', sub: 'pick one firework charm', ticks: BANNER_TICKS } };
    case 'won':
      return { banner: { title: 'THE VAULT HOLDS', sub: 'the last powderworks burns bright', ticks: BANNER_TICKS } };
    case 'gameover':
      return { log: ['The Vault is cracked.'] };
    case 'salvage':
      return { log: [`SALVAGE +${Number(event.amount) || 0} SPARK`] };
    default:
      return {};
  }
}

export function drainEvents(state) {
  const lines = [];
  let banner = null;
  const events = state && Array.isArray(state.events) ? state.events : [];
  for (const event of events) {
    if (!event || typeof event.type !== 'string') continue;
    const words = wordsFor(event, state);
    if (words.banner && !banner) banner = { ...words.banner };
    if (words.log) for (const line of words.log) lines.push(line);
  }
  if (state && Array.isArray(state.events)) state.events.length = 0;
  return { banner, logLines: lines.slice(-MAX_LOG) };
}
