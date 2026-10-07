import { gameAwards } from '../src/games/uno/awards.js';
import { uno } from '../src/games/uno/index.js';
import { test, assertEqual } from './testing.js';
import { act, game, play, player } from './setup.js';

test('Auszeichnungen: Wild +4, gezogene Karten, Erwischt werden gezählt', () => {
  let s = game({ hands: [['W+4', 'r1', 'g1'], ['g2'], ['g3']], draw: ['y1', 'y2', 'y3', 'y4', 'y5', 'y6'] });
  s = act(play(s, 'p0', 'W+4'), { type: 'chooseColor', playerId: 'p0', color: 'red' });
  assertEqual(player(s, 'p0').stats.wild4, 1, '+4 gelegt');
  assertEqual(player(s, 'p1').stats.drawn, 4, 'Strafe gezogen');
  let forgot = play(game({ hands: [['r1', 'g2'], ['g4'], ['g3']], draw: ['y1', 'y2'] }), 'p0', 'r1');
  forgot = act(forgot, { type: 'catchUno', playerId: 'p2', targetId: 'p0' });
  assertEqual([player(forgot, 'p0').stats.caught, player(forgot, 'p2').stats.catches], [1, 1], 'Erwischt');
});

test('Auszeichnungen: Höchstwert gewinnt, Gleichstand teilt, null zählt nicht', () => {
  const stats = (wild4, drawn, caught, catches) => ({ wild4, drawn, caught, catches });
  const awards = gameAwards([
    { name: 'Anna', stats: stats(2, 5, 0, 1) },
    { name: 'Ben', stats: stats(2, 9, 0, 0) },
  ]);
  assertEqual(awards.map((a) => [a.title, a.names]), [
    ['Fiesling', ['Anna', 'Ben']],
    ['Pechvogel', ['Ben']],
    ['Adlerauge', ['Anna']],
  ], 'Auszeichnungen');
});

test('Auszeichnungen: stehen im Ergebnis am Partieende', () => {
  let s = { ...game({ hands: [['r7'], ['W', 'W', 'W', 'W']] }), target: 200 };
  s.players[1].stats.drawn = 12;
  s = play(s, 'p0', 'r7');
  assertEqual(uno.result(s).awards.map((a) => [a.title, a.names]), [['Pechvogel', ['P1']]], 'Auszeichnungen');
});
