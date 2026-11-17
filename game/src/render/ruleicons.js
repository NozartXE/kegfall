// Paints the six bold rule glyphs (place, ignite, chain, win, lose, draft) for the title's digest canvases.

import { palette } from '../config.js';

const TAU = Math.PI * 2;
const INK = palette.ink;
const EMBER = palette.ember;
const BLAST = palette.blast;
const FROST = palette.frost;
const VAULT = palette.vault;
const CHALK = palette.chalk;

export const RULE_ICON_IDS = Object.freeze(['place', 'ignite', 'chain', 'win', 'lose', 'draft']);

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

function drawKeg(ctx, x, y, w, h, fill) {
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, w * 0.24);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, w * 0.07);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(x - w / 2 - w * 0.04, y - h * 0.2, w * 1.08, h * 0.12);
  ctx.fillRect(x - w / 2 - w * 0.04, y + h * 0.08, w * 1.08, h * 0.12);
}

function sparkShape(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = -Math.PI / 2 + (i / 8) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.34;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

const PAINTERS = Object.freeze({
  place(ctx, x, y, s) {
    ctx.save();
    ctx.setLineDash([s * 0.09, s * 0.07]);
    ctx.strokeStyle = 'rgba(35,32,27,0.55)';
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    roundRectPath(ctx, x - s * 0.34, y - s * 0.26, s * 0.68, s * 0.52, s * 0.06);
    ctx.stroke();
    ctx.restore();
    drawKeg(ctx, x, y, s * 0.4, s * 0.46, EMBER);
    ctx.strokeStyle = BLAST;
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.02, y - s * 0.24);
    ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.32, x + s * 0.16, y - s * 0.36);
    ctx.stroke();
  },
  ignite(ctx, x, y, s) {
    drawKeg(ctx, x + s * 0.04, y + s * 0.06, s * 0.44, s * 0.5, EMBER);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.06, y - s * 0.18);
    ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.34, x + s * 0.3, y - s * 0.34);
    ctx.stroke();
    sparkShape(ctx, x + s * 0.34, y - s * 0.42, s * 0.22, BLAST);
    sparkShape(ctx, x + s * 0.4, y - s * 0.26, s * 0.1, EMBER);
  },
  chain(ctx, x, y, s) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      const cx = x + (i - 1) * s * 0.3;
      ctx.beginPath();
      ctx.ellipse(cx, y, s * 0.17, s * 0.28, i % 2 === 0 ? 0.55 : -0.55, 0, TAU);
      ctx.lineWidth = Math.max(2.5, s * 0.09);
      ctx.strokeStyle = i === 1 ? EMBER : INK;
      ctx.stroke();
    }
    sparkShape(ctx, x + s * 0.38, y - s * 0.32, s * 0.13, BLAST);
    sparkShape(ctx, x - s * 0.38, y + s * 0.32, s * 0.13, BLAST);
    ctx.restore();
  },
  win(ctx, x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.38, 0, TAU);
    ctx.fillStyle = BLAST;
    ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.18, y + s * 0.02);
    ctx.lineTo(x - s * 0.04, y + s * 0.16);
    ctx.lineTo(x + s * 0.22, y - s * 0.16);
    ctx.lineWidth = Math.max(3, s * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();
  },
  lose(ctx, x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.38, 0, TAU);
    ctx.fillStyle = VAULT;
    ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = Math.max(3, s * 0.12);
    ctx.lineCap = 'round';
    ctx.strokeStyle = CHALK;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.16, y - s * 0.16);
    ctx.lineTo(x + s * 0.16, y + s * 0.16);
    ctx.moveTo(x + s * 0.16, y - s * 0.16);
    ctx.lineTo(x - s * 0.16, y + s * 0.16);
    ctx.stroke();
  },
  draft(ctx, x, y, s) {
    const widths = [s * 0.26, s * 0.24, s * 0.22];
    widths.forEach((w, i) => {
      const h = s * 0.5 - i * s * 0.04;
      const cx = x + (i - 1) * s * 0.28;
      roundRectPath(ctx, cx - w / 2, y - h / 2, w, h, s * 0.05);
      ctx.fillStyle = i === 1 ? EMBER : FROST;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.strokeStyle = INK;
      ctx.stroke();
      sparkShape(ctx, cx, y, s * 0.08, INK);
    });
  },
});

export function drawRuleIcon(ctx, id, x, y, size) {
  if (!ctx || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const s = Math.max(4, Number(size) || 32);
  const painter = PAINTERS[id];
  ctx.save();
  ctx.translate(x, y);
  if (painter) painter(ctx, 0, 0, s);
  else sparkShape(ctx, 0, 0, s * 0.34, EMBER);
  ctx.restore();
}
