import { viewFor } from '../src/game/view.js';
import { test, assert, assertEqual } from './testing.js';
import { act, codes, game, play } from './setup.js';

test('Sicht: eigene Hand sichtbar, von anderen nur die Kartenanzahl', () => {
  const s = game({ hands: [['r1', 'g2'], ['b3'], ['y4', 'y5', 'y6']], draw: ['b9'] });
  const view = viewFor(s, 'p1');
  assertEqual(codes(view.hand), ['b3'], 'eigene Hand');
  assertEqual(view.players.map((p) => p.cardCount), [2, 1, 3], 'Kartenanzahl');
  const json = JSON.stringify(view);
  for (const hidden of s.players[0].hand.concat(s.players[2].hand, s.drawPile)) {
    assert(!json.includes(`"id":${hidden.id},`), `Karte ${hidden.id} verraten`);
  }
  assert(!('seed' in view) && !('drawPile' in view), 'Seed oder Ziehstapel verraten');
});

test('Sicht: gezogene Karte und spielbare Karten nur für den Spieler am Zug', () => {
  const s = act(game({ hands: [['g1', 'r2'], ['r3']], draw: ['r9'] }), { type: 'draw', playerId: 'p0' });
  const drawn = s.players[0].hand.at(-1).id;
  assertEqual(viewFor(s, 'p0').drawnCardId, drawn, 'Spieler am Zug');
  assertEqual(viewFor(s, 'p0').playableIds, [drawn], 'nur gezogene Karte spielbar');
  assertEqual(viewFor(s, 'p1').drawnCardId, null, 'andere');
  assertEqual(viewFor(s, 'p1').playableIds, [], 'andere spielen nicht');
});

test('Sicht: Uno-Status und Erwischbarkeit', () => {
  const s = play(game({ hands: [['r1', 'g2'], ['g4'], ['g3']] }), 'p0', 'r1');
  const view = viewFor(s, 'p2');
  assertEqual(view.players[0].catchable, true, 'erwischbar');
  assertEqual(view.players[0].saidUno, false, 'nicht gerufen');
  assertEqual(view.currentId, 'p1', 'am Zug');
});
