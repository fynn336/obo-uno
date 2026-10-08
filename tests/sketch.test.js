import { createGame, normalize, reduce, viewFor } from '../src/games/sketch/game.js';
import { sketch } from '../src/games/sketch/index.js';
import { WORDS } from '../src/games/sketch/words.js';
import { nextBotMove } from '../src/lounge/lounge.js';
import { test, assert, assertEqual } from './testing.js';
import { lounge, loungeAct, loungeRejected } from './setup.js';

// p0 zeichnet, das Wort steht fest
function drawing(playerCount, word = 'Schmetterling', rounds = 1) {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const s = createGame({ players, hostId: 'p0', settings: { rounds, drawTime: 80 }, seed: 4 });
  return { ...s, drawer: 0, phase: 'draw', word, usedWords: [word] };
}

function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

function rejected(state, action) {
  if (!reduce(state, action).error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
}

const guess = (playerId, text) => ({ type: 'guess', playerId, text });
const texts = (view) => view.chat.map((entry) => `${entry.player ?? ''}: ${entry.text}`);

test('Montagsmaler: genug verschiedene Wörter, Raten ohne Groß- und Umlaut-Sorgen', () => {
  assert(WORDS.length >= 150 && new Set(WORDS).size === WORDS.length, 'mindestens 150, keine doppelt');
  assertEqual([normalize(' Kühlschrank '), normalize('U-Boot'), normalize('FUSSBALL')], ['kuehlschrank', 'uboot', 'fussball'], 'normalisiert');
});

test('Montagsmaler: der Zeichner wählt eins von drei Wörtern, die anderen sehen nur Striche', () => {
  const players = [{ id: 'p0', name: 'P0' }, { id: 'p1', name: 'P1' }];
  let s = { ...createGame({ players, hostId: 'p0', settings: { rounds: 1, drawTime: 60 }, seed: 1 }), drawer: 0 };
  assertEqual([viewFor(s, 'p0').options.length, viewFor(s, 'p1').options], [3, null], 'nur der Zeichner wählt');
  rejected(s, { type: 'choose', playerId: 'p1', index: 0 });
  s = act(s, { type: 'choose', playerId: 'p0', index: 2 });
  assertEqual([s.phase, s.word, viewFor(s, 'p1').word], ['draw', s.options[2], null], 'Wort geheim');
  assertEqual(viewFor(s, 'p1').pattern.split(' ').length, s.word.length, 'Muster mit Länge');
});

test('Montagsmaler: nur gültige Striche vom Zeichner, Löschen leert die Fläche', () => {
  let s = drawing(2);
  const stroke = { type: 'stroke', playerId: 'p0', color: '#e0322b', size: 10, points: [[0, 0], [500, 1000]] };
  rejected(s, { ...stroke, playerId: 'p1' });
  rejected(s, { ...stroke, color: 'gold' });
  rejected(s, { ...stroke, points: [[0, 1001]] });
  rejected(s, { ...stroke, points: [] });
  s = act(act(s, stroke), stroke);
  assertEqual(viewFor(s, 'p1').strokes.length, 2, 'alle sehen die Striche');
  assertEqual(act(s, { type: 'clear', playerId: 'p0' }).strokes, [], 'gelöscht');
});

test('Montagsmaler: Raten – falsch für alle sichtbar, knapp daneben nur für sich, richtig gibt Punkte', () => {
  let s = act(drawing(4), guess('p1', 'Schmetterlinge'));
  assertEqual(texts(viewFor(s, 'p2')), ['P1: Schmetterlinge'], 'andere sehen nur den Versuch');
  assertEqual(texts(viewFor(s, 'p1')).at(-1), 'P1: knapp daneben!', 'Hinweis privat');
  s = act(s, guess('p2', 'schmetterling'));
  s = act(s, guess('p1', 'SCHMETTERLING'));
  assertEqual(s.players.map((p) => p.score), [6, 8, 10, 0], 'Erster 10, Zweiter 8, Zeichner 3 je Rater');
  assertEqual([viewFor(s, 'p2').word, viewFor(s, 'p3').word], ['Schmetterling', null], 'Wort für Erratende');
  s = act(s, guess('p2', 'war leicht'));
  assertEqual([texts(viewFor(s, 'p1')).at(-1), texts(viewFor(s, 'p3')).at(-1)], ['P2: war leicht', 'P1: hat es erraten!'], 'Eingeweihte unter sich');
});

test('Montagsmaler: alle erraten oder Zeit um – Auflösung, dann der Nächste zeichnet', () => {
  let s = act(act(drawing(3), guess('p1', 'Schmetterling')), guess('p2', 'Schmetterling'));
  assertEqual(s.phase, 'reveal', 'alle haben es');
  s = act(s, { type: 'timeout', playerId: 'p0' });
  assertEqual([s.phase, s.players[s.drawer].id, s.strokes, s.players.some((p) => p.guessed)], ['choose', 'p1', [], false], 'nächster Zeichner');
  s = act(s, { type: 'timeout', playerId: 'p1' });
  assertEqual(s.phase, 'draw', 'Wort automatisch gewählt');
  s = act(s, { type: 'timeout', playerId: 'p1' });
  assertEqual([s.phase, viewFor(s, 'p2').word !== null], ['reveal', true], 'Zeit um, Wort für alle');
});

test('Montagsmaler: nach allen Runden ist Schluss, Plätze nach Punkten', () => {
  let s = act(drawing(2, 'Haus', 1), guess('p1', 'Haus'));
  s = act(s, { type: 'timeout', playerId: 'p0' });
  for (const step of ['choose', 'draw', 'reveal']) {
    assertEqual(s.phase, step, step);
    s = act(s, { type: 'timeout', playerId: 'p1' });
  }
  assertEqual(s.phase, 'gameOver', 'jeder hat einmal gezeichnet');
  const { ranking, awards } = sketch.result(s);
  assertEqual(ranking.map((r) => [r.playerId, r.place]), [['p1', 1], ['p0', 2]], 'Plätze');
  assertEqual(awards.map((a) => [a.title, a.names]), [['Blitzmerker', ['P1']], ['Künstler', ['P0']]], 'Auszeichnungen');
});

test('Montagsmaler: geht der Zeichner, wird aufgelöst; danach zeichnet der Nächste', () => {
  let s = sketch.removePlayer(drawing(3), 'p0');
  assertEqual([s.phase, s.players.map((p) => p.id)], ['reveal', ['p1', 'p2']], 'aufgelöst');
  s = act(s, { type: 'timeout', playerId: s.players[s.drawer].id });
  assertEqual([s.phase, s.players[s.drawer].id], ['choose', 'p1'], 'p1 zeichnet');
});

test('Montagsmaler: Computer-Gegner setzen aus und warten in der Lounge', () => {
  let s = loungeAct(lounge(1), { type: 'addBot', playerId: 'p0' });
  s = loungeAct(s, { type: 'selectGame', playerId: 'p0', gameId: 'sketch' });
  loungeRejected(s, { type: 'startGame', playerId: 'p0' });
  s = loungeAct(loungeAct(s, { type: 'join', playerId: 'p1', name: 'P1' }), { type: 'startGame', playerId: 'p0' });
  assertEqual([s.participants, s.game.players.length, nextBotMove(s)], [['p0', 'p1'], 2, null], 'nur Menschen');
});
