import { test, assertEqual } from './testing.js';
import { act, currentId, game, handOf, play, rejected } from './setup.js';

const DRAW_PILE = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8', 'y9', 'y0', 'b8', 'b9'];

function playWild4(state, playerId, color) {
  return act(play(state, playerId, 'W+4'), { type: 'chooseColor', playerId, color });
}

test('Anfechtung aus: Wild +4 ist trotz passender Farbe erlaubt', () => {
  const s = playWild4(game({ hands: [['W+4', 'r1'], ['g2'], ['g3']], draw: DRAW_PILE }), 'p0', 'blue');
  assertEqual(s.phase, 'playing', 'kein Anfechtungsfenster');
  assertEqual(handOf(s, 'p1').length, 5, 'p1 hat gezogen');
});

test('Anfechtung an: unberechtigt – Anfechter zieht 6 und setzt aus', () => {
  let s = game({ hands: [['W+4', 'g1'], ['b2'], ['g3']], draw: DRAW_PILE, rules: { challenge: true } });
  s = playWild4(s, 'p0', 'blue');
  assertEqual(s.phase, 'challengeWindow', 'Phase');
  assertEqual(currentId(s), 'p1', 'entscheidet');
  s = act(s, { type: 'challenge', playerId: 'p1' });
  assertEqual(handOf(s, 'p1').length, 7, 'p1 zieht 6');
  assertEqual(handOf(s, 'p0'), ['g1'], 'Leger zieht nicht');
  assertEqual(currentId(s), 'p2', 'am Zug');
  assertEqual(s.phase, 'playing', 'Phase danach');
});

test('Anfechtung an: berechtigt – Leger zieht 4, Anfechter bleibt am Zug', () => {
  let s = game({ hands: [['W+4', 'r1', 'g1'], ['b2', 'g7'], ['g3']], draw: DRAW_PILE, rules: { challenge: true } });
  s = playWild4(s, 'p0', 'blue');
  s = act(s, { type: 'challenge', playerId: 'p1' });
  assertEqual(handOf(s, 'p0'), ['r1', 'g1', 'y1', 'y2', 'y3', 'y4'], 'Leger zieht 4');
  assertEqual(handOf(s, 'p1'), ['b2', 'g7'], 'Anfechter zieht nichts');
  assertEqual(currentId(s), 'p1', 'am Zug');
  assertEqual(s.activeColor, 'blue', 'gewählte Farbe bleibt');
  s = play(s, 'p1', 'b2');
  assertEqual(currentId(s), 'p2', 'normal weiter');
});

test('Anfechtung an: Ziehen statt Anfechten – 4 Karten und aussetzen', () => {
  let s = game({ hands: [['W+4', 'r1'], ['b2'], ['g3']], draw: DRAW_PILE, rules: { challenge: true } });
  s = playWild4(s, 'p0', 'blue');
  rejected(s, { type: 'play', playerId: 'p1', cardId: s.players[1].hand[0].id });
  s = act(s, { type: 'draw', playerId: 'p1' });
  assertEqual(handOf(s, 'p1').length, 5, 'p1 zieht 4');
  assertEqual(currentId(s), 'p2', 'am Zug');
});

test('Stapeln aus: +2 auf +2 wird nicht gestapelt', () => {
  const s = play(game({ hands: [['r+2', 'g1'], ['g+2', 'g2'], ['g3']], draw: DRAW_PILE }), 'p0', 'r+2');
  assertEqual(handOf(s, 'p1').length, 4, 'p1 zieht sofort');
  assertEqual(currentId(s), 'p2', 'am Zug');
});

test('Stapeln an: +2 auf +2, wer nicht stapelt, zieht die Summe', () => {
  let s = game({ hands: [['r+2', 'g1'], ['g+2', 'g2'], ['g3']], draw: DRAW_PILE, rules: { stacking: true } });
  s = play(s, 'p0', 'r+2');
  assertEqual(s.pendingDraw, 2, 'offene Strafe');
  assertEqual(handOf(s, 'p1'), ['g+2', 'g2'], 'p1 zieht noch nicht');
  s = play(s, 'p1', 'g+2');
  assertEqual(s.pendingDraw, 4, 'Summe');
  assertEqual(currentId(s), 'p2', 'am Zug');
  s = act(s, { type: 'draw', playerId: 'p2' });
  assertEqual(handOf(s, 'p2'), ['g3', 'y1', 'y2', 'y3', 'y4'], 'p2 zieht 4');
  assertEqual(s.pendingDraw, 0, 'Strafe erledigt');
  assertEqual(currentId(s), 'p0', 'p2 setzt aus');
});

test('Stapeln an: nur +2 auf +2 und +4 auf +4', () => {
  let s = game({ hands: [['r+2', 'g1'], ['W+4', 'r7', 'g2'], ['g3']], draw: DRAW_PILE, rules: { stacking: true } });
  s = play(s, 'p0', 'r+2');
  for (const target of s.players[1].hand) {
    rejected(s, { type: 'play', playerId: 'p1', cardId: target.id });
  }
});

