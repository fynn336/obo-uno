import { uno } from '../src/games/uno/index.js';
import { isPlaying, nextBotMove, reduce, turnTimer, viewFor } from '../src/lounge/lounge.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct, loungeRejected } from './setup.js';

const join = (playerId, name) => ({ type: 'join', playerId, name });
const start = { type: 'startGame', playerId: 'p0' };

function started(playerCount) {
  return loungeAct(lounge(playerCount), start);
}

// Erste Karte, die der Spieler am Zug legen darf, sonst ziehen
function someMove(state) {
  const current = state.game.players[state.game.current].id;
  return { playerId: current, move: uno.botMove(state.game, current) };
}

test('Lounge: Beitritt mit gültigem, eindeutigem Namen, höchstens 8', () => {
  let s = loungeAct(lounge(1), join('a', '  Anna  '));
  assertEqual(s.players.map((p) => p.name), ['P0', 'Anna'], 'Namen');
  loungeRejected(s, join('b', 'anna'));
  loungeRejected(s, join('b', '   '));
  loungeRejected(s, join('b', 'x'.repeat(17)));
  assertEqual(loungeRejected(lounge(8), join('p8', 'P8')), 'Die Lounge ist voll', 'voll');
});

test('Lounge: Beitritt während einer Partie – wartet in der Lounge', () => {
  const s = loungeAct(started(2), join('x', 'Xaver'));
  assertEqual(s.players.length, 3, 'in der Lounge');
  assertEqual([isPlaying(s, 'x'), isPlaying(s, 'p1')], [false, true], 'spielt erst nächste Partie mit');
  assertEqual(viewFor(s, 'x').game, null, 'keine Spielsicht');
  loungeRejected(s, { type: 'move', playerId: 'x', move: { type: 'draw' } });
});

test('Lounge: Avatar nur aus der Liste, Standardfarben verschieden', () => {
  let s = lounge(3);
  assertEqual(s.players.map((p) => p.avatar), [0, 1, 2].map((color) => ({ emoji: '', color })), 'Standard');
  s = loungeAct(s, { type: 'setAvatar', playerId: 'p1', emoji: '🦊', color: 5 });
  assertEqual(s.players[1].avatar, { emoji: '🦊', color: 5 }, 'gewählt');
  loungeRejected(s, { type: 'setAvatar', playerId: 'p1', emoji: '💩', color: 0 });
  loungeRejected(s, { type: 'setAvatar', playerId: 'p1', emoji: '🦊', color: 8 });
  loungeRejected(s, { type: 'setAvatar', playerId: 'p1', emoji: '🦊', color: 1.5 });
});

test('Lounge: Bots nur durch den Host und nur in der Lounge', () => {
  let s = loungeAct(lounge(2), { type: 'addBot', playerId: 'p0' });
  s = loungeAct(s, { type: 'addBot', playerId: 'p0' });
  assertEqual(s.players.slice(2).map((p) => [p.name, p.bot, p.avatar.emoji]), [['Bot Anton', true, '🤖'], ['Bot Berta', true, '🤖']], 'Bots');
  loungeRejected(s, { type: 'addBot', playerId: 'p1' });
  loungeRejected(s, { type: 'removeBot', playerId: 'p0', targetId: 'p1' });
  s = loungeAct(s, { type: 'removeBot', playerId: 'p0', targetId: 'bot-0' });
  assertEqual(s.players.map((p) => p.name), ['P0', 'P1', 'Bot Berta'], 'entfernt');
  loungeRejected(lounge(8), { type: 'addBot', playerId: 'p0' });
  loungeRejected(loungeAct(s, start), { type: 'addBot', playerId: 'p0' });
});

test('Lounge: Spiel wählen und Einstellungen – nur Host, nur gültige Werte', () => {
  let s = lounge(2);
  assertEqual(s.settings.uno, { stacking: false, challenge: false, drawUntilPlayable: false, jumpIn: false, sevenZero: false, deck: 'classic', target: 500, turnTime: 0 }, 'Standard');
  loungeRejected(s, { type: 'selectGame', playerId: 'p0', gameId: 'schach' });
  loungeRejected(s, { type: 'setSetting', playerId: 'p1', gameId: 'uno', key: 'stacking', value: true });
  loungeRejected(s, { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'stacking', value: 1 });
  loungeRejected(s, { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'target', value: 250 });
  loungeRejected(s, { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'toString', value: true });
  s = loungeAct(s, { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'stacking', value: true });
  s = loungeAct(s, { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'target', value: 300 });
  assertEqual([s.settings.uno.stacking, s.settings.uno.target], [true, 300], 'gesetzt');
  s = loungeAct(s, start);
  assertEqual([s.game.rules.stacking, s.game.target], [true, 300], 'an das Spiel übergeben');
  loungeRejected(s, { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'challenge', value: true });
});

