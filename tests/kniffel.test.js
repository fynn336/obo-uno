import { botMove } from '../src/games/kniffel/bot.js';
import { createGame, reduce } from '../src/games/kniffel/game.js';
import { kniffel } from '../src/games/kniffel/index.js';
import { CATEGORIES, scoreFor, totals } from '../src/games/kniffel/scoring.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct } from './setup.js';

const KEEP_NONE = [false, false, false, false, false];

function newKniffel(playerCount, seed = 7) {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  return { ...createGame({ players, hostId: 'p0', seed }), current: 0 };
}

function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

function rejected(state, action) {
  const result = reduce(state, action);
  if (!result.error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
  return result.error;
}

// Spieler am Zug hat genau diese Würfel nach dem ersten Wurf
function rolled(state, dice) {
  return { ...act(state, { type: 'roll', playerId: state.players[state.current].id }), dice };
}

test('Würfelglück: Wertung aller Kategorien', () => {
  const cases = [
    ['ones', [1, 1, 2, 3, 1], 3], ['sixes', [6, 6, 6, 2, 1], 18],
    ['threeKind', [4, 4, 4, 2, 1], 15], ['threeKind', [4, 4, 2, 2, 1], 0],
    ['fourKind', [5, 5, 5, 5, 2], 22], ['fourKind', [5, 5, 5, 2, 2], 0],
    ['fullHouse', [3, 3, 2, 2, 2], 25], ['fullHouse', [3, 3, 3, 3, 3], 0], ['fullHouse', [3, 3, 2, 2, 1], 0],
    ['smallStraight', [1, 2, 3, 4, 6], 30], ['smallStraight', [3, 4, 5, 6, 6], 30], ['smallStraight', [1, 2, 3, 5, 6], 0],
    ['largeStraight', [2, 3, 4, 5, 6], 40], ['largeStraight', [1, 2, 3, 4, 6], 0],
    ['kniffel', [2, 2, 2, 2, 2], 50], ['kniffel', [2, 2, 2, 2, 1], 0],
    ['chance', [6, 5, 4, 3, 1], 19],
  ];
  for (const [key, dice, expected] of cases) assertEqual(scoreFor(key, dice), expected, `${key} ${dice}`);
  assertEqual(CATEGORIES.length, 13, '13 Kategorien');
});

test('Würfelglück: Bonus ab 63 Punkten oben', () => {
  const sheet = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18, chance: 20 };
  assertEqual(totals(sheet), { upper: 63, bonus: 35, total: 118 }, 'mit Bonus');
  assertEqual(totals({ ...sheet, sixes: 12 }).bonus, 0, 'knapp ohne Bonus');
});

test('Würfelglück: höchstens drei Würfe, gehaltene Würfel bleiben liegen', () => {
  let s = rolled(newKniffel(2), [6, 6, 1, 2, 3]);
  s = act(s, { type: 'hold', playerId: 'p0', keep: [true, true, false, false, false] });
  assertEqual(s.kept, [true, true, false, false, false], 'für alle sichtbar');
  s = act(s, { type: 'roll', playerId: 'p0' });
  assertEqual(s.dice.slice(0, 2), [6, 6], 'gehalten');
  s = act(s, { type: 'roll', playerId: 'p0' });
  assertEqual([s.rollsLeft, s.dice.slice(0, 2)], [0, [6, 6]], 'keine Würfe mehr');
  rejected(s, { type: 'roll', playerId: 'p0' });
  rejected(s, { type: 'hold', playerId: 'p0', keep: KEEP_NONE });
  s = act(s, { type: 'score', playerId: 'p0', category: 'chance' });
  assertEqual(s.kept, KEEP_NONE, 'neuer Zug, nichts gehalten');
});

