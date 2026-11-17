// Composes the world layers in order: quay board, ground fields, kegs, sootkin, then blast/particle/floaters fx.

import { drawBoard } from './board.js';
import { drawFields, drawKegs, drawBlasts, drawParticles, drawFloaters } from './fx.js';
import { drawEnemies } from './sootkin.js';

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
