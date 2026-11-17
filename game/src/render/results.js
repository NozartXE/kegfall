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
    { label: 'BARRAGES HELD', value: `${Math.min(9, Math.max(0, Math.round(Number(stats.barragesCleared) || 0)))}/9` },
    { label: 'TIME', value: clock(state.tick) },
    { label: 'SPARK EARNED', value: commas(stats.sparkEarned) },
  ];
}

function drawWonArt(ctx, rect, tick) {
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 22);
  ctx.fillStyle = '#f2e4c4';
  ctx.fill();
  ctx.clip();

  ctx.fillStyle = 'rgba(255,194,31,0.35)';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.5, rect.w * 0.46, 0, TAU);
  ctx.fill();

  for (let i = 0; i < 9; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,122,26,0.35)' : 'rgba(217,58,43,0.28)';
    ctx.fillRect(rect.x + 10 + i * 36, rect.y + 18, 16, rect.h - 36);
  }

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * 0.47;
  const bob = Math.sin(tick * 0.04) * 4;
  ctx.save();
  ctx.translate(cx, cy + bob);
  const trophyR = rect.w * 0.4;
  drawColossus(ctx, trophyR, tick + 30, 0.2, 1);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * TAU + tick * 0.006;
    sparkGlyph(ctx, cx + Math.cos(a) * rect.w * 0.4, cy + Math.sin(a) * rect.w * 0.38, 7 + (i % 2) * 3, i % 2 ? EMBER : BLAST);
  }
  ctx.restore();

  text(ctx, 'THE COLOSSUS FALLS', cx, rect.y + 34, 26, INK, { align: 'center', maxWidth: rect.w - 40 });
  text(ctx, 'EMBER QUAY HOLDS', cx, rect.y + rect.h - 40, 22, TEAL, { align: 'center' });
  text(ctx, 'NINE BARRAGES, ONE CHAIN', cx, rect.y + rect.h - 18, 14, '#6a6054', { align: 'center' });

  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 22);
  ctx.stroke();
  ctx.restore();
}

