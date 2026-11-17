// Draws wave/chain banners and the chain flash over the board: centred text, ember rules and a soft glow.

import { palette } from '../config.js';
import { CONDENSED } from './fit.js';

const INK = palette.ink;
const CHALK = palette.chalk;
const EMBER = palette.ember;
const BLAST = palette.blast;
const CENTER_X = 640;
const TITLE_Y = 150;
const SUB_Y = 178;
const FLASH_Y = 320;
const MAX_TITLE_WIDTH = 720;
const TITLE_PX = 44;
const RULE_H = 3;
const RULE_GAP = 14;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const font = (px) => `800 ${Math.round(px * 10) / 10}px ${CONDENSED}`;

function fade(ticksLeft, total) {
  const span = Number(total);
  if (!(span > 0)) return 0;
  const progress = 1 - (Number(ticksLeft) || 0) / span;
  const fadeIn = clamp01(progress / 0.15);
  const fadeOut = clamp01((1 - progress) / 0.25);
  return Math.min(fadeIn, fadeOut);
}

function fitTitle(ctx, text) {
  let px = TITLE_PX;
  ctx.font = font(px);
  while (px > 8 && ctx.measureText(text).width > MAX_TITLE_WIDTH) {
    px -= 1;
    ctx.font = font(px);
  }
  return px;
}

function stroked(ctx, text, x, y, fill) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawBannerLines(ctx, banner) {
  const title = banner.title === undefined || banner.title === null ? '' : String(banner.title);
  const sub = banner.sub === undefined || banner.sub === null ? '' : String(banner.sub);
  const px = fitTitle(ctx, title);
  const width = ctx.measureText(title).width;
  const half = Math.min(width / 2, MAX_TITLE_WIDTH / 2);
  const gap = Math.min(RULE_GAP, Math.max(0, (CENTER_X - half) / 2));

  ctx.fillStyle = EMBER;
  ctx.fillRect(CENTER_X - half - gap - 90, TITLE_Y - RULE_H / 2 - 4, 90, RULE_H);
  ctx.fillRect(CENTER_X + half + gap, TITLE_Y - RULE_H / 2 - 4, 90, RULE_H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(px);
  stroked(ctx, title, CENTER_X, TITLE_Y, CHALK);

  ctx.font = font(17);
  ctx.fillStyle = BLAST;
  ctx.fillText(sub, CENTER_X, SUB_Y);
}

function drawFlash(ctx, flash) {
  const chain = Number(flash.chain);
  const label = `CHAIN x${Number.isFinite(chain) ? chain : 0}`;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(56);
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 24;
  ctx.shadowColor = EMBER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeText(label, CENTER_X, FLASH_Y);
  ctx.fillStyle = BLAST;
  ctx.fillText(label, CENTER_X, FLASH_Y);
  ctx.restore();
}

export function drawBanner(ctx, state, view) {
  if (!ctx || !view) return;
  const banner = view.banner;
  if (banner && Number(banner.ticksLeft) > 0) {
    const alpha = fade(banner.ticksLeft, banner.total);
    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawBannerLines(ctx, banner);
      ctx.restore();
    }
  }
  const flash = view.chainFlash;
  if (flash && Number(flash.ticksLeft) > 0) {
    const alpha = fade(flash.ticksLeft, flash.total);
    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawFlash(ctx, flash);
      ctx.restore();
    }
  }
}
