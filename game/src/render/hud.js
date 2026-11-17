// Draws the play frame's heads-up display: objective, vault, roster, score, chain, build bar, barrage track, log and buttons.

import {
  KEGS,
  ENEMIES,
  CHARMS,
  SHIFTS,
  BARRAGE_COUNT,
  VAULT_MAX,
  STRIKE_COOLDOWN_TICKS,
  REROLL_COST,
  VIEW_W,
  VIEW_H,
  GRID_X,
  GRID_Y,
  GRID_W,
  GRID_H,
} from '../config.js';
import { barrageForecast } from '../waves.js';
import { gatesForShift } from '../grid.js';
import {
  objectiveRect,
  chainRect,
  scoreRect,
  rosterRect,
  logRect,
  trackRect,
  buildBarRect,
  vaultRect,
  topBar,
  hudStrip,
  leftRail,
  rightRail,
  pointIn,
} from './layout.js';
import { CONDENSED, BODY, fitFont, wrapText } from './fit.js';

export const HUD = Object.freeze({
  chalk: '#f7f3e8',
  stone: '#d9c9a3',
  ink: '#23201b',
  ember: '#ff7a1a',
  blast: '#ffc21f',
  teal: '#0f5e63',
  deepTeal: '#0a3f43',
  vaultRed: '#d93a2b',
  frost: '#7fd4ff',
});

const { chalk: CHALK, stone: STONE, ink: INK, ember: EMBER, blast: BLAST, teal: TEAL, deepTeal: DEEP, vaultRed: RED, frost: FROST } = HUD;

const TAU = Math.PI * 2;
const FIELD = Object.freeze({ x: GRID_X, y: GRID_Y, w: GRID_W, h: GRID_H });
const ROSTER_ORDER = Object.freeze(['colossus', 'brute', 'twinsack', 'imp', 'wisp', 'sootling']);
const KEG_DEFS = new Map(KEGS.map((def) => [def.key, def]));
const ENEMY_DEFS = new Map(ENEMIES.map((def) => [def.key, def]));
const CHARM_DEFS = new Map(CHARMS.map((def) => [def.key, def]));
const BUTTONS = Object.freeze([
  Object.freeze({ id: 'pause', x: 1156, y: 8, w: 36, h: 36 }),
  Object.freeze({ id: 'fast', x: 1196, y: 8, w: 36, h: 36 }),
  Object.freeze({ id: 'mute', x: 1236, y: 8, w: 36, h: 36 }),
]);
const PIPS = Object.freeze([
  { x: 1152, y: 238 },
  { x: 1196, y: 238 },
  { x: 1240, y: 238 },
  { x: 1152, y: 306 },
  { x: 1196, y: 306 },
  { x: 1240, y: 306 },
  { x: 1152, y: 374 },
  { x: 1196, y: 374 },
  { x: 1240, y: 374 },
]);

export function hudButtons() {
  return BUTTONS.map((button) => ({ id: button.id, x: button.x, y: button.y, w: button.w, h: button.h }));
}

const num = (value) => {
  const n = Number(value);
  return Math.round(Number.isFinite(n) ? n : 0).toLocaleString('en-US');
};
const px = (size) => Math.round(size * 10) / 10;
const font = (size, weight = 800, family = CONDENSED) => `${weight} ${px(size)}px ${family}`;
const count = (value) => (Number.isFinite(value) ? value : 0);
const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));
const TAU2 = TAU;

function rect(ctx, x, y, w, h, r = 0) {
  ctx.beginPath();
  if (r > 0) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
}

function label(ctx, text, x, y, size, weight = 800, color = CHALK, family = CONDENSED) {
  ctx.font = font(size, weight, family);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(String(text), x, y);
}

function centered(ctx, text, x, y, size, weight = 800, color = CHALK) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(String(text), x, y);
}

function fitted(ctx, text, x, y, w, size, color = CHALK, weight = 800, align = 'left') {
  ctx.save();
  const use = fitFont(ctx, text, w, size, weight, CONDENSED);
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(String(text), align === 'right' ? x + w : x, y);
  ctx.restore();
  return use;
}

