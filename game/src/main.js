// Boots KEGFALL: builds the app, stages the testhook, wires menus/input/audio and runs the fixed-step rAF loop that draws each mode.

import { createRun, stepRun } from './sim.js';
import { drainEvents } from './announce.js';
import { drawWorld, applyShake } from './render/scene.js';
import { drawHud } from './render/hud.js';
import { drawBanner } from './render/banner.js';
import { drawDraft } from './render/charms.js';
import { drawResults } from './render/results.js';
import { spawnDetonationFx } from './render/fx.js';
import { buildMenus } from './ui/menus.js';
import { buildDemo } from './titledemo.js';
import { attachInput } from './input.js';
import { initAudio, sfx, startMusic, setGains } from './audio.js';
import { loadSave, storeSave, recordRun } from './save.js';
import { installTesthook } from './testhook.js';

const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;
const FAST_STEPS = 3;
const RESULTS_DELAY_TICKS = 90;
const MAX_LOG_LINES = 12;
const MAX_DETONATE_FX = 12;
const MAX_EVENTS_PER_TICK = 6;
const MAX_PARTICLES = 380;
const MAX_RINGS = 40;
const MAX_SCORCHES = 40;
const BANNER_TICKS = 150;
const CHAIN_FLASH_TICKS = 46;
const SAVE_THROTTLE_MS = 400;

const SHAKE_GAIN = 0.16;
const SHAKE_DECAY = 0.9;
const SHAKE_PACKS = Object.freeze([
  [2.5, 0.9],
  [4.0, 1.2],
  [5.5, 1.6],
  [7.5, 2.2],
  [9.5, 2.8],
  [11.5, 3.4],
  [14.0, 4.2],
  [17.0, 5.0],
  [20.0, 6.0],
]);

const app = {
  canvas: null,
  ctx: null,
  save: null,
  settings: null,
  mode: 'title',
  state: null,
  demo: null,
  view: null,
  staged: false,
  difficulty: 'blaze',
  persistTimer: null,
};

let menus = null;
let lastMode = null;
let audioReady = false;
let lastSaveAt = 0;

function makeView(history) {
  return {
    tick: 0,
    tool: 'powder',
    fast: false,
    muted: false,
    paused: false,
    shakeX: 0,
    shakeY: 0,
    shakeMag: 0,
    shakeSetting: 0.7,
    scorches: [],
    particles: [],
    rings: [],
    fxParticles: [],
    fxPuffs: [],
    fxRings: [],
    banner: null,
    chainFlash: null,
    hover: null,
    history: history || [],
    best: 0,
    won: false,
    endedTick: 0,
  };
}

function persist(save) {
  if (save && typeof save === 'object') app.save = save;
  if (app.save && app.settings && typeof app.settings === 'object') app.save.settings = app.settings;
  if (!app.save) return false;
  try {
    return storeSave(app.save);
  } catch {
    return false;
  }
}

function persistSoon() {
  if (persistTimer) return;
  const write = () => {
    persistTimer = null;
    persist();
  };
  if (typeof setTimeout === 'function') persistTimer = setTimeout(write, SAVE_THROTTLE_MS);
  else write();
}

function unlockAudio() {
  if (audioReady) return;
  try {
    audioReady = Boolean(initAudio(app.settings));
  } catch {
    audioReady = false;
  }
  if (audioReady) startMusic(app.mode === 'play' || app.mode === 'draft' ? 'play' : 'title', app.state ? app.state.seed : 7);
}

function playSfx(name, extra) {
  if (!audioReady || app.view.muted) return;
  try {
    sfx(name, extra);
  } catch {
    /* a failing voice must never break the frame */
  }
}

function onGains(settings) {
  app.settings = settings || app.settings;
  if (app.save) app.save.settings = app.settings;
  if (!audioReady) return;
  try {
    setGains(app.settings);
  } catch {
    /* audio is optional */
  }
}

function syncHistory() {
  if (!app.view || !app.save) return;
  app.view.history = Array.isArray(app.save.history) ? app.save.history : [];
  app.view.best = Math.max(0, Math.round(Number(app.save.best) || 0));
}

function showPanel(id) {
  if (menus && typeof menus.showPanel === 'function') menus.showPanel(id);
}

function hideOverlays() {
  if (menus && typeof menus.hideOverlays === 'function') menus.hideOverlays();
}

function showTitle() {
  app.mode = 'title';
  app.state = null;
  app.upgradeMode = false;
  if (app.view) {
    app.view.paused = false;
    app.view.fast = false;
    app.view.banner = null;
    app.view.chainFlash = null;
    app.view.hover = null;
  }
  if (app.demo) app.demo.restart();
  syncHistory();
  if (audioReady) startMusic('title', 7);
  if (menus) menus.showTitle();
}

