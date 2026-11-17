// Text fitting rules: shrink condensed display type to fit a panel, wrap body copy, and draw clipped labels.

import { clampText } from './layout.js';

export const CONDENSED = "'Arial Narrow', 'Helvetica Neue Condensed', 'Roboto Condensed', 'Helvetica Neue', Arial, sans-serif";
export const BODY = "'Helvetica Neue', Arial, sans-serif";
export const MIN_PX = 8;

const font = (px, weight, family) => `${weight} ${Math.round(px * 10) / 10}px ${family}`;

export function fitFont(ctx, text, maxWidth, startPx, weight = 800, family = CONDENSED) {
  if (!ctx) return MIN_PX;
  const limit = maxWidth > 0 ? maxWidth : 0;
  let px = Math.max(MIN_PX, Number(startPx) || MIN_PX);
  const source = text === undefined || text === null ? '' : String(text);
  ctx.font = font(px, weight, family);
  const mWidth = ctx.measureText('M').width;
  if (Number.isFinite(mWidth) && mWidth > 0) px = Math.min(px, Math.floor(mWidth * 1.7));
  ctx.font = font(px, weight, family);
  if (limit === 0 || ctx.measureText(source).width <= limit) return px;
  const wide = ctx.measureText(source).width;
  px = Math.max(MIN_PX, Math.floor(px * (limit / wide) * 0.98));
  ctx.font = font(px, weight, family);
  while (px > MIN_PX && ctx.measureText(source).width > limit) {
    px -= 1;
    ctx.font = font(px, weight, family);
  }
  return px;
}

export function wrapText(ctx, text, maxWidth) {
  const source = text === undefined || text === null ? '' : String(text);
  if (!ctx || !(maxWidth > 0)) return source ? source.split('\n') : [];
  if (!Number.isFinite(ctx.measureText('M').width)) return source.split('\n');
  const width = maxWidth;
  const lines = [];
  for (const paragraph of source.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const next = `${line} ${words[i]}`;
      if (ctx.measureText(next).width <= width) {
        line = next;
        continue;
      }
      lines.push(line);
      let word = words[i];
      while (ctx.measureText(word).width > width && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && ctx.measureText(word.slice(0, cut)).width > width) cut -= 1;
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      line = word;
    }
    lines.push(line);
  }
  return lines;
}

export function drawFitted(ctx, text, x, y, maxWidth, px, fill, align = 'left') {
  if (!ctx) return 0;
  const size = fitFont(ctx, text, maxWidth, px, 800, CONDENSED);
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (fill) ctx.fillStyle = fill;
  ctx.fillText(clampText(ctx, text, maxWidth), x, y);
  ctx.restore();
  return size;
}
