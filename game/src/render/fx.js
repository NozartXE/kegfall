// Draws everything that moves and glows: kegs with pulsing fuses, detonation rings, sparks, smoke, ground fields and score floaters.

import { KEGS, CELL, palette } from '../config.js';
import { CONDENSED } from './fit.js';

const TAU = Math.PI * 2;
const KEG_DEFS = new Map(KEGS.map((def) => [def.key, def]));
const MAX_SCORCHES = 40;
const RING_TICKS = 20;
const SPARK_TICKS = 54;
const PUFF_TICKS = 78;
const BASE_FLOAT_TICKS = 50;
const INK = palette.ink;
const CHALK = palette.chalk;
const EMBER = palette.ember;
const BLAST = palette.blast;
const FROST = palette.frost;
const BRASS = '#c9963c';
const BRASS_LIGHT = '#f2cf7a';
const BRASS_DARK = '#8a6222';
const WOOD = '#a8713b';
const WOOD_DARK = '#7a4c24';
const WOOD_LIGHT = '#cfa268';
const IRON = '#4d4036';
const IRON_LIGHT = '#76685a';
const SOOT = '#2e2922';

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function makeLcg(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ensureFx = (view) => {
  if (!view || typeof view !== 'object') return null;
  if (!Array.isArray(view.fxParticles)) view.fxParticles = [];
  if (!Array.isArray(view.fxPuffs)) view.fxPuffs = [];
  if (!Array.isArray(view.scorches)) view.scorches = [];
  if (!Array.isArray(view.fxRings)) view.fxRings = [];
  return view;
};

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU);
}

function roundRect(ctx, x, y, w, h, r) {
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

function inkShape(ctx, path, fill, lineWidth = 2.2) {
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function starPath(ctx, cx, cy, outer, inner, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function snowflake(ctx, cx, cy, r, color, lineWidth = 1.6) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
    const bx = cx + Math.cos(a) * r * 0.56;
    const by = cy + Math.sin(a) * r * 0.56;
    for (const side of [-0.7, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + side) * r * 0.3, by + Math.sin(a + side) * r * 0.3);
      ctx.stroke();
    }
  }
}

function flameGlyph(ctx, cx, cy, h, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.quadraticCurveTo(cx + h * 0.72, cy - h * 0.1, cx + h * 0.3, cy + h * 0.55);
  ctx.quadraticCurveTo(cx, cy + h * 0.82, cx - h * 0.3, cy + h * 0.55);
  ctx.quadraticCurveTo(cx - h * 0.72, cy - h * 0.1, cx, cy - h);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.46);
  ctx.quadraticCurveTo(cx + h * 0.28, cy, cx + h * 0.1, cy + h * 0.3);
  ctx.quadraticCurveTo(cx - h * 0.22, cy + h * 0.1, cx, cy - h * 0.46);
  ctx.fillStyle = CHALK;
  ctx.fill();
}

function starPip(ctx, cx, cy, filled, r = 6) {
  starPath(ctx, cx, cy, r, r * 0.46);
  ctx.fillStyle = filled ? BRASS : '#e3d4b2';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (filled) {
    starPath(ctx, cx - r * 0.18, cy - r * 0.22, r * 0.42, r * 0.18, 4, 0);
    ctx.fillStyle = BRASS_LIGHT;
    ctx.fill();
  }
}

// ---------- kegs ----------

function drawBarrelBody(ctx, w, h, fill, light, dark) {
  const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  grad.addColorStop(0, dark);
  grad.addColorStop(0.28, fill);
  grad.addColorStop(0.48, light);
  grad.addColorStop(0.75, fill);
  grad.addColorStop(1, dark);
  inkShape(ctx, () => roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.22), grad, 2.2);
}

function drawBand(ctx, y, w, color = '#3a332a', line = 3.4) {
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2 - 1.5, y - line / 2, w + 3, line);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-w / 2 - 1.5, y - line / 2, w + 3, 1);
}

