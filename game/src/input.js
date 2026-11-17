// Turns pointer and keyboard events into sim actions, hover data and app callbacks: every hit test in the game lives here.

import { KEGS } from './config.js';
import { cellAt, cellCenter, inField } from './grid.js';
import { placeKeg, igniteAt, strikeAtPos, upgradeKeg, chooseCharm } from './sim.js';
import { rerollDraft } from './draft.js';
import { draftCardRects } from './render/charms.js';
import { resultsButtons } from './render/results.js';
import { hudButtons, buildBarCards } from './render/hud.js';
import { pointIn } from './render/layout.js';

const KEG_KEYS = KEGS.map((def) => def.key);
const VAULT_ROW = 6;
const VAULT_COLS = Object.freeze([5, 6]);

const safe = (fn, ...args) => {
  if (typeof fn !== 'function') return undefined;
  try {
    return fn(...args);
  } catch (error) {
    if (typeof console !== 'undefined') console.error(error);
    return undefined;
  }
};

const appMode = (app) => (app && typeof app.mode === 'string' ? app.mode : 'title');
const v = (app) => (typeof app.view === 'function' ? app.view() : (app && app.view) || {});

function canvasPoint(canvas, event) {
  const rect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
  const width = rect && rect.width > 0 ? rect.width : 1280;
  const height = rect && rect.height > 0 ? rect.height : 800;
  return {
    x: ((event.clientX - (rect ? rect.left : 0)) * 1280) / width,
    y: ((event.clientY - (rect ? rect.top : 0)) * 800) / height,
  };
}

function kegAtCell(state, col, row) {
  if (!state || !Array.isArray(state.kegs)) return null;
  return state.kegs.find((keg) => keg.col === col && keg.row === row) || null;
}

function openOverlay() {
  if (typeof document === 'undefined' || !document.querySelector) return null;
  const panel = document.querySelector('#howto-screen:not(.hidden), #options-screen:not(.hidden), #almanac-screen:not(.hidden)');
  return panel ? panel.id : null;
}

function cellHoverData(state, cell) {
  if (!cell) return null;
  const keg = kegAtCell(state, cell.col, cell.row);
  const center = cellCenter(cell.col, cell.row);
  const vaultMouth = cell.row === VAULT_ROW && VAULT_COLS.includes(cell.col);
  return { col: cell.col, row: cell.row, x: center.x, y: center.y, keg, vaultMouth };
}

function pointHit(cursor) {
  return cursor && Number.isFinite(cursor.x) && Number.isFinite(cursor.y) ? { x: cursor.x, y: cursor.y } : null;
}

function igniteNearest(app) {
  const state = app.state;
  const point = pointHit(app.cursor);
  if (!point || !state) return;
  const armed = (state.kegs || []).filter((keg) => keg && keg.fuse < 0);
  if (armed.length === 0) {
    safe(v(app).onToast, 'NO KEG TO LIGHT');
    return;
  }
  let best = armed[0];
  let bestDist = Infinity;
  for (const keg of armed) {
    const dist = Math.hypot(keg.x - point.x, keg.y - point.y);
    if (dist < bestDist) {
      best = keg;
      bestDist = dist;
    }
  }
  if (igniteAt(state, best.x, best.y)) safe(v(app).onSfx, 'ignite');
}

function togglePause(app) {
  if (app.mode !== 'play') return;
  app.view.paused = !app.view.paused;
  safe(v(app).onSfx, 'click');
  safe(v(app).onPauseChanged, app.view.paused);
}

function toggleFast(app) {
  if (app.mode !== 'play') return;
  app.view.fast = !app.view.fast;
  safe(v(app).onSfx, 'click');
}

function toggleMute(app) {
  app.view.muted = !app.view.muted;
  safe(v(app).onMuteChanged, app.view.muted);
  safe(v(app).onSfx, 'click');
}

