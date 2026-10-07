import { botMove } from './bot.js';
import { createGame, reduce, viewFor } from './game.js';
import { totals } from './scoring.js';

// Kniffel heißt in der Lounge „Würfelglück“; im Spiel selbst bleiben die bekannten Begriffe.
export const kniffel = {
  id: 'kniffel',
  name: 'Würfelglück',
  icon: '🎲',
  description: 'Fünf Würfel, drei Würfe, 13 Kategorien – wer am Ende die meisten Punkte hat, gewinnt.',
  minPlayers: 1,
  maxPlayers: 8,
  settings: [],
  moves: {
    roll: { keep: 'object' },
    score: { category: 'string' },
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  botMove,

  result(state) {
    if (state.phase !== 'gameOver') return null;
    const totalOf = (player) => totals(player.sheet).total;
    const sorted = [...state.players].sort((a, b) => totalOf(b) - totalOf(a));
    const ranking = sorted.map((p) => ({
      playerId: p.id,
      place: sorted.findIndex((other) => totalOf(other) === totalOf(p)) + 1,
      detail: `${totalOf(p)} Punkte`,
    }));
    return { ranking, awards: awards(state.players) };
  },
};

const AWARDS = [
  { icon: '🍀', title: 'Glückspilz', count: (sheet) => (sheet.kniffel === 50 ? 1 : 0), describe: () => 'hat einen Kniffel gewürfelt' },
  {
    icon: '🙈', title: 'Pechvogel',
    count: (sheet) => Object.values(sheet).filter((points) => points === 0).length,
    describe: (n) => `${n} Kategorien gestrichen`,
  },
];

function awards(players) {
  return AWARDS.flatMap(({ icon, title, count, describe }) => {
    const best = Math.max(0, ...players.map((p) => count(p.sheet)));
    if (best === 0) return [];
    const names = players.filter((p) => count(p.sheet) === best).map((p) => p.name);
    return [{ icon, title, detail: describe(best), names }];
  });
}
