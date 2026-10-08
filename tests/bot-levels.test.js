import { GAMES } from '../src/games/index.js';
import { botAction } from '../src/games/uno/bot.js';
import { BOT_LEVELS, nextBotMove } from '../src/lounge/lounge.js';
import { test, assert, assertEqual } from './testing.js';
import { game, lounge, loungeAct, loungeRejected, play } from './setup.js';

const LEVELS_PLAYED = [['easy', 'hard'], ['medium', 'medium'], ['hard', 'easy']];
// Würfelspiele brauchen einige Partien, bis sich Können gegen Glück durchsetzt.
const GAMES_PER_CHECK = 20;

// Zwei Bots spielen eine ganze Partie, so wie die Lounge sie fragt: der erste mit einem Zug ist dran.
function duel(module, levels, seed) {
  const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const settings = Object.fromEntries(module.settings.map((s) => [s.key, s.default]));
  let s = module.create({ players, hostId: 'a', settings: { ...settings, target: 200 }, seed });
  for (let step = 0; step < 20000 && !module.result(s); step++) {
    const turn = players.map((p, i) => ({ id: p.id, move: module.botMove(s, p.id, levels[i]) })).find((t) => t.move);
    const action = turn ? { ...turn.move, playerId: turn.id } : { type: 'nextRound', playerId: 'a' };
    const result = module.reduce(s, action);
    if (result.error) throw new Error(`${module.id} ${levels}: ${action.type} abgelehnt: ${result.error}`);
    s = result.state;
  }
  return s;
}

test('Bot-Stärke: jede Stufe spielt jedes Spiel ohne abgelehnten Zug zu Ende', () => {
  for (const module of Object.values(GAMES)) {
    for (const levels of LEVELS_PLAYED) assert(module.result(duel(module, levels, 3)), `${module.name} ${levels}`);
  }
});

test('Bot-Stärke: nur der Host stellt sie ein, Standard ist mittel', () => {
  let s = lounge(2);
  assertEqual(s.botLevel, 'medium', 'Standard');
  loungeRejected(s, { type: 'setBotLevel', playerId: 'p1', level: 'hard' });
  loungeRejected(s, { type: 'setBotLevel', playerId: 'p0', level: 'unschlagbar' });
  s = loungeAct(s, { type: 'setBotLevel', playerId: 'p0', level: 'hard' });
  assertEqual([s.botLevel, BOT_LEVELS], ['hard', ['easy', 'medium', 'hard']], 'gesetzt');
});

test('Bot-Stärke Farbenchaos: leicht vergisst UNO, schwer erwischt jeden Vergesser', () => {
  const s = game({ hands: [['r1', 'r2'], ['g2', 'g3'], ['b1']] });
  assertEqual(botAction(s, 'p0', 'easy').type, 'play', 'leicht ruft nicht');
  assertEqual(botAction(s, 'p0', 'medium').type, 'callUno', 'mittel ruft');
  const forgot = play(s, 'p0', 'r1');
  assertEqual(botAction(forgot, 'p2', 'hard'), { type: 'catchUno', playerId: 'p2', targetId: 'p0' }, 'schwer erwischt');
  assertEqual(botAction(forgot, 'p2', 'medium'), null, 'mittel schaut weg');
});

test('Bot-Stärke: schwere Bots gewinnen öfter als leichte', () => {
  for (const id of Object.keys(GAMES)) {
    let wins = 0;
    for (let seed = 1; seed <= GAMES_PER_CHECK; seed++) {
      const ranking = GAMES[id].result(duel(GAMES[id], ['hard', 'easy'], seed * 31)).ranking;
      if (ranking.find((r) => r.playerId === 'a').place === 1) wins++;
    }
    assert(wins > GAMES_PER_CHECK * 0.6, `${GAMES[id].name}: ${wins} von ${GAMES_PER_CHECK}`);
  }
});

test('Bot-Stärke: die Lounge reicht die Stufe an die Bots weiter', () => {
  let s = loungeAct(loungeAct(lounge(1), { type: 'addBot', playerId: 'p0' }), { type: 'startGame', playerId: 'p0' });
  // p0 ist am Zug und hat gerade UNO vergessen
  s = { ...s, game: { ...s.game, current: s.game.players.findIndex((p) => p.id === 'p0'), unoWindow: 'p0' } };
  assertEqual(nextBotMove(s), null, 'mittel schaut weg');
  s = loungeAct(s, { type: 'setBotLevel', playerId: 'p0', level: 'hard' });
  assertEqual(nextBotMove(s)?.move.type, 'catchUno', 'schwer erwischt');
});