test('Lounge: Start nur durch den Host und mit passender Spielerzahl', () => {
  loungeRejected(lounge(1), start);
  loungeRejected(lounge(2), { type: 'startGame', playerId: 'p1' });
  const s = started(3);
  assertEqual([s.phase, s.gameId, s.participants], ['game', 'uno', ['p0', 'p1', 'p2']], 'Partie läuft');
  assert(s.game.players.every((p) => p.hand.length >= 7), 'ausgeteilt');
  loungeRejected(s, start);
});

test('Lounge: Spielzüge werden geprüft und an das Spiel weitergereicht', () => {
  const s = started(2);
  loungeRejected(s, { type: 'move', playerId: 'p0', move: { type: 'cheat' } });
  loungeRejected(s, { type: 'move', playerId: 'p0', move: { type: 'play', cardId: '1' } });
  const { playerId, move } = someMove(s);
  const after = loungeAct(s, { type: 'move', playerId, move });
  assert(after.game.events.length > s.game.events.length, 'Zug im Spiel angekommen');
});

test('Lounge: Spielersicht enthält Avatar und Verbindung aus der Lounge', () => {
  let s = loungeAct(lounge(2), { type: 'setAvatar', playerId: 'p1', emoji: '🐼', color: 3 });
  s = loungeAct(loungeAct(s, start), { type: 'setConnected', playerId: 'p1', connected: false });
  const ben = viewFor(s, 'p0').game.players.find((p) => p.id === 'p1');
  assertEqual([ben.avatar.emoji, ben.connected, ben.cardCount > 0], ['🐼', false, true], 'ergänzt');
});

test('Lounge: Partieende – Platzierung, geteilte Plätze, Lounge-Punkte', () => {
  // p0 legt seine letzte Karte (Wild passt immer) und erreicht damit das Punkteziel.
  const s0 = started(4);
  const lastCard = { id: 999, color: null, value: 'wild' };
  const game = { ...s0.game, target: 1, current: 0, phase: 'playing', pendingDraw: 0, drawnCardId: null };
  const hands = [[lastCard], [], [], game.players[3].hand];
  game.players = game.players.map((p, i) => ({ ...p, score: [0, 5, 5, 0][i], hand: hands[i] }));
  let s = loungeAct({ ...s0, game }, { type: 'move', playerId: 'p0', move: { type: 'play', cardId: lastCard.id } });
  assertEqual(s.phase, 'lounge', 'zurück in der Lounge');
  const standings = s.lastResult.standings.map((r) => [r.playerId, r.place, r.points]);
  assertEqual(standings[0], ['p0', 1, 3], 'Sieger');
  assertEqual(standings.slice(1, 3).map((r) => [r[1], r[2]]), [[2, 2], [2, 2]], 'geteilter 2. Platz');
  assertEqual(standings[3], ['p3', 4, 0], 'letzter');
  assertEqual(s.players.map((p) => p.points), [3, 2, 2, 0], 'Lounge-Punkte');
  s = loungeAct(s, { type: 'newEvening', playerId: 'p0' });
  assertEqual(s.players.map((p) => p.points), [0, 0, 0, 0], 'neuer Abend');
});

test('Lounge: Rauswurf – Zuschauer sofort, Mitspieler aus der Partie, zu wenige = Abbruch', () => {
  let s = loungeAct(started(3), join('x', 'Xaver'));
  s = loungeAct(s, { type: 'leave', playerId: 'x' });
  assertEqual(s.phase, 'game', 'Zuschauer stört nicht');
  s = loungeAct(s, { type: 'leave', playerId: 'p2' });
  assertEqual([s.phase, s.participants, s.game.players.length], ['game', ['p0', 'p1'], 2], 'Partie läuft weiter');
  s = loungeAct(s, { type: 'leave', playerId: 'p1' });
  assertEqual([s.phase, s.lastResult.aborted], ['lounge', true], 'abgebrochen ohne Wertung');
  assertEqual(s.players.map((p) => p.points), [0], 'keine Punkte');
});

