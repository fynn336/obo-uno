import { chanceAtLeast, isHigher, MAEXCHEN, rank, valueOf, VALUES } from './values.js';

// Unter dieser Wahrscheinlichkeit, dass die Ansage stimmen kann, deckt der Bot auf.
const DOUBT_BELOW = 0.25;
// Schwer: Liegt die Ansage über dem knappsten Wert, war es meist ehrlich; sehr hohe Werte trotzdem prüfen.
const HARD_HIGH_CLAIM = 0.3;
// Leicht: lügt plump ein paar Stufen zu hoch
const EASY_LIE_STEPS = 3;
// Diese Ereignisse beenden eine Runde; Ansagen davor zählen nicht mehr.
const ROUND_ENDS = ['reveal', 'giveUp', 'out', 'left'];

// leicht: glaubt alles außer Mäxchen, lügt plump · mittel: deckt unwahrscheinliche Ansagen auf
// schwer: liest die Ansage davor mit und schätzt, wie oft die knappste Ansage gelogen ist
export function botMove(state, botId, level = 'medium') {
  if (state.phase === 'gameOver' || state.players[state.current].id !== botId) return null;
  if (state.phase === 'roll') return { type: 'roll' };
  if (state.phase === 'decide') return { type: doubts(state, level) ? 'doubt' : 'believe' };
  // Ehrlich, wenn der Wurf reicht; sonst lügen – mittel und schwer so knapp wie möglich.
  const actual = valueOf(state.dice);
  if (isHigher(actual, state.announced)) return { type: 'announce', value: actual };
  const steps = level === 'easy' ? EASY_LIE_STEPS : 1;
  return { type: 'announce', value: VALUES[Math.min(VALUES.length - 1, rank(state.announced) + steps)] };
}

function doubts(state, level) {
  const { announced } = state;
  if (announced === MAEXCHEN) return true;
  if (level === 'easy') return false;
  if (level === 'medium') return chanceAtLeast(announced) < DOUBT_BELOW;
  const before = previousAnnouncement(state);
  // Die erste Ansage einer Runde stimmt immer: Jeder Wurf ist höher als nichts.
  if (before === null) return false;
  const tightest = VALUES[rank(before) + 1];
  if (announced !== tightest) return chanceAtLeast(announced) < HARD_HIGH_CLAIM;
  // Knappste Ansage: ehrlich genau diesen Wert gewürfelt oder gelogen, weil der Wurf nicht reichte
  const honest = chanceAtLeast(tightest) - (tightest === MAEXCHEN ? 0 : chanceAtLeast(VALUES[rank(tightest) + 1]));
  const forced = 1 - chanceAtLeast(tightest);
  return honest < forced;
}

// Ansage vor der aktuellen in derselben Runde, aus dem öffentlichen Verlauf
function previousAnnouncement(state) {
  const events = state.events.slice(0, state.events.findLastIndex((e) => e.type === 'announce'));
  for (const event of events.reverse()) {
    if (ROUND_ENDS.includes(event.type)) return null;
    if (event.type === 'announce') return event.value;
  }
  return null;
}
