import { CATEGORIES, scoreFor } from './scoring.js';

// Diese Kategorien zählen fest; liegt so ein Wurf schon vor, hört der Bot auf zu würfeln.
const FIXED = ['fullHouse', 'smallStraight', 'largeStraight', 'kniffel'];
// Reihenfolge, in der der Bot Kategorien streicht, wenn nichts passt
const SACRIFICE = ['ones', 'kniffel', 'twos', 'largeStraight', 'fourKind', 'threes', 'smallStraight',
  'fullHouse', 'threeKind', 'fours', 'fives', 'sixes', 'chance'];
const DICE = 5;

// leicht: hält nur Pasche und nimmt stur die meisten Punkte · mittel: Straßen, Bonus, gedämpfte Chance
// schwer: rechnet für jede Halte-Möglichkeit den erwarteten Wert des nächsten Wurfs aus
export function botMove(state, botId, level = 'medium') {
  if (state.phase !== 'playing' || state.players[state.current].id !== botId) return null;
  const sheet = state.players[state.current].sheet;
  const open = CATEGORIES.filter((category) => sheet[category.key] === null);
  if (state.rollsLeft === 3) return { type: 'roll' };
  const best = level === 'easy' ? mostPoints(open, state.dice) : bestCategory(open, state.dice);
  let keep;
  if (level === 'hard') {
    keep = bestKeep(state.dice, open);
    if (keep.every(Boolean)) keep = null;
  } else {
    keep = FIXED.includes(best.key) && best.points > 0 ? null : diceToKeep(state.dice, open, level === 'easy');
  }
  if (state.rollsLeft === 0 || keep === null) return { type: 'score', category: best.key };
  // Erst sichtbar halten, dann würfeln
  if (keep.some((kept, i) => kept !== state.kept[i])) return { type: 'hold', keep };
  return { type: 'roll' };
}

// Höchste Punkte, Chance nur gedämpft; obere Kategorien mit mindestens drei Gleichen zählen extra (Bonus).
// Die Oberfläche nutzt das als Tipp für den Spieler.
export function bestCategory(open, dice) {
  const scored = open.map((category) => {
    const points = scoreFor(category.key, dice);
    const weight = category.key === 'chance' ? 0.6 : 1;
    const bonusHelp = category.upper && points >= 3 * (CATEGORIES.indexOf(category) + 1) ? 8 : 0;
    return { key: category.key, points, value: points * weight + bonusHelp };
  });
  const useful = scored.filter((s) => s.points > 0).sort((a, b) => b.value - a.value);
  if (useful.length > 0) return useful[0];
  const sacrifice = SACRIFICE.find((key) => scored.some((s) => s.key === key));
  return scored.find((s) => s.key === sacrifice);
}

function mostPoints(open, dice) {
  return open
    .map((category) => ({ key: category.key, points: scoreFor(category.key, dice) }))
    .reduce((best, s) => (s.points > best.points ? s : best));
}

// Straße angefangen? Dann die Straße halten, sonst alle Würfel der häufigsten (bei Gleichstand höchsten) Zahl.
function diceToKeep(dice, open, onlyPairs) {
  const openKeys = open.map((category) => category.key);
  const wantsStraight = openKeys.includes('smallStraight') || openKeys.includes('largeStraight');
  const run = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].find((faces) => faces.every((face) => dice.includes(face)));
  if (!onlyPairs && wantsStraight && run) {
    const used = new Set();
    return dice.map((face) => {
      if (!run.includes(face) || used.has(face)) return false;
      used.add(face);
      return true;
    });
  }
  const counts = [1, 2, 3, 4, 5, 6].map((face) => dice.filter((d) => d === face).length);
  const target = counts.reduce((best, count, i) => (count >= counts[best] ? i : best), 0) + 1;
  return dice.map((face) => face === target);
}

// Welche Würfel halten? Für jede Auswahl der erwartete Wert der besten Kategorie nach dem nächsten Wurf.
function bestKeep(dice, open) {
  const values = new Map();
  const valueOf = (faces) => {
    const id = [...faces].sort().join('');
    if (!values.has(id)) {
      const best = bestCategory(open, faces);
      values.set(id, best.points > 0 ? best.value : 0);
    }
    return values.get(id);
  };
  let best = { expected: -1, keep: null };
  for (let mask = 0; mask < 2 ** DICE; mask++) {
    const keep = dice.map((_, i) => Boolean(mask & (1 << i)));
    const kept = dice.filter((_, i) => keep[i]);
    const expected = outcomes(DICE - kept.length)
      .reduce((sum, [faces, chance]) => sum + chance * valueOf([...kept, ...faces]), 0);
    if (expected > best.expected) best = { expected, keep };
  }
  return best.keep;
}

const outcomeCache = new Map();

// Alle Ergebnisse beim Wurf mit count Würfeln als sortierte Augenzahlen mit Wahrscheinlichkeit
function outcomes(count) {
  if (outcomeCache.has(count)) return outcomeCache.get(count);
  const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
  const result = [];
  const build = (faces, from) => {
    if (faces.length === count) {
      const counts = [1, 2, 3, 4, 5, 6].map((face) => faces.filter((f) => f === face).length);
      const orderings = factorial(count) / counts.reduce((product, n) => product * factorial(n), 1);
      result.push([faces, orderings / 6 ** count]);
      return;
    }
    for (let face = from; face <= 6; face++) build([...faces, face], face);
  };
  build([], 1);
  outcomeCache.set(count, result);
  return result;
}
