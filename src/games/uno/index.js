import { gameAwards } from './awards.js';
import { botAction } from './bot.js';
import { createGame, handPoints, isRunning, reduce } from './game.js';
import { viewFor } from './view.js';
import { TURN_TIME_SETTING } from '../turns.js';

// Uno heißt in der Lounge „Farbenchaos“; im Spiel selbst bleibt es Uno.
export const uno = {
  id: 'uno',
  name: 'Farbenchaos',
  icon: '🃏',
  description: 'Karten nach Farbe oder Zahl ablegen – wer zuerst keine mehr hat, gewinnt die Runde.',
  minPlayers: 2,
  maxPlayers: 8,
  settings: [
    { key: 'stacking', label: 'Stapeln von +2/+4', type: 'toggle', default: false },
    { key: 'challenge', label: 'Wild-+4-Anfechtung', type: 'toggle', default: false },
    { key: 'drawUntilPlayable', label: 'Ziehen bis spielbar', type: 'toggle', default: false },
    {
      key: 'deck', label: 'Kartendesign', type: 'choice', values: ['classic', 'bloom'], default: 'classic',
      describe: (deck) => (deck === 'bloom' ? 'Blütenzauber' : 'Klassisch'),
    },
    {
      key: 'target', label: 'Partie gewonnen bei', type: 'choice', values: [200, 300, 500], default: 500,
      describe: (points) => `${points} Punkten`,
    },
    TURN_TIME_SETTING,
  ],
  moves: {
    play: { cardId: 'number' },
    chooseColor: { color: 'string' },
    draw: {},
    pass: {},
    challenge: {},
    callUno: {},
    catchUno: { targetId: 'string' },
    nextRound: {},
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  timeout: (state, playerId) => reduce(state, { type: 'timeout', playerId }),
  botMove: botAction,

  // Ergebnis nach Partieende: zuerst nach Punkten, bei Gleichstand gewinnt, wer weniger Restpunkte auf der Hand hat.
  result(state) {
    if (state.phase !== 'gameOver') return null;
    const compare = (a, b) => b.score - a.score || handPoints(a.hand) - handPoints(b.hand);
    const sorted = [...state.players].sort(compare);
    const ranking = sorted.map((p) => ({
      playerId: p.id,
      place: sorted.findIndex((other) => compare(other, p) === 0) + 1,
      detail: p.hand.length === 0 ? `${p.score} Punkte` : `${p.score} Punkte · ${handPoints(p.hand)} Restpunkte`,
    }));
    return { ranking, awards: gameAwards(state.players) };
  },

  timer(state) {
    if (!isRunning(state) || state.turnTime === 0) return null;
    const current = state.players[state.current];
    return {
      key: `${state.turnNumber}|${state.phase}|${state.drawnCardId}|${current.id}`,
      playerId: current.id,
      seconds: state.turnTime,
    };
  },
};
