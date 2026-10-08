import { nextRandom } from '../../shared/rng.js';
import { normalize } from '../sketch/game.js';
import { WORDS } from '../sketch/words.js';

export const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß'];
export const MAX_MISSES = 10;
export const REVEAL_SECONDS = 4;
const LETTER_POINTS = 2;
const SOLVE_BONUS = 5;
const MAX_EVENTS = 30;
const VISIBLE_EVENTS = 8;

// Ablauf je Wort: guess (reihum Buchstaben raten oder lösen) → reveal (Auflösung) → nächstes Wort oder gameOver
export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'guess',
    hostId,
    turnTime: settings.turnTime,
    wordCount: settings.words,
    players: players.map(({ id, name }) => ({ id, name, score: 0, solved: 0, misses: 0 })),
    current: 0,
    wordNumber: 0,
    word: null,
    guessed: [],
    misses: 0,
    // 'solved' oder 'hanged', sobald ein Wort entschieden ist
    outcome: null,
    usedWords: [],
    turnNumber: 0,
    events: [],
    seed,
  };
  state.current = Math.floor(random(state) * players.length);
  nextWord(state);
  return state;
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  const error = handlers[action.type](next, action);
  return error ? { state, error } : { state: next, error: null };
}

export function viewFor(state, playerId) {
  const open = state.phase !== 'guess';
  return {
    you: playerId,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(({ id, name, score }) => ({ id, name, score })),
    currentId: state.phase === 'gameOver' ? null : state.players[state.current].id,
    // null steht für einen noch verdeckten Buchstaben
    masked: [...state.word].map((char) => (open || !isLetter(char) || state.guessed.includes(letterOf(char)) ? char : null)),
    guessed: state.guessed,
    misses: state.misses,
    word: open ? state.word : null,
    outcome: state.outcome,
    wordNumber: state.wordNumber,
    wordCount: state.wordCount,
    turnTime: state.turnTime,
    turnNumber: state.turnNumber,
    events: state.events.slice(-VISIBLE_EVENTS),
  };
}

// Großbuchstabe, unter dem ein Zeichen geraten wird; ß bleibt ß
export function letterOf(char) {
  return char === 'ß' ? 'ß' : char.toUpperCase();
}

export function isLetter(char) {
  return ALPHABET.includes(letterOf(char));
}

// Ein richtiger Buchstabe bringt Punkte und einen weiteren Versuch, ein falscher ein Stück Galgen.
function letter(state, { playerId, letter: raw }) {
  const error = checkTurn(state, playerId);
  if (error) return error;
  const guess = typeof raw === 'string' ? letterOf(raw) : null;
  if (!ALPHABET.includes(guess)) return 'Das ist kein Buchstabe';
  if (state.guessed.includes(guess)) return 'Der Buchstabe wurde schon geraten';
  state.guessed.push(guess);
  const player = state.players[state.current];
  const hits = [...state.word].filter((char) => letterOf(char) === guess).length;
  log(state, 'letter', { player: player.name, letter: guess, hits });
  if (hits === 0) {
    miss(state, player);
    return;
  }
  player.score += hits * LETTER_POINTS;
  if (hidden(state) === 0) solve(state, player, 0);
}

// Das ganze Wort raten: richtig gibt einen Bonus je noch verdecktem Buchstaben, falsch zählt als Fehler.
function solveWord(state, { playerId, text }) {
  const error = checkTurn(state, playerId);
  if (error) return error;
  if (normalize(text).length === 0) return 'Erst ein Wort eingeben';
  const player = state.players[state.current];
  if (normalize(text) !== normalize(state.word)) {
    log(state, 'wrongSolve', { player: player.name, text: text.trim().slice(0, 40) });
    miss(state, player);
    return;
  }
  solve(state, player, hidden(state));
}

function timeout(state, { playerId }) {
  if (state.phase === 'gameOver' || state.players[state.current].id !== playerId) return 'Kein laufender Zug dieses Spielers';
  if (state.phase === 'reveal') {
    nextWord(state);
    return;
  }
  log(state, 'timeout', { player: state.players[state.current].name });
  passTurn(state);
}

// Ein Spieler verlässt die Partie; war er dran, geht der Zug weiter.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  log(state, 'left', { player: state.players[index].name });
  state.players.splice(index, 1);
  if (state.players.length === 0 || state.phase === 'gameOver') return;
  if (index < state.current) state.current--;
  else if (index === state.current) {
    state.current = (state.current - 1 + state.players.length) % state.players.length;
    if (state.phase === 'guess') passTurn(state);
  }
}

// leave und timeout löst nur der Host aus.
const handlers = { letter, solve: solveWord, timeout, leave };

function miss(state, player) {
  state.misses++;
  player.misses++;
  if (state.misses < MAX_MISSES) {
    passTurn(state);
    return;
  }
  state.outcome = 'hanged';
  state.phase = 'reveal';
  state.turnNumber++;
  log(state, 'hanged', { word: state.word });
}

function solve(state, player, stillHidden) {
  player.score += SOLVE_BONUS + stillHidden;
  player.solved++;
  state.outcome = 'solved';
  state.phase = 'reveal';
  state.turnNumber++;
  log(state, 'solved', { player: player.name, word: state.word, points: SOLVE_BONUS + stillHidden });
}

// Nächstes Wort; es beginnt, wer nach dem letzten Rater dran wäre.
function nextWord(state) {
  if (state.wordNumber >= state.wordCount) {
    state.phase = 'gameOver';
    return;
  }
  const fresh = WORDS.filter((word) => !state.usedWords.includes(word));
  state.word = fresh[Math.floor(random(state) * fresh.length)];
  state.usedWords.push(state.word);
  state.wordNumber++;
  state.guessed = [];
  state.misses = 0;
  state.outcome = null;
  state.phase = 'guess';
  if (state.wordNumber > 1) state.current = (state.current + 1) % state.players.length;
  state.turnNumber++;
}

function passTurn(state) {
  state.current = (state.current + 1) % state.players.length;
  state.turnNumber++;
}

function hidden(state) {
  return [...state.word].filter((char) => isLetter(char) && !state.guessed.includes(letterOf(char))).length;
}

function checkTurn(state, playerId) {
  if (state.phase !== 'guess') return 'Gerade wird nicht geraten';
  if (state.players[state.current].id !== playerId) return 'Du bist nicht am Zug';
}

function log(state, type, details) {
  const id = (state.events.at(-1)?.id ?? 0) + 1;
  state.events = [...state.events.slice(1 - MAX_EVENTS), { id, type, ...details }];
}

function random(state) {
  const [value, seed] = nextRandom(state.seed);
  state.seed = seed;
  return value;
}
