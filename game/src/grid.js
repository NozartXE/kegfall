// Maps the playfield: cell centers, hit-testing, shift gates and the Vault mouth in field pixels.

import { COLS, ROWS, CELL } from './config.js';

const FIELD_X = 184;
const FIELD_Y = 196;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

export function fieldRect() {
  return { x: FIELD_X, y: FIELD_Y, w: COLS * CELL, h: ROWS * CELL };
}

export function cellCenter(col, row) {
  const c = clamp(Math.floor(col), 0, COLS - 1);
  const r = clamp(Math.floor(row), 0, ROWS - 1);
  return { x: FIELD_X + c * CELL + CELL / 2, y: FIELD_Y + r * CELL + CELL / 2, col: c, row: r };
}

export function inField(x, y) {
  const rect = fieldRect();
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export function cellAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !inField(x, y)) return null;
  return {
    col: Math.floor((x - FIELD_X) / CELL),
    row: Math.floor((y - FIELD_Y) / CELL),
  };
}

const GATE_COLS = Object.freeze({
  1: Object.freeze([2, 9]),
  2: Object.freeze([1, 6, 10]),
  3: Object.freeze([3, 8]),
});

export function gatesForShift(shift) {
  return (GATE_COLS[shift] || []).map((col) => ({ x: cellCenter(col, 0).x, y: FIELD_Y, col }));
}

export function vaultMouth() {
  return { x: 640, y: 728 };
}
