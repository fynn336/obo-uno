import { botMove } from '../src/games/ships/bot.js';
import { createGame, FLEET, reduce, SIZE } from '../src/games/ships/game.js';
import { ships } from '../src/games/ships/index.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct, loungeRejected } from './setup.js';

function newShips(playerCount, seed = 5) {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  return createGame({ players, hostId: 'p0', settings: { turnTime: 0 }, seed });
}

// Laufende Partie, p0 am Zug; jeder Spieler hat genau die angegebenen Schiffe.
function playing(fleets) {
  const s = newShips(fleets.length);
  return {
    ...s,
    phase: 'playing',
    current: 0,
    players: s.players.map((p, i) => ({ ...p, ready: true, ships: fleets[i].map((cells) => ({ cells, sunk: false })) })),
  };
}

function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

function rejected(state, action) {
  if (!reduce(state, action).error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
}

const shoot = (playerId, targetId, x, y) => ({ type: 'shoot', playerId, targetId, x, y });
const currentId = (s) => s.players[s.current].id;
const SMALL = [[[0, 0], [1, 0]]];
const TWO_SHIPS = [[[0, 0], [1, 0]], [[5, 5]]];

test('Schiffe versenken: zufällige Flotte im Meer, Schiffe berühren sich nicht', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const fleet = newShips(1, seed).players[0].ships;
    assertEqual(fleet.map((s) => s.cells.length), FLEET, 'Größen');
    const cells = fleet.flatMap((s, i) => s.cells.map(([x, y]) => ({ x, y, i })));
    assert(cells.every(({ x, y }) => x >= 0 && y >= 0 && x < SIZE && y < SIZE), 'im Meer');
    const touching = cells.some((a) => cells.some((b) => a.i !== b.i && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1));
    assert(!touching, `Seed ${seed}: kein Kontakt`);
  }
});

test('Schiffe versenken: neu verteilen bis zum Bereit, dann geht es los', () => {
  let s = newShips(2);
  rejected(s, shoot('p0', 'p1', 0, 0));
  const before = JSON.stringify(s.players[0].ships);
  s = act(s, { type: 'shuffleFleet', playerId: 'p0' });
  assert(JSON.stringify(s.players[0].ships) !== before, 'neue Flotte');
  s = act(s, { type: 'ready', playerId: 'p0' });
  rejected(s, { type: 'shuffleFleet', playerId: 'p0' });
  assertEqual(s.phase, 'setup', 'wartet auf p1');
  s = act(s, { type: 'ready', playerId: 'p1' });
  assertEqual(s.phase, 'playing', 'alle bereit');
});

test('Schiffe versenken: Wasser gibt den Zug ab, Treffer erlaubt einen weiteren Schuss', () => {
  let s = playing([SMALL, TWO_SHIPS, SMALL]);
  rejected(s, shoot('p1', 'p0', 0, 0));
  rejected(s, shoot('p0', 'p0', 0, 0));
  rejected(s, shoot('p0', 'p1', 10, 0));
  s = act(s, shoot('p0', 'p1', 0, 0));
  assertEqual([currentId(s), s.players[1].shots['0,0']], ['p0', 'hit'], 'Treffer, nochmal');
  rejected(s, shoot('p0', 'p1', 0, 0));
  s = act(s, shoot('p0', 'p1', 9, 9));
  assertEqual([currentId(s), s.players[1].shots['9,9']], ['p1', 'miss'], 'Wasser, weiter');
});

test('Schiffe versenken: versenken, Flotte weg = raus, der Letzte gewinnt', () => {
  let s = playing([SMALL, TWO_SHIPS]);
  s = act(act(s, shoot('p0', 'p1', 0, 0)), shoot('p0', 'p1', 1, 0));
  assertEqual([s.players[1].ships[0].sunk, s.events.at(-1).type], [true, 'sunk'], 'versenkt');
  s = act(s, shoot('p0', 'p1', 5, 5));
  assertEqual([s.out, s.phase], [['p1'], 'gameOver'], 'vorbei');
  const { ranking, awards } = ships.result(s);
  assertEqual(ranking.map((r) => [r.playerId, r.place]), [['p0', 1], ['p1', 2]], 'Plätze');
  assertEqual(awards.map((a) => [a.title, a.names]), [['Scharfschütze', ['P0']], ['Versenker', ['P0']]], 'Auszeichnungen');
});

test('Schiffe versenken: fremde Schiffe bleiben verborgen, bis sie versenkt sind', () => {
  const s = act(act(playing([SMALL, TWO_SHIPS]), shoot('p0', 'p1', 0, 0)), shoot('p0', 'p1', 1, 0));
  const view = ships.viewFor(s, 'p0');
  assertEqual([view.players[0].ships.length, view.players[1].ships.length, view.players[1].shipsLeft], [1, 1, 1], 'nur versenkte');
  assertEqual(ships.viewFor(s, 'p1').players[1].ships.length, 2, 'eigene Flotte ganz');
});

test('Schiffe versenken: Rauswurf des Spielers am Zug gibt den Zug weiter', () => {
  const s = ships.removePlayer(playing([SMALL, SMALL, SMALL]), 'p0');
  assertEqual([s.players.map((p) => p.id), currentId(s), s.phase], [['p1', 'p2'], 'p1', 'playing'], 'weiter');
  assertEqual(ships.removePlayer(s, 'p1').phase, 'gameOver', 'nur noch einer');
});

test('Schiffe versenken: Bots spielen ganze Partien ohne abgelehnten Zug', () => {
  for (const count of [2, 3, 4]) {
    let s = newShips(count, count * 3);
    for (let step = 0; s.phase !== 'gameOver' && step < 2000; step++) {
      const id = s.phase === 'setup' ? s.players.find((p) => !p.ready).id : currentId(s);
      s = act(s, { ...botMove(s, id), playerId: id });
    }
    assertEqual(s.phase, 'gameOver', `${count} Bots`);
    const shots = s.players.reduce((sum, p) => sum + Object.keys(p.shots).length, 0);
    assert(shots < count * SIZE * SIZE * 0.7, 'Bots zielen besser als blind');
  }
});

test('Schiffe versenken: in der Lounge für 2–4 Spieler', () => {
  let s = loungeAct(lounge(1), { type: 'selectGame', playerId: 'p0', gameId: 'ships' });
  loungeRejected(s, { type: 'startGame', playerId: 'p0' });
  s = loungeAct(loungeAct(s, { type: 'addBot', playerId: 'p0' }), { type: 'startGame', playerId: 'p0' });
  assertEqual([s.gameId, s.game.phase], ['ships', 'setup'], 'Aufstellen');
  loungeRejected(loungeAct(lounge(5), { type: 'selectGame', playerId: 'p0', gameId: 'ships' }), { type: 'startGame', playerId: 'p0' });
});
