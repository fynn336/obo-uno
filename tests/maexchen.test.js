import { botMove } from '../src/games/maexchen/bot.js';
import { createGame, reduce } from '../src/games/maexchen/game.js';
import { maexchen } from '../src/games/maexchen/index.js';
import { isHigher, valueLabel, valueOf, VALUES } from '../src/games/maexchen/values.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct, loungeRejected } from './setup.js';

function newMaexchen(playerCount, lives = 3) {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  return { ...createGame({ players, hostId: 'p0', settings: { lives, turnTime: 0 }, seed: 9 }), current: 0 };
}

function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

function rejected(state, action) {
  const result = reduce(state, action);
  if (!result.error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
}

const currentId = (s) => s.players[s.current].id;
const lives = (s) => s.players.map((p) => p.lives);

// Spieler am Zug würfelt genau diese Würfel und sagt value an.
function rollAndAnnounce(state, dice, value) {
  const rolled = { ...act(state, { type: 'roll', playerId: currentId(state) }), dice };
  return act(rolled, { type: 'announce', playerId: currentId(state), value });
}

test('Mäxchen: Rangfolge der Würfe – Zahlen, Pasche, Mäxchen', () => {
  assertEqual([valueOf([1, 2]), valueOf([6, 3]), valueOf([4, 4])], [21, 63, 44], 'Werte');
  assert(isHigher(21, 66) && isHigher(11, 65) && isHigher(32, 31) && !isHigher(65, 11), 'Reihenfolge');
  assertEqual([valueLabel(21), valueLabel(55), valueLabel(43)], ['Mäxchen', '5er-Pasch', '43'], 'Namen');
  assertEqual(VALUES.length, 21, 'alle 21 Würfe');
});

test('Mäxchen: ansagen nur höher, der Nächste glaubt und würfelt selbst', () => {
  let s = newMaexchen(3);
  rejected(s, { type: 'announce', playerId: 'p0', value: 31 });
  s = rollAndAnnounce(s, [5, 4], 54);
  assertEqual([s.phase, currentId(s), s.announced], ['decide', 'p1', 54], 'p1 entscheidet');
  s = act(s, { type: 'believe', playerId: 'p1' });
  s = { ...act(s, { type: 'roll', playerId: 'p1' }), dice: [3, 1] };
  rejected(s, { type: 'announce', playerId: 'p1', value: 53 });
  rejected(s, { type: 'announce', playerId: 'p1', value: 99 });
  s = act(s, { type: 'announce', playerId: 'p1', value: 61 });
  assertEqual([currentId(s), s.announcerId], ['p2', 'p1'], 'weiter');
});

test('Mäxchen: Aufdecken – Lügner oder Zweifler verliert ein Leben, Verlierer beginnt neu', () => {
  const lie = act(rollAndAnnounce(newMaexchen(3), [3, 1], 66), { type: 'doubt', playerId: 'p1' });
  assertEqual([lives(lie), currentId(lie), lie.phase, lie.announced], [[2, 3, 3], 'p0', 'roll', null], 'gelogen');
  assertEqual(lie.events.at(-1).lied, true, 'Verlauf');
  const truth = act(rollAndAnnounce(newMaexchen(3), [6, 6], 65), { type: 'doubt', playerId: 'p1' });
  assertEqual([lives(truth), currentId(truth)], [[3, 2, 3], 'p1'], 'gestimmt');
});

test('Mäxchen: echtes Mäxchen kostet den Zweifler 2 Leben, Glauben kostet 1', () => {
  const doubted = act(rollAndAnnounce(newMaexchen(3), [2, 1], 21), { type: 'doubt', playerId: 'p1' });
  assertEqual(lives(doubted), [3, 1, 3], 'doppelt');
  const believed = act(rollAndAnnounce(newMaexchen(3), [3, 1], 21), { type: 'believe', playerId: 'p1' });
  assertEqual([lives(believed), currentId(believed), believed.phase], [[3, 2, 3], 'p1', 'roll'], 'aufgegeben');
});

test('Mäxchen: Würfel sieht nur, wer ansagt', () => {
  const s = { ...act(newMaexchen(2), { type: 'roll', playerId: 'p0' }), dice: [4, 2] };
  assertEqual([maexchen.viewFor(s, 'p0').myDice, maexchen.viewFor(s, 'p1').myDice], [[4, 2], null], 'verdeckt');
});

test('Mäxchen: wer keine Leben hat, scheidet aus; der Letzte gewinnt', () => {
  let s = newMaexchen(3, 1);
  s = act(rollAndAnnounce(s, [3, 1], 66), { type: 'doubt', playerId: 'p1' });
  assertEqual([s.out, currentId(s)], [['p0'], 'p1'], 'p0 raus, p1 beginnt');
  s = act(rollAndAnnounce(s, [6, 5], 65), { type: 'doubt', playerId: 'p2' });
  assertEqual(s.phase, 'gameOver', 'vorbei');
  const { ranking, awards } = maexchen.result(s);
  assertEqual(ranking.map((r) => [r.playerId, r.place]), [['p1', 1], ['p2', 2], ['p0', 3]], 'Plätze');
  assertEqual(awards.map((a) => [a.title, a.names]), [['Lügenbaron', ['P0']], ['Spürnase', ['P1']]], 'Auszeichnungen');
});

test('Mäxchen: Rauswurf startet die Runde neu', () => {
  let s = rollAndAnnounce(newMaexchen(3), [5, 2], 52);
  s = maexchen.removePlayer(s, 'p1');
  assertEqual([s.players.map((p) => p.id), currentId(s), s.phase, s.announced], [['p0', 'p2'], 'p2', 'roll', null], 'neu');
});

test('Mäxchen: Bots spielen ganze Partien ohne abgelehnten Zug', () => {
  for (const count of [2, 4, 6]) {
    const players = Array.from({ length: count }, (_, i) => ({ id: `b${i}`, name: `B${i}` }));
    let s = createGame({ players, hostId: 'b0', settings: { lives: 3, turnTime: 0 }, seed: count * 7 });
    for (let step = 0; s.phase !== 'gameOver' && step < 5000; step++) {
      const id = currentId(s);
      s = act(s, { ...botMove(s, id), playerId: id });
    }
    assertEqual(s.phase, 'gameOver', `${count} Bots`);
    assertEqual(maexchen.result(s).ranking.length, count, 'alle platziert');
  }
});

test('Mäxchen: in der Lounge ab 2 Spielern, Leben einstellbar', () => {
  let s = loungeAct(lounge(1), { type: 'selectGame', playerId: 'p0', gameId: 'maexchen' });
  loungeRejected(s, { type: 'startGame', playerId: 'p0' });
  s = loungeAct(s, { type: 'setSetting', playerId: 'p0', gameId: 'maexchen', key: 'lives', value: 5 });
  s = loungeAct(loungeAct(s, { type: 'addBot', playerId: 'p0' }), { type: 'startGame', playerId: 'p0' });
  assertEqual([s.gameId, s.game.players.map((p) => p.lives)], ['maexchen', [5, 5]], 'läuft');
});