test('Stapeln an: +4 auf +4', () => {
  let s = game({ hands: [['W+4', 'g1'], ['W+4', 'b+2', 'g2'], ['g3']], draw: DRAW_PILE, rules: { stacking: true } });
  s = playWild4(s, 'p0', 'blue');
  rejected(s, { type: 'play', playerId: 'p1', cardId: s.players[1].hand[1].id });
  s = playWild4(s, 'p1', 'red');
  assertEqual(s.pendingDraw, 8, 'Summe');
  s = act(s, { type: 'draw', playerId: 'p2' });
  assertEqual(handOf(s, 'p2').length, 9, 'p2 zieht 8');
  assertEqual(currentId(s), 'p0', 'p2 setzt aus');
});

test('Stapeln + Anfechtung: berechtigt – oberer Leger zieht 4, Anfechter den Rest', () => {
  let s = game({ hands: [['W+4', 'g1'], ['W+4', 'b2', 'g2'], ['g3']], draw: DRAW_PILE, rules: { stacking: true, challenge: true } });
  s = playWild4(s, 'p0', 'blue');
  assertEqual(s.phase, 'challengeWindow', 'Phase');
  s = playWild4(s, 'p1', 'red');
  assertEqual(s.phase, 'challengeWindow', 'Phase nach Stapeln');
  assertEqual(s.pendingDraw, 8, 'Summe');
  s = act(s, { type: 'challenge', playerId: 'p2' });
  assertEqual(handOf(s, 'p1').length, 6, 'p1 zieht 4');
  assertEqual(handOf(s, 'p0'), ['g1'], 'unterer Leger bleibt verschont');
  assertEqual(handOf(s, 'p2').length, 5, 'p2 zieht den Rest (4)');
  assertEqual(currentId(s), 'p0', 'p2 setzt aus');
});

test('Stapeln + Anfechtung: unberechtigt – Anfechter zieht Summe + 2', () => {
  let s = game({ hands: [['W+4', 'g1'], ['W+4', 'g2', 'g4'], ['g3']], draw: DRAW_PILE, rules: { stacking: true, challenge: true } });
  s = playWild4(s, 'p0', 'blue');
  s = playWild4(s, 'p1', 'red');
  s = act(s, { type: 'challenge', playerId: 'p2' });
  assertEqual(handOf(s, 'p2').length, 11, 'p2 zieht 10');
  assertEqual(handOf(s, 'p1'), ['g2', 'g4'], 'p1 zieht nicht');
  assertEqual(currentId(s), 'p0', 'p2 setzt aus');
  rejected(s, { type: 'challenge', playerId: 'p0' });
});

test('Anfechtung an, Stapeln aus: im Anfechtungsfenster kein Stapeln', () => {
  let s = game({ hands: [['W+4', 'g1'], ['W+4', 'g2'], ['g3']], draw: DRAW_PILE, rules: { challenge: true } });
  s = playWild4(s, 'p0', 'blue');
  rejected(s, { type: 'play', playerId: 'p1', cardId: s.players[1].hand[0].id });
});

test('Ziehen bis spielbar: zieht bis zur ersten spielbaren Karte', () => {
  let s = game({ hands: [['g1', 'g2'], ['g3']], draw: ['b1', 'b2', 'r9', 'b3'], rules: { drawUntilPlayable: true } });
  s = act(s, { type: 'draw', playerId: 'p0' });
  assertEqual(handOf(s, 'p0'), ['g1', 'g2', 'b1', 'b2', 'r9'], 'Hand');
  assertEqual(currentId(s), 'p0', 'noch am Zug');
  s = act(s, { type: 'pass', playerId: 'p0' });
  assertEqual(currentId(s), 'p1', 'Legen ist freiwillig');
});

test('Ziehen bis spielbar: ohne spielbare Karte endet der Zug, wenn nichts mehr da ist', () => {
  const s = act(game({ hands: [['g1', 'g2'], ['g3']], draw: ['b1', 'b2'], rules: { drawUntilPlayable: true } }), { type: 'draw', playerId: 'p0' });
  assertEqual(handOf(s, 'p0'), ['g1', 'g2', 'b1', 'b2'], 'Hand');
  assertEqual(currentId(s), 'p1', 'am Zug');
});

test('Ziehen bis spielbar: gilt nicht für Strafkarten', () => {
  const unplayable = ['b1', 'b2', 'b3', 'b4', 'r9'];
  const auto = play(game({ hands: [['r+2', 'g1'], ['g2'], ['g3']], draw: unplayable, rules: { drawUntilPlayable: true } }), 'p0', 'r+2');
  assertEqual(handOf(auto, 'p1'), ['g2', 'b1', 'b2'], 'automatische Strafe');

  let stacked = game({ hands: [['r+2', 'g1'], ['g2'], ['g3']], draw: unplayable, rules: { drawUntilPlayable: true, stacking: true } });
  stacked = act(play(stacked, 'p0', 'r+2'), { type: 'draw', playerId: 'p1' });
  assertEqual(handOf(stacked, 'p1'), ['g2', 'b1', 'b2'], 'Strafe beim Stapeln');
  assertEqual(currentId(stacked), 'p2', 'p1 setzt aus');
});