function startRun(diffKey) {
  const save = app.save || {};
  const diff = typeof diffKey === 'string' && diffKey ? diffKey : (save.lastDiff || app.difficulty || 'blaze');
  const seed = (Date.now() >>> 0) ^ 0x4b4547;
  const state = createRun(seed, diff);
  state.best = Math.max(0, Math.round(Number(save.best) || 0));
  const view = app.view || makeView();
  view.best = state.best;
  view.won = false;
  view.endedTick = 0;
  view.paused = false;
  view.fast = false;
  view.banner = null;
  view.chainFlash = null;
  view.hover = null;
  view.shakeMag = 0;
  view.scorches = [];
  view.particles = [];
  view.rings = [];
  view.fxParticles = [];
  view.fxPuffs = [];
  view.fxRings = [];
  syncHistory();
  app.view = view;
  app.state = state;
  app.mode = 'play';
  app.difficulty = state.diffKey;
  app.upgradeMode = false;
  save.lastDiff = state.diffKey;
  hideOverlays();
  persistSoon();
  unlockAudio();
  if (audioReady) startMusic('play', seed);
}

function restartRun() {
  if (app.mode === 'title') {
    hideOverlays();
    startRun(app.difficulty);
    return;
  }
  startRun(app.difficulty || (app.state && app.state.diffKey) || 'blaze');
}

function addFeats(state) {
  const save = app.save || (app.save = loadSave());
  save.feats = save.feats || {};
  for (const key of Object.keys(state.feats || {})) {
    if (state.feats[key]) save.feats[key] = true;
  }
  return save;
}

function finishRun(state) {
  const save = app.save || (app.save = loadSave());
  const stats = state.stats || {};
  const won = state.mode === 'won' || Boolean(stats.won);
  const score = Math.max(0, Math.round(Number(state.score) || 0));
  const next = recordRun(save, { score, won, diffKey: state.diffKey, seed: state.seed });
  next.feats = next.feats || {};
  for (const key of Object.keys(state.feats || {})) {
    if (state.feats[key]) next.feats[key] = true;
  }
  next.best = Math.max(0, Math.round(Number(next.best) || 0), score);
  if (won) next.afterglowUnlocked = true;
  app.save = next;
  state.best = next.best;
  persist();
  syncHistory();
  if (app.view) {
    app.view.won = won;
    app.view.best = next.best;
  }
  playSfx(won ? 'win' : 'lose');
  if (menus && typeof menus.refreshTitle === 'function') menus.refreshTitle(app);
}

function showResults() {
  app.mode = 'results';
  if (app.view) {
    app.view.paused = false;
    app.view.fast = false;
  }
  if (audioReady) startMusic('title', app.state ? app.state.seed : 7);
  hideOverlays();
}

function toast(text) {
  if (menus && typeof menus.toast === 'function') menus.toast(text);
}

function onAfterDraft() {
  if (app.view) app.view.banner = null;
  playSfx('draft');
}

function onPauseChanged(paused) {
  if (!paused) hideOverlays();
  else showPanel('pause-screen');
}

function onMuteChanged(muted) {
  if (!app.view) return;
  app.view.muted = Boolean(muted);
  if (!audioReady) return;
  try {
    setGains({ ...app.settings, music: app.view.muted ? 0 : (app.settings && app.settings.music), sfx: app.view.muted ? 0 : (app.settings && app.settings.sfx) });
  } catch {
    /* audio is optional */
  }
}

function shakeFor(chain) {
  let mag = SHAKE_PACKS[0][0];
  for (const [c, m] of SHAKE_PACKS) if (chain >= c) mag = m;
  return mag;
}

function addScorch(view, event) {
  const x = Number(event.x);
  const y = Number(event.y);
  const radiusPx = Number(event.radiusPx);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  view.scorches.push({ x, y, r: Number.isFinite(radiusPx) ? radiusPx : 60, ttl: 600, kind: event.kind || 'powder' });
  if (view.scorches.length > MAX_SCORCHES) view.scorches.splice(0, view.scorches.length - MAX_SCORCHES);
}

