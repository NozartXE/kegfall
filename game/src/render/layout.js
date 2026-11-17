// Fixed frame geometry for the 1280x800 cabinet: region rects, the field box and a text clipper.

import { GRID_X, GRID_Y, GRID_W, GRID_H } from '../config.js';

export const W = 1280;
export const H = 800;

const rect = (x, y, w, h) => Object.freeze({ x, y, w, h, x2: x + w, y2: y + h, cx: x + w / 2, cy: y + h / 2 });

export const topBar = rect(0, 0, 1280, 64);
export const leftRail = rect(0, 64, 168, 736);
export const rightRail = rect(1112, 64, 168, 736);
export const bottomBar = rect(168, 744, 944, 56);

export const field = Object.freeze({ x: GRID_X, y: GRID_Y, w: GRID_W, h: GRID_H, x2: GRID_X + GRID_W, y2: GRID_Y + GRID_H, cx: GRID_X + GRID_W / 2, cy: GRID_Y + GRID_H / 2 });

export const hudStrip = rect(168, 64, 944, 132);

export const objectiveRect = rect(180, 72, 452, 116);
export const chainRect = rect(640, 68, 264, 124);
export const scoreRect = rect(912, 72, 188, 116);

export const rosterRect = rect(8, 72, 152, 316);
export const logRect = rect(8, 396, 152, 368);
export const trackRect = rect(1120, 72, 152, 704);

export const buildBarRect = rect(176, 750, 928, 48);
export const vaultRect = rect(932, 146, 168, 42);

export const pad = 10;
export const gap = 8;

// Trims text with an ellipsis so it never exceeds maxWidth in the current ctx font.
export function clampText(ctx, text, maxWidth) {
  const source = text === undefined || text === null ? '' : String(text);
  if (!ctx || !(maxWidth > 0)) return '';
  if (ctx.measureText(source).width <= maxWidth) return source;
  const mark = '...';
  if (ctx.measureText(mark).width > maxWidth) return '';
  let lo = 0;
  let hi = source.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(source.slice(0, mid) + mark).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return source.slice(0, lo).trimEnd() + mark;
}

export function pointIn(rectValue, x, y) {
  if (!rectValue) return false;
  return x >= rectValue.x && x < rectValue.x2 && y >= rectValue.y && y < rectValue.y2;
}
