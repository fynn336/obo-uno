import { BASE, fieldOf, legalMoves, targetOf, TRACK } from './game.js';

// Gewichte für die Wahl der Figur
const CAPTURE = 100;
const LEAVE_HOUSE = 80;
const REACH_GOAL = 60;
const ENEMY_START = 50;
const PROGRESS = 0.1;

// leicht: zieht die erste mögliche Figur · mittel: rauskommen, ins Ziel, vorderste Figur zuerst und übersieht dabei
// jede zweite Chance zum Rauswerfen · schwer: wirft immer raus und meidet fremde Startfelder
export function botMove(state, botId, level = 'medium') {
  if (state.phase !== 'playing' || state.players[state.current].id !== botId) return null;
  if (!state.mustMove) return { type: 'roll' };
  const player = state.players[state.current];
  const moves = legalMoves(player, state);
  if (level === 'easy') return { type: 'move', piece: moves[0] };
  const seesCaptures = level === 'hard' || state.turnNumber % 2 === 0;
  const value = (piece) => {
    const from = player.pieces[piece];
    const to = targetOf(from, state.die);
    const onTrack = (position) => position >= 0 && position < TRACK;
    let score = to * PROGRESS;
    if (from === BASE) score += LEAVE_HOUSE;
    if (!onTrack(to) && onTrack(from)) score += REACH_GOAL;
    if (!onTrack(to)) return score;
    if (seesCaptures && occupiedByOpponent(state, player, to)) score += CAPTURE;
    if (level === 'hard' && onEnemyStart(state, player, to)) score -= ENEMY_START;
    return score;
  };
  const best = moves.reduce((a, b) => (value(b) > value(a) ? b : a));
  return { type: 'move', piece: best };
}

function occupiedByOpponent(state, player, position) {
  const field = fieldOf(player.color, position);
  return state.players.some((other) => other !== player
    && other.pieces.some((p) => p >= 0 && p < TRACK && fieldOf(other.color, p) === field));
}

// Startfeld eines Gegners, der noch Figuren im Haus hat: Mit seiner nächsten 6 wird man geschlagen.
function onEnemyStart(state, player, position) {
  const field = fieldOf(player.color, position);
  return state.players.some((other) => other !== player && other.pieces.includes(BASE) && fieldOf(other.color, 0) === field);
}
