import { botMove } from './bot.js';
import { createGame, reduce, viewFor } from './game.js';
import { totals } from './scoring.js';
import { awardsFor } from '../awards.js';
import { playOutTurn, TURN_TIME_SETTING } from '../turns.js';

// Kniffel heißt in der Lounge „Würfelglück“; im Spiel selbst bleiben die bekannten Begriffe.
export const kniffel = {
  id: 'kniffel',
  name: 'Würfelglück',
  icon: '🎲',
  description: 'Fünf Würfel, drei Würfe, 13 Kategorien – wer am Ende die meisten Punkte hat, gewinnt.',
  minPlayers: 1,
  maxPlayers: 8,
  settings: [TURN_TIME_SETTING],
  moves: {
    roll: {},
    hold: { keep: 'object' },
    score: { category: 'string' },
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  botMove,
  timeout: (state, playerId) => playOutTurn(state, playerId, { reduce, botMove }),

  timer(state) {
    if (state.phase !== 'playing' || state.turnTime === 0) return null;
    return { key: String(state.turnNumber), playerId: state.players[state.current].id, seconds: state.turnTime };
  },

  result(state) {
    if (state.phase !== 'gameOver') return null;
    const totalOf = (player) => totals(player.sheet).total;
    const sorted = [...state.players].sort((a, b) => totalOf(b) - totalOf(a));
    const ranking = sorted.map((p) => ({
      playerId: p.id,
      place: sorted.findIndex((other) => totalOf(other) === totalOf(p)) + 1,
      detail: `${totalOf(p)} Punkte`,
    }));
    return { ranking, awards: awardsFor(state.players, AWARDS) };
  },
};

const AWARDS = [
  { icon: '🍀', title: 'Glückspilz', count: (p) => (p.sheet.kniffel === 50 ? 1 : 0), describe: () => 'hat einen Kniffel gewürfelt' },
  {
    icon: '🙈', title: 'Pechvogel',
    count: (p) => Object.values(p.sheet).filter((points) => points === 0).length,
    describe: (n) => `${n} Kategorien gestrichen`,
  },
];