function drawFuseStub(ctx, baseY, len, lit, burn, tick) {
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#5c5242';
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  ctx.quadraticCurveTo(2.5, baseY - len * 0.6, -1, baseY - len);
  ctx.stroke();
  const fxs = -1;
  const fyy = baseY - len;
  if (!lit) {
    ctx.fillStyle = BRASS;
    circle(ctx, fxs, fyy, 2.2);
    ctx.fill();
    return;
  }
  const flick = 0.7 + 0.3 * Math.sin(tick * 1.7 + len);
  circle(ctx, fxs, fyy, 7 * flick);
  ctx.fillStyle = 'rgba(255,122,26,0.35)';
  ctx.fill();
  circle(ctx, fxs, fyy - 1, 4 * flick);
  ctx.fillStyle = BLAST;
  ctx.fill();
  circle(ctx, fxs, fyy - 1.5, 2.1 * flick);
  ctx.fillStyle = CHALK;
  ctx.fill();
  if (burn < 0.35) {
    const rng = makeLcg(Math.floor(tick / 2) + 13);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i === 0 ? BLAST : EMBER;
      ctx.fillRect(fxs + (rng() - 0.5) * 10 - 1, fyy - 4 - rng() * 6, 2, 2);
    }
  }
}

function drawFuseTrail(ctx, keg, tick) {
  const total = Math.max(1, keg.fuseTotal || 48);
  const fuse = Math.max(0, keg.fuse);
  const urgent = 1 - clamp01(fuse / total);
  const rng = makeLcg(((keg.id || 1) * 131) ^ (Math.floor(tick / 2) + 1));
  const pulse = 0.55 + 0.45 * Math.sin(tick * (0.16 + urgent * 0.5) + (keg.id || 0));
  const r = urgent > 0.6 ? 22 : 16;
  const grad = ctx.createRadialGradient(keg.x, keg.y - 14, 2, keg.x, keg.y - 14, r);
  grad.addColorStop(0, `rgba(255,194,31,${0.36 + pulse * 0.3})`);
  grad.addColorStop(0.5, `rgba(255,122,26,${0.16 + pulse * 0.18})`);
  grad.addColorStop(1, 'rgba(255,122,26,0)');
  ctx.fillStyle = grad;
  circle(ctx, keg.x, keg.y - 14, r);
  ctx.fill();

  const count = fuse <= 3 ? 4 : 3;
  const dirBase = 0.75 + urgent * 0.5;
  for (let i = 0; i < count; i += 1) {
    const dist = fuse <= 3 ? 2 + rng() * 8 : 3 + rng() * 10;
    const angle = -Math.PI / 2 + (rng() - 0.5) * dirBase;
    const px = keg.x + Math.cos(angle) * dist;
    const py = keg.y - 34 - Math.sin(angle) * -dist * 0.3 + rng() * 4;
    const size = i === 0 ? 2.6 : 1.6 + rng();
    ctx.fillStyle = i === 0 ? BLAST : EMBER;
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
  }
}

function drawPowderKeg(ctx, level, tick, burning) {
  drawBarrelBody(ctx, 38, 46, WOOD, WOOD_LIGHT, WOOD_DARK);
  ctx.strokeStyle = 'rgba(122,76,36,0.55)';
  ctx.lineWidth = 1;
  for (const dx of [-11, 0, 11]) {
    ctx.beginPath();
    ctx.moveTo(dx, -20);
    ctx.quadraticCurveTo(dx * 1.18, 0, dx, 20);
    ctx.stroke();
  }
  drawBand(ctx, -14, 38);
  drawBand(ctx, 0, 39);
  drawBand(ctx, 14, 38);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-14, -19, 3, 38);
  drawFuseStub(ctx, -20, 13, burning, burning ? 0.5 : 1, tick);
}

function drawOilDrum(ctx, level, tick, burning) {
  drawBarrelBody(ctx, 38, 46, '#c4342a', '#e8604a', '#8c2019');
  drawBand(ctx, -15, 38, '#3a332a', 3);
  drawBand(ctx, 13, 38, '#3a332a', 3);
  ctx.fillStyle = '#a82820';
  circle(ctx, 0, -4, 10);
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  flameGlyph(ctx, 0, 0, 9, BLAST);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-15, -19, 3, 38);
}

