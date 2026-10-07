import { revealStartCard } from '../src/games/uno/game.js';
import { test, assert, assertEqual } from './testing.js';
import { act, card, codes, currentId, game, handOf, play, player, rejected } from './setup.js';

const draw = (state, playerId) => act(state, { type: 'draw', playerId });

function startWith(code, playerCount = 3) {
  const state = game({ hands: Array.from({ length: playerCount }, () => ['g1', 'g2']), draw: ['y7', 'y8', 'y9'] });
  state.discardPile = [];
  state.drawPile.push(card(code));
  state.current = 1;
  revealStartCard(state);
  return state;
}

test('Effekt: Zahlkarte – nächster Spieler, Farbe wird aktiv', () => {
  const s = play(game({ hands: [['g5', 'g1'], ['g2'], ['g3']] }), 'p0', 'g5');
  assertEqual(currentId(s), 'p1', 'am Zug');
  assertEqual(s.activeColor, 'green', 'aktive Farbe');
});

test('Effekt: Aussetzen überspringt den nächsten Spieler', () => {
  const s = play(game({ hands: [['rS', 'g1'], ['g2'], ['g3']] }), 'p0', 'rS');
  assertEqual(currentId(s), 'p2', 'am Zug');
});

test('Effekt: Richtungswechsel bei 3 Spielern', () => {
  let s = play(game({ hands: [['rR', 'g1'], ['g2'], ['r3', 'g3']] }), 'p0', 'rR');
  assertEqual(s.direction, -1, 'Richtung');
  assertEqual(currentId(s), 'p2', 'am Zug');
  s = play(s, 'p2', 'r3');
  assertEqual(currentId(s), 'p1', 'danach');
});

test('Effekt: Richtungswechsel bei 2 Spielern wirkt wie Aussetzen', () => {
  const s = play(game({ hands: [['rR', 'g1'], ['g2']] }), 'p0', 'rR');
  assertEqual(currentId(s), 'p0', 'am Zug');
});

test('Effekt: +2 – nächster Spieler zieht 2 und setzt aus', () => {
  const s = play(game({ hands: [['r+2', 'g1'], ['g2'], ['g3']], draw: ['b1', 'b2', 'b3'] }), 'p0', 'r+2');
  assertEqual(handOf(s, 'p1'), ['g2', 'b1', 'b2'], 'Hand p1');
  assertEqual(currentId(s), 'p2', 'am Zug');
});

test('Effekt: Wild – nur der Leger wählt die Farbe', () => {
  let s = play(game({ hands: [['W', 'g1'], ['g2'], ['g3']] }), 'p0', 'W');
  assertEqual(s.phase, 'chooseColor', 'Phase');
  rejected(s, { type: 'chooseColor', playerId: 'p1', color: 'blue' });
  rejected(s, { type: 'chooseColor', playerId: 'p0', color: 'purple' });
  s = act(s, { type: 'chooseColor', playerId: 'p0', color: 'blue' });
  assertEqual(s.activeColor, 'blue', 'aktive Farbe');
  assertEqual(s.phase, 'playing', 'Phase danach');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Effekt: Wild +4 – nächster Spieler zieht 4 und setzt aus', () => {
  let s = game({ hands: [['W+4', 'g1'], ['g2'], ['g3']], draw: ['b1', 'b2', 'b3', 'b4', 'b5'] });
  s = play(s, 'p0', 'W+4');
  s = act(s, { type: 'chooseColor', playerId: 'p0', color: 'yellow' });
  assertEqual(handOf(s, 'p1'), ['g2', 'b1', 'b2', 'b3', 'b4'], 'Hand p1');
  assertEqual(currentId(s), 'p2', 'am Zug');
  assertEqual(s.activeColor, 'yellow', 'aktive Farbe');
});

test('Startkarte: Zahlkarte – Startspieler beginnt', () => {
  const s = startWith('b4');
  assertEqual(s.activeColor, 'blue', 'aktive Farbe');
  assertEqual(currentId(s), 'p1', 'am Zug');
  assertEqual(s.phase, 'playing', 'Phase');
});

test('Startkarte: Aussetzen – Startspieler wird übersprungen', () => {
  assertEqual(currentId(startWith('bS')), 'p2', 'am Zug');
});

test('Startkarte: Richtungswechsel bei 3 Spielern – Spieler davor beginnt', () => {
  const s = startWith('bR');
  assertEqual(s.direction, -1, 'Richtung');
  assertEqual(currentId(s), 'p0', 'am Zug');
});

test('Startkarte: Richtungswechsel bei 2 Spielern – wirkt wie Aussetzen', () => {
  assertEqual(currentId(startWith('bR', 2)), 'p0', 'am Zug');
});

test('Startkarte: +2 – Startspieler zieht 2 und setzt aus', () => {
  const s = startWith('b+2');
  assertEqual(handOf(s, 'p1'), ['g1', 'g2', 'y7', 'y8'], 'Hand p1');
  assertEqual(currentId(s), 'p2', 'am Zug');
});

test('Startkarte: Wild – Startspieler wählt die Farbe und bleibt am Zug', () => {
  let s = startWith('W');
  assertEqual(s.phase, 'chooseColor', 'Phase');
  assertEqual(currentId(s), 'p1', 'wählt');
  s = act(s, { type: 'chooseColor', playerId: 'p1', color: 'green' });
  assertEqual(s.activeColor, 'green', 'aktive Farbe');
  assertEqual(currentId(s), 'p1', 'am Zug');
  assertEqual(s.phase, 'playing', 'Phase danach');
});

