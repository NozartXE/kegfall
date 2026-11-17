// Fills KEGFALL's DOM overlays (title, how-to, options, almanac, pause) from config and the save, painting rule icons inline.

import {
  DIFFICULTIES, FEATS, KEGS, ENEMIES, CHARMS, CHAIN_WINDOW_TICKS, TICKS_PER_SECOND, FUSE_TICKS,
  BARRAGE_COUNT, VAULT_MAX, REROLL_COST, KEGS as KEG_DEFS,
} from '../config.js';
import { howtoRows, almanacRows } from '../render/howto.js';
import { RULE_ICON_IDS, drawRuleIcon } from '../render/ruleicons.js';

const secs = (ticks) => `${Math.round((ticks / TICKS_PER_SECOND) * 10) / 10}s`;

const SCOPE = Object.freeze([
  `${KEGS.length} KEG KINDS`,
  `${ENEMIES.length - 2} SOOTKIN + THE COLOSSUS`,
  `${BARRAGE_COUNT} BARRAGES`,
  `${CHARMS.length} FIREWORK CHARMS`,
  `${DIFFICULTIES.length} DIFFICULTIES`,
  'ENDLESS AFTERGLOW',
]);

const RULES = Object.freeze([
  { icon: 'place', key: 'PLACE', text: `Click a plaza cell to set one of ${KEG_DEFS.length} keg kinds.` },
  { icon: 'ignite', key: 'IGNITE', text: `Light a keg: ${secs(FUSE_TICKS)} fuse, the CHAIN does the rest.` },
  { icon: 'chain', key: 'CHAIN', text: `Blasts arm kegs; every detonation inside ${secs(CHAIN_WINDOW_TICKS)} multiplies score.` },
  { icon: 'draft', key: 'DRAFT', text: `Between barrages pick 1 of 3 firework charms (X reroll ${REROLL_COST} SPARK).` },
  { icon: 'win', key: 'WIN', text: `Hold all ${BARRAGE_COUNT} barrages and drop the Cinder Colossus.`, row: 'win-row' },
  { icon: 'lose', key: 'LOSE', text: `The Sootkin crack the Vault (${VAULT_MAX} HP). R restarts a run.`, row: 'lose-row' },
]);

const KEYCAPS = Object.freeze([
  ['1-4', 'kegs'], ['CLICK', 'place / ignite'], ['U', 'upgrade'], ['F', 'strike'],
  ['SPACE', 'ignite nearest'], ['P', 'pause'], ['T', 'title'], ['M', 'mute'], ['R', 'restart'],
]);

const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const pct = (value) => `${Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100)}%`;
const commas = (value) => Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-US');

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

function toast(text) {
  const node = typeof document !== 'undefined' && document.getElementById ? document.getElementById('start-hint') : null;
  if (!node) return;
  node.dataset.base = node.dataset.base || node.textContent || '';
  node.textContent = String(text);
  if (node._toastTimer) clearTimeout(node._toastTimer);
  node._toastTimer = setTimeout(() => {
    node.textContent = node.dataset.base || 'Press PLAY or ENTER to light the first fuse.';
  }, 1900);
}

function paintIcon(rule) {
  const canvas = make('canvas');
  canvas.width = 52;
  canvas.height = 52;
  canvas.style.width = '26px';
  canvas.style.height = '26px';
  canvas.setAttribute('aria-hidden', 'true');
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) drawRuleIcon(ctx, rule.icon, 26, 26, 34);
  } catch {
    /* canvas unavailable: the key text still carries the rule */
  }
  return canvas;
}

function buildTitleRules() {
  const table = $('title-rules');
  if (!table) return;
  clear(table);
  for (const rule of RULES) {
    const row = make('div', rule.row ? `rules-row ${rule.row}` : 'rules-row');
    const icon = make('span', 'icon');
    icon.appendChild(paintIcon(rule));
    row.appendChild(icon);
    row.appendChild(make('span', 'rule-key', rule.key));
    row.appendChild(make('span', 'rule-text', rule.text));
    table.appendChild(row);
  }
}

function buildScope() {
  const p = $('rule-scope');
  if (!p) return;
  clear(p);
  for (const part of SCOPE) p.appendChild(make('span', undefined, part));
}

function fillDifficulties(app) {
  const picker = $('difficulty-picker');
  if (!picker) return;
  clear(picker);
  for (const diff of DIFFICULTIES) {
    const button = make('button', 'diff-button', diff.name);
    button.type = 'button';
    button.dataset.diff = diff.key;
    button.title = diff.blurb;
    button.addEventListener('click', () => {
      app.difficulty = diff.key;
      if (typeof app.onSfx === 'function') app.onSfx('click');
      refreshTitle(app);
      if (typeof app.onToast === 'function') app.onToast(`${diff.name}: ${diff.blurb}`);
    });
    picker.appendChild(button);
  }
}

