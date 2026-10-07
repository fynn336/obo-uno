import { test, assert, assertEqual } from './testing.js';
import { act, currentId, game, handOf, lobby, play, rejected } from './setup.js';

const timeout = (playerId) => ({ type: 'timeout', playerId });

test('Zug-Timer: Einstellung nur durch den Host, nur erlaubte Werte', () => {
  let s = lobby(2);
  assertEqual(s.turnTime, 0, 'Standard aus');
  rejected(s, { type: 'setTurnTime', playerId: 'p1', value: 30 });
  rejected(s, { type: 'setTurnTime', playerId: 'p0', value: 45 });
  s = act(s, { type: 'setTurnTime', playerId: 'p0', value: 30 });
  assertEqual(s.turnTime, 30, 'gesetzt');
});

test('Zug-Timer: normaler Zug – 1 Karte ziehen, Zug endet, auch wenn sie passt', () => {
  const s = act(game({ hands: [['g1', 'g2'], ['g3']], draw: ['r9'] }), timeout('p0'));
  assertEqual(handOf(s, 'p0'), ['g1', 'g2', 'r9'], 'Hand');
  assertEqual(currentId(s), 'p1', 'am Zug');
  assertEqual(s.events.slice(-2).map((e) => e.type), ['timeout', 'draw'], 'Ereignisse');
});

test('Zug-Timer: nach dem Ziehen wird die Karte behalten', () => {
  let s = act(game({ hands: [['g1', 'g2'], ['g3']], draw: ['r9'] }), { type: 'draw', playerId: 'p0' });
  s = act(s, timeout('p0'));
  assertEqual(handOf(s, 'p0').length, 3, 'keine weitere Karte');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Zug-Timer: offene Strafe wird gezogen', () => {
  let s = game({ hands: [['r+2', 'g1'], ['g2'], ['g3']], draw: ['y1', 'y2'], rules: { stacking: true } });
  s = act(play(s, 'p0', 'r+2'), timeout('p1'));
  assertEqual(handOf(s, 'p1').length, 3, 'zieht 2');
  assertEqual(currentId(s), 'p2', 'setzt aus');
});

test('Zug-Timer: offene Farbwahl wird zufällig getroffen', () => {
  const s = act(play(game({ hands: [['W', 'g1'], ['g2'], ['g3']] }), 'p0', 'W'), timeout('p0'));
  assert(s.activeColor !== null && s.phase === 'playing', 'Farbe gewählt');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Zug-Timer: nur für den Spieler am Zug, nur während der Runde', () => {
  rejected(game({ hands: [['g1'], ['g2']] }), timeout('p1'));
  rejected(lobby(2), timeout('p0'));
});

test('Zug-Timer: jeder Spielerwechsel erhöht den Zugzähler', () => {
  const s = game({ hands: [['r1', 'g1'], ['g2']] });
  assertEqual(play(s, 'p0', 'r1').turnNumber, s.turnNumber + 1, 'Zähler');
});
