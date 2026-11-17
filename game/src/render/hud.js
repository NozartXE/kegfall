// Draws the play frame's heads-up display: objective, vault, roster, score, chain, build bar, barrage track, log and buttons.

import {
  KEGS,
  ENEMIES,
  CHARMS,
  SHIFTS,
  BARRAGE_COUNT,
  VAULT_MAX,
  STRIKE_COOLDOWN_TICKS,
  VIEW_W,
  VIEW_H,
} from '../config.js';
import { BARRAGES } from '../waves.js';
import {
  objectiveRect,
  chainRect,
  scoreRect,
  rosterRect,
  logRect,
  trackRect,
  buildBarRect,
  vaultRect,
  topBar,
  pointIn,
} from './layout.js';
import { CONDENSED, BODY, fitFont, wrapText } from './fit.js';
import { drawKegs } from './fx.js';