test('Lounge: Host kann eine Partie beenden', () => {
  const s = started(2);
  loungeRejected(s, { type: 'abortGame', playerId: 'p1' });
  const ended = loungeAct(s, { type: 'abortGame', playerId: 'p0' });
  assertEqual([ended.phase, ended.lastResult.aborted], ['lounge', true], 'beendet');
  loungeRejected(ended, { type: 'abortGame', playerId: 'p0' });
});

test('Lounge: Bots und Zug-Timer laufen über das Spiel', () => {
  let s = loungeAct(lounge(1), { type: 'addBot', playerId: 'p0' });
  assertEqual(nextBotMove(s), null, 'keine Partie');
  s = loungeAct(s, { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'turnTime', value: 30 });
  s = loungeAct(s, start);
  const current = s.game.players[s.game.current].id;
  assertEqual(turnTimer(s).playerId, current, 'Uhr für den Spieler am Zug');
  assertEqual(nextBotMove(s)?.playerId ?? null, current === 'bot-0' ? 'bot-0' : null, 'nur Bots ziehen selbst');
  const afterTimeout = loungeAct(s, { type: 'timeout', playerId: current });
  assert(afterTimeout.game.turnNumber > s.game.turnNumber, 'Zeitablauf weitergereicht');
});

test('Lounge: ganze Partie mit Bots bis zur Wertung', () => {
  let s = loungeAct(lounge(1), { type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'target', value: 200 });
  for (let i = 0; i < 3; i++) s = loungeAct(s, { type: 'addBot', playerId: 'p0' });
  s = loungeAct(s, start);
  for (let step = 0; s.phase === 'game' && step < 20000; step++) {
    const next = s.game.phase === 'roundOver'
      ? { playerId: 'p0', move: { type: 'nextRound' } }
      : nextBotMove(s) ?? someMove(s);
    const result = reduce(s, { type: 'move', ...next });
    if (result.error) throw new Error(`${next.move.type} abgelehnt: ${result.error}`);
    s = result.state;
  }
  assertEqual(s.phase, 'lounge', 'Partie beendet');
  assertEqual(s.lastResult.standings.length, 4, 'alle platziert');
  assertEqual(s.players.reduce((sum, p) => sum + p.points, 0) >= 6, true, 'Lounge-Punkte verteilt');
});

test('Farbenchaos: Kartendesign aus der Lounge gilt für die ganze Partie', () => {
  const setDeck = (value) => ({ type: 'setSetting', playerId: 'p0', gameId: 'uno', key: 'deck', value });
  loungeRejected(lounge(2), setDeck('regenbogen'));
  const s = loungeAct(loungeAct(lounge(2), setDeck('bloom')), start);
  assertEqual([viewFor(s, 'p0').game.deck, viewFor(s, 'p1').game.deck], ['bloom', 'bloom'], 'für alle');
});

test('Lounge: Neuer Abend zeigt einen Rückblick mit Podest, Siegern und Auszeichnungen', () => {
  // Zwei gewonnene Farbenchaos-Partien: erst p0, dann p1 legt die letzte Karte.
  const win = (state, winner) => {
    const lastCard = { id: 999, color: null, value: 'wild' };
    const game = { ...state.game, target: 1, current: winner, phase: 'playing', pendingDraw: 0, drawnCardId: null };
    game.players = game.players.map((p, i) => ({ ...p, hand: i === winner ? [lastCard] : p.hand }));
    return loungeAct({ ...state, game }, { type: 'move', playerId: `p${winner}`, move: { type: 'play', cardId: lastCard.id } });
  };
  let s = win(started(3), 0);
  s = win(loungeAct(s, start), 1);
  s = win(loungeAct(s, start), 0);
  loungeRejected(s, { type: 'newEvening', playerId: 'p1' });
  s = loungeAct(s, { type: 'newEvening', playerId: 'p0' });
  const { recap } = viewFor(s, 'p2');
  assertEqual(recap.games, 3, 'drei Partien');
  assertEqual(recap.podium.map((p) => [p.name, p.place]).slice(0, 2), [['P0', 1], ['P1', 2]], 'Podest');
  assertEqual(recap.perGame, [{ gameId: 'uno', played: 3, winners: ['P0'], wins: 2 }], 'meiste Siege');
  assertEqual([s.players.map((p) => p.points), s.lastResult], [[0, 0, 0], null], 'Sterne zurückgesetzt');
  s = loungeAct(s, start);
  assertEqual([s.recap, s.history], [null, []], 'nächste Partie räumt den Rückblick weg');
});