function buildKeycaps() {
  const caps = $('keycaps');
  if (!caps) return;
  clear(caps);
  for (const [key, label] of KEYCAPS) {
    caps.appendChild(make('span', 'keycap', key));
    caps.appendChild(make('span', 'keycap-label', label));
  }
}

function markActiveDifficulty(app) {
  const picker = $('difficulty-picker');
  if (!picker) return;
  const active = app.difficulty || 'blaze';
  for (const button of picker.querySelectorAll('.diff-button')) {
    const on = button.dataset.diff === active;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) button.classList.add('active');
    else button.classList.remove('active');
  }
}

function refreshTitle(app) {
  const save = app.save || {};
  const best = $('title-best');
  if (best) best.textContent = `BEST ${commas(save.best)}`;
  const feats = $('feats-count');
  if (feats) {
    const earned = FEATS.filter((feat) => save.feats && save.feats[feat.id]).length;
    feats.textContent = `FEATS ${earned}/${FEATS.length}`;
  }
  const bestTitle = $('best-line');
  if (bestTitle) bestTitle.textContent = `BEST ${commas(save.best)}`;
  const afterglow = $('afterglow-line');
  if (afterglow) {
    if (save.afterglowUnlocked) {
      afterglow.textContent = 'AFTERGLOW: unlocked. Endless mode waits beyond the ninth barrage.';
      afterglow.classList.add('unlocked');
    } else {
      afterglow.textContent = 'AFTERGLOW: locked until you win a run.';
      afterglow.classList.remove('unlocked');
    }
  }
  markActiveDifficulty(app);
}

function wireHowto() {
  const body = $('howto-body');
  if (!body) return;
  clear(body);
  const grid = make('div', 'howto-grid');
  for (const row of howtoRows()) {
    const section = make('section');
    section.appendChild(make('h3', undefined, row.title));
    const p = make('p', undefined, row.text);
    section.appendChild(p);
    grid.appendChild(section);
  }
  const keys = make('section');
  keys.appendChild(make('h3', undefined, 'KEYS'));
  const list = make('ul');
  for (const [key, label] of [
    ['1-4', 'select keg kind'], ['CLICK', 'place a keg on an empty cell, ignite a placed keg'],
    ['U then CLICK', 'upgrade a keg (Lv2, Lv3)'], ['F', 'SPARK STRIKE at the cursor'],
    ['SPACE', 'ignite the nearest armed keg to the cursor'], ['P / ESC', 'pause'], ['R', 'restart'], ['T', 'title'],
  ]) list.appendChild(make('li', undefined, `${key}: ${label}`));
  keys.appendChild(list);
  grid.appendChild(keys);
  body.appendChild(grid);
}

function wireAlmanac() {
  const body = $('almanac-body');
  if (!body) return;
  clear(body);
  const data = almanacRows();
  const grid = make('div', 'almanac-grid');
  const group = (title, entries) => {
    const section = make('section', 'almanac-group');
    section.appendChild(make('h3', undefined, title));
    const list = make('ul');
    for (const entry of entries) {
      const item = make('li', 'almanac-entry');
      const swatch = make('span', 'swatch');
      if (entry.color) swatch.style.background = entry.color;
      item.appendChild(swatch);
      item.appendChild(make('strong', undefined, entry.name));
      item.appendChild(make('span', undefined, `${entry.trait} ${entry.stat || ''}`.trim()));
      if (entry.text) item.appendChild(make('span', undefined, entry.text));
      list.appendChild(item);
    }
    section.appendChild(list);
    grid.appendChild(section);
  };
  group('KEGS', data.kegs);
  group('SOOTKIN', data.enemies);
  group('FIREWORK CHARMS', data.charms.map((charm) => ({ ...charm, trait: charm.text })));
  body.appendChild(grid);
}

function wireOptions(app) {
  const sliders = [
    ['music', 'music-slider', 'music-value'],
    ['sfx', 'sfx-slider', 'sfx-value'],
    ['shake', 'shake-slider', 'shake-value'],
  ];
  for (const [key, sliderId, outId] of sliders) {
    const input = $(sliderId);
    const output = $(outId);
    if (input) {
      input.value = String(Number(app.save.settings && app.save.settings[key]) || 0);
      input.addEventListener('input', () => {
        const value = Math.max(0, Math.min(1, Number(input.value) || 0));
        app.save.settings = { ...(app.save.settings || {}), [key]: value };
        if (output) output.textContent = pct(value);
        if (key === 'shake' && app.view) app.view.shakeSetting = value;
        if (typeof app.onGains === 'function') app.onGains(app.save.settings);
        if (typeof app.persist === 'function') app.persist();
        if (key === 'sfx' && typeof app.onSfx === 'function') app.onSfx('click');
      });
    }
  }
}

