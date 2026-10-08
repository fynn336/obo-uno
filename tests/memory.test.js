import { botMove } from '../src/games/memory/bot.js';
import { createGame, reduce, viewFor } from '../src/games/memory/game.js';
import { memory } from '../src/games/memory/index.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct } from './setup.js';

// Feste Auslage: Karten 0/1 sind ein Paar, 2/3, 4/5 usw.; p0 ist dran
function table(playerCount, pairs = 3) {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const s = createGame({ players, hostId: 'p0', settings: { pairs, turnTime: 0 }, seed: 3 });
  const motifs = ['🐶', '🐱', '🦊', '🐻', '🐼', '🐸'].slice(0, pairs);
  return { ...s, current: 0, cards: motifs.flatMap((motif) => [{ motif, owner: null }, { motif, owner: null }]) };
}

function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

function rejected(state, action) {
  if (!reduce(state, action).error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
}

const flip = (playerId, index) => ({ type: 'flip', playerId, index });
const currentId = (s) => s.players[s.current].id;

test('Memory: zufällige Auslage mit genau zwei Karten je Motiv', () => {
  const s = createGame({ players: [{ id: 'p0', name: 'P0' }], hostId: 'p0', settings: { pairs: 18, turnTime: 0 }, seed: 9 });
  const counts = new Map();
  for (const card of s.cards) counts.set(card.motif, (counts.get(card.motif) ?? 0) + 1);
  assertEqual([s.cards.length, counts.size, [...counts.values()].every((n) => n === 2)], [36, 18, true], 'Paare');
  assertEqual(viewFor(s, 'p0').cards.every((card) => card.motif === null), true, 'alles verdeckt');
});

test('Memory: Paar gehört dem Finder, der gleich nochmal darf', () => {
  let s = act(act(table(2), flip('p0', 0)), flip('p0', 1));
  assertEqual([s.cards[0].owner, s.players[0].pairs, currentId(s), s.open], ['p0', 1, 'p0', []], 'Paar');
  assertEqual(viewFor(s, 'p1').cards[0].motif, '🐶', 'Paare liegen offen');
  rejected(s, flip('p0', 0));
  rejected(s, flip('p1', 2));
  rejected(s, flip('p0', 99));
});

test('Memory: falsches Paar bleibt kurz offen, dann ist der Nächste dran', () => {
  let s = act(act(table(2), flip('p0', 0)), flip('p0', 2));
  assertEqual([s.phase, viewFor(s, 'p1').cards[2].motif], ['peek', '🐱'], 'kurz offen');
  rejected(s, flip('p0', 4));
  assertEqual(memory.timer(s).seconds, 2, 'zwei Sekunden');
  s = act(s, { type: 'timeout', playerId: 'p0' });
  assertEqual([s.phase, currentId(s), viewFor(s, 'p0').cards[2].motif], ['flip', 'p1', null], 'umgedreht');
});

test('Memory: Goldfisch – die passende Karte lag schon offen', () => {
  let s = act(act(table(2), flip('p0', 0)), flip('p0', 2));
  s = act(s, { type: 'timeout', playerId: 'p0' });
  s = act(act(s, flip('p1', 3)), flip('p1', 4));
  assertEqual(s.players[1].forgot, 1, 'Karte 2 passte zu Karte 3');
});

test('Memory: alle Paare gefunden – Plätze und Serienmeister', () => {
  let s = table(2, 2);
  for (const index of [0, 1, 2, 3]) s = act(s, flip('p0', index));
  assertEqual(s.phase, 'gameOver', 'vorbei');
  const { ranking, awards } = memory.result(s);
  assertEqual(ranking.map((r) => [r.playerId, r.place]), [['p0', 1], ['p1', 2]], 'Plätze');
  assertEqual(awards.map((a) => [a.title, a.names]), [['Serienmeister', ['P0']]], 'Serie');
});

test('Memory: Bots merken sich je nach Stärke unterschiedlich viel', () => {
  // Karte 0 lag vor vielen Zügen offen; jetzt hat der Bot ihren Partner aufgedeckt.
  let s = { ...table(2, 6), history: [0, 5, 6, 7, 8, 9, 10, 11, 4, 2, 3, 9, 8] };
  s = act(s, flip('p0', 1));
  assertEqual(botMove(s, 'p0', 'hard'), { type: 'flip', index: 0 }, 'schwer erinnert sich');
  assert(botMove(s, 'p0', 'easy').index !== 0, 'leicht hat es vergessen');
});

test('Memory: in der Lounge ab 1 Spieler, Paare einstellbar', () => {
  let s = loungeAct(lounge(1), { type: 'selectGame', playerId: 'p0', gameId: 'memory' });
  s = loungeAct(s, { type: 'setSetting', playerId: 'p0', gameId: 'memory', key: 'pairs', value: 12 });
  s = loungeAct(s, { type: 'startGame', playerId: 'p0' });
  assertEqual([s.gameId, s.game.cards.length], ['memory', 24], 'läuft');
});
