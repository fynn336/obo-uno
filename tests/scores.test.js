import { cardPoints } from '../src/game/deck.js';
import { viewFor } from '../src/game/view.js';
import { test, assertEqual } from './testing.js';
import { act, card, game, lobby, play, player, rejected } from './setup.js';

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

test('Punkte: Ziel erreicht – Abend gewonnen, nächste Runde beginnt bei 0', () => {
  let s = game({ hands: [['r7'], ['W', 'W', 'W', 'W']] });
  s = { ...s, target: 200 };
  s = play(s, 'p0', 'r7');
  assertEqual(s.championId, 'p0', 'Abendsieger');
  assertEqual(s.events.at(-1).champion, true, 'im Ereignis');
  s = act(s, { type: 'start', playerId: 'p0' });
  assertEqual(s.championId, null, 'zurückgesetzt');
  assertEqual(s.players.map((p) => p.score), [0, 0], 'Punkte zurückgesetzt');
});

test('Punkte: Punktestand bleibt zwischen Runden ohne Abendsieg erhalten', () => {
  let s = play(game({ hands: [['r7'], ['g3']] }), 'p0', 'r7');
  s = act(s, { type: 'start', playerId: 'p0' });
  assertEqual(player(s, 'p0').score, 3, 'Punkte');
});

test('Punkteziel: nur Host, nur erlaubte Werte, nicht während der Runde', () => {
  let s = lobby(2);
  assertEqual(s.target, 500, 'Standard');
  rejected(s, { type: 'setTarget', playerId: 'p1', value: 200 });
  rejected(s, { type: 'setTarget', playerId: 'p0', value: 250 });
  s = act(s, { type: 'setTarget', playerId: 'p0', value: 300 });
  assertEqual(s.target, 300, 'geändert');
  rejected(act(s, { type: 'start', playerId: 'p0' }), { type: 'setTarget', playerId: 'p0', value: 200 });
});