function drawSparkMine(ctx, level, tick, burning) {
  const grad = ctx.createLinearGradient(0, -10, 0, 14);
  grad.addColorStop(0, BRASS_LIGHT);
  grad.addColorStop(0.45, BRASS);
  grad.addColorStop(1, BRASS_DARK);
  inkShape(ctx, () => ellipse(ctx, 0, 6, 25, 13), grad, 2.2);
  ctx.strokeStyle = 'rgba(35,32,27,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    ellipse(ctx, 0, 6 + i * 2.6, 25 - i * 2, 13 - i * 2.2);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU + Math.PI / 8;
    circle(ctx, Math.cos(a) * 20, 6 + Math.sin(a) * 8.5, 1.5);
    ctx.fill();
  }
  const domeGrad = ctx.createRadialGradient(-3, -10, 1, 0, -8, 15);
  domeGrad.addColorStop(0, 'rgba(247,243,232,0.95)');
  domeGrad.addColorStop(0.45, 'rgba(127,212,255,0.8)');
  domeGrad.addColorStop(1, 'rgba(15,94,99,0.9)');
  inkShape(ctx, () => ctx.arc(0, 4, 11, Math.PI, 0), domeGrad, 2);
  const glow = 0.5 + 0.5 * Math.sin(tick * 0.14 + 1);
  circle(ctx, 0, 0, 3.4);
  ctx.fillStyle = burning ? EMBER : `rgba(255,194,31,${0.6 + glow * 0.4})`;
  ctx.fill();
  if (burning) {
    ctx.strokeStyle = BLAST;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 1);
    ctx.lineTo(6, -3);
    ctx.lineTo(4, -5);
    ctx.lineTo(8, -9);
    ctx.stroke();
  }
}

function drawFrostKeg(ctx, level, tick, burning) {
  drawBarrelBody(ctx, 34, 44, '#a5dcf0', '#d8f4ff', '#5fa8c4');
  drawBand(ctx, -15, 34, '#0f5e63', 3);
  drawBand(ctx, 14, 34, '#0f5e63', 3);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  circle(ctx, 0, 0, 10.5);
  ctx.fill();
  snowflake(ctx, 0, 0, 9, '#0f5e63', 1.8);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.lineTo(-7, -2);
  ctx.lineTo(-9, 5);
  ctx.lineTo(-13, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-12, -19, 3, 38);
}

