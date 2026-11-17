// Reads and writes the single localStorage save (best, last 3 runs, feats, settings), silently falling back in Node.

export const SAVE_KEY = 'kegfall-save-v1';
export const MAX_HISTORY = 3;

export const DEFAULT_SETTINGS = Object.freeze({ music: 0.8, sfx: 0.9, shake: 0.7 });

export const GRADE_THRESHOLDS = Object.freeze([100000, 65000, 35000, 15000]);

export const GRADE_LINES = Object.freeze({
  S: 'A perfect storm of powder. Ember Quay will sing of this chain.',
  A: 'The Sootkin broke on your kegs like kindling.',
  B: 'A solid burn: the Vault held and the quay still stands.',
  C: 'Scorched but standing. Tune the fuses and try again.',
  D: 'Smoke and regret. The Vault coughed its last ember.',
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const defaultSave = () => ({
  best: 0,
  history: [],
  feats: {},
  settings: { ...DEFAULT_SETTINGS },
  afterglowUnlocked: false,
});

const clampUnit = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
};

const sanitizeHistory = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === 'object' && Number.isFinite(Number(entry.score)))
    .slice(0, MAX_HISTORY)
    .map((entry) => ({
      score: Math.max(0, Math.round(Number(entry.score))),
      grade: typeof entry.grade === 'string' && /^[SABCD]$/.test(entry.grade) ? entry.grade : gradeFor(Number(entry.score)),
      won: Boolean(entry.won),
      diffKey: typeof entry.diffKey === 'string' && entry.diffKey ? entry.diffKey : 'blaze',
      seed: typeof entry.seed === 'string' || Number.isFinite(Number(entry.seed)) ? entry.seed : 0,
    }));
};

const sanitizeFeats = (raw) => {
  const out = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (key && value) out[key] = value;
    }
  }
  return out;
};

const sanitizeSettings = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    music: clampUnit(source.music, DEFAULT_SETTINGS.music),
    sfx: clampUnit(source.sfx, DEFAULT_SETTINGS.sfx),
    shake: clampUnit(source.shake, DEFAULT_SETTINGS.shake),
  };
};

export function normalizeSave(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultSave();
  const history = sanitizeHistory(raw.history);
  const bestValue = Number(raw.best);
  const historyBest = history.reduce((top, entry) => Math.max(top, entry.score), 0);
  return {
    best: Math.max(0, Math.round(Number.isFinite(bestValue) ? bestValue : 0), historyBest),
    history,
    feats: sanitizeFeats(raw.feats),
    settings: sanitizeSettings(raw.settings),
    afterglowUnlocked: Boolean(raw.afterglowUnlocked),
  };
}

const storage = () => {
  try {
    if (typeof globalThis === 'undefined' || !globalThis.localStorage) return null;
    const store = globalThis.localStorage;
    if (typeof store.getItem !== 'function' || typeof store.setItem !== 'function') return null;
    return store;
  } catch {
    return null;
  }
};

export function loadSave() {
  try {
    const store = storage();
    if (!store) return defaultSave();
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return normalizeSave(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export function storeSave(save) {
  const clean = normalizeSave(save);
  try {
    const store = storage();
    if (store) store.setItem(SAVE_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

export function gradeFor(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'D';
  const [s, a, b, c] = GRADE_THRESHOLDS;
  if (n >= s) return 'S';
  if (n >= a) return 'A';
  if (n >= b) return 'B';
  if (n >= c) return 'C';
  return 'D';
}

export function recordRun(save, run) {
  const base = normalizeSave(save);
  const score = Math.max(0, Math.round(Number(run && run.score) || 0));
  const entry = {
    score,
    grade: gradeFor(score),
    won: Boolean(run && run.won),
    diffKey: typeof run?.diffKey === 'string' && run.diffKey ? run.diffKey : 'blaze',
    seed: run?.seed ?? 0,
  };
  const history = [entry, ...base.history].slice(0, MAX_HISTORY);
  const next = {
    ...base,
    best: Math.max(base.best, score),
    history,
    afterglowUnlocked: base.afterglowUnlocked || entry.won,
  };
  storeSave(next);
  return clone(next);
}