test('Würfelglück: ungültige Züge werden abgelehnt', () => {
  const s = newKniffel(2);
  rejected(s, { type: 'roll', playerId: 'p1' });
  rejected(s, { type: 'hold', playerId: 'p0', keep: KEEP_NONE });
  rejected(s, { type: 'score', playerId: 'p0', category: 'chance' });
  const r = rolled(s, [1, 2, 3, 4, 5]);
  rejected(r, { type: 'hold', playerId: 'p0', keep: [true] });
  rejected(r, { type: 'hold', playerId: 'p0', keep: 'alle' });
  rejected(r, { type: 'hold', playerId: 'p1', keep: KEEP_NONE });
  rejected(r, { type: 'score', playerId: 'p0', category: 'toString' });
  rejected(r, { type: 'score', playerId: 'p1', category: 'chance' });
});

test('Würfelglück: Eintragen beendet den Zug, belegte Kategorien sind gesperrt', () => {
  let s = act(rolled(newKniffel(2), [2, 3, 4, 5, 6]), { type: 'score', playerId: 'p0', category: 'largeStraight' });
  assertEqual([s.players[0].sheet.largeStraight, s.players[1].id, s.current, s.rollsLeft], [40, 'p1', 1, 3], 'nächster Spieler');
  s = act(rolled(s, [1, 1, 1, 1, 1]), { type: 'score', playerId: 'p1', category: 'kniffel' });
  s = rolled(s, [2, 3, 4, 5, 6]);
  rejected(s, { type: 'score', playerId: 'p0', category: 'largeStraight' });
  s = act(s, { type: 'score', playerId: 'p0', category: 'ones' });
  assertEqual(s.players[0].sheet.ones, 0, 'gestrichen');
});

test('Würfelglück: nach 13 Runden ist die Partie vorbei, Ergebnis mit Plätzen', () => {
  let s = newKniffel(2);
  for (const category of CATEGORIES) {
    s = act(rolled(s, [6, 6, 6, 6, 6]), { type: 'score', playerId: 'p0', category: category.key });
    s = act(rolled(s, [1, 1, 1, 1, 1]), { type: 'score', playerId: 'p1', category: category.key });
  }
  assertEqual(s.phase, 'gameOver', 'vorbei');
  rejected(s, { type: 'roll', playerId: 'p0' });
  const result = kniffel.result(s);
  assertEqual(result.ranking.map((r) => [r.playerId, r.place]), [['p0', 1], ['p1', 2]], 'Plätze');
  assertEqual(result.awards.map((a) => [a.title, a.names]), [['Glückspilz', ['P0', 'P1']], ['Pechvogel', ['P0', 'P1']]], 'Auszeichnungen');
});

test('Würfelglück: Rauswurf des Spielers am Zug gibt den Zug weiter', () => {
  let s = rolled(newKniffel(3), [1, 2, 3, 4, 5]);
  s = kniffel.removePlayer(s, 'p0');
  assertEqual([s.players.map((p) => p.id), s.players[s.current].id, s.rollsLeft], [['p1', 'p2'], 'p1', 3], 'weiter');
});

test('Würfelglück: Bots spielen ganze Partien ohne abgelehnten Zug', () => {
  for (let seed = 1; seed <= 5; seed++) {
    let s = createGame({ players: [1, 2, 3].map((i) => ({ id: `b${i}`, name: `B${i}` })), hostId: 'b1', seed });
    for (let step = 0; s.phase === 'playing' && step < 2000; step++) {
      const id = s.players[s.current].id;
      s = act(s, { ...botMove(s, id), playerId: id });
    }
    assertEqual(s.phase, 'gameOver', `Seed ${seed}`);
    assert(s.players.every((p) => totals(p.sheet).total > 50), 'Bots holen ordentlich Punkte');
  }
});

test('Würfelglück: in der Lounge ab 1 Spieler startbar', () => {
  let s = loungeAct(lounge(1), { type: 'selectGame', playerId: 'p0', gameId: 'kniffel' });
  s = loungeAct(s, { type: 'startGame', playerId: 'p0' });
  assertEqual([s.phase, s.gameId], ['game', 'kniffel'], 'läuft');
  s = loungeAct(s, { type: 'move', playerId: 'p0', move: { type: 'roll' } });
  assertEqual(s.game.rollsLeft, 2, 'gewürfelt');
});