function consumeEvents(state, view) {
  if (!state || !view) return;
  const events = Array.isArray(state.events) ? state.events.slice(0, MAX_EVENTS_PER_TICK) : [];
  let detonations = 0;
  for (const event of events) {
    if (!event || typeof event.type !== 'string') continue;
    if (event.type === 'detonate') {
      if (detonations < MAX_DETONATE_FX) spawnDetonationFx(view, event);
      detonations += 1;
      addScorch(view, event);
      view.shakeMag = Math.max(view.shakeMag || 0, shakeFor(Number(event.chain) || 1));
      playSfx('blast', Number(event.chain) || 1);
    } else if (event.type === 'place') {
      playSfx('place');
    } else if (event.type === 'breach') {
      playSfx('breach');
    } else if (event.type === 'feat') {
      playSfx('feat');
    } else if (event.type === 'ignite') {
      playSfx('ignite');
    } else if (event.type === 'bossdown') {
      playSfx('blast', 12);
    }
  }

  const drained = drainEvents(state);
  if (drained.banner) {
    view.banner = { ...drained.banner, total: BANNER_TICKS, ticksLeft: BANNER_TICKS };
  }
  const logLines = Array.isArray(drained.logLines) ? drained.logLines : [];
  if (logLines.length > 0 && Array.isArray(state.log)) {
    state.log.push(...logLines);
    if (state.log.length > MAX_LOG_LINES) state.log.splice(0, state.log.length - MAX_LOG_LINES);
  }
  if (Array.isArray(state.events) && state.events.length > MAX_EVENTS_PER_TICK) {
    state.events.splice(0, MAX_EVENTS_PER_TICK);
  }
}

function capFx(view) {
  if (view.fxParticles && view.fxParticles.length > MAX_PARTICLES) view.fxParticles.splice(0, view.fxParticles.length - MAX_PARTICLES);
  if (view.fxRings && view.fxRings.length > MAX_RINGS) view.fxRings.splice(0, view.fxRings.length - MAX_RINGS);
  if (view.scorches && view.scorches.length > MAX_SCORCHES) view.scorches.splice(0, view.scorches.length - MAX_SCORCHES);
}

function stepShake(view) {
  const mag = Number(view.shakeMag) || 0;
  const scale = Number.isFinite(view.shakeSetting) ? view.shakeSetting : 1;
  if (mag <= 0.05) {
    view.shakeMag = 0;
    view.shakeX = 0;
    view.shakeY = 0;
    return;
  }
  const t = view.tick || 0;
  view.shakeX = Math.sin(t * 1.9) * mag * SHAKE_GAIN * scale;
  view.shakeY = Math.cos(t * 2.7 + 0.6) * mag * SHAKE_GAIN * scale * 0.8;
  view.shakeMag = mag * SHAKE_DECAY;
}

function countdownFlash(view) {
  if (view.chainFlash && Number(view.chainFlash.ticksLeft) > 0) {
    view.chainFlash = { ...view.chainFlash, ticksLeft: Number(view.chainFlash.ticksLeft) - 1 };
    if (view.chainFlash.ticksLeft <= 0) view.chainFlash = null;
  }
}

function countdownBanner(view) {
  if (!view.banner) return;
  const left = Number(view.banner.ticksLeft) - 1;
  view.banner = left > 0 ? { ...view.banner, ticksLeft: left } : null;
}

function peekChain(state) {
  if (!state || !Array.isArray(state.events)) return 0;
  let chain = 0;
  for (const event of state.events) {
    if (event && event.type === 'detonate') chain = Math.max(chain, Number(event.chain) || 0);
  }
  return chain;
}

function flashChain(view, state) {
  const chain = peekChain(state);
  if (chain >= 6) view.chainFlash = { chain, total: CHAIN_FLASH_TICKS, ticksLeft: CHAIN_FLASH_TICKS };
}

function stepPlay(ticks) {
  const state = app.state;
  if (!state) return;
  const view = app.view;
  for (let i = 0; i < ticks; i += 1) {
    flashChain(view, state);
    stepRun(state);
    consumeEvents(state, view);
    view.tick += 1;
    view.shakeSetting = Math.max(0, Math.min(1, Number(app.settings && app.settings.shake) || 0));
    stepShake(view);
    countdownBanner(view);
    countdownFlash(view);
    capFx(view);
    if (state.mode === 'won' || state.mode === 'lost') {
      const wasOver = app.view.endedTick > 0;
      if (!wasOver) {
        app.view.endedTick = view.tick;
        finishRun(state);
        hideOverlays();
      }
      if (view.tick - app.view.endedTick >= RESULTS_DELAY_TICKS) {
        showResults();
        return;
      }
    }
    if (state.mode === 'draft' && app.mode === 'play') {
      app.mode = 'draft';
      return;
    }
  }
}

function stepDraft() {
  const state = app.state;
  if (!state) return;
  if (state.mode !== 'draft') {
    app.mode = 'play';
    return;
  }
  stepRun(state);
  const view = app.view;
  view.tick += 1;
  stepShake(view);
  countdownBanner(view);
  countdownFlash(view);
  capFx(view);
  if (state.mode === 'play') app.mode = 'play';
}

function stepResults() {
  const state = app.state;
  const view = app.view;
  stepRun(state);
  consumeEvents(state, view);
  view.tick += 1;
  stepShake(view);
  countdownBanner(view);
  countdownFlash(view);
  capFx(view);
}

function stepTitle() {
  if (!app.demo) return;
  const state = app.demo.step();
  if (!state) return;
  const view = app.view;
  consumeEvents(state, view);
  view.tick += 1;
  stepShake(view);
  countdownBanner(view);
  countdownFlash(view);
  capFx(view);
}