export function attachInput(canvas, app) {
  if (!canvas || !app || typeof canvas.addEventListener !== 'function') return () => {};
  const view = () => v(app);

  const stateFor = () => (appMode(app) === 'play' ? app.state : null);

  const updateHover = (point) => {
    const cell = stateFor() ? cellAt(point.x, point.y) : null;
    app.cursor = { x: point.x, y: point.y };
    app.hover = appMode(app) === 'play' ? cellHoverData(stateFor(), cell) : null;
  };

  const onMove = (event) => {
    const point = canvasPoint(canvas, event);
    updateHover(point);
    if (appMode(app) === 'title' && app.demo && app.demo.state) {
      const cell = cellAt(point.x, point.y);
      app.demoHover = cell ? { col: cell.col, row: cell.row } : null;
    }
  };

  const actAtCell = (cell) => {
    const state = app.state;
    if (!state) return;
    const existing = kegAtCell(state, cell.col, cell.row);
    if (isUpgradeMode(app)) {
      if (existing) {
        if (upgradeKeg(state, existing)) safe(view().onSfx, 'place');
        else safe(view().onToast, `NEED ${existing.level >= 3 ? 'MAX LEVEL' : 'MORE SPARK'}`);
      } else safe(view().onToast, 'NO KEG HERE TO UPGRADE');
      setUpgradeMode(app, false);
      return;
    }
    if (existing) {
      if (existing.fuse < 0 && igniteAt(state, existing.x, existing.y)) safe(view().onSfx, 'ignite');
      return;
    }
    if (state.mode !== 'play') return;
    if (cell.row === VAULT_ROW && VAULT_COLS.includes(cell.col)) {
      safe(view().onToast, 'THE VAULT MOUTH IS SEALED');
      return;
    }
    if (placeKeg(state, app.selected || KEG_KEYS[0], cell.col, cell.row)) safe(view().onSfx, 'place');
    else safe(view().onToast, 'NOT ENOUGH SPARK');
  };

  const onDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const point = canvasPoint(canvas, event);
    if (typeof view().onGesture === 'function') safe(view().onGesture);
    updateHover(point);

    const mode = appMode(app);
    const ui = openOverlay();
    if (ui) return;

    if (mode === 'title') {
      const demo = app.demo;
      if (demo && demo.state) {
        const cell = cellAt(point.x, point.y);
        if (cell) {
          const keg = kegAtCell(demo.state, cell.col, cell.row);
          if (keg) safe(demo.ignite, keg);
          else safe(demo.placeAt, cell.col, cell.row);
        }
      }
      return;
    }

    if (mode === 'play') {
      for (const button of hudButtons()) {
        if (!pointIn(button, point.x, point.y)) continue;
        if (button.id === 'pause') togglePause(app);
        else if (button.id === 'fast') toggleFast(app);
        else if (button.id === 'mute') toggleMute(app);
        return;
      }
      const card = buildBarCards().findIndex((rect) => pointIn(rect, point.x, point.y));
      if (card >= 0) {
        app.selected = KEG_KEYS[card];
        app.upgradeMode = false;
        safe(view().onSfx, 'click');
        return;
      }
      const cell = cellAt(point.x, point.y);
      if (cell) {
        actAtCell(cell);
        return;
      }
      if (inField(point.x, point.y)) return;
      safe(view().onSfx, 'click');
      return;
    }

    if (mode === 'draft') {
      const rects = draftCardRects();
      for (const cardRect of rects.cards) {
        if (!pointIn(cardRect, point.x, point.y)) continue;
        if (app.state && chooseCharm(app.state, cardRect.index)) {
          safe(view().onSfx, 'click');
          safe(view().onAfterDraft);
        }
        return;
      }
      if (pointIn(rects.reroll, point.x, point.y)) {
        if (app.state && rerollDraft(app.state)) safe(view().onSfx, 'draft');
        else safe(view().onToast, 'REROLL NEEDS MORE SPARK');
      }
      return;
    }

    if (mode === 'results') {
      const buttons = resultsButtons();
      if (pointIn(buttons.runAgain, point.x, point.y)) safe(view().onRestart);
      else if (pointIn(buttons.title, point.x, point.y)) safe(view().onTitle);
    }
  };

  const onLeave = () => {
    app.cursor = null;
    app.hover = null;
    app.demoHover = null;
  };

  const onKey = (event) => {
    if (!event || (event.repeat && event.code !== 'KeyF')) return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
    const code = event.code || '';
    const key = String(event.key || '').toLowerCase();
    const mode = appMode(app);
    if (mode === 'title' && code === 'Space') {
      event.preventDefault();
      return;
    }
    if (typeof view().onGesture === 'function') safe(view().onGesture);

    if (code === 'Escape') {
      const ui = openOverlay();
      if (ui) {
        safe(view().onCloseOverlay);
        return;
      }
      if (mode === 'play') {
        if (app.upgradeMode) {
          setUpgradeMode(app, false);
          return;
        }
        togglePause(app);
      }
      return;
    }

    if (mode === 'title') {
      if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') {
        event.preventDefault();
        safe(view().onStart);
      }
      return;
    }

    if (mode === 'draft' || mode === 'paused') return;

    if (mode === 'results') {
      if (code === 'KeyR') safe(view().onRestart);
      else if (code === 'KeyT') safe(view().onTitle);
      return;
    }

    const num = /^Digit([1-4])$/.exec(code);
    if (num) {
      if (app.state && app.state.mode === 'draft') {
        if (chooseCharm(app.state, Number(num[1]) - 1)) {
          safe(view().onAfterDraft);
          safe(view().onSfx, 'click');
        }
        return;
      }
      app.selected = KEG_KEYS[Number(num[1]) - 1];
      app.upgradeMode = false;
      safe(view().onSfx, 'click');
      return;
    }

    if (code === 'KeyP' || key === 'p') {
      togglePause(app);
      return;
    }
    if (code === 'KeyR' || key === 'r') {
      safe(view().onRestart);
      return;
    }
    if (code === 'KeyT' || key === 't') {
      safe(view().onTitle);
      return;
    }
    if (code === 'KeyM' || key === 'm') {
      toggleMute(app);
      return;
    }
    if (code === 'KeyU' || key === 'u') {
      setUpgradeMode(app, !app.upgradeMode);
      safe(view().onSfx, 'click');
      return;
    }
    if (code === 'KeyF' || key === 'f') {
      const point = pointHit(app.cursor);
      if (!point) return;
      if (app.state && strikeAtPos(app.state, point.x, point.y)) safe(view().onSfx, 'strike');
      return;
    }
    if (code === 'KeyX' || key === 'x') {
      if (app.state && app.state.mode === 'draft' && rerollDraft(app.state)) safe(view().onSfx, 'draft');
      return;
    }
    if (code === 'Space') {
      event.preventDefault();
      igniteNearest(app);
      return;
    }
    if (key === ' ') return;
  };

  const onKeyUp = (event) => {
    if (!event || event.code !== 'Space') return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
    const ui = openOverlay();
    if (ui || appMode(app) !== 'title') return;
    safe(view().onStart);
  };

  const blur = () => onLeave();

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
  }

  return () => {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerleave', onLeave);
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', blur);
    }
  };
}

function isUpgradeMode(app) {
  return Boolean(app && app.upgradeMode);
}

function setUpgradeMode(app, on) {
  if (!app) return;
  app.upgradeMode = Boolean(on);
}
