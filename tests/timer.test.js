import { test, assert, assertEqual } from './testing.js';
import { createGame as createKniffel } from '../src/games/kniffel/game.js';
import { kniffel } from '../src/games/kniffel/index.js';
import { createGame as createLudo } from '../src/games/ludo/game.js';
import { ludo } from '../src/games/ludo/index.js';
import { uno } from '../src/games/uno/index.js';
import { act, currentId, game, handOf, play, rejected } from './setup.js';

const timeout = (playerId) => ({ type: 'timeout', playerId });

test('Zug-Timer: aus bei 0 Sekunden, sonst neuer Schlüssel bei jedem Zug', () => {
  assertEqual(uno.timer(game({ hands: [['r1', 'g1'], ['g2']] })), null, 'aus');
  const s = { ...game({ hands: [['r1', 'g1'], ['g2']] }), turnTime: 30 };
  const before = uno.timer(s);
  assertEqual([before.playerId, before.seconds], ['p0', 30], 'Spieler und Dauer');
  const after = uno.timer(play(s, 'p0', 'r1'));
  assert(after.key !== before.key && after.playerId === 'p1', 'neuer Zug');
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
  rejected(play(game({ hands: [['r1'], ['g2']] }), 'p0', 'r1'), timeout('p1'));
});

test('Zug-Timer: jeder Spielerwechsel erhöht den Zugzähler', () => {
  const s = game({ hands: [['r1', 'g1'], ['g2']] });
  assertEqual(play(s, 'p0', 'r1').turnNumber, s.turnNumber + 1, 'Zähler');
});

test('Zug-Timer Würfelglück: Bot spielt den Zug zu Ende, Uhr läuft pro Zug', () => {
  const players = [{ id: 'p0', name: 'P0' }, { id: 'p1', name: 'P1' }];
  const s = { ...createKniffel({ players, hostId: 'p0', settings: { turnTime: 30 }, seed: 3 }), current: 0 };
  const before = kniffel.timer(s);
  assertEqual([before.playerId, before.seconds], ['p0', 30], 'Spieler und Dauer');
  const rolled = kniffel.reduce(s, { type: 'roll', playerId: 'p0' }).state;
  assertEqual(kniffel.timer(rolled).key, before.key, 'Würfeln startet die Uhr nicht neu');
  const after = kniffel.timeout(rolled, 'p0').state;
  assertEqual(Object.values(after.players[0].sheet).filter((points) => points !== null).length, 1, 'eingetragen');
  assertEqual(after.players[after.current].id, 'p1', 'nächster Spieler');
  assert(kniffel.timeout(after, 'p0').error, 'nicht am Zug');
  assertEqual(kniffel.timer({ ...s, turnTime: 0 }), null, 'aus');
});

test('Zug-Timer Ludo: Bot würfelt und zieht für den Spieler', () => {
  const players = [{ id: 'p0', name: 'P0' }, { id: 'p1', name: 'P1' }];
  const s = { ...createLudo({ players, hostId: 'p0', settings: { finish: 'first', turnTime: 60 }, seed: 5 }), current: 0 };
  assertEqual(ludo.timer(s).seconds, 60, 'Dauer');
  const after = ludo.timeout(s, 'p0').state;
  assert(after.players[after.current].id === 'p1' && !after.mustMove, 'Zug abgegeben');
  assert(after.events.some((e) => e.type === 'roll' && e.player === 'P0'), 'gewürfelt');
});
