// Draws the Sootkin: one readable painter per enemy kind, from 30px sootlings to the 90px Colossus and its MEGA KEG.

import { ENEMIES, palette } from '../config.js';

const TAU = Math.PI * 2;
const ENEMY_DEFS = new Map(ENEMIES.map((def) => [def.key, def]));

const INK = palette.ink;
const CHALK = palette.chalk;
const EMBER = palette.ember;
const BLAST = palette.blast;
const FROST = palette.frost;
const SOOT = '#2e2922';
const SOOT_LIGHT = '#4a4036';
const IRON = '#4d4036';
const IRON_DARK = '#2b241e';
const IRON_LIGHT = '#7c6d5d';
const BRASS = '#c9963c';
const BRASS_LIGHT = '#f2cf7a';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU);
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

function inkShape(ctx, path, fill, lineWidth = 2) {
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function flameShape(ctx, x, y, h, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + h * 0.7, y - h * 0.1, x + h * 0.28, y + h * 0.55);
  ctx.quadraticCurveTo(x, y + h * 0.8, x - h * 0.28, y + h * 0.55);
  ctx.quadraticCurveTo(x - h * 0.7, y - h * 0.1, x, y - h);
  ctx.fillStyle = color;
  ctx.fill();
}

function sparkle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y - 0.8, r * 2, 1.6);
  ctx.fillRect(x - 0.8, y - r, 1.6, r * 2);
}

function enemyPhase(enemy) {
  const id = Number(enemy.id) || 1;
  return (id * 0.618034 + (Number(enemy.weavePhase) || 0) * 0.7) % 1;
}

function drawShadow(ctx, radius, lift = 0) {
  ellipse(ctx, 0, 2 + lift * 0.2, radius * 0.72, radius * 0.26);
  ctx.fillStyle = 'rgba(35,32,27,0.26)';
  ctx.fill();
}

function drawEyes(ctx, x1, x2, y, size, blink) {
  const half = size / 2;
  if (blink) {
    ctx.fillStyle = SOOT;
    ctx.fillRect(x1 - half, y - half * 0.3, size, size * 0.6);
    ctx.fillRect(x2 - half, y - half * 0.3, size, size * 0.6);
    return;
  }
  circle(ctx, x1, y, half);
  ctx.fillStyle = BLAST;
  ctx.fill();
  circle(ctx, x2, y, half);
  ctx.fill();
  circle(ctx, x1 - half * 0.2, y - half * 0.2, half * 0.45);
  ctx.fillStyle = CHALK;
  ctx.fill();
  circle(ctx, x2 - half * 0.2, y - half * 0.2, half * 0.45);
  ctx.fill();
}

function drawSack(ctx, x, y, r, color = '#9c6b3f') {
  inkShape(ctx, () => ellipse(ctx, x, y, r, r * 1.08, -0.18), color, 1.6);
  ctx.strokeStyle = '#6b4827';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y - r * 0.62);
  ctx.lineTo(x + r * 0.35, y - r * 0.86);
  ctx.stroke();
  ctx.fillStyle = '#6b4827';
  circle(ctx, x + r * 0.1, y - r * 0.9, 1.6);
  ctx.fill();
}

