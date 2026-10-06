import { test, assertEqual } from './testing.js';
import { act, game, handOf, play, player, rejected } from './setup.js';

const DRAW_PILE = ['y1', 'y2', 'y3', 'y4'];
const callUno = (state, playerId) => act(state, { type: 'callUno', playerId });
const catchUno = (playerId, targetId) => ({ type: 'catchUno', playerId, targetId });

test('Uno: Ruf mit 2 Karten am eigenen Zug schützt', () => {
  let s = callUno(game({ hands: [['r1', 'r2'], ['g2'], ['g3']], draw: DRAW_PILE }), 'p0');
  assertEqual(player(s, 'p0').saidUno, true, 'gerufen');
  s = play(s, 'p0', 'r1');
  assertEqual(s.unoWindow, null, 'kein Erwisch-Fenster');
  rejected(s, catchUno('p2', 'p0'));
});

test('Uno: Ruf nur mit genau 2 Karten und nur am eigenen Zug', () => {
  const s = game({ hands: [['r1', 'r2', 'r3'], ['g2', 'g4'], ['g3']] });
  rejected(s, { type: 'callUno', playerId: 'p0' });
  rejected(s, { type: 'callUno', playerId: 'p1' });
});

test('Uno: Ruf nach dem Ziehen einer spielbaren Karte', () => {
  let s = act(game({ hands: [['g1'], ['g2'], ['g3']], draw: ['r9'] }), { type: 'draw', playerId: 'p0' });
  s = callUno(s, 'p0');
  s = play(s, 'p0', 'r9');
  assertEqual(s.unoWindow, null, 'geschützt');
});

test('Uno: vergessen – ein anderer erwischt, Spieler zieht 2', () => {
  let s = play(game({ hands: [['r1', 'g2'], ['g4'], ['g3']], draw: DRAW_PILE }), 'p0', 'r1');
  assertEqual(s.unoWindow, 'p0', 'erwischbar');
  rejected(s, catchUno('p0', 'p0'));
  s = act(s, catchUno('p2', 'p0'));
  assertEqual(handOf(s, 'p0'), ['g2', 'y1', 'y2'], 'zieht 2');
  assertEqual(s.unoWindow, null, 'Fenster zu');
  rejected(s, catchUno('p1', 'p0'));
});

test('Uno: Erwisch-Fenster schließt, sobald der nächste Spieler handelt', () => {
  let s = play(game({ hands: [['r1', 'g2'], ['r3', 'g4'], ['g3']], draw: DRAW_PILE }), 'p0', 'r1');
  s = play(s, 'p1', 'r3');
  rejected(s, catchUno('p2', 'p0'));
});

test('Uno: Erwischen schon während der Farbwahl möglich', () => {
  let s = play(game({ hands: [['W', 'g2'], ['g4'], ['g3']], draw: DRAW_PILE }), 'p0', 'W');
  s = act(s, catchUno('p1', 'p0'));
  assertEqual(handOf(s, 'p0').length, 3, 'zieht 2');
  s = act(s, { type: 'chooseColor', playerId: 'p0', color: 'green' });
  assertEqual(s.activeColor, 'green', 'Farbwahl geht weiter');
});

test('Uno: Ruf verfällt, wenn der Spieler Karten zieht', () => {
  let s = callUno(game({ hands: [['g1', 'g2'], ['g4']], draw: ['b9'] }), 'p0');
  s = act(s, { type: 'draw', playerId: 'p0' });
  assertEqual(player(s, 'p0').saidUno, false, 'Ruf verfallen');
});
