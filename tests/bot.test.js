import { botAction } from '../src/game/bot.js';
import { reduce } from '../src/game/game.js';
import { test, assertEqual } from './testing.js';
import { act, codes, game, lobby, player, rejected } from './setup.js';

const MAX_STEPS = 3000;

test('Bots: Host fügt hinzu und entfernt, Namen eindeutig, höchstens 8 Spieler', () => {
  let s = act(lobby(2), { type: 'addBot', playerId: 'p0' });
  s = act(s, { type: 'addBot', playerId: 'p0' });
  assertEqual(s.players.slice(2).map((p) => [p.name, p.bot, p.avatar.emoji]), [['Bot Anton', true, '🤖'], ['Bot Berta', true, '🤖']], 'Bots');
  rejected(s, { type: 'addBot', playerId: 'p1' });
  rejected(s, { type: 'removeBot', playerId: 'p0', targetId: 'p1' });
  s = act(s, { type: 'removeBot', playerId: 'p0', targetId: 'bot-0' });
  assertEqual(s.players.map((p) => p.name), ['P0', 'P1', 'Bot Berta'], 'entfernt');
  rejected(lobby(8), { type: 'addBot', playerId: 'p0' });
  rejected(act(s, { type: 'start', playerId: 'p0' }), { type: 'addBot', playerId: 'p0' });
});

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
      let s = { ...lobby(4, rules), seed: seed * 97 + i };
      s.players.forEach((p) => { p.bot = true; });
      s = act(s, { type: 'start', playerId: 'p0' });
      let steps = 0;
      while (s.phase !== 'roundOver' && steps++ < MAX_STEPS) {
        const action = botAction(s, s.players[s.current].id);
        const result = reduce(s, action);
        if (result.error) throw new Error(`Seed ${seed}, Regeln ${JSON.stringify(rules)}: ${action.type} abgelehnt: ${result.error}`);
        s = result.state;
      }
      assertEqual(s.phase, 'roundOver', `Seed ${seed}, Regeln ${JSON.stringify(rules)} endet`);
    }
  }
});
