import { botMove } from '../src/games/hangman/bot.js';
import { createGame, MAX_MISSES, reduce, viewFor } from '../src/games/hangman/game.js';
import { hangman } from '../src/games/hangman/index.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct } from './setup.js';

// p0 ist am Zug, gesucht ist word
function guessing(playerCount, word = 'Fußball', words = 3) {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const s = createGame({ players, hostId: 'p0', settings: { words, turnTime: 0 }, seed: 2 });
  return { ...s, current: 0, word, usedWords: [word] };
}

function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

function rejected(state, action) {
  if (!reduce(state, action).error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
}

const letter = (playerId, value) => ({ type: 'letter', playerId, letter: value });
const currentId = (s) => s.players[s.current].id;

test('Galgenmännchen: richtiger Buchstabe gibt Punkte je Vorkommen und einen weiteren Versuch', () => {
  let s = act(guessing(2), letter('p0', 'l'));
  assertEqual([s.players[0].score, currentId(s)], [4, 'p0'], 'zweimal L, nochmal dran');
  assertEqual(viewFor(s, 'p1').masked, [null, null, null, null, null, 'l', 'l'], 'aufgedeckt');
  rejected(s, letter('p0', 'L'));
  rejected(s, letter('p0', '7'));
  rejected(s, letter('p1', 'a'));
  s = act(s, letter('p0', 'ß'));
  assertEqual([s.players[0].score, currentId(s)], [6, 'p0'], 'ß ist ein eigener Buchstabe');
});

test('Galgenmännchen: falscher Buchstabe lässt den Galgen wachsen und gibt den Zug ab', () => {
  const s = act(guessing(3), letter('p0', 'x'));
  assertEqual([s.misses, currentId(s), viewFor(s, 'p0').word], [1, 'p1', null], 'Fehler, Wort bleibt geheim');
});

test('Galgenmännchen: lösen bringt Bonus je verdecktem Buchstaben, falsch lösen ist ein Fehler', () => {
  let s = act(guessing(2), letter('p0', 'l'));
  s = act(s, { type: 'solve', playerId: 'p0', text: ' fussball ' });
  assertEqual([s.phase, s.outcome, s.players[0].score], ['reveal', 'solved', 4 + 5 + 5], 'gelöst');
  assertEqual(viewFor(s, 'p1').word, 'Fußball', 'Wort für alle');
  const wrong = act(guessing(2), { type: 'solve', playerId: 'p0', text: 'Basketball' });
  assertEqual([wrong.misses, currentId(wrong)], [1, 'p1'], 'falsch gelöst');
});

test('Galgenmännchen: letzter Buchstabe löst das Wort, 8 Fehler hängen es', () => {
  let s = guessing(1, 'Eis');
  for (const value of ['e', 'i']) s = act(s, letter('p0', value));
  s = act(s, letter('p0', 's'));
  assertEqual([s.outcome, s.players[0].score], ['solved', 6 + 5], 'Bonus für den letzten Buchstaben');
  let hanged = guessing(2, 'Eis');
  for (const value of [...'ABCDFGHJKL']) hanged = act(hanged, letter(currentId(hanged), value));
  assertEqual([hanged.misses, hanged.outcome, hanged.phase], [MAX_MISSES, 'hanged', 'reveal'], 'Galgen komplett');
});

test('Galgenmännchen: nach der Auflösung kommt das nächste Wort, am Ende die Wertung', () => {
  let s = act(guessing(2, 'Eis', 2), { type: 'solve', playerId: 'p0', text: 'Eis' });
  s = act(s, { type: 'timeout', playerId: 'p0' });
  assertEqual([s.phase, s.wordNumber, currentId(s), s.misses, s.guessed], ['guess', 2, 'p1', 0, []], 'nächstes Wort');
  assert(s.word !== 'Eis', 'neues Wort');
  s = act(s, { type: 'solve', playerId: 'p1', text: s.word });
  s = act(s, { type: 'timeout', playerId: 'p1' });
  assertEqual(s.phase, 'gameOver', 'vorbei');
  assertEqual(hangman.result(s).awards.map((a) => [a.title, a.names]), [['Rätselkönig', ['P0', 'P1']]], 'Auszeichnung');
});

test('Galgenmännchen: Wörter mit Bindestrich zeigen ihn sofort', () => {
  assertEqual(viewFor(guessing(1, 'U-Boot'), 'p0').masked, [null, '-', null, null, null, null], 'Bindestrich offen');
});

test('Galgenmännchen: schwerer Bot löst, sobald nur noch ein Wort passt', () => {
  let s = guessing(1, 'Wassermelone');
  s = act(s, letter('p0', 'e'));
  s = act(s, letter('p0', 'm'));
  assertEqual(botMove(s, 'p0', 'hard'), { type: 'solve', text: 'Wassermelone' }, 'gelöst');
  assertEqual(botMove(s, 'p0', 'medium').type, 'letter', 'mittel rät weiter Buchstaben');
});

test('Galgenmännchen: in der Lounge ab 1 Spieler', () => {
  let s = loungeAct(lounge(1), { type: 'selectGame', playerId: 'p0', gameId: 'hangman' });
  s = loungeAct(s, { type: 'startGame', playerId: 'p0' });
  assertEqual([s.gameId, s.game.phase, s.game.wordNumber], ['hangman', 'guess', 1], 'läuft');
});