function drawChainedKegFlash(ctx, keg, tick) {
  const flash = 0.58 + 0.42 * Math.sin(tick * 0.85 + (keg.id || 0));
  ctx.globalAlpha = 0.34 + flash * 0.4;
  ctx.strokeStyle = Math.sin(tick * 1.3) > 0 ? '#ffffff' : EMBER;
  ctx.lineWidth = 3;
  circle(ctx, keg.x, keg.y, 25);
  ctx.stroke();
  ctx.globalAlpha = 0.16 + flash * 0.22;
  circle(ctx, keg.x, keg.y, 22);
  ctx.fillStyle = Math.sin(tick * 0.85 + (keg.id || 0)) > 0 ? CHALK : EMBER;
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawKegs(ctx, state, view) {
  if (!ctx || !state || !Array.isArray(state.kegs)) return;
  const tick = Number.isFinite(state.tick) ? state.tick : 0;
  for (const keg of state.kegs) {
    if (!keg || !Number.isFinite(keg.x) || !Number.isFinite(keg.y)) continue;
    const def = keg.def || KEG_DEFS.get(keg.kind) || KEG_DEFS.get('powder');
    const level = Math.max(1, Math.min(3, Math.floor(keg.level || 1)));
    const lit = Number.isFinite(keg.fuse) && keg.fuse >= 0;
    const chained = lit && keg.fuse <= 16;

    ctx.save();
    ctx.translate(keg.x, keg.y);
    ellipse(ctx, 0, 23, 22, 8);
    ctx.fillStyle = 'rgba(35,32,27,0.24)';
    ctx.fill();

    if (lit) {
      ctx.save();
      drawFuseTrail(ctx, keg, tick);
      ctx.restore();
    }

    ctx.save();
    if (chained) {
      const shake = Math.sin(tick * 1.1 + (keg.id || 0)) * 1.4;
      ctx.translate(shake, 0);
    }
    const painter = { powder: drawPowderKeg, oil: drawOilDrum, mine: drawSparkMine, frost: drawFrostKeg }[def.key] || drawPowderKeg;
    painter(ctx, level, tick, lit);
    ctx.restore();

    for (let i = 0; i < level; i += 1) {
      const px = (i - (level - 1) / 2) * 13;
      starPip(ctx, px, 30, true, 6);
    }
    if (chained) drawChainedKegFlash(ctx, keg, tick);
    ctx.restore();
  }
}

// ---------- detonation fx ----------

function radiusColors(kind) {
  if (kind === 'frost') return { spark: ['#d8f4ff', FROST, '#0f5e63'], smoke: ['rgba(214,244,255,0.75)', 'rgba(127,212,255,0.4)'] };
  if (kind === 'oil') return { spark: ['#fff4c4', EMBER, '#b0301f'], smoke: ['rgba(70,52,38,0.7)', 'rgba(52,44,36,0.4)'] };
  if (kind === 'imp') return { spark: ['#ffffff', '#ffb24a', EMBER], smoke: ['rgba(58,51,42,0.65)', 'rgba(58,51,42,0.35)'] };
  if (kind === 'mega') return { spark: ['#ffffff', BLAST, EMBER], smoke: ['rgba(46,41,34,0.8)', 'rgba(46,41,34,0.5)'] };
  if (kind === 'strike') return { spark: ['#ffffff', FROST, '#ffffff'], smoke: ['rgba(58,51,42,0.5)', 'rgba(58,51,42,0.25)'] };
  return { spark: ['#fff6d2', BLAST, EMBER], smoke: ['rgba(58,51,42,0.7)', 'rgba(58,51,42,0.4)'] };
}

export function spawnDetonationFx(view, evt) {
  const target = ensureFx(view);
  if (!target || !evt || !Number.isFinite(evt.x) || !Number.isFinite(evt.y)) return;
  const radius = Math.max(12, Number.isFinite(evt.radiusPx) ? evt.radiusPx : CELL);
  const chain = Math.max(1, Math.floor(evt.chain || 1));
  const tick = Number.isFinite(evt.tick) ? evt.tick : 0;
  const kind = evt.kind || 'powder';
  const colors = radiusColors(kind);

  target.fxRings.push({ x: evt.x, y: evt.y, r: 0, maxR: radius, kind, chain, age: 0, ttl: RING_TICKS });

  const rng = makeLcg(Math.imul(tick, 31) + chain * 7 + 13);
  const count = 14 + Math.floor(rng() * 13);
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + (rng() - 0.5) * 0.32;
    const speed = 2.4 + rng() * 6.4;
    target.fxParticles.push({
      x: evt.x + Math.cos(angle) * 6,
      y: evt.y + Math.sin(angle) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.4,
      size: 1.6 + rng() * 2.6,
      age: 0,
      ttl: 26 + Math.floor(rng() * (SPARK_TICKS - 20)),
      color: colors.spark[i % colors.spark.length],
    });
  }

  const puffs = 6 + Math.floor(rng() * 3);
  for (let i = 0; i < puffs; i += 1) {
    const angle = (i / puffs) * TAU + rng() * 0.6;
    const dist = radius * (0.12 + rng() * 0.42);
    target.fxPuffs.push({
      x: evt.x + Math.cos(angle) * dist,
      y: evt.y + Math.sin(angle) * dist * 0.7,
      vx: Math.cos(angle) * (0.2 + rng() * 0.4),
      vy: -0.35 - rng() * 0.5,
      r: 10 + rng() * 14,
      grow: 0.35 + rng() * 0.5,
      age: 0,
      ttl: 52 + Math.floor(rng() * (PUFF_TICKS - 46)),
      color: colors.smoke[i % colors.smoke.length],
    });
  }

  const shake = Math.min(15, 1.8 + radius * 0.05) * Math.min(1.6, 0.75 + chain * 0.06);
  target.shakeMag = Math.max(Number(target.shakeMag) || 0, shake);

  if (chain >= 6) {
    target.camFlash = {
      color: chain >= 12 ? '#fff6d2' : BLAST,
      alpha: Math.max(Number(target.camFlashAlpha) || 0, Math.min(0.55, 0.14 + chain * 0.022)),
      age: 0,
      ttl: 16,
    };
    target.camFlashAlpha = target.camFlash.alpha;
  }

  target.scorches.push({ x: evt.x, y: evt.y, r: Math.min(72, radius * 0.6 + 16), alpha: 0.3 });
  if (target.scorches.length > MAX_SCORCHES) target.scorches.splice(0, target.scorches.length - MAX_SCORCHES);
}

// ---------- per-frame fx ----------