function advance() {
  if (app.mode === 'title') {
    stepTitle();
    return;
  }
  if (app.mode === 'results') {
    stepResults();
    return;
  }
  if (app.mode === 'draft') {
    stepDraft();
    return;
  }
  if (app.mode === 'play') {
    if (app.view && app.view.paused) return;
    stepPlay(app.view && app.view.fast ? FAST_STEPS : 1);
  }
}

function renderWorld(ctx, state, view) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawWorld(ctx, state, view);
  ctx.restore();
}

function render() {
  const ctx = app.ctx;
  if (!ctx) return;

  if (app.mode === 'title') {
    const demo = app.demo && app.demo.state;
    if (demo) renderWorld(ctx, demo, app.view);
    return;
  }

  const state = app.state;
  if (!state) return;

  if (app.mode === 'play') {
    renderWorld(ctx, state, app.view);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHud(ctx, state, app.view);
    drawBanner(ctx, state, app.view);
    ctx.restore();
    return;
  }

  if (app.mode === 'draft') {
    renderWorld(ctx, state, app.view);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applyShake(ctx, app.view);
    drawDraft(ctx, state, app.view);
    ctx.restore();
    return;
  }

  if (app.mode === 'results') {
    renderWorld(ctx, state, app.view);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawResults(ctx, state, { ...app.view, best: app.view.best || (app.save && app.save.best) || 0, history: app.view.history });
    ctx.restore();
  }
}

function syncMode() {
  if (app.mode === lastMode) return;
  lastMode = app.mode;
  const playish = app.mode === 'play' || app.mode === 'draft';
  if (app.mode === 'title') {
    if (menus && typeof menus.showTitle === 'function') menus.showTitle();
    if (audioReady && !(app.staged && app.test)) startMusic('title', 7);
  } else if (app.mode === 'results') {
    hideOverlays();
    if (audioReady) startMusic('title', app.state ? app.state.seed : 7);
  } else if (playish) {
    hideOverlays();
    if (audioReady) startMusic('play', app.state ? app.state.seed : 11);
  }
}

function onGesture() {
  unlockAudio();
}

function boot() {
  app.canvas = document.getElementById('board');
  app.ctx = app.canvas && app.canvas.getContext ? app.canvas.getContext('2d') : null;
  app.save = loadSave();
  app.settings = app.save.settings || { music: 0.8, sfx: 0.9, shake: 0.7 };
  app.view = makeView(app.save.history);
  app.view.best = app.save.best;
  app.view.shakeSetting = Number(app.settings.shake) || 0;
  app.difficulty = app.save.lastDiff || 'blaze';
  app.demo = buildDemo(7);

  app.persist = persist;
  app.onSfx = (name, arg) => playSfx(name, arg);
  app.onToast = toast;
  app.onGains = onGains;
  app.onStart = startRun;
  app.onRestart = restartRun;
  app.onTitle = showTitle;
  app.onResume = () => {
    if (app.view) app.view.paused = false;
    hideOverlays();
  };
  app.onPauseToggle = () => {
    if (app.mode !== 'play' || !app.view) return;
    app.view.paused = !app.view.paused;
    onPauseChanged(app.view.paused);
  };
  app.onPauseChanged = onPauseChanged;
  app.onMuteChanged = onMuteChanged;
  app.onAfterDraft = onAfterDraft;
  app.onGesture = onGesture;
  app.onCloseOverlay = () => {
    hideOverlays();
    if (app.mode === 'paused') {
      app.mode = app.modeBeforePause || 'play';
      if (app.view) app.view.paused = app.view.paused && app.mode === 'play';
    }
  };

  installTesthook(app);

  if (app.staged) {
    app.difficulty = (app.state && app.state.diffKey) || app.difficulty;
    syncHistory();
    if (app.mode !== 'title') hideOverlays();
    else if (menus) menus.showTitle();
    lastMode = app.mode;
  }

  menus = buildMenus(app);
  if (app.mode === 'title') menus.showTitle();
  else hideOverlays();

  attachInput(app.canvas, app);

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pointerdown', onGesture, { once: false });
    window.addEventListener('keydown', onGesture, { once: false });
  }

  const start = { last: 0, acc: 0 };
  const frame = (now) => {
    const t = Number.isFinite(now) ? now : 0;
    if (start.last === 0) start.last = t - STEP_MS;
    const dt = Math.min(MAX_FRAME_MS, Math.max(0, t - start.last));
    start.last = t;
    start.acc += dt;

    let guard = 0;
    while (start.acc >= STEP_MS && guard < 12) {
      start.acc -= STEP_MS;
      guard += 1;
      advance();
    }
    if (guard >= 12) start.acc = 0;

    syncMode();
    render();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}

export { app };
