// Composes the world layers in order: quay board, ground fields, kegs, sootkin, then blast/particle/floaters fx.

import { drawBoard } from './board.js';
import { drawFields, drawKegs, drawBlasts, drawParticles, drawFloaters } from './fx.js';
import { drawEnemies } from './sootkin.js';
import { W, H } from './layout.js';

export function applyShake(ctx, view) {
  if (!ctx || !view) return;
  ctx.translate(Number(view.shakeX) || 0, Number(view.shakeY) || 0);
}

export function drawWorld(ctx, state, view) {
  if (!ctx || !state) return;
  ctx.save();
  applyShake(ctx, view);
  drawBoard(ctx, state, view);
  drawFields(ctx, state, view);
  drawKegs(ctx, state, view);
  drawEnemies(ctx, state, view);
  drawBlasts(ctx, state, view);
  drawParticles(ctx, state, view);
  drawFloaters(ctx, state, view);
  ctx.restore();
}

// Non-play screens dim the ENTIRE canvas over the finished world, vault strip included.
export function drawDim(ctx, alpha) {
  const a = Number(alpha);
  if (!ctx || !(a > 0)) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(14,12,10,${Math.min(0.92, a)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
