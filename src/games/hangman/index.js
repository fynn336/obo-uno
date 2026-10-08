import { awardsFor } from '../awards.js';
import { TURN_TIME_SETTING } from '../turns.js';
import { botMove } from './bot.js';
import { createGame, REVEAL_SECONDS, reduce, viewFor } from './game.js';

export const hangman = {
  id: 'hangman',
  name: 'Galgenmännchen',
  icon: '🪢',
  description: 'Reihum Buchstaben raten, bevor der Galgen fertig ist – wer das Wort löst, bekommt den Bonus.',
  minPlayers: 1,
  maxPlayers: 8,
  rules: [
    'Gesucht ist ein verdecktes Wort. Reihum rät jeder einen Buchstaben – per Klick oder einfach mit der Tastatur.',
    'Richtig: 2 Punkte für jedes Vorkommen, und du darfst gleich weiterraten. Falsch: Der Galgen wächst, der Nächste ist dran.',
    'Am eigenen Zug kannst du jederzeit das ganze Wort lösen: 5 Punkte plus 1 für jeden noch verdeckten Buchstaben.',
    'Ein falscher Lösungsversuch zählt wie ein falscher Buchstabe.',
    'Nach 10 Fehlern ist der Galgen komplett und das Wort verloren. Wer den letzten Buchstaben aufdeckt, bekommt auch den Bonus.',
    'Nach allen Wörtern gewinnt, wer die meisten Punkte hat. Umlaute und ß sind eigene Buchstaben.',
  ],
  settings: [
    { key: 'words', label: 'Wörter pro Partie', type: 'choice', values: [3, 5, 8], default: 5, describe: (n) => `${n} Wörter` },
    TURN_TIME_SETTING,
  ],
  moves: {
    letter: { letter: 'string' },
    solve: { text: 'string' },
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  botMove,
  // Zeit um: Der Zug geht weiter, ohne Strafe. Nach einer Auflösung kommt automatisch das nächste Wort.
  timeout: (state, playerId) => reduce(state, { type: 'timeout', playerId }),

  timer(state) {
    if (state.phase === 'gameOver') return null;
    const playerId = state.players[state.current].id;
    if (state.phase === 'reveal') return { key: `reveal|${state.turnNumber}`, playerId, seconds: REVEAL_SECONDS };
    return state.turnTime === 0 ? null : { key: `guess|${state.turnNumber}`, playerId, seconds: state.turnTime };
  },

  result(state) {
    if (state.phase !== 'gameOver') return null;
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const ranking = sorted.map((p) => ({
      playerId: p.id,
      place: sorted.findIndex((other) => other.score === p.score) + 1,
      detail: `${p.score} Punkte`,
    }));
    return { ranking, awards: awardsFor(state.players, AWARDS) };
  },
};

const AWARDS = [
  { icon: '🧠', title: 'Rätselkönig', count: (p) => p.solved, describe: (n) => `${n} Wörter gelöst` },
  { icon: '🙈', title: 'Pechvogel', count: (p) => p.misses, describe: (n) => `${n} Fehlversuche` },
];
