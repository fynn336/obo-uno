import { botMove } from '../src/games/ludo/bot.js';
import { BASE, createGame, fieldOf, reduce } from '../src/games/ludo/game.js';
import { ludo } from '../src/games/ludo/index.js';
import { nextRandom } from '../src/shared/rng.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct, loungeRejected } from './setup.js';

function newLudo(playerCount, finish = 'first') {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  return { ...createGame({ players, hostId: 'p0', settings: { finish }, seed: 7 }), current: 0 };
}

// Setzt Figuren direkt: pieces[i] gehört zum i-ten Spieler.
function withPieces(state, pieces) {
  return { ...state, players: state.players.map((p, i) => ({ ...p, pieces: pieces[i] ?? p.pieces })) };
}

// Wählt den Seed so, dass der nächste Wurf genau diese Zahl zeigt.
function withDie(state, face) {
  let seed = 1;
  while (1 + Math.floor(nextRandom(seed)[0] * 6) !== face) seed++;
  return { ...state, seed };
}

function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

function rejected(state, action) {
  const result = reduce(state, action);
  if (!result.error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
  return result.error;
}

function rollAs(state, face) {
  return act(withDie(state, face), { type: 'roll', playerId: state.players[state.current].id });
}

function moveAs(state, piece) {
  return act(state, { type: 'move', playerId: state.players[state.current].id, piece });
}

test('Ludo: zu zweit gegenüber, Startfelder zehn Felder auseinander', () => {
  const s = newLudo(2);
  assertEqual(s.players.map((p) => p.color), [0, 2], 'Farben');
  assertEqual([fieldOf(0, 0), fieldOf(1, 0), fieldOf(2, 5), fieldOf(3, 15)], [0, 10, 25, 5], 'Felder');
  assertEqual(newLudo(4).players.map((p) => p.color), [0, 1, 2, 3], 'zu viert');
});

test('Ludo: ohne Figur draußen drei Versuche für eine 6', () => {
  let s = rollAs(newLudo(2), 3);
  assertEqual([s.current, s.triesLeft, s.mustMove], [0, 2, false], 'zweiter Versuch');
  s = rollAs(rollAs(s, 2), 5);
  assertEqual([s.current, s.triesLeft], [1, 3], 'nächster Spieler');
});

test('Ludo: mit einer 6 muss eine Figur raus, danach wird nochmal gewürfelt', () => {
  let s = withPieces(newLudo(2), [[BASE, BASE, 12, BASE]]);
  s = rollAs(s, 6);
  assertEqual(ludo.viewFor(s, 'p0').movable, [0, 1, 3], 'nur Figuren aus dem Haus');
  rejected(s, { type: 'move', playerId: 'p0', piece: 2 });
  s = moveAs(s, 0);
  assertEqual([s.players[0].pieces, s.current, s.mustMove], [[0, BASE, 12, BASE], 0, false], 'nochmal würfeln');
});

test('Ludo: Startfeld räumen, solange Figuren im Haus sind', () => {
  let s = rollAs(withPieces(newLudo(2), [[0, BASE, 20, BASE]]), 3);
  assertEqual(ludo.viewFor(s, 'p0').movable, [0], 'Startfeld zuerst');
  s = moveAs(s, 0);
  assertEqual([s.players[0].pieces[0], s.current], [3, 1], 'gezogen, Zug vorbei');
});

test('Ludo: Schlagen schickt die Figur zurück ins Haus', () => {
  // Rot auf Feld 15, Grün (Start bei Feld 20) steht auf Feld 18 = relativ 38
  let s = rollAs(withPieces(newLudo(2), [[15, 30, 31, 32], [38, BASE, BASE, BASE]]), 3);
  s = moveAs(s, 0);
  assertEqual([s.players[1].pieces[0], s.players[0].captures, s.players[1].captured], [BASE, 1, 1], 'geschlagen');
  assertEqual(s.events.at(-1).victim, 'P1', 'im Verlauf');
});

test('Ludo: eigene Figuren blockieren, ins Ziel nur mit passender Zahl', () => {
  let s = rollAs(withPieces(newLudo(2), [[10, 13, 41, 39]]), 3);
  assertEqual(ludo.viewFor(s, 'p0').movable, [1, 3], 'blockiert und zu weit');
  s = moveAs(s, 3);
  assertEqual(s.players[0].pieces[3], 42, 'im Ziel');
  rejected(s, { type: 'move', playerId: 'p0', piece: 0 });
});

test('Ludo: ungültige Züge werden abgelehnt', () => {
  const s = newLudo(2);
  rejected(s, { type: 'roll', playerId: 'p1' });
  rejected(s, { type: 'move', playerId: 'p0', piece: 0 });
  const r = rollAs(s, 6);
  rejected(r, { type: 'roll', playerId: 'p0' });
  rejected(r, { type: 'move', playerId: 'p0', piece: 7 });
  rejected(r, { type: 'move', playerId: 'p1', piece: 0 });
});

test('Ludo: der Erste im Ziel beendet die Partie, Plätze nach Fortschritt', () => {
  let s = withPieces(newLudo(3), [[40, 41, 42, 37], [40, 5, BASE, BASE], [30, BASE, BASE, BASE]]);
  s = moveAs(rollAs(s, 6), 3);
  assertEqual(s.phase, 'gameOver', 'vorbei');
  rejected(s, { type: 'roll', playerId: 'p1' });
  const { ranking } = ludo.result(s);
  assertEqual(ranking.map((r) => [r.playerId, r.place]), [['p0', 1], ['p1', 2], ['p2', 3]], 'Plätze');
  assertEqual(ranking[1].detail, '1 von 4 im Ziel', 'Detail');
});

test('Ludo: „alle im Ziel“ spielt weiter und überspringt Fertige', () => {
  let s = withPieces(newLudo(3, 'all'), [[40, 41, 42, 39], [20, BASE, BASE, BASE], [40, 41, 42, 38]]);
  s = moveAs(rollAs(s, 4), 3);
  assertEqual([s.phase, s.finished, s.current], ['playing', ['p0'], 1], 'weiter mit P1');
  s = rollAs(s, 1);
  s = moveAs(s, 0);
  assertEqual(s.current, 2, 'P2 dran');
  s = moveAs(rollAs(s, 5), 3);
  assertEqual(s.phase, 'gameOver', 'nur noch einer übrig');
  assertEqual(ludo.result(s).ranking.map((r) => r.playerId), ['p0', 'p2', 'p1'], 'Einlauf-Reihenfolge');
});

test('Ludo: Rauswurf des Spielers am Zug gibt den Zug weiter', () => {
  let s = rollAs(newLudo(3), 6);
  s = ludo.removePlayer(s, 'p0');
  assertEqual([s.players.map((p) => p.id), s.players[s.current].id, s.mustMove], [['p1', 'p2'], 'p1', false], 'weiter');
});

test('Ludo: Bots spielen ganze Partien ohne abgelehnten Zug', () => {
  for (const [count, finish] of [[2, 'first'], [3, 'all'], [4, 'first'], [4, 'all']]) {
    const players = Array.from({ length: count }, (_, i) => ({ id: `b${i}`, name: `B${i}` }));
    let s = createGame({ players, hostId: 'b0', settings: { finish }, seed: count * 11 });
    for (let step = 0; s.phase === 'playing' && step < 20000; step++) {
      const id = s.players[s.current].id;
      s = act(s, { ...botMove(s, id), playerId: id });
    }
    assertEqual(s.phase, 'gameOver', `${count} Bots, ${finish}`);
    assert(s.players.some((p) => p.captures > 0), 'es wird geschlagen');
  }
});

test('Ludo: in der Lounge für 2–4 Spieler', () => {
  let s = loungeAct(lounge(1), { type: 'selectGame', playerId: 'p0', gameId: 'ludo' });
  loungeRejected(s, { type: 'startGame', playerId: 'p0' });
  s = loungeAct(s, { type: 'setSetting', playerId: 'p0', gameId: 'ludo', key: 'finish', value: 'all' });
  s = loungeAct(s, { type: 'addBot', playerId: 'p0' });
  s = loungeAct(s, { type: 'startGame', playerId: 'p0' });
  assertEqual([s.phase, s.gameId, s.game.finish], ['game', 'ludo', 'all'], 'läuft');
  loungeRejected(loungeAct(lounge(5), { type: 'selectGame', playerId: 'p0', gameId: 'ludo' }), { type: 'startGame', playerId: 'p0' });
});
