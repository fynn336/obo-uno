import { awardsFor } from '../awards.js';
import { playOutTurn, TURN_TIME_SETTING } from '../turns.js';
import { botMove } from './bot.js';
import { createGame, reduce, viewFor } from './game.js';

export const maexchen = {
  id: 'maexchen',
  name: 'Mäxchen',
  icon: '🤫',
  description: 'Verdeckt würfeln, höher ansagen, frech lügen – wer beim Bluffen erwischt wird, verliert ein Leben.',
  minPlayers: 2,
  maxPlayers: 8,
  settings: [
    { key: 'lives', label: 'Leben pro Spieler', type: 'choice', values: [3, 5], default: 3, describe: (lives) => `${lives} Leben` },
    TURN_TIME_SETTING,
  ],
  moves: {
    roll: {},
    announce: { value: 'number' },
    believe: {},
    doubt: {},
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  botMove,
  timeout: (state, playerId) => playOutTurn(state, playerId, { reduce, botMove }),

  timer(state) {
    if (state.phase === 'gameOver' || state.turnTime === 0) return null;
    return { key: String(state.turnNumber), playerId: state.players[state.current].id, seconds: state.turnTime };
  },

  // Sieger ist, wer übrig bleibt; danach zählt, wer später ausgeschieden ist.
  result(state) {
    if (state.phase !== 'gameOver') return null;
    const alive = state.players.filter((p) => p.lives > 0);
    const outLast = [...state.out].reverse().map((id) => state.players.find((p) => p.id === id)).filter(Boolean);
    const ranking = [
      ...alive.map((p) => ({ playerId: p.id, place: 1, detail: `noch ${p.lives} ❤️` })),
      ...outLast.map((p, i) => ({ playerId: p.id, place: alive.length + i + 1, detail: 'ausgeschieden' })),
    ];
    return { ranking, awards: awardsFor(state.players, AWARDS) };
  },
};

const AWARDS = [
  { icon: '🤥', title: 'Lügenbaron', count: (p) => p.lies, describe: (n) => `${n}-mal beim Lügen erwischt` },
  { icon: '🕵️', title: 'Spürnase', count: (p) => p.goodDoubts, describe: (n) => `${n} Lügen aufgedeckt` },
];