function drawImpBody(ctx, r, bite, blink) {
  inkShape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.7);
    ctx.lineTo(-r * 0.22, -r * 1.18);
    ctx.lineTo(r * 0.04, -r * 0.82);
    ctx.closePath();
  }, SOOT, 1.6);
  inkShape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.7);
    ctx.lineTo(r * 0.84, -r * 1.14);
    ctx.lineTo(r * 0.94, -r * 0.55);
    ctx.closePath();
  }, SOOT, 1.6);
  inkShape(ctx, () => ellipse(ctx, 0, 0, r, r * 0.92), SOOT, 1.8);
  circle(ctx, -r * 0.36, -r * 0.34, r * 0.3);
  ctx.fillStyle = SOOT_LIGHT;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
  drawEyes(ctx, -r * 0.34, r * 0.34, -r * 0.12, Math.max(2.6, r * 0.3), blink);
  ctx.strokeStyle = '#1a1713';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, r * 0.2, r * 0.32, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  if (bite) {
    ctx.fillStyle = EMBER;
    for (let i = 0; i < 3; i += 1) {
      const x = -r * 0.18 + i * r * 0.18;
      ctx.beginPath();
      ctx.moveTo(x, r * 0.42);
      ctx.lineTo(x + r * 0.08, r * 0.58);
      ctx.lineTo(x + r * 0.16, r * 0.42);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawSootling(ctx, r, tick, phase, blink) {
  const bob = Math.sin(tick * 0.14 + phase * TAU) * r * 0.08;
  ctx.translate(0, -bob);
  drawImpBody(ctx, r, false, blink);
  drawSack(ctx, r * 0.82, r * 0.56, r * 0.38);
}

function drawPowderImp(ctx, r, tick, phase, blink) {
  const bob = Math.sin(tick * 0.17 + phase * TAU) * r * 0.08;
  ctx.translate(0, -bob);
  drawImpBody(ctx, r * 0.92, true, blink);
  const kw = r * 0.78;
  const kh = r * 0.6;
  const ky = -r * 1.62;
  inkShape(ctx, () => roundRect(ctx, -kw / 2, ky, kw, kh, kw * 0.24), '#9c5a30', 1.6);
  ctx.fillStyle = INK;
  ctx.fillRect(-kw / 2 - 1, ky + kh * 0.28, kw + 2, 2);
  ctx.fillRect(-kw / 2 - 1, ky + kh * 0.7, kw + 2, 2);
  ctx.strokeStyle = '#5c5242';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, ky);
  ctx.quadraticCurveTo(2, ky - 5, -1, ky - 9);
  ctx.stroke();
  const flick = 0.7 + 0.3 * Math.sin(tick * 0.9 + phase * 9);
  circle(ctx, -1, ky - 10, 3.6 * flick);
  ctx.fillStyle = 'rgba(255,122,26,0.4)';
  ctx.fill();
  circle(ctx, -1, ky - 10, 2 * flick);
  ctx.fillStyle = BLAST;
  ctx.fill();
}

function drawWisp(ctx, r, tick, phase) {
  const lean = Math.sin(phase * TAU) * r * 0.34;
  const flick = Math.sin(tick * 0.32 + phase * TAU) * 0.12;
  ctx.save();
  ctx.rotate(lean / r * 0.45);
  flameShape(ctx, 0.5, -r * 0.22, r * 1.5 * (1 + flick), EMBER);
  flameShape(ctx, 0, -r * 0.32, r * 1.06 * (1 + flick * 0.6), BLAST);
  flameShape(ctx, 0, -r * 0.4, r * 0.6, CHALK);
  ctx.fillStyle = 'rgba(255,194,31,0.22)';
  ellipse(ctx, 0, -r * 1.42, r * 0.42, r * 0.3);
  ctx.fill();
  ctx.fillStyle = SOOT;
  circle(ctx, -r * 0.17, -r * 0.72, 2.2);
  ctx.fill();
  circle(ctx, r * 0.17, -r * 0.72, 2.2);
  ctx.fill();
  ctx.fillStyle = CHALK;
  ctx.fillRect(-r * 0.18, -r * 0.74, 1.1, 1.1);
  ctx.fillRect(r * 0.15, -r * 0.74, 1.1, 1.1);
  ctx.fillStyle = 'rgba(255,194,31,0.75)';
  for (let i = 0; i < 4; i += 1) {
    const k = (tick * 0.06 + i * 0.27 + phase) % 1;
    const sx = Math.sin((phase + i * 0.37) * TAU) * r * 0.3 + lean * 0.4;
    const sy = -r * 1.7 - k * r * 1.1;
    ctx.globalAlpha = 1 - k;
    ctx.fillRect(sx - 1.2, sy - 1.2, 2.4, 2.4);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBrute(ctx, r, tick, phase) {
  const bob = Math.sin(tick * 0.07 + phase * TAU) * r * 0.06;
  ctx.translate(0, -bob);
  ctx.fillStyle = INK;
  for (const side of [-1, 1]) {
    roundRect(ctx, side * r * 0.5 - r * 0.17, r * 0.42, r * 0.34, r * 0.5, r * 0.1);
    ctx.fill();
  }
  inkShape(ctx, () => ellipse(ctx, 0, 0, r, r * 1.02), IRON_DARK, 2.2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ellipse(ctx, -r * 0.32, -r * 0.35, r * 0.36, r * 0.24, -0.5);
  ctx.fill();
  ctx.strokeStyle = EMBER;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.52, -r * 0.4);
  ctx.lineTo(-r * 0.18, -r * 0.1);
  ctx.lineTo(-r * 0.32, r * 0.26);
  ctx.lineTo(0, r * 0.48);
  ctx.moveTo(r * 0.5, -r * 0.5);
  ctx.lineTo(r * 0.24, -r * 0.18);
  ctx.lineTo(r * 0.44, r * 0.12);
  ctx.stroke();
  ctx.strokeStyle = BLAST;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.1);
  ctx.lineTo(-r * 0.1, r * 0.04);
  ctx.stroke();
  circle(ctx, -r * 0.32, -r * 0.22, r * 0.12);
  ctx.fillStyle = '#ffb24a';
  ctx.fill();
  circle(ctx, r * 0.32, -r * 0.22, r * 0.12);
  ctx.fill();
  ctx.fillStyle = CHALK;
  ctx.fillRect(-r * 0.36, -r * 0.26, r * 0.08, r * 0.08);
  ctx.fillRect(r * 0.28, -r * 0.26, r * 0.08, r * 0.08);
  ctx.fillStyle = IRON_LIGHT;
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU + 0.2;
    circle(ctx, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.92, 1.7);
    ctx.fill();
  }
  ctx.fillStyle = '#3a3129';
  ctx.fillRect(-r * 0.42, r * 0.28, r * 0.84, r * 0.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-r * 0.42, r * 0.28, r * 0.84, r * 0.2);
  ctx.fillStyle = '#8e8272';
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(-r * 0.36 + i * r * 0.22, r * 0.33, r * 0.08, r * 0.1);
  }
}

