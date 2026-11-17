// Draws the between-barrage draft: three charm roundels, owned run strip, honest next-barrage forecast and the reroll key.

import { CHARMS, ENEMIES, SHIFTS, REROLL_COST, BARRAGE_COUNT, palette } from '../config.js';
import { BARRAGES, barrageForecast } from '../waves.js';
import { CONDENSED, BODY, fitFont, wrapText } from './fit.js';
import { clampText } from './layout.js';

const TAU = Math.PI * 2;
const CHARM_DEFS = new Map(CHARMS.map((def) => [def.key, def]));
const ENEMY_DEFS = new Map(ENEMIES.map((def) => [def.key, def]));
const INK = palette.ink;
const CHALK = palette.chalk;
const EMBER = palette.ember;
const BLAST = palette.blast;
const TEAL = palette.teal;

export const DRAFT_LAYOUT = Object.freeze({
  titleY: 64,
  subY: 116,
  cardY: 144,
  cardW: 336,
  cardH: 432,
  cardGap: 24,
  cardX0: 64,
  roundelR: 118,
  stripY: 592,
  stripH: 40,
  forecastX: 64,
  forecastY: 644,
  forecastW: 1140,
  forecastH: 68,
  rerollY: 724,
  rerollH: 48,
  asideX: 64,
  asideY: 782,
});

