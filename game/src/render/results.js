// Draws the end-of-run plaque: hero art, grade and score, stat tiles, grade table, run history, build, feats and the next goal.

import { CHARMS, FEATS, DIFFICULTIES, TICKS_PER_SECOND, palette } from '../config.js';
import { GRADE_THRESHOLDS, GRADE_LINES, gradeFor } from '../save.js';
import { CONDENSED, BODY, fitFont } from './fit.js';
import { clampText } from './layout.js';
import { drawColossus } from './sootkin.js';

const TAU = Math.PI * 2;
const CHARM_DEFS = new Map(CHARMS.map((def) => [def.key, def]));
const DIFF_DEFS = new Map(DIFFICULTIES.map((def) => [def.key, def]));
const INK = palette.ink;
const CHALK = palette.chalk;
const EMBER = palette.ember;
const BLAST = palette.blast;
const TEAL = palette.teal;
const VAULT = palette.vault;
const SOOT = '#3a332a';

export const RESULTS_LAYOUT = Object.freeze({
  art: { x: 32, y: 40, w: 340, h: 700 },
  plaque: { x: 392, y: 28, w: 856, h: 522 },
  goalY: 566,
  goalH: 44,
  runAgain: { x: 916, y: 728, w: 332, h: 58 },
  title: { x: 740, y: 728, w: 156, h: 58 },
});

