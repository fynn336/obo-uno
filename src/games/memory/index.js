import { awardsFor } from '../awards.js';
import { TURN_TIME_SETTING } from '../turns.js';
import { botMove } from './bot.js';
import { createGame, PEEK_SECONDS, reduce, viewFor } from './game.js';

export const memory = {
  id: 'memory',
  name: 'Memory',
  icon: '🧩',
  description: 'Karten aufdecken, Paare finden, gut aufpassen – wer die meisten Paare sammelt, gewinnt.',
  minPlayers: 1,
  maxPlayers: 8,
  rules: [
    'Wer dran ist, deckt nacheinander zwei Karten auf.',
    'Zeigen beide dasselbe Motiv, gehört dir das Paar, und du bist gleich noch einmal dran.',
    'Sonst bleiben die Karten kurz offen – gut merken! – und werden wieder umgedreht. Dann ist der Nächste dran.',
    'Sind alle Paare gefunden, gewinnt, wer die meisten hat.',
    'Auszeichnungen: Serienmeister (die meisten Paare am Stück) und Goldfisch (am häufigsten danebengegriffen, obwohl die passende Karte schon offen lag).',
  ],
  settings: [
    { key: 'pairs', label: 'Paare', type: 'choice', values: [12, 18, 24], default: 18, describe: (n) => `${n} Paare` },
    TURN_TIME_SETTING,
  ],
  moves: {
    flip: { index: 'number' },
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  botMove,
  timeout: (state, playerId) => reduce(state, { type: 'timeout', playerId }),

  // Ein falsches Paar bleibt kurz offen; die Zeit pro Zug ist optional.
  timer(state) {
    if (state.phase === 'gameOver') return null;
    const playerId = state.players[state.current].id;
    if (state.phase === 'peek') return { key: `peek|${state.turnNumber}`, playerId, seconds: PEEK_SECONDS };
    return state.turnTime === 0 ? null : { key: `flip|${state.turnNumber}`, playerId, seconds: state.turnTime };
  },

  result(state) {
    if (state.phase !== 'gameOver') return null;
    const sorted = [...state.players].sort((a, b) => b.pairs - a.pairs);
    const ranking = sorted.map((p) => ({
      playerId: p.id,
      place: sorted.findIndex((other) => other.pairs === p.pairs) + 1,
      detail: `${p.pairs} Paare`,
    }));
    return { ranking, awards: awardsFor(state.players, AWARDS) };
  },
};

const AWARDS = [
  {
    icon: '🔥', title: 'Serienmeister', count: (p) => (p.bestStreak > 1 ? p.bestStreak : 0),
    describe: (n) => `${n} Paare am Stück`,
  },
  { icon: '🐟', title: 'Goldfisch', count: (p) => p.forgot, describe: (n) => `${n}-mal die bekannte Karte vergessen` },
];