function stepFx(view) {
  if (!view) return;
  if (Array.isArray(view.fxRings)) {
    view.fxRings = view.fxRings.filter((ring) => {
      ring.age += 1;
      const t = clamp01(ring.age / ring.ttl);
      ring.r = ring.maxR * (1 - (1 - t) * (1 - t) * (1 - t));
      return ring.age < ring.ttl;
    });
  }
  if (Array.isArray(view.fxParticles)) {
    view.fxParticles = view.fxParticles.filter((p) => {
      p.age += 1;
      p.vy += 0.17;
      p.vx *= 0.972;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      return p.age < p.ttl;
    });
  }
  if (Array.isArray(view.fxPuffs)) {
    view.fxPuffs = view.fxPuffs.filter((puff) => {
      puff.age += 1;
      puff.x += puff.vx;
      puff.y += puff.vy;
      puff.vx *= 0.985;
      puff.vy *= 0.985;
      puff.r += puff.grow;
      return puff.age < puff.ttl;
    });
  }
  if (view.camFlash) {
    view.camFlash.age += 1;
    if (view.camFlash.age >= view.camFlash.ttl) {
      view.camFlash = null;
      view.camFlashAlpha = 0;
    } else {
      view.camFlashAlpha = view.camFlash.alpha * (1 - view.camFlash.age / view.camFlash.ttl);
    }
  }
  if (Number.isFinite(view.shakeMag) && view.shakeMag > 0) {
    view.shakeMag = Math.max(0, view.shakeMag - 0.55);
    if (view.shakeMag === 0) {
      view.shakeX = 0;
      view.shakeY = 0;
    }
  }
}

function drawRings(ctx, view) {
  const rings = view.fxRings;
  if (!Array.isArray(rings)) return;
  for (const ring of rings) {
    const t = clamp01(ring.age / ring.ttl);
    const fade = 1 - t;
    const r = Math.max(1, ring.r);
    const cold = ring.kind === 'frost';
    const stroke = cold ? FROST : t < 0.45 ? EMBER : '#c4471f';
    ctx.save();
    ctx.globalAlpha = clamp01(0.5 * fade);
    ctx.lineWidth = 6 * (0.4 + fade * 0.8);
    ctx.strokeStyle = stroke;
    circle(ctx, ring.x, ring.y, r);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.2, 5 * (0.2 + fade * 0.6));
    ctx.strokeStyle = cold ? '#eafbff' : BLAST;
    ctx.globalAlpha = clamp01(0.35 * fade);
    circle(ctx, ring.x, ring.y, Math.max(1, r - 4));
    ctx.stroke();
    ctx.restore();
  }
}