export function resultsButtons() {
  const again = RESULTS_LAYOUT.runAgain;
  const title = RESULTS_LAYOUT.title;
  return {
    runAgain: { x: again.x, y: again.y, w: again.w, h: again.h },
    title: { x: title.x, y: title.y, w: title.w, h: title.h },
    buttons: [
      { id: 'runAgain', key: 'r', label: 'R - RUN AGAIN', ...again },
      { id: 'title', key: 't', label: 'T - TITLE', ...title },
    ],
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function text(ctx, value, x, y, px, fill, { align = 'left', weight = 800, family = CONDENSED, maxWidth = 0 } = {}) {
  ctx.font = `${weight} ${Math.round(px * 10) / 10}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fill;
  const source = value === undefined || value === null ? '' : String(value);
  ctx.fillText(maxWidth > 0 ? clampText(ctx, source, maxWidth) : source, x, y);
}

function commas(n) {
  const value = Math.round(Number(n) || 0);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function clock(ticks) {
  const total = Math.max(0, Math.round((Number(ticks) || 0) / TICKS_PER_SECOND));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function sparkGlyph(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = -Math.PI / 2 + (i / 8) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.34;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function statValues(state) {
  const stats = state.stats || {};
  return [
    { label: 'KILLS', value: commas(stats.kills) },
    { label: 'DETONATIONS', value: commas(stats.detonations) },
    { label: 'BEST CHAIN', value: `x${Math.max(0, Math.round(Number(state.bestChain) || 0))}` },
    { label: 'BARRAGES', value: `${Math.min(9, Math.max(0, Math.round(Number(stats.barragesCleared) || 0)))}/9` },
    { label: 'TIME', value: clock(state.tick) },
    { label: 'SPARK EARNED', value: commas(stats.sparkEarned) },
  ];
}

// Run poster: a dark field carrying a powder keg with a lit fuse and the best-chain medallion; the outcome copy sits under it.
function drawPosterBase(ctx, rect, tick, variant) {
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 22);
  ctx.fillStyle = '#221b15';
  ctx.fill();
  ctx.clip();

  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sky.addColorStop(0, variant === 'won' ? '#3c2d1d' : '#2c2320');
  sky.addColorStop(0.6, '#1b1511');
  sky.addColorStop(1, '#120e0b');
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = variant === 'won' ? 'rgba(255,194,31,0.12)' : 'rgba(217,58,43,0.12)';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.44, rect.w * 0.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(247,243,232,0.05)';
  for (let i = 0; i < 6; i += 1) ctx.fillRect(rect.x + 18 + i * 56, rect.y + rect.h * 0.62, 22, 3);

  ctx.strokeStyle = variant === 'won' ? 'rgba(127,212,255,0.5)' : 'rgba(217,58,43,0.55)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, rect.x + 10, rect.y + 10, rect.w - 20, rect.h - 20, 16);
  ctx.stroke();
  void tick;
}

function drawPosterKeg(ctx, cx, cy, s, tick) {
  ctx.save();
  ctx.translate(cx, cy);
  const bodyW = 128 * s;
  const bodyH = 156 * s;
  const grad = ctx.createLinearGradient(-bodyW / 2, 0, bodyW / 2, 0);
  grad.addColorStop(0, '#6b431f');
  grad.addColorStop(0.32, '#a8713b');
  grad.addColorStop(0.5, '#cfa268');
  grad.addColorStop(0.72, '#9a6533');
  grad.addColorStop(1, '#5f3b1b');
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2, -bodyH / 2);
  ctx.quadraticCurveTo(-bodyW * 0.6, 0, -bodyW / 2, bodyH / 2);
  ctx.lineTo(bodyW / 2, bodyH / 2);
  ctx.quadraticCurveTo(bodyW * 0.6, 0, bodyW / 2, -bodyH / 2);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#2a2119';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(90,58,28,0.6)';
  ctx.lineWidth = 1.4;
  for (const dx of [-0.3, 0, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(bodyW * dx * 0.8, -bodyH * 0.44);
    ctx.quadraticCurveTo(bodyW * dx, 0, bodyW * dx * 0.8, bodyH * 0.44);
    ctx.stroke();
  }

  for (const bandY of [-0.38, 0, 0.38]) {
    ctx.fillStyle = '#3a332a';
    ctx.fillRect(-bodyW / 2 - 2, bodyH * bandY - 4, bodyW + 4, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(-bodyW / 2 - 2, bodyH * bandY - 4, bodyW + 4, 2);
  }

  ctx.fillStyle = 'rgba(35,32,27,0.78)';
  ctx.fillRect(-bodyW * 0.28, -bodyH * 0.1, bodyW * 0.56, bodyH * 0.2);
  text(ctx, 'POWDER', 0, -bodyH * 0.015, 15 * s, BLAST, { align: 'center' });
  text(ctx, 'DANGER', 0, bodyH * 0.075, 12 * s, CHALK, { align: 'center' });

  ctx.fillStyle = '#8a6222';
  ctx.fillRect(-bodyW * 0.12, -bodyH / 2 - 8 * s, bodyW * 0.24, 12 * s);

  ctx.lineCap = 'round';
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#5c5242';
  ctx.beginPath();
  ctx.moveTo(0, -bodyH / 2 - 6 * s);
  ctx.quadraticCurveTo(14 * s, -bodyH / 2 - 26 * s, 4 * s, -bodyH / 2 - 52 * s);
  ctx.stroke();

  const fxs = 4 * s;
  const fyy = -bodyH / 2 - 54 * s;
  const flick = 0.8 + 0.2 * Math.sin(tick * 0.12);
  ctx.fillStyle = 'rgba(255,122,26,0.28)';
  ctx.beginPath();
  ctx.arc(fxs, fyy, 22 * s * flick, 0, TAU);
  ctx.fill();
  ctx.fillStyle = EMBER;
  ctx.beginPath();
  ctx.arc(fxs, fyy, 10 * s * flick, 0, TAU);
  ctx.fill();
  ctx.fillStyle = BLAST;
  ctx.beginPath();
  ctx.arc(fxs, fyy - 2 * s, 6 * s * flick, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CHALK;
  ctx.beginPath();
  ctx.arc(fxs, fyy - 3 * s, 3 * s * flick, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPosterMedallion(ctx, x, y, r, bestChain, won) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = won ? 'rgba(15,94,99,0.92)' : 'rgba(35,32,27,0.92)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = BLAST;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r - 8, 0, TAU);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,194,31,0.55)';
  ctx.stroke();
  text(ctx, 'BEST', x, y - r * 0.4, r * 0.3, 'rgba(247,243,232,0.75)', { align: 'center' });
  const chain = `x${Math.max(0, Math.round(Number(bestChain) || 0))}`;
  text(ctx, chain, x, y + r * 0.08, r * 0.62, CHALK, { align: 'center', maxWidth: r * 1.6 });
  text(ctx, 'CHAIN', x, y + r * 0.58, r * 0.3, BLAST, { align: 'center' });
  ctx.restore();
}

function drawWonArt(ctx, rect, tick, bestChain) {
  ctx.save();
  drawPosterBase(ctx, rect, tick, 'won');
  const cx = rect.x + rect.w / 2;
  const kegY = rect.y + rect.h * 0.37;
  drawPosterKeg(ctx, cx, kegY, 1.35, tick);
  drawPosterMedallion(ctx, cx + rect.w * 0.27, rect.y + rect.h * 0.2, 44, bestChain, true);
  text(ctx, 'THE COLOSSUS FALLS', cx, rect.y + 36, 25, CHALK, { align: 'center', maxWidth: rect.w - 40 });
  text(ctx, 'EMBER QUAY HOLDS', cx, rect.y + rect.h - 76, 22, BLAST, { align: 'center', maxWidth: rect.w - 40 });
  text(ctx, 'NINE BARRAGES, ONE CHAIN', cx, rect.y + rect.h - 50, 14, 'rgba(247,243,232,0.7)', { align: 'center', maxWidth: rect.w - 40 });
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 22);
  ctx.stroke();
  ctx.restore();
}

function drawLostArt(ctx, rect, tick, bestChain) {
  ctx.save();
  drawPosterBase(ctx, rect, tick, 'lost');
  const cx = rect.x + rect.w / 2;
  const kegY = rect.y + rect.h * 0.37;
  ctx.save();
  ctx.globalAlpha = 0.92;
  drawPosterKeg(ctx, cx - 14, kegY + 10, 1.25, tick);
  ctx.restore();
  drawPosterMedallion(ctx, cx + rect.w * 0.28, rect.y + rect.h * 0.2, 42, bestChain, false);
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 4; i += 1) {
    const sx = rect.x + rect.w * (0.18 + i * 0.22);
    const sy = rect.y + rect.h * 0.6 + Math.sin(tick * 0.03 + i) * 6;
    ctx.fillStyle = 'rgba(58,51,42,0.8)';
    ctx.beginPath();
    ctx.arc(sx, sy, 18 + i * 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  text(ctx, 'THE VAULT RUNS DRY', cx, rect.y + 36, 24, CHALK, { align: 'center', maxWidth: rect.w - 40 });
  text(ctx, 'SOOTKIN TAKE THE QUAY', cx, rect.y + rect.h - 76, 21, VAULT, { align: 'center', maxWidth: rect.w - 40 });
  text(ctx, 'RELIGHT THE FUSES', cx, rect.y + rect.h - 50, 14, 'rgba(247,243,232,0.7)', { align: 'center', maxWidth: rect.w - 40 });
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 22);
  ctx.stroke();
  ctx.restore();
}

function drawGradeTable(ctx, x, y, w, score, grade) {
  const letters = ['S', 'A', 'B', 'C'];
  const rowH = 22;
  text(ctx, 'GRADE THRESHOLDS', x, y, 15, '#6a6054');
  letters.forEach((letter, i) => {
    const threshold = GRADE_THRESHOLDS[i];
    const met = score >= threshold;
    const rowY = y + 22 + i * rowH;
    const current = letter === grade;
    ctx.fillStyle = current ? 'rgba(255,194,31,0.28)' : i % 2 ? 'rgba(35,32,27,0.03)' : 'rgba(35,32,27,0.07)';
    ctx.fillRect(x, rowY - rowH / 2, w, rowH - 2);
    text(ctx, letter, x + 12, rowY, 16, INK);
    text(ctx, commas(threshold), x + 40, rowY, 15, met ? TEAL : '#8a8076');
    text(ctx, met ? 'CHECK' : 'CROSS', x + w - 12, rowY, 14, met ? TEAL : VAULT, { align: 'right' });
    const markX = x + w - 62;
    ctx.strokeStyle = met ? TEAL : VAULT;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    if (met) {
      ctx.moveTo(markX - 5, rowY);
      ctx.lineTo(markX - 1, rowY + 5);
      ctx.lineTo(markX + 7, rowY - 6);
    } else {
      ctx.moveTo(markX - 5, rowY - 5);
      ctx.lineTo(markX + 5, rowY + 5);
      ctx.moveTo(markX + 5, rowY - 5);
      ctx.lineTo(markX - 5, rowY + 5);
    }
    ctx.stroke();
  });
}

function drawHistory(ctx, x, y, w, history) {
  text(ctx, 'LAST 3 RUNS', x, y, 15, '#6a6054');
  const rows = Array.isArray(history) ? history.slice(0, 3) : [];
  if (rows.length === 0) {
    text(ctx, 'NO RUNS ON THE LEDGER YET', x, y + 30, 17, '#8a8076');
    return;
  }
  rows.forEach((row, i) => {
    const rowY = y + 26 + i * 26;
    const won = Boolean(row && row.won);
    ctx.fillStyle = i % 2 ? 'rgba(35,32,27,0.03)' : 'rgba(35,32,27,0.07)';
    ctx.fillRect(x, rowY - 12, w, 24);
    text(ctx, commas(row && row.score), x + 12, rowY, 16, INK);
    const diff = DIFF_DEFS.get(row && row.diffKey);
    text(ctx, diff ? diff.name : '', x + 130, rowY, 13, '#6a6054');
    const chipW = 58;
    const chipX = x + w - chipW - 8;
    roundRectPath(ctx, chipX, rowY - 10, chipW, 20, 10);
    ctx.fillStyle = won ? TEAL : VAULT;
    ctx.fill();
    text(ctx, won ? 'WON' : 'LOST', chipX + chipW / 2, rowY, 12, CHALK, { align: 'center' });
  });
}

function drawFeats(ctx, x, y, w, earned) {
  text(ctx, 'FEATS', x, y, 15, '#6a6054');
  const cellW = (w - 10) / 3;
  FEATS.forEach((feat, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = x + col * (cellW + 5);
    const cy = y + 12 + row * 30;
    const on = Boolean(earned && earned[feat.id]);
    ctx.fillStyle = on ? 'rgba(255,194,31,0.9)' : 'rgba(35,32,27,0.10)';
    roundRectPath(ctx, cx, cy, cellW, 26, 6);
    ctx.fill();
    if (on) {
      text(ctx, 'CHECK', cx + 8, cy + 13, 11, INK);
      text(ctx, feat.name, cx + 48, cy + 13, 13, INK, { maxWidth: cellW - 54 });
    } else {
      text(ctx, 'LOCKED', cx + 8, cy + 13, 11, '#8a8076');
      text(ctx, feat.name, cx + 56, cy + 13, 13, '#8a8076', { maxWidth: cellW - 62 });
    }
  });
}

function nextGoal(score, grade, earned) {
  const gIdx = ['S', 'A', 'B', 'C'].indexOf(grade);
  if (gIdx > 0) {
    const letter = ['S', 'A', 'B', 'C'][gIdx - 1];
    const threshold = GRADE_THRESHOLDS[gIdx - 1];
    return `GRADE ${letter}: ${commas(Math.max(0, threshold - score))} MORE SCORE (${commas(threshold)})`;
  }
  if (grade !== 'S') return `GRADE C: ${commas(Math.max(0, GRADE_THRESHOLDS[3] - score))} MORE SCORE (${commas(GRADE_THRESHOLDS[3])})`;
  const unmet = FEATS.find((feat) => !(earned && earned[feat.id]));
  if (unmet) return `${unmet.name}: ${unmet.text}`;
  return 'ALL FEATS LIT. CLIMB THE ENDLESS AFTERGLOW.';
}

export function drawResults(ctx, state, view) {
  if (!ctx || !state) return;
  const v = view || {};
  const score = Math.max(0, Math.round(Number(state.score) || 0));
  const best = Math.max(0, Math.round(Number(v.best ?? state.best) || 0));
  const grade = gradeFor(score);
  const won = Boolean(wonState(state));
  const tick = Number.isFinite(state.tick) ? state.tick : 0;

  ctx.save();

  if (won) drawWonArt(ctx, RESULTS_LAYOUT.art, tick, state.bestChain);
  else drawLostArt(ctx, RESULTS_LAYOUT.art, tick, state.bestChain);

  const p = RESULTS_LAYOUT.plaque;
  roundRectPath(ctx, p.x, p.y, p.w, p.h, 24);
  ctx.fillStyle = 'rgba(247,243,232,0.96)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = won ? TEAL : VAULT;
  ctx.fillRect(p.x + 24, p.y + 24, 8, p.h - 48);

  text(ctx, won ? 'RUN COMPLETE' : 'VAULT LOST', p.x + 48, p.y + 34, 18, won ? TEAL : VAULT);

  const gx = p.x + 48;
  const gy = p.y + 108;
  const gradeColor = { S: EMBER, A: BLAST, B: TEAL, C: '#8a6222', D: VAULT }[grade] || INK;
  text(ctx, grade, gx, gy, 118, gradeColor, { align: 'left' });
  text(ctx, 'GRADE', gx + 2, gy + 74, 15, '#6a6054');

  const sx = p.x + 208;
  text(ctx, 'SCORE', sx, p.y + 78, 16, '#6a6054');
  text(ctx, commas(score), sx, p.y + 124, 62, INK);
  if (best > 0 && score >= best) {
    roundRectPath(ctx, sx + 260, p.y + 70, 118, 28, 14);
    ctx.fillStyle = EMBER;
    ctx.fill();
    text(ctx, 'NEW BEST', sx + 319, p.y + 84, 16, CHALK, { align: 'center' });
  }

  const line = verdictLine(won, grade);
  text(ctx, line, sx, p.y + 158, 16, '#3a332a', { weight: 600, family: BODY, maxWidth: p.w - 280 });

  const tiles = statValues(state);
  const tileGap = 8;
  const tileW = (p.w - 96 - tileGap * (tiles.length - 1)) / tiles.length;
  const tileY = p.y + 178;
  tiles.forEach((tile, i) => {
    const tx = p.x + 48 + i * (tileW + tileGap);
    roundRectPath(ctx, tx, tileY, tileW, 66, 10);
    ctx.fillStyle = 'rgba(35,32,27,0.07)';
    ctx.fill();
    text(ctx, tile.label, tx + 10, tileY + 18, 12, '#6a6054', { maxWidth: tileW - 20 });
    const valuePx = fitFont(ctx, tile.value, tileW - 20, 30, 800, CONDENSED);
    text(ctx, tile.value, tx + 10, tileY + 44, valuePx, INK, { maxWidth: tileW - 20 });
  });

  const diff = DIFF_DEFS.get(state.diffKey);
  const delta = best > 0 ? score - best : 0;
  let deltaText;
  if (best === 0) deltaText = 'FIRST RUN ON THE LEDGER';
  else if (delta > 0) deltaText = `+${commas(delta)} OVER BEST`;
  else if (delta === 0) deltaText = score >= best ? 'MATCHES BEST' : 'LEVEL WITH BEST';
  else deltaText = `-${commas(-delta)} UNDER`;
  const meta = `${diff ? diff.name : String(state.diffKey || 'BLAZE').toUpperCase()} - SEED ${state.seed ?? 0} - ${clock(
    state.tick,
  )} - ${deltaText}`;
  text(ctx, meta, p.x + 48, p.y + 268, 17, delta > 0 ? TEAL : delta < 0 ? VAULT : '#3a332a', { maxWidth: p.w - 96 });

  ctx.fillStyle = 'rgba(35,32,27,0.16)';
  ctx.fillRect(p.x + 48, p.y + 284, p.w - 96, 1.5);

  const leftX = p.x + 48;
  const rightX = p.x + 452;
  drawGradeTable(ctx, leftX, p.y + 306, 380, score, grade);
  drawHistory(ctx, rightX, p.y + 306, 356, v.history);
  drawFeats(ctx, leftX, p.y + 422, p.w - 96, v.feats || state.feats);

  const charmKeys = Array.isArray(state.charms) ? state.charms : [];
  const pickedNames = charmKeys.map((key) => (CHARM_DEFS.get(key) || { name: '?' }).name);
  const offersSeen = Number.isFinite(state.stats && state.stats.offersSeen) ? state.stats.offersSeen : charmKeys.length * 3;
  const pickLine = `${charmKeys.length} PICKED FROM ${offersSeen} OFFERS`;
  const buildY = p.y + p.h - 16;
  text(ctx, 'YOUR BUILD', leftX, buildY - 20, 13, '#6a6054');
  text(ctx, pickLine, leftX + 104, buildY - 20, 15, TEAL);
  text(ctx, pickedNames.length > 0 ? pickedNames.join(' - ') : 'NO CHARMS CLAIMED', leftX, buildY, 17, INK, {
    maxWidth: p.w - 96,
  });

  const goal = RESULTS_LAYOUT;
  roundRectPath(ctx, p.x, goal.goalY, p.w, goal.goalH, 12);
  ctx.fillStyle = 'rgba(255,194,31,0.92)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  text(ctx, `NEXT GOAL: ${nextGoal(score, grade, v.feats || state.feats)}`, p.x + 20, goal.goalY + goal.goalH / 2, 19, INK, {
    maxWidth: p.w - 40,
  });

  const buttons = resultsButtons();
  const again = buttons.runAgain;
  roundRectPath(ctx, again.x, again.y, again.w, again.h, 14);
  const grad = ctx.createLinearGradient(again.x, again.y, again.x, again.y + again.h);
  grad.addColorStop(0, BLAST);
  grad.addColorStop(1, EMBER);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  text(ctx, 'R - RUN AGAIN', again.x + again.w / 2, again.y + again.h / 2, 28, INK, { align: 'center', maxWidth: again.w - 30 });

  const titleBtn = buttons.title;
  roundRectPath(ctx, titleBtn.x, titleBtn.y, titleBtn.w, titleBtn.h, 14);
  ctx.fillStyle = 'rgba(247,243,232,0.16)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = CHALK;
  ctx.stroke();
  text(ctx, 'T - TITLE', titleBtn.x + titleBtn.w / 2, titleBtn.y + titleBtn.h / 2, 22, CHALK, {
    align: 'center',
    maxWidth: titleBtn.w - 20,
  });

  ctx.restore();
}

function wonState(state) {
  if (state.stats && typeof state.stats.won === 'boolean') return state.stats.won;
  return state.mode === 'won' || state.won === true;
}

const LOSS_LINES = Object.freeze([
  'Sootkin boil over the rails. Bank one more keg on the gate line.',
  'The Vault went dark before the last fuse. Pace the chain tighter.',
  'A hard quay, a dry Vault. Let the kegs chain before you spend.',
  'The tide came in and took the quay. Tune the fuses for next run.',
]);

// Verdict copy follows the outcome: a loss never quotes a triumph line.
function verdictLine(won, grade) {
  if (won) return GRADE_LINES[grade] || GRADE_LINES.B;
  const idx = Math.max(0, ['S', 'A', 'B', 'C'].indexOf(grade));
  return LOSS_LINES[Math.min(idx, LOSS_LINES.length - 1)];
}
