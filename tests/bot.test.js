import { botAction } from '../src/games/uno/bot.js';
import { isRunning, reduce } from '../src/games/uno/game.js';
import { test, assertEqual } from './testing.js';
import { act, codes, game, newGame, player } from './setup.js';

const MAX_STEPS = 3000;

test('Bots: Aktionskarten vor Zahlen, Wild-Karten zuletzt', () => {
  const s = game({ hands: [['W', 'r3', 'rS', 'g9'], ['g1']] });
  assertEqual(codes([player(s, 'p0').hand.find((c) => c.id === botAction(s, 'p0').cardId)]), ['rS'], 'Karte');
  const onlyWild = game({ hands: [['W', 'W+4', 'g9'], ['g1']] });
  assertEqual(codes([player(onlyWild, 'p0').hand.find((c) => c.id === botAction(onlyWild, 'p0').cardId)]), ['W'], 'Wild vor Wild +4');
});

test('Bots: rufen UNO, wählen ihre häufigste Farbe, ziehen ohne passende Karte', () => {
  assertEqual(botAction(game({ hands: [['r1', 'g2'], ['g1']] }), 'p0').type, 'callUno', 'UNO');
  const s = game({ hands: [['W', 'b1', 'b2', 'g3'], ['g1']] });
  const choosing = act(s, { type: 'play', playerId: 'p0', cardId: s.players[0].hand[0].id });
  assertEqual(botAction(choosing, 'p0'), { type: 'chooseColor', playerId: 'p0', color: 'blue' }, 'Farbe');
  assertEqual(botAction(game({ hands: [['g1', 'g2'], ['g3']] }), 'p0'), { type: 'draw', playerId: 'p0' }, 'ziehen');
  assertEqual(botAction(game({ hands: [['g1', 'g2'], ['g3']] }), 'p1'), null, 'nicht am Zug');
});

test('Bots: spielen ganze Partien mit allen Hausregel-Kombinationen ohne abgelehnte Aktion', () => {
  const ruleSets = [{}, { stacking: true }, { challenge: true }, { drawUntilPlayable: true },
    { stacking: true, challenge: true, drawUntilPlayable: true }];
  for (const [i, rules] of ruleSets.entries()) {
    for (let seed = 1; seed <= 6; seed++) {
      let s = newGame(4, rules, seed * 97 + i);
      let steps = 0;
      while (isRunning(s) && steps++ < MAX_STEPS) {
        const action = botAction(s, s.players[s.current].id);
        const result = reduce(s, action);
        if (result.error) throw new Error(`Seed ${seed}, Regeln ${JSON.stringify(rules)}: ${action.type} abgelehnt: ${result.error}`);
        s = result.state;
      }
      assertEqual(isRunning(s), false, `Seed ${seed}, Regeln ${JSON.stringify(rules)} endet`);
    }
  }
});
