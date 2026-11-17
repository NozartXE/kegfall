// Seeded random helper (mulberry32) whose whole state is a plain object, so runs copy, replay and hash cleanly.

function seedFrom(value) {
  if (value === undefined || value === null) return (Date.now() ^ 0x9e3779b9) >>> 0;
  if (typeof value === 'number' && Number.isFinite(value)) return (value >>> 0);
  const text = String(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const stableStringify = (value) => {
  const seen = new WeakSet();
  const walk = (item) => {
    if (item === null || typeof item !== 'object') {
      if (typeof item === 'number' && !Number.isFinite(item)) return 'null';
      if (typeof item === 'bigint') return JSON.stringify(item.toString());
      return JSON.stringify(item) ?? 'null';
    }
    if (seen.has(item)) throw new TypeError('hashState: circular value');
    seen.add(item);
    let out;
    if (Array.isArray(item)) out = `[${item.map(walk).join(',')}]`;
    else {
      const keys = Object.keys(item).filter((key) => item[key] !== undefined).sort();
      out = `{${keys.map((key) => `${JSON.stringify(key)}:${walk(item[key])}`).join(',')}}`;
    }
    seen.delete(item);
    return out;
  };
  return walk(value);
};

export const hashState = (value) => {
  const text = typeof value === 'string' ? value : stableStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

export function makeRng(seed) {
  const state = { s: seedFrom(seed), calls: 0, seed: seedFrom(seed) };

  const next = () => {
    state.calls += 1;
    state.s = (state.s + 0x6d2b79f5) >>> 0;
    let t = state.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min, max) => {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    if (hi < lo) return lo;
    return lo + Math.floor(next() * (hi - lo + 1));
  };

  const range = (min, max) => min + next() * (max - min);

  const pick = (list) => {
    if (!list || list.length === 0) return undefined;
    return list[int(0, list.length - 1)];
  };

  const chance = (p) => next() < p;

  return Object.freeze({
    state,
    next,
    int,
    range,
    pick,
    chance,
    get calls() {
      return state.calls;
    },
  });
}
