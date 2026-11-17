// Headless balance table (greedy + careful bots across difficulties and seeds) plus determinism and idle-loses proofs.

import * as sim from '../game/src/sim.js';
import { greedyBot, carefulBot, botStep } from './stageplan.mjs';

const DIFFS = Object.freeze(['kindling', 'blaze', 'inferno']);
const SEEDS = Object.freeze([7, 21]);
const MAX_TICKS = 400000;
const BOTS = Object.freeze([['greedy', greedyBot], ['careful', carefulBot]]);

function runOut(bot, seed, diffKey, maxTicks = MAX_TICKS) {
  const state = sim.createRun(seed, diffKey);
  while (state.mode !== 'won' && state.mode !== 'lost' && state.tick < maxTicks) botStep(state, bot);
  const result = state.mode === 'won' ? 'won' : state.mode === 'lost' ? 'lost' : 'timed-out';
  return {
    bot: '',
    difficulty: diffKey,
    seed,
    result,
    score: state.score || 0,
    bestChain: state.bestChain || 0,
    ticks: state.tick || 0,
    state,
  };
}

function idleRun(seed, diffKey, maxTicks = MAX_TICKS) {
  const state = sim.createRun(seed, diffKey);
  while (state.mode !== 'won' && state.mode !== 'lost' && state.tick < maxTicks) sim.stepRun(state);
  return state;
}

function main() {
  console.log('KEGFALL balance - headless bots over the real sim');
  const header = ['bot', 'difficulty', 'seed', 'result', 'score', 'bestChain', 'ticks'];
  const rows = [header];
  const outcomes = [];
  for (const [name, bot] of BOTS) {
    for (const diffKey of DIFFS) {
      for (const seed of SEEDS) {
        const run = runOut(bot, seed, diffKey);
        run.bot = name;
        outcomes.push(run);
        rows.push([name, diffKey, String(seed), run.result, String(run.score), `x${run.bestChain}`, String(run.ticks)]);
      }
    }
  }
  const widths = header.map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  for (const row of rows) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd());

  const first = runOut(greedyBot, 7, 'blaze', MAX_TICKS);
  const second = runOut(greedyBot, 7, 'blaze', MAX_TICKS);
  const hashA = sim.hashRun(first.state);
  const hashB = sim.hashRun(second.state);
  const determinism = hashA === hashB;
  console.log(`DETERMINISM ${determinism ? 'PASS' : 'FAIL'} (greedy blaze seed 7: ${hashA} vs ${hashB})`);

  const idle = idleRun(7, 'blaze');
  const idleLoses = idle.mode === 'lost';
  console.log(`IDLE-LOSES ${idleLoses ? 'PASS' : 'FAIL'} (idle blaze seed 7 ended ${idle.mode}, vault ${idle.vault}, tick ${idle.tick})`);

  const wins = outcomes.filter((run) => run.result === 'won');
  for (const [name] of BOTS) {
    const mine = outcomes.filter((run) => run.bot === name);
    const won = mine.filter((run) => run.result === 'won');
    const kindling = mine.filter((run) => run.difficulty === 'kindling');
    const kWin = kindling.filter((run) => run.result === 'won').length;
    console.log(`SUMMARY ${name}: ${won.length}/${mine.length} wins, kindling ${kWin}/${kindling.length}, best chain x${Math.max(...mine.map((r) => r.bestChain))}, top score ${Math.max(...mine.map((r) => r.score))}`);
  }
  console.log(`SUMMARY total wins ${wins.length}/${outcomes.length}`);

  process.exitCode = determinism ? 0 : 1;
}

main();
