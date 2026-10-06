import { COLORS, createDeck, isPlayable } from '../src/game/deck.js';
import { nextRandom } from '../src/game/rng.js';
import { test, assert, assertEqual } from './testing.js';
import { card, lobby, act } from './setup.js';

test('Deck: 108 Karten mit eindeutigen IDs', () => {
  const deck = createDeck();
  assertEqual(deck.length, 108, 'Anzahl');
  assertEqual(new Set(deck.map((c) => c.id)).size, 108, 'eindeutige IDs');
});

test('Deck: Verteilung pro Farbe und Wild-Karten', () => {
  const deck = createDeck();
  const count = (color, value) => deck.filter((c) => c.color === color && c.value === value).length;
  for (const color of COLORS) {
    assertEqual(count(color, '0'), 1, `${color} 0`);
    for (const value of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2']) {
      assertEqual(count(color, value), 2, `${color} ${value}`);
    }
  }
  assertEqual(count(null, 'wild'), 4, 'Wild');
  assertEqual(count(null, 'wild4'), 4, 'Wild +4');
});

test('isPlayable: Zahlkarten nach Farbe oder Zahl', () => {
  const top = card('r5');
  assert(isPlayable(card('r9'), top, 'red'), 'gleiche Farbe');
  assert(isPlayable(card('g5'), top, 'red'), 'gleiche Zahl');
  assert(!isPlayable(card('g6'), top, 'red'), 'weder Farbe noch Zahl');
});

test('isPlayable: Aktionskarten nach Farbe oder Symbol', () => {
  for (const code of ['S', 'R', '+2']) {
    const top = card(`r${code}`);
    assert(isPlayable(card(`g${code}`), top, 'red'), `gleiches Symbol ${code}`);
    assert(isPlayable(card(`r${code === 'S' ? 'R' : 'S'}`), top, 'red'), `gleiche Farbe auf ${code}`);
    assert(!isPlayable(card('g1'), top, 'red'), `fremde Karte auf ${code}`);
  }
});

test('isPlayable: Wild und Wild +4 passen immer', () => {
  const top = card('r5');
  assert(isPlayable(card('W'), top, 'red'), 'Wild');
  assert(isPlayable(card('W+4'), top, 'red'), 'Wild +4');
});

test('isPlayable: auf Wild zählt die gewählte Farbe', () => {
  const top = card('W');
  assert(isPlayable(card('b3'), top, 'blue'), 'gewählte Farbe');
  assert(!isPlayable(card('r3'), top, 'blue'), 'andere Farbe');
});

test('Zufall: gleicher Seed ergibt gleiche Folge, anderer Seed eine andere', () => {
  const sequence = (seed) => {
    const values = [];
    for (let i = 0; i < 5; i++) [values[i], seed] = nextRandom(seed);
    return values;
  };
  assertEqual(sequence(7), sequence(7), 'gleicher Seed');
  assert(JSON.stringify(sequence(7)) !== JSON.stringify(sequence(8)), 'anderer Seed');
  assert(sequence(7).every((v) => v >= 0 && v < 1), 'Bereich [0, 1)');
});

test('Rundenstart: gleicher Seed ergibt gleiche Verteilung', () => {
  const started = () => act(lobby(3), { type: 'start', playerId: 'p0' });
  assertEqual(started(), started(), 'State');
});