export function draftCardRects() {
  const { cardX0, cardW, cardGap, cardY, cardH } = DRAFT_LAYOUT;
  const cards = [];
  for (let i = 0; i < 3; i += 1) {
    const x = cardX0 + i * (cardW + cardGap);
    cards.push({ x, y: cardY, w: cardW, h: cardH, x2: x + cardW, y2: cardY + cardH, index: i });
  }
  const reroll = {
    x: 64,
    y: DRAFT_LAYOUT.rerollY,
    w: 470,
    h: DRAFT_LAYOUT.rerollH,
  };
  reroll.x2 = reroll.x + reroll.w;
  reroll.y2 = reroll.y + reroll.h;
  return { cards, reroll };
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

function textWidth(ctx, value, px, family = CONDENSED) {
  ctx.font = `800 ${Math.round(px * 10) / 10}px ${family}`;
  return ctx.measureText(String(value === undefined || value === null ? '' : value)).width;
}

function text(ctx, value, x, y, px, fill, { align = 'left', weight = 800, family = CONDENSED, maxWidth = 0 } = {}) {
  ctx.font = `${weight} ${Math.round(px * 10) / 10}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fill;
  const source = value === undefined || value === null ? '' : String(value);
  ctx.fillText(maxWidth > 0 ? clampText(ctx, source, maxWidth) : source, x, y);
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

// Kind icon for the forecast rows: small ember/soot glyphs, one silhouette per Sootkin.
function kindGlyph(ctx, kind, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  if (kind === 'colossus') {
    roundRectPath(ctx, x - r * 0.6, y - r * 0.7, r * 1.2, r * 1.4, r * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BLAST;
    ctx.fillRect(x - r * 0.32, y - r * 0.3, r * 0.2, r * 0.2);
    ctx.fillRect(x + r * 0.12, y - r * 0.3, r * 0.2, r * 0.2);
  } else if (kind === 'brute') {
    roundRectPath(ctx, x - r * 0.62, y - r * 0.66, r * 1.24, r * 1.32, r * 0.18);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x - r * 0.38, y - r * 0.32, r * 0.76, r * 0.62);
  } else if (kind === 'wisp') {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.8);
    ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.2, x, y + r * 0.75);
    ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.2, x, y - r * 0.8);
    ctx.fill();
  } else if (kind === 'twinsack') {
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y, r * 0.46, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.34, y + r * 0.14, r * 0.36, 0, TAU);
    ctx.fill();
  } else if (kind === 'imp') {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.08, r * 0.58, 0, TAU);
    ctx.fill();
    ctx.stroke();
    sparkGlyph(ctx, x, y - r * 0.72, r * 0.36, BLAST);
  } else {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.08, r * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function charmIcon(ctx, icon, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.12);
  switch (icon) {
    case 'ring':
    case 'blast': {
      for (const s of [1, 0.6, 0.28]) {
        ctx.beginPath();
        ctx.arc(0, 0, r * s, 0, TAU);
        ctx.stroke();
      }
      sparkGlyph(ctx, 0, 0, r * 0.22, BLAST);
      break;
    }
    case 'fuse':
    case 'spark': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.5);
      ctx.quadraticCurveTo(0, -r * 0.2, r * 0.45, -r * 0.35);
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.strokeStyle = INK;
      ctx.stroke();
      sparkGlyph(ctx, r * 0.55, -r * 0.5, r * 0.42, BLAST);
      sparkGlyph(ctx, r * 0.74, -r * 0.24, r * 0.18, EMBER);
      break;
    }
    case 'hand':
    case 'target': {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.34, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, 0);
      ctx.lineTo(-r * 0.36, 0);
      ctx.moveTo(r * 0.36, 0);
      ctx.lineTo(r * 0.9, 0);
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, -r * 0.36);
      ctx.moveTo(0, r * 0.36);
      ctx.lineTo(0, r * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.1, 0, TAU);
      ctx.fillStyle = EMBER;
      ctx.fill();
      break;
    }
    case 'bolt':
    case 'magnet': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.85);
      ctx.lineTo(r * 0.45, -r * 0.1);
      ctx.lineTo(0.05 * r, r * 0.02);
      ctx.lineTo(r * 0.32, r * 0.85);
      ctx.lineTo(-r * 0.5, -r * 0.02);
      ctx.lineTo(-r * 0.02, -r * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'ledger':
    case 'refund':
    case 'coin': {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.68, 0, TAU);
      ctx.fill();
      ctx.stroke();
      text(ctx, '$', 0, 1, r * 0.9, INK, { align: 'center' });
      break;
    }
    case 'frost':
    case 'flame': {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.quadraticCurveTo(r * 0.7, -r * 0.1, r * 0.34, r * 0.55);
      ctx.quadraticCurveTo(0, r * 0.95, -r * 0.34, r * 0.55);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.1, 0, -r * 0.9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = BLAST;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.25);
      ctx.quadraticCurveTo(r * 0.3, r * 0.2, 0, r * 0.6);
      ctx.quadraticCurveTo(-r * 0.3, r * 0.2, 0, -r * 0.25);
      ctx.fill();
      break;
    }
    case 'wall':
    case 'vault': {
      roundRectPath(ctx, -r * 0.78, -r * 0.64, r * 1.56, r * 1.28, r * 0.16);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.32, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.22, r * 0.14);
      ctx.stroke();
      break;
    }
    case 'link': {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * r * 0.36, 0, r * 0.42, r * 0.26, s * 0.6, 0, TAU);
        ctx.lineWidth = Math.max(2.5, r * 0.17);
        ctx.stroke();
      }
      break;
    }
    case 'moon': {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.28, -r * 0.12, r * 0.56, 0, TAU);
      ctx.fillStyle = INK;
      ctx.fill();
      break;
    }
    case 'skull': {
      ctx.beginPath();
      ctx.arc(0, -r * 0.12, r * 0.62, Math.PI * 0.9, Math.PI * 2.1);
      ctx.lineTo(r * 0.36, r * 0.52);
      ctx.lineTo(-r * 0.36, r * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(-r * 0.22, -r * 0.1, r * 0.14, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.22, -r * 0.1, r * 0.14, 0, TAU);
      ctx.fill();
      break;
    }
    default: {
      sparkGlyph(ctx, 0, 0, r * 0.8, color);
    }
  }
  ctx.restore();
}

function drawRoundel(ctx, cx, cy, r, def, index, head, tail) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r);
  grad.addColorStop(0, CHALK);
  grad.addColorStop(0.62, head);
  grad.addColorStop(1, tail);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 10, 0, TAU);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(35,32,27,0.35)';
  ctx.stroke();
  charmIcon(ctx, def.icon, cx, cy, r * 0.5, def.color || EMBER);

  const keyR = 22;
  const kx = cx - r * 0.72;
  const ky = cy - r * 0.72;
  ctx.beginPath();
  ctx.arc(kx, ky, keyR, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = CHALK;
  ctx.stroke();
  text(ctx, String(index + 1), kx, ky + 1, 26, CHALK, { align: 'center' });
  ctx.restore();
}

export function drawDraft(ctx, state, view) {
  if (!ctx || !state) return;
  void view;
  const offers = Array.isArray(state.offers) ? state.offers : [];
  const barrageIdx = Math.min(BARRAGE_COUNT - 1, (Number(state.barrage) || 0) + 1);
  const barrage = BARRAGES[barrageIdx];
  const rects = draftCardRects();

  ctx.save();
  ctx.fillStyle = 'rgba(14,12,10,0.62)';
  ctx.fillRect(0, 0, 1280, 800);

  text(ctx, 'THE SHIFT TURNS - PICK 1', 64, DRAFT_LAYOUT.titleY, 46, CHALK, { maxWidth: 800 });
  const sub = `BARRAGE ${barrageIdx + 1} - ${barrage ? barrage.name : 'THE ASH GATES OPEN'}`;
  text(ctx, sub, 64, DRAFT_LAYOUT.subY, 24, BLAST, { maxWidth: 800 });

  const spark = Math.max(0, Math.round(Number(state.spark) || 0));
  text(ctx, 'SPARK', 1216, DRAFT_LAYOUT.subY - 12, 13, 'rgba(247,243,232,0.7)', { align: 'right' });
  sparkGlyph(ctx, 1100, DRAFT_LAYOUT.subY - 12, 8, BLAST);
  text(ctx, String(spark), 1216, DRAFT_LAYOUT.subY + 12, 30, CHALK, { align: 'right' });

  offers.forEach((key, i) => {
    const def = CHARM_DEFS.get(key);
    const card = rects.cards[i];
    if (!def) return;
    roundRectPath(ctx, card.x, card.y, card.w, card.h, 22);
    ctx.fillStyle = 'rgba(247,243,232,0.94)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = def.color || EMBER;
    ctx.fillRect(card.x + 14, card.y + 14, card.w - 28, 8);

    const cx = card.x + card.w / 2;
    drawRoundel(ctx, cx, card.y + 24 + DRAFT_LAYOUT.roundelR, DRAFT_LAYOUT.roundelR, def, i, 'rgba(255,194,31,0.35)', 'rgba(255,122,26,0.45)');

    const nameY = card.y + 24 + DRAFT_LAYOUT.roundelR * 2 + 30;
    const namePx = fitFont(ctx, def.name, card.w - 40, 34, 800, CONDENSED);
    text(ctx, def.name, cx, nameY, namePx, INK, { align: 'center', maxWidth: card.w - 40 });

    ctx.font = `600 17px ${BODY}`;
    const lines = wrapText(ctx, def.effect, card.w - 48).slice(0, 3);
    lines.forEach((line, li) => text(ctx, line, cx, nameY + 32 + li * 21, 17, '#3a332a', { align: 'center', weight: 600, family: BODY }));

    ctx.font = `700 15px ${CONDENSED}`;
    const synLines = wrapText(ctx, `SYNERGY: ${def.synergy}`, card.w - 48).slice(0, 3);
    const synTop = card.y + card.h - 16 - synLines.length * 18;
    ctx.fillStyle = 'rgba(15,94,99,0.10)';
    ctx.fillRect(card.x + 16, synTop - 12, card.w - 32, synLines.length * 18 + 14);
    synLines.forEach((line, li) => text(ctx, line, card.x + 24, synTop + li * 18, 15, TEAL, { weight: 700 }));
  });

  for (let i = offers.length; i < 3; i += 1) {
    const card = rects.cards[i];
    ctx.save();
    ctx.setLineDash([10, 8]);
    roundRectPath(ctx, card.x, card.y, card.w, card.h, 22);
    ctx.strokeStyle = 'rgba(247,243,232,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    text(ctx, 'NO OFFER', card.x + card.w / 2, card.y + card.h / 2, 22, 'rgba(247,243,232,0.5)', { align: 'center' });
  }

  const ownedKeys = Array.isArray(state.charms) ? state.charms : [];
  const ownedNames = ownedKeys.map((key) => (CHARM_DEFS.get(key) || { name: '?' }).name);
  const stripX = 64;
  const stripW = 1140;
  ctx.fillStyle = 'rgba(247,243,232,0.10)';
  ctx.fillRect(stripX, DRAFT_LAYOUT.stripY, stripW, DRAFT_LAYOUT.stripH);
  ctx.strokeStyle = 'rgba(247,243,232,0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(stripX, DRAFT_LAYOUT.stripY, stripW, DRAFT_LAYOUT.stripH);
  text(ctx, 'YOUR FIREWORKS:', stripX + 14, DRAFT_LAYOUT.stripY + DRAFT_LAYOUT.stripH / 2, 17, BLAST);
  const ownedText = ownedNames.length > 0 ? ownedNames.join(' - ') : 'NONE YET';
  ctx.font = `800 17px ${CONDENSED}`;
  const labelW = ctx.measureText('YOUR FIREWORKS:').width + 26;
  text(ctx, ownedText, stripX + 14 + labelW, DRAFT_LAYOUT.stripY + DRAFT_LAYOUT.stripH / 2, 17, CHALK, {
    maxWidth: stripW - labelW - 28,
  });
  text(ctx, `${ownedNames.length}/${CHARMS.length}`, stripX + stripW - 14, DRAFT_LAYOUT.stripY + DRAFT_LAYOUT.stripH / 2, 16, 'rgba(247,243,232,0.6)', { align: 'right' });

  const fx = DRAFT_LAYOUT.forecastX;
  const fy = DRAFT_LAYOUT.forecastY;
  const fw = DRAFT_LAYOUT.forecastW;
  const fh = DRAFT_LAYOUT.forecastH;
  ctx.fillStyle = 'rgba(247,243,232,0.92)';
  roundRectPath(ctx, fx, fy, fw, fh, 14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  text(ctx, `INCOMING BARRAGE ${barrageIdx + 1}:`, fx + 16, fy + 22, 19, INK);

  const forecast = barrageForecast(barrageIdx);
  const entries = forecast.map((row) => {
    const def = ENEMY_DEFS.get(row.kind) || { name: row.kind.toUpperCase(), trait: 'Unknown Sootkin' };
    return { row, def, label: `${def.name} x${row.count}`, w: 24 + Math.round(textWidth(ctx, `${def.name} x${row.count}`, 17)) };
  });
  let topKind = forecast[0];
  for (const row of forecast) if (!topKind || row.count > topKind.count) topKind = row;
  const dangerText = topKind
    ? `DANGER: ${entries.find((entry) => entry.row === topKind).def.trait} (x${topKind.count}).`
    : 'DANGER: none scouted.';
  const dangerW = Math.min(fw - 48, Math.round(textWidth(ctx, dangerText, 16)) + 4);
  const rowY = fy + fh - 21;
  let rowX = fx + 16;
  const limitX = fx + fw - dangerW - 24;
  for (const entry of entries) {
    if (rowX > limitX && rowX > fx + 16) break;
    kindGlyph(ctx, entry.row.kind, rowX + 9, rowY, 9, entry.def.color || EMBER);
    text(ctx, entry.label, rowX + 24, rowY, 17, INK);
    rowX += entry.w + 26;
  }
  text(ctx, dangerText, fx + fw - 16, rowY, 16, palette.vault, { align: 'right', maxWidth: dangerW });

  const rr = rects.reroll;
  const affordable = spark >= REROLL_COST;
  const held = affordHint(affordable);
  roundRectPath(ctx, rr.x, rr.y, rr.w, rr.h, 10);
  ctx.fillStyle = held.fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = held.stroke;
  ctx.stroke();
  text(ctx, `X - REROLL (${REROLL_COST} SPARK)`, rr.x + 16, rr.y + rr.h / 2, 20, held.text);
  if (!affordable) text(ctx, 'NOT ENOUGH', rr.x + rr.w - 16, rr.y + rr.h / 2, 18, '#8a8076', { align: 'right' });
  else {
    sparkGlyph(ctx, rr.x + rr.w - 26, rr.y + rr.h / 2, 9, BLAST);
    text(ctx, String(spark), rr.x + rr.w - 42, rr.y + rr.h / 2, 18, held.text, { align: 'right' });
  }

  const shiftIdx = Math.max(0, Math.min(SHIFTS.length - 1, (barrage ? barrage.shift : 1) - 1));
  const shiftName = SHIFTS[shiftIdx] ? SHIFTS[shiftIdx].name : 'DAWN';
  const shot = forecast.reduce((sum, row) => sum + row.count, 0);
  const aside = `${shot} SOOTKIN - SHIFT ${shiftIdx + 1} ${shiftName} - ${
    state.mods && state.mods.nightDouble && shiftIdx === 2 ? 'NIGHT MARKET PAYS DOUBLE' : 'KEGS PLACED NOW CARRY OVER'
  }`;
  text(ctx, aside, DRAFT_LAYOUT.asideX, DRAFT_LAYOUT.asideY + 4, 15, 'rgba(247,243,232,0.82)', { maxWidth: 1000 });

  ctx.restore();
}

function affordHint(ok) {
  return ok ? { fill: EMBER, stroke: INK, text: CHALK } : { fill: '#8a8076', stroke: '#5a544c', text: '#d9d2c4' };
}
