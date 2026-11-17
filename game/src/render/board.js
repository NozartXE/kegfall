// Draws the Ember Quay diorama: shift sky, chalk plaza with stone checker, gates, vault door, channels and decals.

import { GRID_X, GRID_Y, GRID_W, GRID_H, COLS, ROWS, CELL } from '../config.js';
import { gatesForShift } from '../grid.js';

export const C = Object.freeze({
  chalk: '#f7f3e8',
  stone: '#d9c9a3',
  deepStone: '#b39b6d',
  ink: '#23201b',
  ember: '#ff7a1a',
  blast: '#ffc21f',
  teal: '#0f5e63',
  deepTeal: '#0a3f43',
  vaultRed: '#d93a2b',
  frost: '#7fd4ff',
  soot: '#3a332a',
});

const TAU = Math.PI * 2;

function seedRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIES = Object.freeze({
  1: { top: '#ffd9b0', bottom: '#f7e9cf', sun: '#ffc98a', sunY: 92, roofline: '#c77e4e', far: '#d99a6d', haze: '#ffb98a' },
  2: { top: '#fbe6a6', bottom: '#f9f0d4', sun: '#ffd94f', sunY: 44, roofline: '#c69a5e', far: '#d8b57a', haze: '#ffe9b0' },
  3: { top: '#c08cae', bottom: '#f6c49a', sun: '#ff9a52', sunY: 108, roofline: '#8e5a63', far: '#b97c72', haze: '#ffb072' },
});

const shiftSky = (shift) => SKIES[shift] || SKIES[1];

export const skyBand = Object.freeze({ x: 168, y: 64, w: 944, h: 132 });
export const gateBand = Object.freeze({ x: 168, y: 144, w: 944, h: 58 });
export const channelL = Object.freeze({ x: 168, y: 196, w: 16, h: 532 });
export const channelR = Object.freeze({ x: 1096, y: 196, w: 16, h: 532 });

const innerL = channelL.x + channelL.w;
const innerR = channelR.x;

const GATE_SLOTS = Object.freeze({
  1: [2, 9],
  2: [1, 6, 10],
  3: [3, 8],
});

const tileRng = seedRng(0x51ee7);
const TILE_PICKS = new Float32Array(COLS * ROWS);
for (let i = 0; i < TILE_PICKS.length; i += 1) TILE_PICKS[i] = tileRng();
const CELL_CUTS = new Float32Array(COLS * ROWS);
for (let i = 0; i < CELL_CUTS.length; i += 1) CELL_CUTS[i] = tileRng();

const skyRng = seedRng(0xa5c0de);
const CLOUDS = Object.freeze(Array.from({ length: 7 }, () => ({
  x: innerL + skyRng() * (innerR - innerL),
  y: 74 + skyRng() * 52,
  w: 40 + skyRng() * 84,
  h: 6 + skyRng() * 9,
})));
const SPARKLE_RNG = seedRng(0x5ea);
const SPARKLES = Object.freeze({
  left: Array.from({ length: 16 }, () => ({ y: GRID_Y + 12 + SPARKLE_RNG() * (GRID_H - 24), dx: SPARKLE_RNG() * 10, phase: SPARKLE_RNG() * TAU, len: 3 + SPARKLE_RNG() * 5 })),
  right: Array.from({ length: 16 }, () => ({ y: GRID_Y + 12 + SPARKLE_RNG() * (GRID_H - 24), dx: SPARKLE_RNG() * 10, phase: SPARKLE_RNG() * TAU, len: 3 + SPARKLE_RNG() * 5 })),
});

const ROOF_RNG = seedRng(0x90f1);
const ridges = (baseY, minW, maxW, minH, maxH, dents) => {
  const out = [];
  let x = innerL - 20;
  while (x < innerR + 20) {
    const w = minW + ROOF_RNG() * (maxW - minW);
    const h = minH + ROOF_RNG() * (maxH - minH);
    const kind = ROOF_RNG();
    out.push({ x, w, h, baseY, dents: kind < dents, notch: ROOF_RNG() < 0.4 });
    x += w + 6 + ROOF_RNG() * 22;
  }
  return out;
};
const FAR_ROOFS = ridges(150, 46, 104, 14, 30, 0.2);
const MAIN_ROOFS = ridges(196, 52, 96, 26, 46, 0.3);

