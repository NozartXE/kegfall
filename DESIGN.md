# KEGFALL — design freeze (round 7 / game 5, best-game-01)

## One line
Chain-detonation defense: the Sootkin march on the Last Powderworks; you place
kegs, light one fuse, and the CHAIN does the rest — giant combo counter,
screen-filling cascades, score floaters everywhere. Real-time, dense, loud.

## Why this mechanic (distinctness, 2026-11-17 ~23:05 WIB pull)
No top-40 entry is a chain-detonation game (138 keyword matches are incidental:
curling combos, a defuse FPS, tether-slam). Time-echo is taken (#9 ECHOFALL).
Slingshot/orbital is capped (#39 NIGHTBLOOM 91.87%, genre ceiling ~89-90).
Rounds 1-6 proved: real-time dense-feedback loops win; sparse puzzlers lose.

## Fiction
- Warden **SORREL BRAND**, keeper of the Last Powderworks on Ember Quay.
- Enemies: the **SOOTKIN**, ember imps marching from the ash gates to crack the
  VAULT. WIN: hold all 9 barrages. LOSE: the Vault runs dry (10 HP).
- Boss on barrage 9: **THE CINDER COLOSSUS**, carrying a MEGA KEG.

## Core loop (fixed 60 Hz sim, seeded mulberry32, no wall-clock)
- Board: chalk-white quay plaza grid, 12 cols x 7 rows of build cells between
  the ash gates (top) and the Vault (bottom). Gates rotate per shift
  (DAWN east pair, NOON all three, DUSK west pair) so placement must adapt.
- Player verbs: PLACE a keg (spend SPARK), UPGRADE a keg (Lv2/Lv3, bigger
  blast), IGNITE a keg (click / tap: fuse burns 0.8 s with a spark trail),
  SPARK STRIKE (direct small blast, 6 s cooldown), pause / fast-forward.
- Kegs (build bar, 4 kinds): POWDER KEG (medium blast), OIL DRUM (large blast
  + burning ground 4 s), SPARK MINE (cheap, proximity auto-detonation, small
  blast), FROST KEG (unlocks shift 2: small damage + slow field).
- Chains: a blast that catches another keg arms its fuse (0.25 s); a blast or
  death that kills a POWDER IMP detonates it instantly. Detonations inside a
  1.2 s window increment CHAIN; kills score base x CHAIN multiplier; chain
  length also pays bonus SPARK. The CHAIN counter is huge, centre-top.
- Enemies (5 kinds + boss): SOOTLING (basic), POWDER IMP (volatile, explodes
  on death), EMBERWISP (fast, weaves), CINDERBRUTE (armoured, blast-resistant,
  slow), TWINSACK (splits into two Sootlings on death), CINDER COLOSSUS (boss:
  huge HP, spawns imps, its MEGA KEG makes the largest blast in the game).
- Run structure: 9 barrages over 3 shifts (DAWN / NOON / DUSK palettes and
  gate sets). Between barrages: draft 1 of 3 FIREWORK charms from a pool of 12
  (reroll costs SPARK), with an honest next-barrage forecast from the sim.
- Currencies: SPARK (build), VAULT 10 HP, SCORE with CHAIN multiplier.
- 3 difficulties: KINDLING / BLAZE / INFERNO. Endless AFTERGLOW mode after a
  win (line on title). 6 feats. Almanac. Options (music / sfx / shake
  sliders). Generative pentatonic WebAudio music + sfx. localStorage best,
  run history (last 3, honest), settings.

## Dossier architecture (SUNWRIGHT pattern, adopted whole)
Canvas 1280x800. Shot order (name order = judge order):
1. `1-play.jpg` — COVER IS PLAY: staged at the densest tick of a directed bot
   run (shift 2, mid-barrage, chain mid-cascade, target CHAIN x12+): WIN/LOSE
   objective banners, VAULT HP droplets, INCOMING roster with counts+traits,
   SCORE + BEST + CHAIN multiplier, SPARK + charms, 4-keg build bar with
   names/costs/effects, floating combat text (+240 CHAIN x7), event banner +
   3-line log, 9-barrage progress track with Colossus skull, pause/ff/mute,
   controls line. Mean luminance >= 0.45, no dark 64x64 block.
2. `2-title.jpg` — wordmark fills frame width, live demo sim behind, scope
   strip "4 keg kinds - 5 sootkin + the Colossus - 9 barrages - 12 firework
   charms - 3 difficulties", six-row icon rules digest with explicit WIN and
   LOSE rows, PLAY + BEST + FEATS, 3 difficulty buttons, AFTERGLOW endless
   line, HOW TO PLAY / OPTIONS / ALMANAC buttons, keycap controls footer.
3. `3-draft.jpg` — "THE SHIFT TURNS - PICK 1": three big charm roundels
   (key hints, names, effect text, synergy note), owned-charms run strip,
   honest next-barrage forecast (composition + danger note), reroll with
   visible SPARK cost. HUD hidden.
4. `4-results.jpg` — grade letter + score + NEW BEST, Colossus hero art,
   stat tiles, run metadata (difficulty, seed, time, delta vs best), grade
   thresholds with check/cross, LAST 3 RUNS history (losses in red, honest),
   YOUR BUILD charms summary, feats row, NEXT GOAL line, per-barrage graph,
   "R - RUN AGAIN" dominant.

## Source layout (every file opens with a one-line plain-English job comment)
index.html carries the pitch as an HTML comment (win/lose, scope, tech).
Root sim (DOM-free): config.js (all tuning + NAMES), rng.js, grid.js,
enemies.js, waves.js, blasts.js (detonation + chain engine), combat.js,
draft.js, sim.js, save.js, announce.js, audio.js, input.js, titledemo.js,
testhook.js, main.js. render/: board.js (quay diorama), fx.js (blasts,
particles, floaters), sootkin.js (enemy art), hud.js, scene.js, banner.js,
charms.js, results.js, howto.js, ruleicons.js, fit.js, layout.js.
ui/menus.js (DOM overlays), style.css.

## Verification
tools/balance.mjs: greedy + careful bots play full runs headless; difficulty
tuned from bot outcomes; determinism = identical run hash across repeats.
tools/stageplan.mjs picks the cover tick by density/action/floater score;
tools/check-shot-truth.mjs rebuilds every HUD number from a headless replay.
Capture via raw CDP (?shot= staging through testhook), zero console errors.
Dossier via `node main.ts` twice, byte-identical; kit check 13/0.