function syncOptions(app) {
  const pairs = [['music', 'music-slider', 'music-value'], ['sfx', 'sfx-slider', 'sfx-value'], ['shake', 'shake-slider', 'shake-value']];
  for (const [key, sliderId, outId] of pairs) {
    const value = Math.max(0, Math.min(1, Number(app.save.settings && app.save.settings[key]) || 0));
    const input = $(sliderId);
    const output = $(outId);
    if (input) input.value = String(value);
    if (output) output.textContent = pct(value);
    if (key === 'shake' && app.view) app.view.shakeSetting = value;
  }
}

function wireBackButtons(onBack) {
  const buttons = typeof document !== 'undefined' && document.querySelectorAll ? document.querySelectorAll('[data-back]') : [];
  for (const button of buttons) {
    if (button.dataset.wired) continue;
    button.dataset.wired = '1';
    button.addEventListener('click', () => {
      onBack();
      if (typeof window !== 'undefined' && window.focus) window.focus();
    });
  }
}

function setPanelState(app, panelId) {
  app.panel = panelId || null;
  const sections = ['title-screen', 'howto-screen', 'options-screen', 'almanac-screen', 'pause-screen'];
  for (const id of sections) {
    const node = $(id);
    if (!node) continue;
    const show = app.mode === 'title' ? id === 'title-screen' || id === app.panel
      : app.mode === 'paused' ? id === 'pause-screen' : false;
    node.classList.toggle('hidden', !show);
  }
}

export function buildMenus(app) {
  const missingBest = !$('best-line');
  if (missingBest) {
    const hint = $('start-hint');
    const node = make('p', undefined, 'BEST 0');
    node.id = 'best-line';
    if (hint && hint.parentNode) {
      hint.parentNode.insertBefore(node, hint);
      if (typeof document !== 'undefined' && document.head) {
        const sheet = document.createElement('style');
        sheet.textContent = '#best-line{margin:0;text-align:center;font-family:var(--display);font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--blast)}';
        document.head.appendChild(sheet);
      }
    }
  }

  buildScope();
  buildTitleRules();
  buildKeycaps();
  fillDifficulties(app);
  wireHowto();
  wireAlmanac();
  wireOptions(app);

  const play = $('play-button');
  if (play) play.addEventListener('click', () => app.onStart && app.onStart());
  const howto = $('howto-button');
  if (howto) howto.addEventListener('click', () => { if (app.onSfx) app.onSfx('click'); showPanel('howto-screen'); });
  const options = $('options-button');
  if (options) options.addEventListener('click', () => { if (app.onSfx) app.onSfx('click'); showPanel('options-screen'); });
  const almanac = $('almanac-button');
  if (almanac) almanac.addEventListener('click', () => { if (app.onSfx) app.onSfx('click'); showPanel('almanac-screen'); });
  const resume = $('resume-button');
  if (resume) resume.addEventListener('click', () => { if (app.onResume) app.onResume(); });

  wireBackButtons(() => {
    if (app.onSfx) app.onSfx('click');
    if (app.mode === 'paused') showPause();
    else showTitle();
  });

  function showPanel(id) {
    setPanelState(app, id);
    if (id === 'options-screen') syncOptions(app);
    const back = id ? $(id) && $(id).querySelector('[data-back]') : null;
    if (back && back.focus) back.focus();
  }

  function showTitle() {
    app.panel = null;
    if (app.view) app.view.paused = false;
    setPanelState(app, null);
    refreshTitle(app);
    const play = $('play-button');
    if (play && play.focus) play.focus();
  }

  function showPause() {
    app.panel = null;
    setPanelState(app, null);
    const heading = $('pause-heading');
    if (heading) heading.textContent = 'PAUSED';
    const body = $('pause-body');
    if (body) body.textContent = 'Fuses are held. The quay waits.';
    const resumeButton = $('resume-button');
    if (resumeButton && resumeButton.focus) resumeButton.focus();
  }

  function hideOverlays() {
    app.panel = null;
    setPanelState(app, null);
  }

  function hideAll() {
    app.panel = null;
    for (const id of ['title-screen', 'howto-screen', 'options-screen', 'almanac-screen', 'pause-screen']) {
      const node = $(id);
      if (node) node.classList.add('hidden');
    }
  }

  function showTitleScreen() {
    showTitle();
  }

  function setPause(text) {
    if (app.mode !== 'paused') {
      app.modeBeforePause = app.mode;
      app.mode = 'paused';
    }
    const body = $('pause-body');
    if (body) body.textContent = text || 'Fuses are held. The quay waits.';
    setPanelState(app, null);
  }

  refreshTitle(app);
  syncOptions(app);
  return { showTitle, showTitleScreen, hideOverlays, hideAll, showPause, setPause, showPanel, refreshTitle, syncOptions, toast };
}

export { SCOPE, RULES, RULE_ICON_IDS };
