import { nextRandom } from '../../shared/rng.js';
import { emptySheet, isSheetFull, scoreFor, totals } from './scoring.js';

const DICE = 5;
const ROLLS_PER_TURN = 3;
const MAX_EVENTS = 30;
const VISIBLE_EVENTS = 8;

export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'playing',
    hostId,
    turnTime: settings.turnTime,
    players: players.map(({ id, name }) => ({ id, name, sheet: emptySheet() })),
    current: 0,
    dice: Array(DICE).fill(1),
    kept: Array(DICE).fill(false),
    rollsLeft: ROLLS_PER_TURN,
    turnNumber: 0,
    events: [],
    seed,
  };
  state.current = Math.floor(random(state) * players.length);
  return state;
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  const error = handlers[action.type](next, action);
  return error ? { state, error } : { state: next, error: null };
}

export function viewFor(state, playerId) {
  return {
    you: playerId,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(({ id, name, sheet }) => ({ id, name, sheet, ...totals(sheet) })),
    currentId: state.phase === 'playing' ? state.players[state.current].id : null,
    dice: state.dice,
    kept: state.kept,
    rollsLeft: state.rollsLeft,
    turnNumber: state.turnNumber,
    turnTime: state.turnTime,
    events: state.events.slice(-VISIBLE_EVENTS),
  };
}

// Gehaltene Würfel bleiben liegen; beim ersten Wurf eines Zugs wird immer alles gewürfelt.
function roll(state, { playerId }) {
  const error = checkTurn(state, playerId);
  if (error) return error;
  if (state.rollsLeft === 0) return 'Du hast schon dreimal gewürfelt – trag jetzt etwas ein';
  state.dice = state.dice.map((face, i) => (state.kept[i] ? face : 1 + Math.floor(random(state) * 6)));
  state.rollsLeft--;
  log(state, 'roll', { player: currentPlayer(state).name, dice: state.dice });
}

// keep gibt an, welche Würfel beim nächsten Wurf liegen bleiben; alle Mitspieler sehen es.
function hold(state, { playerId, keep }) {
  const error = checkTurn(state, playerId);
  if (error) return error;
  if (state.rollsLeft === ROLLS_PER_TURN) return 'Erst würfeln, dann halten';
  if (state.rollsLeft === 0) return 'Keine Würfe mehr – trag jetzt etwas ein';
  if (!Array.isArray(keep) || keep.length !== DICE || !keep.every((kept) => typeof kept === 'boolean')) {
    return 'Ungültige Würfelauswahl';
  }
  state.kept = keep;
}

function score(state, { playerId, category }) {
  const error = checkTurn(state, playerId);
  if (error) return error;
  if (state.rollsLeft === ROLLS_PER_TURN) return 'Erst würfeln, dann eintragen';
  const player = currentPlayer(state);
  if (!Object.hasOwn(player.sheet, category)) return 'Unbekannte Kategorie';
  if (player.sheet[category] !== null) return 'Diese Kategorie ist schon belegt';
  const points = scoreFor(category, state.dice);
  player.sheet[category] = points;
  log(state, 'score', { player: player.name, category, points });
  nextTurn(state);
}

// Ein Spieler verlässt die Partie; wer am Zug war, gibt den Zug ab.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  log(state, 'left', { player: state.players[index].name });
  state.players.splice(index, 1);
  if (state.players.length === 0) return;
  if (index < state.current) state.current--;
  else if (index === state.current) startTurn(state, state.current % state.players.length);
  if (state.players.every((p) => isSheetFull(p.sheet))) state.phase = 'gameOver';
}

// leave löst nur der Host aus.
const handlers = { roll, hold, score, leave };

function nextTurn(state) {
  if (state.players.every((p) => isSheetFull(p.sheet))) {
    state.phase = 'gameOver';
    return;
  }
  startTurn(state, (state.current + 1) % state.players.length);
}

function startTurn(state, index) {
  state.current = index;
  state.rollsLeft = ROLLS_PER_TURN;
  state.kept = Array(DICE).fill(false);
  state.turnNumber++;
}

function checkTurn(state, playerId) {
  if (state.phase !== 'playing') return 'Die Partie ist vorbei';
  if (currentPlayer(state).id !== playerId) return 'Du bist nicht am Zug';
}

function currentPlayer(state) {
  return state.players[state.current];
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