function drawSparks(ctx, view) {
  const sparks = view.fxParticles;
  if (Array.isArray(sparks)) {
    for (const p of sparks) {
      const t = clamp01(p.age / p.ttl);
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = (1 - t) * 0.7;
      ctx.fillRect(p.x - p.vx * 1.4 - 0.8, p.y - p.vy * 1.4 - 0.8, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
}

function drawPuffs(ctx, view) {
  const puffs = view.fxPuffs;
  if (Array.isArray(puffs)) {
    for (const puff of puffs) {
      const t = clamp01(puff.age / puff.ttl);
      const alpha = (1 - t) * 0.9;
      circle(ctx, puff.x, puff.y, puff.r);
      ctx.fillStyle = puff.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      circle(ctx, puff.x - puff.r * 0.32, puff.y - puff.r * 0.34, puff.r * 0.46);
      ctx.fillStyle = 'rgba(247,243,232,0.10)';
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawParticleLayer(ctx, view) {
  drawSparks(ctx, view);
  drawPuffs(ctx, view);
}

export function drawFx(ctx, state, view) {
  if (!ctx || !view) return;
  stepFx(view);
  drawRings(ctx, view);
  drawParticleLayer(ctx, view);
}

// scene's compatibility shims: same layers, split so later sessions can reorder them.
export function drawBlasts(ctx, state, view) {
  void state;
  if (!ctx || !view) return;
  drawRings(ctx, view);
}

export function drawParticles(ctx, state, view) {
  void state;
  if (!ctx || !view) return;
  drawParticleLayer(ctx, view);
}

export function drawCameraFlash(ctx, view) {
  if (!ctx || !view || !view.camFlash) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Number(view.camFlashAlpha) || 0);
  ctx.fillStyle = view.camFlash.color || BLAST;
  ctx.fillRect(0, 0, 1280, 800);
  ctx.restore();
}

function combatFloaterColor(text) {
  const t = String(text);
  if (t.startsWith('VAULT')) return palette.vault;
  if (t.startsWith('-')) return palette.vault;
  if (t.startsWith('+')) return BLAST;
  return CHALK;
}

export function drawFloaters(ctx, state) {
  if (!ctx || !state || !Array.isArray(state.floaters)) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const floater of state.floaters) {
    if (!floater || !Number.isFinite(floater.x) || !Number.isFinite(floater.y)) continue;
    const ttl = Number.isFinite(floater.ttl) ? floater.ttl : BASE_FLOAT_TICKS;
    const life = Number.isFinite(floater.ttlMax) ? floater.ttlMax : BASE_FLOAT_TICKS;
    const t = clamp01(1 - ttl / Math.max(1, life));
    const big = Boolean(floater.big);
    const size = big ? 30 + Math.round(6 * (1 - t)) : 15;
    const rise = big ? 54 : 34;
    const x = floater.x;
    const y = floater.y - 10 - rise * (1 - (1 - t) * (1 - t));
    const alpha = t > 0.68 ? clamp01((1 - t) / 0.32) : 1;
    const scale = big ? 1 + Math.max(0, 0.3 - t) * 1.4 : 1;
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${size}px ${CONDENSED}`;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const text = String(floater.text ?? '');
    const color = floater.color || (big ? BLAST : combatFloaterColor(text));
    if (big) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = INK;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255,246,210,0.75)';
      ctx.strokeText(text, 1.5, -1.5);
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(35,32,27,0.85)';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawFields(ctx, state) {
  if (!ctx || !state || !Array.isArray(state.fields)) return;
  const tick = Number.isFinite(state.tick) ? state.tick : 0;
  for (const f of state.fields) {
    if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) continue;
    const r = Math.max(8, Number(f.radiusPx) || CELL);
    const edge = clamp01((Number(f.ticksLeft) || 0) / 24);
    if (f.kind === 'burn') {
      const grad = ctx.createRadialGradient(f.x, f.y, r * 0.1, f.x, f.y, r);
      grad.addColorStop(0, `rgba(255,194,31,${0.13 * edge})`);
      grad.addColorStop(0.5, `rgba(255,122,26,${0.1 * edge})`);
      grad.addColorStop(0.85, `rgba(196,71,31,${0.06 * edge})`);
      grad.addColorStop(1, 'rgba(122,42,24,0)');
      ctx.fillStyle = grad;
      ellipse(ctx, f.x, f.y, r, r * 0.7);
      ctx.fill();
      ctx.strokeStyle = `rgba(196,71,31,${0.55 * edge})`;
      ctx.lineWidth = 1.8;
      ellipse(ctx, f.x, f.y, r * 0.92, r * 0.64);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,122,26,${0.35 * edge})`;
      ctx.lineWidth = 1;
      ellipse(ctx, f.x, f.y, r * 0.7, r * 0.49);
      ctx.stroke();
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * TAU + Math.sin(tick * 0.05 + i) * 0.3;
        const d = r * (0.3 + 0.45 * ((i * 37) % 10) / 10);
        const h = 4 + 4 * Math.abs(Math.sin(tick * 0.16 + i * 1.7));
        const fx = f.x + Math.cos(a) * d;
        const fy = f.y + Math.sin(a) * d * 0.7;
        ctx.fillStyle = i % 2 ? `rgba(255,194,31,${0.75 * edge})` : `rgba(255,122,26,${0.8 * edge})`;
        ctx.beginPath();
        ctx.moveTo(fx, fy - h);
        ctx.lineTo(fx + 2.6, fy + 1);
        ctx.lineTo(fx - 2.6, fy + 1);
        ctx.fill();
      }
    } else if (f.kind === 'frost') {
      const grad = ctx.createRadialGradient(f.x, f.y, r * 0.1, f.x, f.y, r);
      grad.addColorStop(0, `rgba(216,244,255,${0.34 * edge})`);
      grad.addColorStop(0.6, `rgba(127,212,255,${0.24 * edge})`);
      grad.addColorStop(1, 'rgba(15,94,99,0)');
      ctx.fillStyle = grad;
      ellipse(ctx, f.x, f.y, r, r * 0.7);
      ctx.fill();
      ctx.strokeStyle = `rgba(15,94,99,${0.35 * edge})`;
      ctx.lineWidth = 1.6;
      ellipse(ctx, f.x, f.y, r * 0.86, r * 0.6);
      ctx.stroke();
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * TAU + tick * 0.01;
        const d = r * 0.55;
        snowflake(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.65, 3.4, `rgba(15,94,63,${0.55 * edge})`, 1);
      }
    }
  }
}
