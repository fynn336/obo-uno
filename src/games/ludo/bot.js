import { BASE, fieldOf, legalMoves, targetOf, TRACK } from './game.js';

// Gewichte für die Wahl der Figur
const CAPTURE = 100;
const LEAVE_HOUSE = 80;
const REACH_GOAL = 60;
const ESCAPE = 25;
const DANGER = 40;
const PROGRESS = 0.1;

export function botMove(state, botId) {
  if (state.phase !== 'playing' || state.players[state.current].id !== botId) return null;
  if (!state.mustMove) return { type: 'roll' };
  const player = state.players[state.current];
  const value = (piece) => {
    const from = player.pieces[piece];
    const to = targetOf(from, state.die);
    const onTrack = (position) => position >= 0 && position < TRACK;
    let score = to * PROGRESS;
    if (from === BASE) score += LEAVE_HOUSE;
    if (!onTrack(to) && onTrack(from)) score += REACH_GOAL;
    if (onTrack(to) && occupiedByOpponent(state, player, to)) score += CAPTURE;
    if (onTrack(from) && threatened(state, player, from)) score += ESCAPE;
    if (onTrack(to) && threatened(state, player, to)) score -= DANGER;
    return score;
  };
  const moves = legalMoves(player, state);
  const best = moves.reduce((a, b) => (value(b) > value(a) ? b : a));
  return { type: 'move', piece: best };
}

function opponentFields(state, player) {
  return state.players
    .filter((other) => other !== player)
    .flatMap((other) => other.pieces.filter((p) => p >= 0 && p < TRACK).map((p) => fieldOf(other.color, p)));
}

function occupiedByOpponent(state, player, position) {
  return opponentFields(state, player).includes(fieldOf(player.color, position));
}

// Steht eine fremde Figur bis zu sechs Felder dahinter?
function threatened(state, player, position) {
  const field = fieldOf(player.color, position);
  return opponentFields(state, player).some((other) => {
    const distance = (field - other + TRACK) % TRACK;
    return distance >= 1 && distance <= 6;
  });
}