function drawTwinsack(ctx, r, tick, phase, blink) {
  const bob = Math.sin(tick * 0.15 + phase * TAU) * r * 0.07;
  ctx.translate(0, -bob);
  drawSack(ctx, 0, -r * 0.5, r * 0.62, '#a87844');
  ctx.fillStyle = '#7a512b';
  ctx.fillRect(-r * 0.5, -r * 0.72, r, r * 0.12);
  ctx.fillStyle = '#6b4827';
  circle(ctx, -r * 0.18, -r * 0.76, 1.6);
  ctx.fill();
  circle(ctx, r * 0.18, -r * 0.76, 1.6);
  ctx.fill();
  const sway = Math.sin(tick * 0.13 + phase * TAU) * 1.2;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.58 + side * sway, r * 0.28);
    ctx.scale(0.72, 0.72);
    drawImpBody(ctx, r, true, blink);
    ctx.restore();
  }
}

function drawChimney(ctx, x, baseY, h, tick, phase, lean = 0) {
  ctx.fillStyle = IRON_LIGHT;
  ctx.fillRect(x - 4 + lean, baseY - h, 8, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x - 4 + lean, baseY - h, 8, h);
  ctx.fillStyle = IRON_DARK;
  ctx.fillRect(x - 6 + lean, baseY - h - 4, 12, 5);
  for (let i = 0; i < 3; i += 1) {
    const k = (tick * 0.012 + i * 0.33 + phase) % 1;
    const sx = x + lean + Math.sin(k * 6 + phase * 9 + i) * 12 * k;
    const sy = baseY - h - 8 - k * 56;
    circle(ctx, sx, sy, 5 + k * 9);
    ctx.fillStyle = `rgba(70,60,50,${0.5 * (1 - k)})`;
    ctx.fill();
  }
}

function drawMegaKeg(ctx, x, y, r, tick) {
  ctx.save();
  ctx.translate(x, y);
  const grad = ctx.createLinearGradient(-r, 0, r, 0);
  grad.addColorStop(0, '#7a4c24');
  grad.addColorStop(0.35, '#b47b42');
  grad.addColorStop(0.52, '#d6a166');
  grad.addColorStop(1, '#7a4c24');
  inkShape(ctx, () => roundRect(ctx, -r, -r * 1.15, r * 2, r * 2.3, r * 0.28), grad, 3);
  ctx.fillStyle = '#3a332a';
  for (const yb of [-r * 0.72, -r * 0.08, r * 0.58]) ctx.fillRect(-r - 1.5, yb, r * 2 + 3, r * 0.17);
  ctx.fillStyle = BLAST;
  ctx.fillRect(-r - 1.5, -r * 0.12, r * 2 + 3, 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-r * 0.74, -r * 1.02, r * 0.16, r * 2.04);
  const fuse = 0.7 + 0.3 * Math.sin(tick * 0.8);
  circle(ctx, 0, -r * 1.42, r * 0.2 * fuse);
  ctx.fillStyle = EMBER;
  ctx.fill();
  circle(ctx, 0, -r * 1.42, r * 0.1 * fuse);
  ctx.fillStyle = CHALK;
  ctx.fill();
  ctx.restore();
}

