import { test, assert, assertEqual } from './testing.js';
import { act, codes, currentId, game, handOf, play, rejected } from './setup.js';

const DRAW_PILE = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6'];
const leave = (playerId) => ({ type: 'leave', playerId });

test('Rauswurf zwischen den Runden: Spieler wird einfach entfernt', () => {
  const s = act(play(game({ hands: [['r1'], ['g2'], ['g3']] }), 'p0', 'r1'), leave('p1'));
  assertEqual(s.players.map((p) => p.id), ['p0', 'p2'], 'Spieler');
});

test('Rauswurf: Karten kommen unter den Ziehstapel, Spiel läuft weiter', () => {
  const s = act(game({ hands: [['r1', 'r2'], ['g2'], ['b7', 'b8']], draw: ['y1'] }), leave('p2'));
  assertEqual(codes(s.drawPile), ['b7', 'b8', 'y1'], 'Ziehstapel (unten zuerst)');
  assertEqual(s.players.map((p) => p.id), ['p0', 'p1'], 'Spieler');
  assertEqual(currentId(s), 'p0', 'am Zug');
  assertEqual(s.phase, 'playing', 'Phase');
});

test('Rauswurf: Spieler vor dem aktuellen verschiebt den Zug nicht', () => {
  const s = act(game({ hands: [['r1'], ['g2'], ['b7']], current: 2 }), leave('p0'));
  assertEqual(currentId(s), 'p2', 'am Zug');
});

test('Rauswurf: aktueller Spieler – der nächste ist dran (beide Richtungen)', () => {
  const forward = act(game({ hands: [['r1'], ['g2'], ['b7']], current: 2 }), leave('p2'));
  assertEqual(currentId(forward), 'p0', 'im Uhrzeigersinn');
  const backward = act(game({ hands: [['r1'], ['g2'], ['b7']], current: 1, direction: -1 }), leave('p1'));
  assertEqual(currentId(backward), 'p0', 'gegen den Uhrzeigersinn');
});

test('Rauswurf während der Farbwahl: Zufallsfarbe, Karte wirkt weiter', () => {
  let s = play(game({ hands: [['W+4', 'g1'], ['g2'], ['g3']], draw: DRAW_PILE }), 'p0', 'W+4');
  s = act(s, leave('p0'));
  assert(['red', 'yellow', 'green', 'blue'].includes(s.activeColor), `Farbe ${s.activeColor}`);
  assertEqual(s.phase, 'playing', 'Phase');
  assertEqual(handOf(s, 'p1').length, 5, 'p1 zieht 4');
  assertEqual(currentId(s), 'p2', 'am Zug');
});

test('Rauswurf bei Startkarte Wild: Zufallsfarbe, nächster Spieler beginnt', () => {
  let s = game({ hands: [['r1'], ['g2'], ['g3']], top: 'W', color: null });
  s = { ...s, phase: 'chooseColor', startWild: true };
  s = act(s, leave('p0'));
  assert(s.activeColor !== null, 'Farbe gesetzt');
  assertEqual(s.startWild, false, 'Startfarbe erledigt');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Rauswurf mit offener Strafe: Strafe verfällt', () => {
  let s = game({ hands: [['r+2', 'g1'], ['g2'], ['g3']], draw: DRAW_PILE, rules: { stacking: true } });
  s = act(play(s, 'p0', 'r+2'), leave('p1'));
  assertEqual(s.pendingDraw, 0, 'keine Strafe');
  assertEqual(currentId(s), 'p2', 'am Zug');
  assertEqual(handOf(s, 'p2'), ['g3'], 'p2 zieht nicht');
});

test('Rauswurf: Anfechtung gegen ausgeschiedenen Leger – niemand zieht', () => {
  let s = game({ hands: [['W+4', 'r1', 'g1'], ['g2'], ['g3']], draw: DRAW_PILE, rules: { challenge: true } });
  s = act(play(s, 'p0', 'W+4'), { type: 'chooseColor', playerId: 'p0', color: 'blue' });
  s = act(s, leave('p0'));
  s = act(s, { type: 'challenge', playerId: 'p1' });
  assertEqual(handOf(s, 'p1'), ['g2'], 'Anfechter zieht nicht');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Rauswurf: bleibt nur 1 Spieler, endet die Runde', () => {
  const s = act(game({ hands: [['r1'], ['g2']] }), leave('p0'));
  assertEqual(s.phase, 'roundOver', 'Phase');
  assertEqual(s.winnerId, 'p1', 'Gewinner');
});

test('Ungültig: falscher Spieler', () => {
  const s = game({ hands: [['r1'], ['r2'], ['g3']] });
  const cardId = s.players[1].hand[0].id;
  assertEqual(rejected(s, { type: 'play', playerId: 'p1', cardId }), 'Du bist nicht am Zug', 'Fehler');
  rejected(s, { type: 'draw', playerId: 'p2' });
});

test('Ungültig: unspielbare oder fremde Karte', () => {
  const s = game({ hands: [['g1', 'r2'], ['r3']] });
  assertEqual(rejected(s, { type: 'play', playerId: 'p0', cardId: s.players[0].hand[0].id }), 'Diese Karte passt nicht', 'unspielbar');
  rejected(s, { type: 'play', playerId: 'p0', cardId: s.players[1].hand[0].id });
  rejected(s, { type: 'play', playerId: 'p0', cardId: 'r2' });
});

test('Ungültig: falsche Phase', () => {
  const betweenRounds = play(game({ hands: [['r1'], ['g2']] }), 'p0', 'r1');
  rejected(betweenRounds, { type: 'draw', playerId: 'p1' });
  const playing = game({ hands: [['W', 'g1'], ['r3']] });
  rejected(playing, { type: 'chooseColor', playerId: 'p0', color: 'red' });
  rejected(playing, { type: 'challenge', playerId: 'p0' });
  const choosing = play(playing, 'p0', 'W');
  assertEqual(rejected(choosing, { type: 'draw', playerId: 'p0' }), 'Wähle zuerst eine Farbe', 'Farbwahl offen');
  rejected(choosing, { type: 'play', playerId: 'p0', cardId: choosing.players[0].hand[0].id });
});

test('Ungültig: unbekannte Aktion', () => {
  const s = game({ hands: [['r1'], ['g2']] });
  rejected(s, { type: 'cheat', playerId: 'p0' });
  rejected(s, { type: 'constructor', playerId: 'p0' });
});