function wrapped(ctx, text, x, y, w, size, color = CHALK, weight = 800) {
  ctx.save();
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const lines = wrapText(ctx, text, w);
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], x, y + i * (size + 2));
  }
  ctx.restore();
  return lines.length;
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function sparkDot(ctx, x, y, size = 4, color = BLAST) {
  ctx.fillStyle = color;
  circle(ctx, x, y, size);
  ctx.fill();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function sparkHex(ctx, x, y, size = 5, color = BLAST) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * TAU - Math.PI / 2;
    const sx = x + Math.cos(a) * size;
    const sy = y + Math.sin(a) * size;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
}

function shiftName(index) {
  const shift = SHIFTS[Math.max(0, Math.min(SHIFTS.length - 1, Math.floor(Number(index) || 1) - 1))];
  return shift ? shift.name : 'DAWN';
}

function gateNames(index) {
  const n = Math.floor(Number(index) || 1);
  let names = [];
  if (n === 1) names = ['EAST', 'WEST'];
  else if (n === 2) names = ['WEST', 'EAST', 'CENTRE'];
  else names = ['WEST', 'EAST'];
  try {
    const gates = gatesForShift(n);
    if (Array.isArray(gates) && gates.length === names.length) return names;
  } catch (err) {
    return names.join(' + ');
  }
  return names.join(' + ');
}

function drawObjective(ctx, state) {
  const remaining = Math.max(0, BARRAGE_COUNT - count(state.stats && state.stats.barragesCleared));
  const x = 16;
  const y = 8;
  ctx.save();
  ctx.globalAlpha = 0.94;
  rect(ctx, x + 2, y + 3, 544, 52, 6);
  ctx.fillStyle = DEEP;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  rect(ctx, x, y, 544, 52, 6);
  ctx.fillStyle = 'rgba(247,243,232,0.92)';
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const line1 = `WIN: HOLD ${remaining} MORE BARRAGES`;
  ctx.font = font(20, 800);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const size = fitFont(ctx, line1, 510, 20, 800, CONDENSED);
  ctx.font = font(size, 800);
  ctx.fillText(line1, x + 12, y + 23);
  label(ctx, 'LOSE: THE VAULT RUNS DRY', x + 12, y + 38, 16, 800, RED);
  rect(ctx, x + 12, y + 44, 520, 1, 0);
  ctx.fillStyle = 'rgba(35,32,27,0.18)';
  ctx.fill();
  const line3 = `SHIFT ${state.shift || 1} - ${shiftName(state.shift)} - GATES: ${gateNames(state.shift)}`;
  fitted(ctx, line3, x + 12, y + 50, 510, 13, STONE, 800);
  ctx.restore();
}

function drawVault(ctx, state) {
  const x = 570;
  const y = 8;
  const w = 190;
  const max = Math.max(1, Math.floor(Number(state.vaultMax) || VAULT_MAX));
  const vault = Math.max(0, Math.min(max, Number(state.vault) || 0));
  const tick = Number(state.tick) || 0;
  ctx.save();
  rect(ctx, x + 2, y + 3, w, 52, 6);
  ctx.fillStyle = DEEP;
  ctx.fill();
  rect(ctx, x, y, w, 52, 6);
  ctx.fillStyle = 'rgba(247,243,232,0.92)';
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.stroke();

  label(ctx, 'VAULT', x + 10, y + 14, 15, 800, INK);
  const pipW = Math.max(12, Math.min(16, (w - 20) / max));
  const lastR = Math.max(4.4, Math.min(7, pipW * 0.46));
  const cx = x + 10 + pipW / 2 + 34;
  for (let i = 0; i < max; i += 1) {
    const pxc = cx + i * pipW;
    const cy = y + 17;
    const filled = i < vault;
    const pulsing = filled && i === vault - 1 && vault <= 3;
    const pulse = pulsing ? 0.5 + 0.5 * Math.sin(tick / 5) : 1;
    circle(ctx, pxc, cy, lastR);
    if (filled) {
      const fill = pulsing ? mix(RED, EMBER, pulse * 0.4) : EMBER;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      circle(ctx, pxc - lastR * 0.3, cy - lastR * 0.32, lastR * 0.28);
      ctx.fill();
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      circle(ctx, pxc, cy, Math.max(2, lastR - 3));
      ctx.fillStyle = 'rgba(35,32,27,0.22)';
      ctx.fill();
    }
    if (pulsing) {
      ctx.strokeStyle = `rgba(217,58,43,${0.35 + 0.5 * pulse})`;
      ctx.lineWidth = 2;
      circle(ctx, pxc, cy, lastR + 3 + pulse * 3);
      ctx.stroke();
    }
  }
  label(ctx, 'DRY = RUN LOST', x + 10, y + 42, 11, 800, vault <= 3 ? RED : INK);
  ctx.restore();
}