function drawColossus(ctx, r, tick, phase, hpRatio) {
  const stomp = Math.sin(tick * 0.045 + phase * TAU);
  const bob = Math.max(0, stomp) * r * 0.05;
  ctx.translate(0, -bob);
  for (const side of [-1, 1]) {
    roundRect(ctx, side * r * 0.5 - r * 0.2, r * 0.5 + Math.max(0, -stomp) * 2, r * 0.4, r * 0.58, r * 0.1);
    ctx.fillStyle = IRON_DARK;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  drawChimney(ctx, -r * 0.62, -r * 0.72, r * 0.55, tick, phase, -0.06);
  drawChimney(ctx, r * 0.62, -r * 0.72, r * 0.55, tick, phase, 0.06);
  drawChimney(ctx, 0, -r * 0.86, r * 0.42, tick + 7, phase + 0.4);
  drawMegaKeg(ctx, r * 0.62, -r * 1.16, r * 0.4, tick);

  ctx.strokeStyle = IRON;
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.82, -r * 0.1);
  ctx.quadraticCurveTo(-r * 1.05, r * 0.1, -r * 0.92, r * 0.2);
  ctx.moveTo(r * 0.82, -r * 0.1);
  ctx.quadraticCurveTo(r * 1.05, r * 0.1, r * 0.92, r * 0.2);
  ctx.stroke();

  inkShape(ctx, () => ellipse(ctx, 0, 0, r, r * 1.08), IRON_DARK, 2.6);
  inkShape(ctx, () => roundRect(ctx, -r * 0.24, -r * 0.78, r * 0.48, r * 0.38, r * 0.06), '#5d5044', 2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ellipse(ctx, -r * 0.42, -r * 0.4, r * 0.3, r * 0.18, -0.6);
  ctx.fill();

  const heat = 0.65 + 0.35 * Math.sin(tick * 0.09 + phase * TAU);
  ctx.strokeStyle = `rgba(255,122,26,${0.55 + heat * 0.4})`;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.62);
  ctx.lineTo(-r * 0.34, -r * 0.3);
  ctx.lineTo(-r * 0.48, r * 0.05);
  ctx.lineTo(-r * 0.2, r * 0.36);
  ctx.lineTo(-r * 0.32, r * 0.66);
  ctx.moveTo(r * 0.58, -r * 0.55);
  ctx.lineTo(r * 0.32, -r * 0.22);
  ctx.lineTo(r * 0.5, r * 0.12);
  ctx.lineTo(r * 0.26, r * 0.42);
  ctx.stroke();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -r * 0.3);
  ctx.lineTo(-r * 0.48, r * 0.05);
  ctx.moveTo(r * 0.32, -r * 0.22);
  ctx.lineTo(r * 0.5, r * 0.12);
  ctx.stroke();

  ctx.fillStyle = '#c8b8a0';
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU + 0.12;
    circle(ctx, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.97, 2.6);
    ctx.fill();
    ctx.fillStyle = '#705f4e';
    ctx.fillRect(Math.cos(a) * r * 0.9 - 1.6, Math.sin(a) * r * 0.97 - 0.6, 3.2, 1.2);
    ctx.fillStyle = '#c8b8a0';
  }

  const eyeY = -r * 0.26;
  for (const side of [-1, 1]) {
    const ex = side * r * 0.3;
    circle(ctx, ex, eyeY, r * 0.13);
    ctx.fillStyle = '#ff9a2e';
    ctx.fill();
    circle(ctx, ex, eyeY, r * 0.065);
    ctx.fillStyle = BLAST;
    ctx.fill();
    circle(ctx, ex - r * 0.03, eyeY - r * 0.03, r * 0.025);
    ctx.fillStyle = CHALK;
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(-r * 0.5, r * 0.12, r * 1, r * 0.12);
  ctx.strokeStyle = EMBER;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, r * 0.18);
  ctx.lineTo(r * 0.36, r * 0.18);
  ctx.stroke();

  drawCrownBar(ctx, r, hpRatio);
}