function roofPath(ctx, roof) {
  const x = roof.x;
  const w = roof.w;
  const y = roof.baseY;
  const h = roof.h;
  ctx.beginPath();
  if (roof.dents) {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h * 0.55);
    ctx.lineTo(x + w * 0.18, y - h * 0.55);
    ctx.lineTo(x + w * 0.28, y - h);
    ctx.lineTo(x + w * 0.36, y - h * 0.62);
    ctx.lineTo(x + w * 0.62, y - h * 0.62);
    ctx.lineTo(x + w * 0.72, y - h * 0.42);
    ctx.lineTo(x + w * 0.8, y - h * 0.86);
    ctx.lineTo(x + w * 0.88, y - h * 0.5);
    ctx.lineTo(x + w, y - h * 0.5);
    ctx.lineTo(x + w, y);
  } else {
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 2, y - h);
    ctx.lineTo(x + w - 2, y - h);
    ctx.lineTo(x + w + 4, y);
  }
  ctx.closePath();
}

function drawRoofline(ctx, roofs, fill, line) {
  ctx.fillStyle = fill;
  for (const roof of roofs) {
    roofPath(ctx, roof);
    ctx.fill();
    if (line && roof.notch) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(roof.x + roof.w * 0.5, roof.baseY - roof.h);
      ctx.lineTo(roof.x + roof.w * 0.5, roof.baseY - roof.h - 9);
      ctx.stroke();
    }
  }
}

