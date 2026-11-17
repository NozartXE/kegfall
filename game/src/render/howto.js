// Supplies the DOM how-to rows and almanac entries, pulled straight from config so every number is honest.

import { KEGS, ENEMIES, CHARMS, VAULT_MAX, BARRAGE_COUNT, CHAIN_WINDOW_TICKS, TICKS_PER_SECOND, START_SPARK } from '../config.js';

const secs = (ticks) => `${Math.round((ticks / TICKS_PER_SECOND) * 10) / 10}s`;

const KEG_SECOND_LINE = Object.freeze({
  powder: 'Medium blast, the reliable chain link.',
  oil: 'Large blast + burning ground.',
  mine: 'Cheap; fires itself when Sootkin get close.',
  frost: 'Small blast + slow field.',
});

function kegStatLine(keg) {
  const bits = [`COST ${keg.cost} SPARK`, `BLAST ${keg.radius.toFixed(1)} CELLS`, `DAMAGE ${keg.damage}`];
  if (keg.burnTicks) bits.push(`BURNS ${secs(keg.burnTicks)}`);
  if (keg.slowTicks) bits.push(`SLOWS ${secs(keg.slowTicks)} TO ${Math.round((keg.slowMul || 1) * 100)}%`);
  if (keg.proximity) bits.push(`AUTO AT ${keg.proximity.toFixed(1)} CELLS`);
  if (keg.unlockShift) bits.push('UNLOCKS IN SHIFT 2 (NOON)');
  return bits.join(' - ');
}

function enemyStatLine(enemy) {
  const bits = [`HP ${enemy.hp}`, `SCORE ${enemy.score}`, `SPARK ${enemy.spark}`];
  if (enemy.boss) {
    bits.unshift('BOSS');
    bits.push(`MEGA KEG ${enemy.megaKegRadius.toFixed(1)} CELLS / ${enemy.megaKegDamage} DMG`);
    bits.push('THE FINAL BARRAGE');
  } else {
    bits.push(`SPEED ${enemy.speed.toFixed(2)}`);
    if (enemy.armor) bits.push(`ARMOUR ${Math.round(enemy.armor * 100)}% BLAST RESIST`);
    if (enemy.volatile) bits.push(`DEATH BLAST ${enemy.deathBlastRadius.toFixed(2)} CELLS / ${enemy.deathBlastDamage} DMG`);
  }
  return bits.join(' - ');
}

export function howtoRows() {
  return [
    {
      icon: 'keg',
      title: 'PLACE',
      text: `Click a plaza cell to plant a keg; ${KEGS.length} kinds cost ${Math.min(...KEGS.map((k) => k.cost))}-${Math.max(
        ...KEGS.map((k) => k.cost),
      )} of your ${START_SPARK} starting SPARK.`,
    },
    {
      icon: 'fuse',
      title: 'IGNITE',
      text: `Click a placed keg or hit SPARK STRIKE: one fuse burns ${secs(48)} and the CHAIN does the rest.`,
    },
    {
      icon: 'chain',
      title: 'CHAIN',
      text: `Every keg caught inside ${secs(CHAIN_WINDOW_TICKS)} of the last detonation adds to the CHAIN multiplier and pays SPARK.`,
    },
    {
      icon: 'vault',
      title: 'VAULT',
      text: `The ${VAULT_MAX} HP VAULT is the line you defend; keep every Sootkin off it or the run ends dry.`,
    },
    {
      icon: 'imp',
      title: 'ENEMIES',
      text: `${ENEMIES.length - 2} Sootkin kinds plus the Colossus: volatile imps, weaving wisps, armoured brutes, splitting twinsacks.`,
    },
    {
      icon: 'boss',
      title: 'BOSS',
      text: `Hold all ${BARRAGE_COUNT} barrages; barrage ${BARRAGE_COUNT} brings the Cinder Colossus and its MEGA KEG.`,
    },
  ];
}

export function almanacRows() {
  const enemies = ENEMIES.map((enemy) => ({
    icon: 'imp',
    kind: enemy.boss ? 'boss' : 'enemy',
    id: enemy.key,
    name: enemy.name,
    trait: enemy.trait,
    stat: enemyStatLine(enemy),
    color: enemy.color,
  }));
  const kegs = KEGS.map((keg) => ({
    icon: 'keg',
    kind: 'keg',
    id: keg.key,
    name: keg.name,
    trait: KEG_SECOND_LINE[keg.key] || keg.effect,
    stat: kegStatLine(keg),
    color: keg.color,
  }));
  return { enemies, kegs, charms: CHARMS.map((charm) => ({ id: charm.key, name: charm.name, text: charm.effect })) };
}
