import { cardPoints } from '../src/games/uno/deck.js';
import { viewFor } from '../src/games/uno/view.js';
import { test, assertEqual } from './testing.js';
import { uno } from '../src/games/uno/index.js';
import { act, card, game, play, player, rejected } from './setup.js';

test('Punkte: Kartenwerte nach offizieller Wertung', () => {
  assertEqual(['r0', 'g7', 'b9', 'yS', 'rR', 'g+2', 'W', 'W+4'].map((code) => cardPoints(card(code))),
    [0, 7, 9, 20, 20, 20, 50, 50], 'Werte');
});

test('Punkte: Sieger bekommt die Handwerte aller anderen', () => {
  const s = play(game({ hands: [['r7'], ['g3', 'bS'], ['W', 'y1']] }), 'p0', 'r7');
  assertEqual(player(s, 'p0').score, 3 + 20 + 50 + 1, 'Punkte');
  assertEqual(s.events.at(-1).points, 74, 'im Ereignis');
  assertEqual(player(s, 'p1').score, 0, 'Verlierer');
});

test('Punkte: Sichtbar erst nach Rundenende', () => {
  const s = game({ hands: [['r7', 'g1'], ['g3']] });
  assertEqual(viewFor(s, 'p0').players.map((p) => p.handPoints), [null, null], 'während der Runde');
  const over = play(game({ hands: [['r7'], ['g3', 'W']] }), 'p0', 'r7');
  assertEqual(viewFor(over, 'p0').players.map((p) => p.handPoints), [0, 53], 'nach Rundenende');
});

test('Punkte: Rundenende durch Rauswurf bringt keine Punkte', () => {
  const s = act(game({ hands: [['r1'], ['g2', 'W']] }), { type: 'leave', playerId: 'p0' });
  assertEqual(player(s, 'p1').score, 0, 'Punkte');
  assertEqual(s.events.at(-1).points, 0, 'im Ereignis');
});

test('Punkte: Ziel erreicht – Partie vorbei, Ergebnis nach Punkten', () => {
  let s = { ...game({ hands: [['r7'], ['W', 'W', 'W', 'W'], ['g3']] }), target: 200 };
  s.players[2].score = 150;
  s = play(s, 'p0', 'r7');
  assertEqual(s.phase, 'gameOver', 'Phase');
  assertEqual(s.events.at(-1).champion, true, 'im Ereignis');
  rejected(s, { type: 'nextRound', playerId: 'p0' });
  assertEqual(uno.result(s).ranking.map((r) => [r.playerId, r.place]), [['p0', 1], ['p2', 2], ['p1', 3]], 'Platzierung');
  assertEqual(uno.result(game({ hands: [['r7'], ['g3']] })), null, 'kein Ergebnis während der Partie');
});

test('Punkte: Gleichstand – weniger Restpunkte auf der Hand gewinnt, sonst geteilter Platz', () => {
  let s = { ...game({ hands: [['r7'], ['W', 'W', 'W', 'W'], ['g3'], ['g3']] }), target: 200 };
  s = play(s, 'p0', 'r7');
  assertEqual(uno.result(s).ranking.map((r) => [r.playerId, r.place]), [['p0', 1], ['p2', 2], ['p3', 2], ['p1', 4]], 'Plätze');
});

test('Punkte: Punktestand bleibt zwischen den Runden erhalten', () => {
  let s = play(game({ hands: [['r7'], ['g3']] }), 'p0', 'r7');
  s = act(s, { type: 'nextRound', playerId: 'p0' });
  assertEqual(player(s, 'p0').score, 3, 'Punkte');
});
