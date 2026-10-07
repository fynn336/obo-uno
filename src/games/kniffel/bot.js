import { CATEGORIES, scoreFor } from './scoring.js';

// Diese Kategorien zählen fest; liegt so ein Wurf schon vor, hört der Bot auf zu würfeln.
const FIXED = ['fullHouse', 'smallStraight', 'largeStraight', 'kniffel'];
// Reihenfolge, in der der Bot Kategorien streicht, wenn nichts passt
const SACRIFICE = ['ones', 'kniffel', 'twos', 'largeStraight', 'fourKind', 'threes', 'smallStraight',
  'fullHouse', 'threeKind', 'fours', 'fives', 'sixes', 'chance'];

export function botMove(state, botId) {
  if (state.phase !== 'playing' || state.players[state.current].id !== botId) return null;
  const sheet = state.players[state.current].sheet;
  const open = CATEGORIES.filter((category) => sheet[category.key] === null);
  if (state.rollsLeft === 3) return { type: 'roll', keep: Array(5).fill(false) };
  const best = bestCategory(open, state.dice);
  const goodEnough = FIXED.includes(best.key) && best.points > 0;
  if (state.rollsLeft === 0 || goodEnough) return { type: 'score', category: best.key };
  return { type: 'roll', keep: diceToKeep(state.dice, open) };
}

// Höchste Punkte, Chance nur gedämpft; obere Kategorien mit mindestens drei Gleichen zählen extra (Bonus).
function bestCategory(open, dice) {
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

// Straße angefangen? Dann die Straße halten, sonst alle Würfel der häufigsten (bei Gleichstand höchsten) Zahl.
function diceToKeep(dice, open) {
  const openKeys = open.map((category) => category.key);
  const wantsStraight = openKeys.includes('smallStraight') || openKeys.includes('largeStraight');
  const run = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].find((faces) => faces.every((face) => dice.includes(face)));
  if (wantsStraight && run) {
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