function mix(a, b, t) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${clampByte(pa[0] + (pb[0] - pa[0]) * k)},${clampByte(pa[1] + (pb[1] - pa[1]) * k)},${clampByte(pa[2] + (pb[2] - pa[2]) * k)})`;
}

function parseHex(color) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color || ''));
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function drawChain(ctx, state) {
  const rectValue = chainRect || { x: 770, y: 8, w: 240, h: 52 };
  const cx = rectValue.x + rectValue.w / 2;
  const chain = Math.max(0, Math.floor(Number(state.chain) || 0));
  const best = Math.max(0, Math.floor(Number(state.bestChain) || 0), chain);
  const tick = Number(state.tick) || 0;
  ctx.save();
  rect(ctx, rectValue.x, rectValue.y, rectValue.w, rectValue.h, 6);
  ctx.fillStyle = 'rgba(10,63,67,0.30)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,94,99,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const mainY = rectValue.y + rectValue.h * 0.42;
  if (chain >= 2) {
    const scale = 1 + 0.06 * Math.sin(tick / 4);
    const text = `CHAIN x${num(chain)}`;
    ctx.translate(cx, mainY);
    ctx.scale(scale, scale);
    ctx.font = font(46, 800);
    const wSize = fitFont(ctx, text, rectValue.w - 22, 46, 800, CONDENSED);
    ctx.font = font(wSize, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = BLAST;
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.save();
    const glow = 0.25 + 0.2 * Math.sin(tick / 4);
    ctx.strokeStyle = `rgba(255,194,31,${glow})`;
    ctx.lineWidth = 2;
    circle(ctx, cx, mainY, rectValue.w * 0.32);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.globalAlpha = 0.35;
    fitted(ctx, 'LIGHT A KEG - START A CHAIN', rectValue.x + 8, mainY, rectValue.w - 16, 20, CHALK, 800, 'center');
    ctx.globalAlpha = 1;
  }
  centered(ctx, `BEST CHAIN x${num(best)}`, cx, rectValue.y + rectValue.h - 13, 14, 800, chain >= 2 ? STONE : CHALK);
  ctx.restore();
}

function drawScore(ctx, state) {
  const rectValue = scoreRect || { x: 1020, y: 8, w: 128, h: 52 };
  const x = rectValue.x;
  const right = rectValue.x + rectValue.w;
  const y = rectValue.y + 11;
  const score = Math.max(0, Number(state.score) || 0);
  const best = Math.max(0, Number(state.best) || 0, score);
  const spark = Math.max(0, Math.round(Number(state.spark) || 0));
  ctx.save();
  rect(ctx, x + 2, rectValue.y + 3, rectValue.w, rectValue.h, 6);
  ctx.fillStyle = DEEP;
  ctx.fill();
  rect(ctx, x, rectValue.y, rectValue.w, rectValue.h, 6);
  ctx.fillStyle = 'rgba(247,243,232,0.92)';
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.stroke();
  const lineH = 16;
  fitted(ctx, `SCORE ${num(score)}`, right - 10, y, rectValue.w - 20, lineH, INK, 800, 'right');
  fitted(ctx, `BEST ${num(best)}`, right - 10, y + 17, rectValue.w - 20, lineH, INK, 800, 'right');
  ctx.font = font(16, 800);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  const sparkText = `SPARK ${num(spark)}`;
  const sw = Math.min(rectValue.w - 20, ctx.measureText(sparkText).width + 10);
  ctx.fillStyle = EMBER;
  ctx.fillText(sparkText, right - 10, y + 34);
  sparkHex(ctx, right - 10 - sw + 6, y + 34, 4.5, BLAST);
  ctx.restore();
}

function drawButton(ctx, button, glyph, view) {
  const { x, y, w, h } = button;
  ctx.save();
  rect(ctx, x + 2, y + 3, w, h, 6);
  ctx.fillStyle = INK;
  ctx.fill();
  rect(ctx, x, y, w, h, 6);
  ctx.fillStyle = DEEP;
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(247,243,232,0.18)';
  ctx.lineWidth = 1;
  rect(ctx, x + 3, y + 3, w - 6, h - 6, 4);
  ctx.stroke();
  ctx.fillStyle = CHALK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (glyph === 'II') {
    ctx.fillRect(x + 13, y + 11, 3, 14);
    ctx.fillRect(x + 21, y + 11, 3, 14);
    if (view && (view.paused || view.pause)) {
      ctx.fillStyle = EMBER;
      ctx.font = font(9, 800);
      ctx.fillText('ON', x + w / 2, y + h - 5);
    }
  } else if (glyph === '>>') {
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 12);
    ctx.lineTo(x + 17, y + 18);
    ctx.lineTo(x + 11, y + 24);
    ctx.moveTo(x + 19, y + 12);
    ctx.lineTo(x + 25, y + 18);
    ctx.lineTo(x + 19, y + 24);
    ctx.stroke();
    if (view && view.fast) {
      ctx.fillStyle = BLAST;
      ctx.beginPath();
      ctx.arc(x + w - 7, y + 7, 3, 0, TAU);
      ctx.fill();
    }
  } else {
    const muted = !!(view && view.muted);
    ctx.font = font(muted ? 11 : 9, 800);
    if (muted) {
      ctx.strokeStyle = RED;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 9, y + h / 2 + 9);
      ctx.lineTo(x + w / 2 + 17, y + h / 2 + 17);
      ctx.moveTo(x + w / 2 + 17, y + h / 2 + 9);
      ctx.lineTo(x + w / 2 + 9, y + h / 2 + 17);
      ctx.stroke();
    }
    ctx.fillStyle = muted ? 'rgba(247,243,232,0.55)' : CHALK;
    ctx.fillText(muted ? 'MUTE' : 'SOUND', x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function drawButtons(ctx, view) {
  drawButton(ctx, BUTTONS[0], 'II', view);
  drawButton(ctx, BUTTONS[1], '>>', view);
  drawButton(ctx, BUTTONS[2], 'SOUND', view);
}

function presentKinds(state) {
  const counts = new Map();
  const queue = Array.isArray(state.spawnQueue) ? state.spawnQueue : [];
  for (const entry of queue) {
    if (entry && entry.kind) counts.set(entry.kind, (counts.get(entry.kind) || 0) + 1);
  }
  const enemies = Array.isArray(state.enemies) ? state.enemies : [];
  for (const foe of enemies) {
    if (!foe || !foe.alive) continue;
    const kind = foe.kind || foe.type;
    if (!kind) continue;
    counts.set(kind, (counts.get(kind) || 0) + 1);
  }
  return counts;
}

function nextKindFor(state, counts) {
  const current = Math.floor(Number(state.barrage) || 0);
  for (let step = 1; step <= BARRAGE_COUNT; step += 1) {
    const idx = current + step;
    if (idx >= BARRAGE_COUNT) break;
    const forecast = barrageForecast(idx) || [];
    if (forecast.length === 0) break;
    for (const row of forecast) {
      if (row && !counts.has(row.kind)) return row.kind;
    }
  }
  return null;
}

function drawIncoming(ctx, state) {
  const x = 8;
  const y = 210;
  const w = 160;
  const h = 260;
  const tick = Number(state.tick) || 0;
  const counts = presentKinds(state);
  ctx.save();
  rect(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(247,243,232,0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,94,99,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  label(ctx, 'INCOMING', x + 10, y + 14, 14, 800, CHALK);
  fitted(ctx, `${num((state.spawnQueue && state.spawnQueue.length) || 0)} QUEUED`, x + 10, y + 14, w - 20, 10, 'rgba(217,201,163,0.8)', 700, 'right');
  ctx.strokeStyle = 'rgba(15,94,99,0.5)';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 24);
  ctx.lineTo(x + w - 10, y + 24);
  ctx.stroke();

  let rowY = y + 34;
  let rows = 0;
  for (const kind of ROSTER_ORDER) {
    const n = counts.get(kind) || 0;
    if (n <= 0) continue;
    const def = ENEMY_DEFS.get(kind) || { name: kind.toUpperCase(), trait: '' };
    const color = HUD[def.color] || def.color || CHALK;
    rect(ctx, x + 8, rowY - 8, 5, 16, 2);
    ctx.fillStyle = def.color || EMBER;
    ctx.fill();
    fitted(ctx, `${def.name} x${num(n)}`, x + 18, rowY, w - 30, 13, CHALK, 800);
    rowY += 15;
    if (def.trait) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      const lines = wrapped(ctx, def.trait, x + 18, rowY - 3, w - 28, 10, STONE, 700);
      ctx.restore();
      rowY += Math.min(2, lines) * 12 + 3;
    } else {
      rowY += 5;
    }
    rows += 1;
    if (rowY > y + h - 46) break;
  }
  if (rows === 0) {
    fitted(ctx, 'THE QUAY IS QUIET', x + 12, rowY + 6, w - 24, 11, STONE, 800);
    rowY += 20;
  }
  if ((state.barrage || 0) === BARRAGE_COUNT - 2) {
    ctx.save();
    const pulse = 0.55 + 0.45 * Math.sin(tick / 6);
    ctx.globalAlpha = pulse;
    fitted(ctx, 'THE CINDER COLOSSUS', x + 10, rowY + 8, w - 20, 11, RED, 800);
    ctx.restore();
    rowY += 16;
  }
  const nextKind = nextKindFor(state, counts);
  if (nextKind) {
    const def = ENEMY_DEFS.get(nextKind) || { name: nextKind.toUpperCase() };
    rect(ctx, x + 8, y + h - 34, w - 16, 1, 0);
    ctx.fillStyle = 'rgba(217,201,163,0.25)';
    ctx.fill();
    label(ctx, 'NEXT:', x + 10, y + h - 20, 11, 800, STONE);
    fitted(ctx, def.name, x + 46, y + h - 20, w - 56, 11, def.color || CHALK, 800);
  }
  ctx.restore();
}

function drawLog(ctx, state) {
  const x = 8;
  const y = 480;
  const w = 160;
  const h = 80;
  const log = Array.isArray(state.log) ? state.log : [];
  const lines = log.slice(-3);
  ctx.save();
  rect(ctx, x, y, w, h, 8);
  ctx.fillStyle = DEEP;
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  label(ctx, 'QUAY LOG', x + 9, y + 11, 10, 800, 'rgba(247,243,232,0.55)', BODY);
  let lineY = y + 26;
  for (const entry of lines) {
    const text = String(entry || '').toUpperCase();
    ctx.save();
    ctx.globalAlpha = 0.9;
    const used = fitted(ctx, text, x + 9, lineY, w - 18, 11, CHALK, 700);
    ctx.restore();
    lineY += Math.max(12, used + 2);
  }
  ctx.restore();
}

function drawSkull(ctx, x, y, size, color = INK) {
  ctx.save();
  ctx.fillStyle = color;
  circle(ctx, x, y - size * 0.15, size * 0.62);
  ctx.fill();
  ctx.fillRect(x - size * 0.34, y + size * 0.12, size * 0.68, size * 0.34);
  ctx.fillStyle = 'rgba(247,243,232,0.9)';
  circle(ctx, x - size * 0.26, y - size * 0.2, size * 0.17);
  ctx.fill();
  circle(ctx, x + size * 0.26, y - size * 0.2, size * 0.17);
  ctx.fill();
  ctx.fillRect(x - size * 0.1, y + size * 0.1, size * 0.2, size * 0.16);
  ctx.strokeStyle = 'rgba(247,243,232,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.18, y + size * 0.3);
  ctx.lineTo(x - size * 0.18, y + size * 0.46);
  ctx.moveTo(x, y + size * 0.3);
  ctx.lineTo(x, y + size * 0.46);
  ctx.moveTo(x + size * 0.18, y + size * 0.3);
  ctx.lineTo(x + size * 0.18, y + size * 0.46);
  ctx.stroke();
  ctx.restore();
}

function drawTrack(ctx, state) {
  const x = 1120;
  const y = 210;
  const w = 152;
  const h = 260;
  const tick = Number(state.tick) || 0;
  const cleared = Math.max(0, Math.min(BARRAGE_COUNT, count(state.stats && state.stats.barragesCleared)));
  const current = Math.max(0, Math.min(BARRAGE_COUNT - 1, Math.floor(Number(state.barrage) || 0)));
  ctx.save();
  rect(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(247,243,232,0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,94,99,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  label(ctx, 'BARRAGES', x + 10, y + 14, 14, 800, CHALK);
  fitted(ctx, `${num(cleared)}/${BARRAGE_COUNT}`, x + 10, y + 14, w - 20, 11, STONE, 800, 'right');
  const bandY = [238, 306, 374];
  const names = ['DAWN', 'NOON', 'DUSK'];
  for (let band = 0; band < 3; band += 1) {
    label(ctx, names[band], x + 9, bandY[band] - 21, 9, 800, 'rgba(217,201,163,0.75)');
    rect(ctx, x + 9, bandY[band] + 12, w - 18, 1, 0);
    ctx.fillStyle = 'rgba(15,94,99,0.35)';
    ctx.fill();
  }
  for (let i = 0; i < BARRAGE_COUNT; i += 1) {
    const pip = PIPS[i];
    const done = i < cleared || (i < current);
    const isCurrent = i === current && state.mode === 'play';
    const r = 13;
    ctx.save();
    circle(ctx, pip.x, pip.y, r);
    if (done) {
      ctx.fillStyle = EMBER;
      ctx.fill();
    } else if (isCurrent) {
      ctx.fillStyle = 'rgba(255,194,31,0.18)';
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(10,63,67,0.45)';
      ctx.fill();
    }
    if (isCurrent) {
      const pulse = 0.5 + 0.5 * Math.sin(tick / 6);
      ctx.strokeStyle = BLAST;
      ctx.lineWidth = 2 + pulse * 2;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,194,31,${0.25 + 0.35 * pulse})`;
      ctx.lineWidth = 1;
      circle(ctx, pip.x, pip.y, r + 3 + pulse * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = done ? INK : 'rgba(217,201,163,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (i === BARRAGE_COUNT - 1) {
      drawSkull(ctx, pip.x, pip.y - 1, 7, done ? INK : CHALK);
    }
    ctx.font = font(11, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = done ? INK : CHALK;
    ctx.fillText(String(i + 1), pip.x, pip.y);
    if (done) {
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pip.x - 4, pip.y - 2);
      ctx.lineTo(pip.x - 1, pip.y + 1);
      ctx.lineTo(pip.x + 5, pip.y - 6);
      ctx.stroke();
    }
    ctx.restore();
  }
  const more = Math.max(0, BARRAGE_COUNT - cleared);
  fitted(ctx, `HOLD ${num(more)} MORE`, x + 10, y + h - 12, w - 20, 12, more <= 1 ? BLAST : STONE, 800, 'center');
  ctx.restore();
}