function drawLostArt(ctx, rect, tick) {
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 22);
  ctx.fillStyle = '#2b241e';
  ctx.fill();
  ctx.clip();

  ctx.fillStyle = 'rgba(217,58,43,0.16)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const doorW = rect.w * 0.62;
  const doorH = rect.h * 0.46;
  const dx = rect.x + (rect.w - doorW) / 2;
  const dy = rect.y + rect.h * 0.34;
  ctx.fillStyle = '#b39b6d';
  ctx.fillRect(dx - 14, dy - 14, doorW + 28, doorH + 28);
  ctx.fillStyle = TEAL;
  roundRectPath(ctx, dx, dy, doorW, doorH, 10);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#0a3f43';
  ctx.stroke();

  ctx.fillStyle = SOOT;
  ctx.beginPath();
  ctx.moveTo(dx + doorW * 0.18, dy + doorH * 0.05);
  ctx.lineTo(dx + doorW * 0.46, dy + doorH * 0.4);
  ctx.lineTo(dx + doorW * 0.62, dy + doorH * 0.22);
  ctx.lineTo(dx + doorW * 0.86, dy + doorH * 0.95);
  ctx.lineTo(dx + doorW * 0.5, dy + doorH * 0.74);
  ctx.lineTo(dx + doorW * 0.3, dy + doorH * 1.02);
  ctx.lineTo(dx + doorW * 0.12, dy + doorH * 0.58);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ff7a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(dx + doorW * 0.18, dy + doorH * 0.05);
  ctx.lineTo(dx + doorW * 0.46, dy + doorH * 0.4);
  ctx.lineTo(dx + doorW * 0.62, dy + doorH * 0.22);
  ctx.lineTo(dx + doorW * 0.86, dy + doorH * 0.95);
  ctx.stroke();

  ctx.fillStyle = '#d9c9a3';
  ctx.beginPath();
  ctx.arc(dx + doorW * 0.14, dy + doorH * 0.2, doorW * 0.11, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(dx + doorW * 0.08, dy + doorH * 0.22, doorW * 0.04, doorH * 0.22);
  ctx.beginPath();
  ctx.arc(dx + doorW * 0.14, dy + doorH * 0.2, doorW * 0.03, 0, TAU);
  ctx.fill();

  const imps = [
    { x: rect.x + rect.w * 0.24, y: rect.y + rect.h * 0.86, r: 26, phase: 0 },
    { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.9, r: 32, phase: 2 },
    { x: rect.x + rect.w * 0.76, y: rect.y + rect.h * 0.85, r: 24, phase: 4 },
  ];
  for (const imp of imps) {
    const hop = Math.abs(Math.sin(tick * 0.08 + imp.phase)) * 12;
    const y = imp.y - hop;
    ctx.save();
    ctx.translate(imp.x, y);
    ctx.fillStyle = SOOT;
    ctx.beginPath();
    ctx.arc(0, 0, imp.r, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-imp.r * 0.7, -imp.r * 0.5);
    ctx.lineTo(-imp.r * 1.1, -imp.r * 1.2);
    ctx.lineTo(-imp.r * 0.25, -imp.r * 0.85);
    ctx.moveTo(imp.r * 0.7, -imp.r * 0.5);
    ctx.lineTo(imp.r * 1.1, -imp.r * 1.2);
    ctx.lineTo(imp.r * 0.25, -imp.r * 0.85);
    ctx.fill();
    ctx.fillStyle = EMBER;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * imp.r * 0.36, -imp.r * 0.1, imp.r * 0.15, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = BLAST;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, imp.r * 0.22, imp.r * 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  text(ctx, 'THE VAULT RUNS DRY', rect.x + rect.w / 2, rect.y + 34, 26, CHALK, { align: 'center', maxWidth: rect.w - 40 });
  text(ctx, 'SOOTKIN TAKE THE QUAY', rect.x + rect.w / 2, rect.y + rect.h - 40, 20, VAULT, { align: 'center' });
  text(ctx, 'RELIGHT THE FUSES', rect.x + rect.w / 2, rect.y + rect.h - 18, 14, 'rgba(247,243,232,0.7)', { align: 'center' });

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
  ctx.fillStyle = 'rgba(14,12,10,0.78)';
  ctx.fillRect(0, 0, 1280, 800);

  if (won) drawWonArt(ctx, RESULTS_LAYOUT.art, tick);
  else drawLostArt(ctx, RESULTS_LAYOUT.art, tick);

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
  const gy = p.y + 150;
  const gradeColor = { S: EMBER, A: BLAST, B: TEAL, C: '#8a6222', D: VAULT }[grade] || INK;
  text(ctx, grade, gx, gy, 132, gradeColor, { align: 'left' });
  text(ctx, 'GRADE', gx + 2, gy + 82, 15, '#6a6054');

  const sx = p.x + 208;
  text(ctx, 'SCORE', sx, p.y + 78, 16, '#6a6054');
  text(ctx, commas(score), sx, p.y + 124, 62, INK);
  if (best > 0 && score >= best) {
    roundRectPath(ctx, sx + 260, p.y + 70, 118, 28, 14);
    ctx.fillStyle = EMBER;
    ctx.fill();
    text(ctx, 'NEW BEST', sx + 319, p.y + 84, 16, CHALK, { align: 'center' });
  }

  const line = GRADE_LINES[grade] || '';
  text(ctx, line, sx, p.y + 162, 16, '#3a332a', { weight: 600, family: BODY, maxWidth: p.w - 280 });

  const tiles = statValues(state);
  const tileGap = 8;
  const tileW = (p.w - 96 - tileGap * (tiles.length - 1)) / tiles.length;
  const tileY = p.y + 186;
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
  text(ctx, meta, p.x + 48, p.y + 282, 17, delta > 0 ? TEAL : delta < 0 ? VAULT : '#3a332a', { maxWidth: p.w - 96 });

  ctx.fillStyle = 'rgba(35,32,27,0.16)';
  ctx.fillRect(p.x + 48, p.y + 300, p.w - 96, 1.5);

  const leftX = p.x + 48;
  const rightX = p.x + 452;
  drawGradeTable(ctx, leftX, p.y + 322, 380, score, grade);
  drawHistory(ctx, rightX, p.y + 322, 356, v.history);
  drawFeats(ctx, leftX, p.y + 384, p.w - 96, v.feats || state.feats);

  const charmKeys = Array.isArray(state.charms) ? state.charms : [];
  const pickedNames = charmKeys.map((key) => (CHARM_DEFS.get(key) || { name: '?' }).name);
  const offersSeen = Number.isFinite(state.stats && state.stats.offersSeen) ? state.stats.offersSeen : charmKeys.length * 3;
  const pickLine = `${charmKeys.length} PICKED FROM ${offersSeen} OFFERS`;
  const buildY = p.y + p.h - 30;
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
