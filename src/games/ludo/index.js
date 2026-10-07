import { botMove } from './bot.js';
import { createGame, reduce, TRACK, viewFor } from './game.js';
import { playOutTurn, TURN_TIME_SETTING } from '../turns.js';

export const ludo = {
  id: 'ludo',
  name: 'Ludo',
  icon: '🎯',
  description: 'Mit einer 6 raus aus dem Haus, einmal ums Brett und rein ins Ziel – und dabei die anderen rauswerfen.',
  minPlayers: 2,
  maxPlayers: 4,
  settings: [
    {
      key: 'finish', label: 'Partie endet', type: 'choice', values: ['first', 'all'], default: 'first',
      describe: (finish) => (finish === 'first' ? 'wenn der Erste im Ziel ist' : 'wenn alle im Ziel sind'),
    },
    TURN_TIME_SETTING,
  ],
  moves: {
    roll: {},
    move: { piece: 'number' },
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

  // Wer im Ziel ist, in Reihenfolge des Einlaufs; danach nach Figuren im Ziel und zurückgelegten Feldern.
  result(state) {
    if (state.phase !== 'gameOver') return null;
    const done = state.finished.map((id) => state.players.find((p) => p.id === id));
    const compare = (a, b) => inGoal(b) - inGoal(a) || progress(b) - progress(a);
    const rest = state.players.filter((p) => !state.finished.includes(p.id)).sort(compare);
    const ranking = [
      ...done.map((p, i) => ({ playerId: p.id, place: i + 1, detail: 'alle Figuren im Ziel' })),
      ...rest.map((p) => ({
        playerId: p.id,
        place: done.length + rest.findIndex((other) => compare(other, p) === 0) + 1,
        detail: `${inGoal(p)} von 4 im Ziel`,
      })),
    ];
    return { ranking, awards: awards(state.players) };
  },
};

const AWARDS = [
  { icon: '💥', title: 'Rausschmeißer', count: (p) => p.captures, describe: (n) => `${n}-mal geschlagen` },
  { icon: '🙈', title: 'Pechvogel', count: (p) => p.captured, describe: (n) => `${n}-mal rausgeflogen` },
];

function awards(players) {
  return AWARDS.flatMap(({ icon, title, count, describe }) => {
    const best = Math.max(0, ...players.map(count));
    if (best === 0) return [];
    const names = players.filter((p) => count(p) === best).map((p) => p.name);
    return [{ icon, title, detail: describe(best), names }];
  });
}

function inGoal(player) {
  return player.pieces.filter((position) => position >= TRACK).length;
}

function progress(player) {
  return player.pieces.reduce((sum, position) => sum + position + 1, 0);
}