function drawCharms(ctx, state) {
  const x = 1120;
  const y = 480;
  const w = 152;
  const h = 80;
  const owned = Array.isArray(state.charms) ? state.charms : [];
  ctx.save();
  rect(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(10,63,67,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,194,31,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  label(ctx, 'YOUR FIREWORKS', x + 9, y + 12, 11, 800, BLAST);
  const shown = owned.slice(0, 6);
  const chips = shown.map((key) => {
    const def = CHARM_DEFS.get(key);
    return def ? def : { name: String(key).toUpperCase(), color: STONE };
  });
  const startX = x + 8;
  const startY = y + 23;
  const chipH = 15;
  const maxW = w - 16;
  let lineX = startX;
  let lineY = startY;
  for (const chip of chips) {
    ctx.font = font(9, 800, BODY);
    const cw = Math.min(maxW, Math.ceil(ctx.measureText(chip.name).width) + 10);
    if (lineX + cw > startX + maxW) {
      lineX = startX;
      lineY += chipH + 2;
    }
    if (lineY + chipH > y + h - 3) break;
    rect(ctx, lineX, lineY, cw, chipH, 3);
    ctx.fillStyle = 'rgba(247,243,232,0.1)';
    ctx.fill();
    ctx.strokeStyle = chip.color || STONE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = chip.color || STONE;
    ctx.fillRect(lineX + 3, lineY + 4, 2.5, chipH - 8);
    ctx.save();
    ctx.beginPath();
    ctx.rect(lineX + 3, lineY, cw - 6, chipH);
    ctx.clip();
    ctx.font = font(9, 800, BODY);
    ctx.fillStyle = CHALK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(chip.name, lineX + 8, lineY + chipH / 2 + 0.5);
    ctx.restore();
    lineX += cw + 3;
  }
  if (owned.length === 0) {
    fitted(ctx, 'NONE YET', x + 9, y + 36, w - 18, 10, 'rgba(247,243,232,0.45)', 700);
  } else if (owned.length > shown.length) {
    fitted(ctx, `+${num(owned.length - shown.length)} MORE`, x + 9, y + h - 8, w - 18, 10, STONE, 800, 'right');
  }
  ctx.restore();
}

function lockedKeg(state, def) {
  const need = Math.max(0, Math.floor(Number(def.unlockShift) || 0));
  return need > 0 && (Number(state.shift) || 1) < need + 1;
}

function drawKegCard(ctx, def, slot, x, y, w, h, state, view) {
  const kegMul = Number.isFinite(state.mods && state.mods.kegCostMul) ? state.mods.kegCostMul : 1;
  const cost = Math.ceil(def.cost * kegMul);
  const spark = Number(state.spark) || 0;
  const locked = lockedKeg(state, def);
  const selected = view && view.tool === def.key;
  const affordable = spark >= cost && !locked;
  ctx.save();
  if (!affordable) ctx.globalAlpha = 0.55;
  rect(ctx, x, y, w, h, 7);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(247,243,232,0.97)');
  grad.addColorStop(1, 'rgba(217,201,163,0.9)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = selected ? EMBER : 'rgba(35,32,27,0.55)';
  ctx.lineWidth = selected ? 3 : 1.5;
  ctx.stroke();
  rect(ctx, x + 6, y + 6, 16, 16, 3);
  ctx.fillStyle = DEEP;
  ctx.fill();
  ctx.font = font(11, 800);
  ctx.fillStyle = CHALK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(slot), x + 14, y + 14.5);
  rect(ctx, x + 26, y + 6, w - 32, 3, 1.5);
  ctx.fillStyle = def.color;
  ctx.fill();
  fitted(ctx, def.name, x + 7, y + 25, w - 14, 13, INK, 800);
  ctx.font = font(13, 800);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const costText = `${num(cost)}`;
  const cw = ctx.measureText(costText).width;
  ctx.fillStyle = spark >= cost ? EMBER : RED;
  ctx.fillText(costText, x + w - 9 - cw, y + 25);
  sparkDot(ctx, x + w - 9 - cw - 7, y + 25, 4, spark >= cost ? BLAST : STONE);
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.font = font(10, 700, BODY);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const lines = wrapText(ctx, def.effect, w - 14).slice(0, 2);
  for (let i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], x + 7, y + 35 + i * 12);
  ctx.restore();
  if (locked) {
    rect(ctx, x, y, w, h, 7);
    ctx.fillStyle = 'rgba(10,63,67,0.72)';
    ctx.fill();
    centered(ctx, 'LOCKED', x + w / 2, y + h / 2 - 6, 13, 800, FROST);
    centered(ctx, `SHIFT ${(Number(def.unlockShift) || 0) + 1}`, x + w / 2, y + h / 2 + 9, 11, 800, CHALK);
  }
  ctx.restore();
}

function drawIgniteCard(ctx, x, y, w, h, state) {
  ctx.save();
  rect(ctx, x, y, w, h, 7);
  ctx.fillStyle = 'rgba(10,63,67,0.92)';
  ctx.fill();
  ctx.strokeStyle = BLAST;
  ctx.lineWidth = 2;
  ctx.stroke();
  centered(ctx, 'IGNITE', x + w / 2, y + 17, 16, 800, BLAST);
  fitted(ctx, 'CLICK A KEG', x + 8, y + 35, w - 16, 11, CHALK, 800, 'center');
  fitted(ctx, 'SPACE', x + 8, y + 49, w - 16, 11, CHALK, 800, 'center');
  ctx.strokeStyle = 'rgba(255,194,31,0.45)';
  ctx.lineWidth = 1;
  rect(ctx, x + 4, y + 4, w - 8, h - 8, 5);
  ctx.stroke();
  ctx.restore();
}

function drawStrikeCard(ctx, x, y, w, h, state) {
  const max = Math.max(1, Number(STRIKE_COOLDOWN_TICKS) || 1);
  const left = Math.max(0, Number(state.strikeCooldown) || 0);
  const fraction = Math.max(0, Math.min(1, 1 - left / max));
  const ready = fraction >= 1;
  ctx.save();
  rect(ctx, x, y, w, h, 7);
  ctx.fillStyle = 'rgba(35,32,27,0.92)';
  ctx.fill();
  ctx.strokeStyle = ready ? EMBER : 'rgba(217,201,163,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const cx = x + 19;
  const cy = y + h / 2;
  circle(ctx, cx, cy, 13);
  ctx.fillStyle = 'rgba(247,243,232,0.08)';
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = ready ? BLAST : EMBER;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + TAU * fraction);
  ctx.closePath();
  ctx.fillStyle = ready ? 'rgba(255,122,26,0.45)' : 'rgba(255,194,31,0.22)';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  centered(ctx, 'F', cx, cy, 12, 800, CHALK);
  fitted(ctx, 'F - SPARK STRIKE', x + 36, y + 17, w - 42, 13, CHALK, 800);
  const status = ready ? 'READY' : `${(left / 60).toFixed(1)} s`;
  fitted(ctx, status, x + 36, y + 33, w - 42, 11, ready ? BLAST : STONE, 800);
  ctx.save();
  ctx.globalAlpha = 0.6;
  fitted(ctx, `REROLL ${num(REROLL_COST)}`, x + 36, y + 47, w - 42, 9, STONE, 700);
  ctx.restore();
  ctx.restore();
}