function drawSky(ctx, state, frame) {
  const shift = Math.max(1, Math.min(3, Math.floor(Number(state && state.shift) || 1)));
  const sky = shiftSky(shift);
  const tick = Number.isFinite(state && state.tick) ? state.tick : 0;

  const grad = ctx.createLinearGradient(0, frame.y, 0, frame.y + frame.h);
  grad.addColorStop(0, sky.top);
  grad.addColorStop(1, sky.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(frame.x, frame.y, frame.w, frame.h);

  ctx.fillStyle = sky.sun;
  ctx.beginPath();
  ctx.arc(innerL + (innerR - innerL) * 0.72, sky.sunY, 26, 0, TAU);
  ctx.fill();

  const drift = ((tick * 0.12) % (innerR - innerL + 200)) - 100;
  ctx.fillStyle = 'rgba(247,243,232,0.55)';
  for (const cloud of CLOUDS) {
    const cx = innerL - 100 + ((cloud.x - innerL + drift + innerR - innerL + 200) % (innerR - innerL + 200)) - 100;
    ctx.beginPath();
    ctx.ellipse(cx, cloud.y, cloud.w * 0.5, cloud.h * 0.5, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = sky.haze;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(innerL, 118 + i * 7, innerR - innerL, 2);
  }
  ctx.globalAlpha = 1;

  drawRoofline(ctx, FAR_ROOFS, sky.far, null);
  drawRoofline(ctx, MAIN_ROOFS, shift === 3 ? '#6d4650' : C.deepTeal, C.ink);
}

function drawGates(ctx, state, frame) {
  const shift = Math.max(1, Math.min(3, Math.floor(Number(state && state.shift) || 1)));
  const tick = Number.isFinite(state && state.tick) ? state.tick : 0;
  const active = gatesForShift(shift).map((gate) => gate.col);
  const slots = GATE_SLOTS[shift] || GATE_SLOTS[1];
  const gateY = frame.y + frame.h - 4;

  for (const col of slots) {
    const cx = Number.isFinite(col) ? GRID_X + col * CELL + CELL / 2 : 640;
    const lit = active.includes(col);
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.09 + col * 1.7);
    const halfW = 34;
    const archH = 44;

    ctx.fillStyle = C.deepStone;
    ctx.beginPath();
    ctx.moveTo(cx - halfW - 9, gateY);
    ctx.lineTo(cx - halfW - 9, gateY - archH * 0.55);
    ctx.lineTo(cx - halfW + 2, gateY - archH - 6);
    ctx.lineTo(cx + halfW - 2, gateY - archH - 6);
    ctx.lineTo(cx + halfW + 9, gateY - archH * 0.55);
    ctx.lineTo(cx + halfW + 9, gateY);
    ctx.closePath();
    ctx.fill();

    const glow = ctx.createRadialGradient(cx, gateY - 12, 2, cx, gateY - 12, 56);
    if (lit) {
      glow.addColorStop(0, `rgba(255,122,26,${0.55 + pulse * 0.3})`);
      glow.addColorStop(0.6, 'rgba(255,122,26,0.16)');
    } else {
      glow.addColorStop(0, 'rgba(58,51,42,0.18)');
    }
    glow.addColorStop(1, 'rgba(255,122,26,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 60, gateY - 70, 120, 76);

    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, gateY);
    ctx.lineTo(cx - halfW, gateY - archH * 0.5);
    ctx.quadraticCurveTo(cx, gateY - archH - 4, cx + halfW, gateY - archH * 0.5);
    ctx.lineTo(cx + halfW, gateY);
    ctx.closePath();
    ctx.fill();

    if (lit) {
      ctx.strokeStyle = `rgba(255,194,31,${0.55 + pulse * 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - halfW + 4, gateY - archH * 0.5);
      ctx.quadraticCurveTo(cx, gateY - archH + 2, cx + halfW - 4, gateY - archH * 0.5);
      ctx.stroke();
      ctx.fillStyle = C.ember;
      ctx.beginPath();
      ctx.ellipse(cx, gateY - 3, 12 + pulse * 3, 3 + pulse * 2, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(217,201,163,0.35)';
      ctx.fillRect(cx - halfW + 6, gateY - archH * 0.5, halfW * 2 - 12, 3);
    }
  }
}

function drawPlaza(ctx) {
  ctx.fillStyle = C.stone;
  ctx.fillRect(innerL, GRID_Y, innerR - innerL, GRID_H);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const i = row * COLS + col;
      const pick = TILE_PICKS[i];
      ctx.fillStyle = pick < 0.3 ? C.chalk : pick < 0.68 ? C.stone : C.deepStone;
      ctx.fillRect(GRID_X + col * CELL, GRID_Y + row * CELL, CELL, CELL);
      if (pick > 0.62) {
        ctx.fillStyle = 'rgba(179,155,109,0.28)';
        const cut = CELL_CUTS[i] * 6;
        ctx.fillRect(GRID_X + col * CELL + CELL - 20 - cut, GRID_Y + row * CELL + 10 + cut, 14, 3);
      }
    }
  }

  ctx.fillStyle = 'rgba(58,51,42,0.22)';
  for (let col = 0; col <= COLS; col += 1) {
    ctx.fillRect(GRID_X + col * CELL - (col === 0 ? 1 : 0.5), GRID_Y, col === 0 || col === COLS ? 3 : 1, GRID_H);
  }
  for (let row = 0; row <= ROWS; row += 1) {
    ctx.fillRect(GRID_X, GRID_Y + row * CELL - (row === 0 ? 1.5 : 0.5), GRID_W, row === 0 || row === ROWS ? 3 : 1);
  }
}

function drawChannels(ctx, state) {
  const tick = Number.isFinite(state && state.tick) ? state.tick : 0;
  for (const channel of [channelL, channelR]) {
    const grad = ctx.createLinearGradient(channel.x, 0, channel.x + channel.w, 0);
    grad.addColorStop(0, C.teal);
    grad.addColorStop(0.55, C.deepTeal);
    grad.addColorStop(1, C.teal);
    ctx.fillStyle = grad;
    ctx.fillRect(channel.x, channel.y, channel.w, channel.h);
  }
  ctx.fillStyle = C.deepStone;
  ctx.fillRect(channelL.x, channelL.y, 3, channelL.h);
  ctx.fillRect(channelR.x + channelR.w - 3, channelR.y, 3, channelR.h);

  for (const [key, side] of [['left', channelL], ['right', channelR]]) {
    for (const sparkle of SPARKLES[key]) {
      const glow = 0.5 + 0.5 * Math.sin(tick * 0.07 + sparkle.phase);
      const x = side.x + 4 + sparkle.dx * 0.8;
      ctx.fillStyle = `rgba(247,243,232,${0.25 + glow * 0.6})`;
      ctx.fillRect(x, sparkle.y, sparkle.len, 2);
      if (glow > 0.8) {
        ctx.fillStyle = 'rgba(127,212,255,0.8)';
        ctx.fillRect(x + sparkle.len + 2, sparkle.y, 2, 2);
      }
    }
  }
}

function drawVault(ctx, state) {
  const tick = Number.isFinite(state && state.tick) ? state.tick : 0;
  const cx = 640;
  const top = GRID_Y + GRID_H - 2;
  const w = 150;
  const h = 62;
  const gems = state && Array.isArray(state.vaultGems) ? state.vaultGems.length : 0;

  ctx.fillStyle = C.deepStone;
  ctx.fillRect(cx - w / 2 - 12, top - 10, w + 24, h + 10);
  ctx.fillStyle = C.teal;
  ctx.fillRect(cx - w / 2, top - 4, w, h);
  ctx.strokeStyle = C.deepTeal;
  ctx.lineWidth = 4;
  ctx.strokeRect(cx - w / 2 + 6, top + 2, w - 12, h - 8);

  ctx.fillStyle = C.deepTeal;
  for (let i = 0; i < 9; i += 1) {
    const rx = cx - w / 2 + 12 + i * ((w - 24) / 8);
    ctx.beginPath();
    ctx.arc(rx, top + 10, 2.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx, top + h - 14, 2.2, 0, TAU);
    ctx.fill();
  }

  const gemGlow = 0.5 + 0.5 * Math.sin(tick * 0.04);
  const gemY = top + h * 0.62;
  for (let i = 0; i < 10; i += 1) {
    const gx = cx - 9 * 6.5 + i * 13;
    const alive = gems > i;
    ctx.fillStyle = alive ? C.vaultRed : C.soot;
    ctx.beginPath();
    ctx.moveTo(gx, gemY - 4);
    ctx.lineTo(gx + 4, gemY);
    ctx.lineTo(gx, gemY + 4);
    ctx.lineTo(gx - 4, gemY);
    ctx.closePath();
    ctx.fill();
    if (alive) {
      ctx.fillStyle = `rgba(255,194,31,${0.25 + gemGlow * 0.3})`;
      ctx.fillRect(gx - 1, gemY - 1, 2, 2);
    }
  }
  ctx.fillStyle = C.chalk;
  ctx.fillRect(cx - 26, top + 6, 52, 2);
}

function drawScorches(ctx, state, view) {
  const list = view && Array.isArray(view.scorches) ? view.scorches : null;
  const source = list || (state && Array.isArray(state.scorches) ? state.scorches : null);
  if (!source) return;
  for (const scorch of source) {
    if (!scorch || !Number.isFinite(scorch.x) || !Number.isFinite(scorch.y)) continue;
    const r = Number.isFinite(scorch.r) ? scorch.r : 40;
    const alpha = Number.isFinite(scorch.alpha) ? scorch.alpha : 0.3;
    const grad = ctx.createRadialGradient(scorch.x, scorch.y, r * 0.15, scorch.x, scorch.y, r);
    grad.addColorStop(0, `rgba(58,51,42,${alpha})`);
    grad.addColorStop(0.65, `rgba(58,51,42,${alpha * 0.45})`);
    grad.addColorStop(1, 'rgba(58,51,42,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(scorch.x, scorch.y, r, r * 0.66, 0, 0, TAU);
    ctx.fill();
  }
}

function drawFrameWalls(ctx) {
  const wall = (x, w) => {
    const grad = ctx.createLinearGradient(0, GRID_Y - 60, 0, GRID_Y + GRID_H);
    grad.addColorStop(0, C.stone);
    grad.addColorStop(1, C.deepStone);
    ctx.fillStyle = grad;
    ctx.fillRect(x, GRID_Y - 46, w, GRID_H + 46);
    ctx.fillStyle = 'rgba(35,32,27,0.18)';
    for (let y = GRID_Y - 32; y < GRID_Y + GRID_H; y += 26) {
      ctx.fillRect(x + 4, y, w - 8, 2);
    }
  };
  wall(168, channelL.x - 168);
  wall(channelR.x + channelR.w, 1112 - (channelR.x + channelR.w));
}

export function drawBoard(ctx, state, view) {
  const frame = skyBand;
  ctx.save();
  drawSky(ctx, state, frame);
  drawGates(ctx, state, gateBand);
  drawPlaza(ctx);
  drawChannels(ctx, state);
  drawFrameWalls(ctx);
  drawScorches(ctx, state, view);
  drawVault(ctx, state);
  ctx.restore();
}

export function drawTitleBackdrop(ctx, state) {
  const demo = state && typeof state === 'object' ? state : { shift: 1, tick: 0 };
  ctx.save();
  ctx.globalAlpha = 0.9;
  drawSky(ctx, demo, skyBand);
  drawGates(ctx, demo, gateBand);
  drawPlaza(ctx);
  drawChannels(ctx, demo);
  drawFrameWalls(ctx);
  drawVault(ctx, demo);
  ctx.restore();
}
