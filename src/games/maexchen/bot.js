import { chanceAtLeast, isHigher, MAEXCHEN, rank, valueOf, VALUES } from './values.js';

// Unter dieser Wahrscheinlichkeit, dass die Ansage stimmen kann, deckt der Bot auf.
const DOUBT_BELOW = 0.4;

export function botMove(state, botId) {
  if (state.phase === 'gameOver' || state.players[state.current].id !== botId) return null;
  if (state.phase === 'roll') return { type: 'roll' };
  if (state.phase === 'decide') {
    const suspicious = state.announced === MAEXCHEN || chanceAtLeast(state.announced) < DOUBT_BELOW;
    return { type: suspicious ? 'doubt' : 'believe' };
  }
  // Ehrlich, wenn der Wurf reicht; sonst so knapp wie möglich darüber lügen.
  const actual = valueOf(state.dice);
  const value = isHigher(actual, state.announced) ? actual : VALUES[rank(state.announced) + 1];
  return { type: 'announce', value };
}