test('Startkarte: Wild +4 kommt zurück ins Deck, es wird neu aufgedeckt', () => {
  const s = startWith('W+4');
  assert(s.discardPile.length === 1 && s.discardPile[0].value !== 'wild4', 'Startkarte ist kein Wild +4');
  assert(codes(s.drawPile).includes('W+4'), 'Wild +4 liegt im Ziehstapel');
  assertEqual(s.drawPile.length, 3, 'Ziehstapel');
});

test('Ziehen: unspielbare Karte beendet den Zug', () => {
  const s = draw(game({ hands: [['g1', 'g2'], ['g3']], draw: ['b9'] }), 'p0');
  assertEqual(handOf(s, 'p0'), ['g1', 'g2', 'b9'], 'Hand');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Ziehen: spielbare Karte darf sofort gelegt werden', () => {
  let s = draw(game({ hands: [['g1', 'g2'], ['g3']], draw: ['r9'] }), 'p0');
  assertEqual(currentId(s), 'p0', 'noch am Zug');
  s = play(s, 'p0', 'r9');
  assertEqual(codes([s.discardPile.at(-1)]), ['r9'], 'oben liegt');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Ziehen: danach ist nur die gezogene Karte erlaubt', () => {
  const s = draw(game({ hands: [['r1', 'g2'], ['g3']], draw: ['r9'] }), 'p0');
  const target = player(s, 'p0').hand.find((c) => c.value === '1');
  assertEqual(rejected(s, { type: 'play', playerId: 'p0', cardId: target.id }), 'Du darfst nur die gezogene Karte legen', 'Fehler');
});

test('Ziehen: gezogene Karte behalten und weitergeben', () => {
  let s = draw(game({ hands: [['g1', 'g2'], ['g3']], draw: ['r9'] }), 'p0');
  rejected(s, { type: 'draw', playerId: 'p0' });
  s = act(s, { type: 'pass', playerId: 'p0' });
  assertEqual(handOf(s, 'p0'), ['g1', 'g2', 'r9'], 'Hand');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Ziehen: freiwillig trotz spielbarer Karte erlaubt, Weitergeben nur nach Ziehen', () => {
  const s = game({ hands: [['r1', 'g2'], ['g3']], draw: ['b9'] });
  rejected(s, { type: 'pass', playerId: 'p0' });
  assertEqual(currentId(draw(s, 'p0')), 'p1', 'am Zug');
});

test('Neumischen: leerer Ziehstapel wird aus dem Ablagestapel gebildet', () => {
  const s = draw(game({ hands: [['g1', 'g2'], ['g3']], discard: ['b1', 'b2'], top: 'r5' }), 'p0');
  assertEqual(s.discardPile.length, 1, 'Ablagestapel');
  assertEqual(codes(s.discardPile), ['r5'], 'oberste Karte bleibt');
  assertEqual(s.drawPile.length, 1, 'Ziehstapel');
  assertEqual([...codes(s.drawPile), ...handOf(s, 'p0').slice(2)].sort(), ['b1', 'b2'], 'neu gemischte Karten');
});

test('Neumischen: ohne Karten zum Ziehen endet der Zug ohne Karte', () => {
  const s = draw(game({ hands: [['g1', 'g2'], ['g3']] }), 'p0');
  assertEqual(handOf(s, 'p0'), ['g1', 'g2'], 'Hand');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Spielende: letzte Karte gewinnt die Runde', () => {
  const s = play(game({ hands: [['r7'], ['g3']] }), 'p0', 'r7');
  assertEqual(s.phase, 'roundOver', 'Phase');
  assertEqual(s.winnerId, 'p0', 'Gewinner');
  rejected(s, { type: 'draw', playerId: 'p1' });
});

test('Spielende: letzte Karte +2 oder Wild wirkt nicht mehr', () => {
  const afterDraw2 = play(game({ hands: [['r+2'], ['g3']], draw: ['b1', 'b2'] }), 'p0', 'r+2');
  assertEqual(handOf(afterDraw2, 'p1'), ['g3'], 'p1 zieht nicht');
  const afterWild = play(game({ hands: [['W'], ['g3']] }), 'p0', 'W');
  assertEqual(afterWild.phase, 'roundOver', 'keine Farbwahl');
});

test('Rundenende: Host startet die nächste Runde', () => {
  let s = play(game({ hands: [['r7'], ['g3'], ['g4']] }), 'p0', 'r7');
  rejected(s, { type: 'nextRound', playerId: 'p1' });
  s = act(s, { type: 'nextRound', playerId: 'p0' });
  rejected(s, { type: 'nextRound', playerId: 'p0' });
  assert(s.phase === 'playing' || s.phase === 'chooseColor', `Phase ${s.phase}`);
  assertEqual(s.winnerId, null, 'Gewinner zurückgesetzt');
  const total = s.players.reduce((sum, p) => sum + p.hand.length, 0) + s.drawPile.length + s.discardPile.length;
  assertEqual(total, 108, 'Kartenzahl');
  assert(s.players.every((p) => p.hand.length >= 7), 'jeder hat mindestens 7 Karten');
});