function drawCrownBar(ctx, r, hpRatio) {
  const w = r * 1.7;
  const h = 7;
  const y = -r * 1.44;
  ctx.fillStyle = INK;
  ctx.fillRect(-w / 2 - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#4a3f33';
  ctx.fillRect(-w / 2, y, w, h);
  const ratio = clamp01(hpRatio);
  ctx.fillStyle = ratio > 0.5 ? BLAST : '#ff7a1a';
  ctx.fillRect(-w / 2, y, w * ratio, h);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(-w / 2, y, w * ratio, 2);
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 4, y - h);
  ctx.lineTo(-w / 2 + w * 0.16, y - h * 2.4);
  ctx.lineTo(-w / 2 + w * 0.32, y - h * 1.2);
  ctx.lineTo(-w / 2 + w * 0.5, y - h * 2.8);
  ctx.lineTo(-w / 2 + w * 0.68, y - h * 1.2);
  ctx.lineTo(-w / 2 + w * 0.84, y - h * 2.4);
  ctx.lineTo(w / 2 + 4, y - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawHpArc(ctx, r, ratio) {
  if (!(ratio > 0) || ratio >= 0.999) return;
  const rad = r * 1.12;
  ctx.lineCap = 'butt';
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, rad, -Math.PI * 0.86, -Math.PI * 0.14);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = ratio > 0.5 ? BLAST : EMBER;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, rad, -Math.PI * 0.86, -Math.PI * (0.86 - 0.72 * ratio));
  ctx.stroke();
}

function drawHitFlash(ctx, r) {
  ellipse(ctx, 0, 0, r * 1.02, r * 1.02);
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fill();
}

function drawSlowWash(ctx, r, tick) {
  ctx.save();
  ellipse(ctx, 0, 0, r * 1.05, r * 1.05);
  ctx.fillStyle = 'rgba(127,212,255,0.38)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(216,244,255,0.75)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i += 1) {
    const yy = -r * 0.7 + ((tick * 0.5 + i * r * 0.6) % (r * 1.4));
    ctx.fillStyle = 'rgba(247,243,232,0.7)';
    ctx.fillRect(-r * 0.6 + i * r * 0.3, yy, 2, 2);
  }
  ctx.restore();
}

function drawBurnFlicker(ctx, r, tick, phase) {
  const flick = 0.6 + 0.4 * Math.sin(tick * 0.7 + phase * 17);
  ctx.save();
  ctx.globalAlpha = 0.4 + flick * 0.35;
  for (let i = 0; i < 3; i += 1) {
    const x = (i - 1) * r * 0.42 + Math.sin(tick * 0.3 + i) * 2;
    flameShape(ctx, x, -r * 0.72, r * (0.5 + i * 0.1) * flick, i === 1 ? BLAST : EMBER);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

const PAINTERS = Object.freeze({
  sootling: (ctx, r, tick, phase, blink) => drawSootling(ctx, r, tick, phase, blink),
  imp: (ctx, r, tick, phase, blink) => drawPowderImp(ctx, r, tick, phase, blink),
  wisp: (ctx, r, tick, phase) => drawWisp(ctx, r, tick, phase),
  brute: (ctx, r, tick, phase) => drawBrute(ctx, r, tick, phase),
  twinsack: (ctx, r, tick, phase, blink) => drawTwinsack(ctx, r, tick, phase, blink),
});

function enemyRadius(enemy) {
  const def = enemy.def || ENEMY_DEFS.get(enemy.kind) || ENEMY_DEFS.get('sootling');
  const declared = Number(enemy.radius) || def.size * 76;
  return def.key === 'colossus' ? Math.max(45, declared) * 0.9 : declared * 0.72;
}

export function drawEnemies(ctx, state, view) {
  void view;
  if (!ctx || !state || !Array.isArray(state.enemies)) return;
  const tick = Number.isFinite(state.tick) ? state.tick : 0;
  for (const enemy of state.enemies) {
    if (!enemy || !(enemy.hp > 0) || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) continue;
    const def = enemy.def || ENEMY_DEFS.get(enemy.kind) || ENEMY_DEFS.get('sootling');
    const r = enemyRadius(enemy);
    const phase = enemyPhase(enemy);
    const blink = ((tick + (Number(enemy.id) || 0) * 37) % 173) < 4;
    const ratio = Number(enemy.maxHp) > 0 ? clamp01(enemy.hp / enemy.maxHp) : 1;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    drawShadow(ctx, r * (def.key === 'colossus' ? 1.1 : 1));
    if (def.key === 'colossus') {
      drawColossus(ctx, r, tick, phase, ratio);
    } else {
      const painter = PAINTERS[def.key];
      if (painter) painter(ctx, r, tick, phase, blink);
      if (enemy.slowTicks > 0) drawSlowWash(ctx, r, tick);
      if (enemy.burnTicks > 0) drawBurnFlicker(ctx, r, tick, phase);
      if (enemy.hitFlash > 0) drawHitFlash(ctx, r);
      drawHpArc(ctx, r, ratio);
    }
    if (def.key === 'colossus' && enemy.hitFlash > 0) drawHitFlash(ctx, r);
    ctx.restore();
  }
}