function drawBuildBar(ctx, state, view) {
  const x = 176;
  const y = 744;
  const w = 928;
  const h = 56;
  const cardW = 148;
  const gap = (w - cardW * 6) / 5;
  ctx.save();
  rect(ctx, x - 4, y - 4, w + 8, h + 8, 8);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < KEGS.length; i += 1) {
    const def = KEGS[i];
    drawKegCard(ctx, def, i + 1, x + i * (cardW + gap), y, cardW, h, state, view);
  }
  drawIgniteCard(ctx, x + 4 * (cardW + gap), y, cardW, h, state);
  drawStrikeCard(ctx, x + 5 * (cardW + gap), y, cardW, h, state);
  ctx.restore();
  fitted(
    ctx,
    'CLICK place / ignite - 1-4 keg - U upgrade - F strike - P pause - R restart',
    x,
    738 - 6,
    w,
    11,
    'rgba(247,243,232,0.75)',
    700,
    'center',
  );
}

export function drawHud(ctx, state, view) {
  if (!ctx || !state) return;
  const safeView = view || {};
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  rect(ctx, 0, 0, VIEW_W, 64, 0);
  const strip = ctx.createLinearGradient(0, 0, 0, 64);
  strip.addColorStop(0, DEEP);
  strip.addColorStop(1, TEAL);
  ctx.fillStyle = strip;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 63);
  ctx.lineTo(VIEW_W, 63);
  ctx.stroke();

  rect(ctx, 0, 64, 168, VIEW_H - 64, 0);
  ctx.fillStyle = 'rgba(247,243,232,0.9)';
  ctx.fill();
  rect(ctx, VIEW_W - 168, 64, 168, VIEW_H - 64, 0);
  ctx.fillStyle = 'rgba(247,243,232,0.9)';
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(168, 64);
  ctx.lineTo(168, VIEW_H);
  ctx.moveTo(VIEW_W - 168, 64);
  ctx.lineTo(VIEW_W - 168, VIEW_H);
  ctx.stroke();

  drawObjective(ctx, state);
  drawVault(ctx, state);
  drawChain(ctx, state);
  drawScore(ctx, state);
  drawButtons(ctx, safeView);
  drawIncoming(ctx, state);
  drawLog(ctx, state);
  drawTrack(ctx, state);
  drawCharms(ctx, state);
  drawBuildBar(ctx, state, safeView);

  if (state.mode === 'draft') {
    rect(ctx, 0, 0, VIEW_W, VIEW_H, 0);
    ctx.fillStyle = 'rgba(10,30,32,0.45)';
    ctx.fill();
  }
  ctx.restore();
}
