import { nextRandom } from '../../shared/rng.js';
import { isHigher, MAEXCHEN, rank, valueOf, VALUES } from './values.js';

const MAX_EVENTS = 30;
const VISIBLE_EVENTS = 8;
// Ein aufgedecktes echtes Mäxchen kostet den Zweifler doppelt.
const MAEXCHEN_PENALTY = 2;

// Ablauf: roll (verdeckt würfeln) → announce (ansagen) → decide (der Nächste glaubt oder deckt auf)
export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'roll',
    hostId,
    turnTime: settings.turnTime,
    players: players.map(({ id, name }) => ({ id, name, lives: settings.lives, lies: 0, goodDoubts: 0 })),
    // Ausgeschiedene in der Reihenfolge, in der sie rausgeflogen sind
    out: [],
    current: 0,
    dice: null,
    announced: null,
    announcerId: null,
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

// Die Würfel sieht nur, wer gerade angesagt; aufgedeckt stehen sie im Verlauf.
export function viewFor(state, playerId) {
  const playing = state.phase !== 'gameOver';
  return {
    you: playerId,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(({ id, name, lives }) => ({ id, name, lives })),
    currentId: playing ? currentPlayer(state).id : null,
    announced: state.announced,
    announcerId: state.announcerId,
    myDice: state.phase === 'announce' && currentPlayer(state).id === playerId ? state.dice : null,
    turnNumber: state.turnNumber,
    turnTime: state.turnTime,
    events: state.events.slice(-VISIBLE_EVENTS),
  };
}

function roll(state, { playerId }) {
  const error = checkTurn(state, playerId, 'roll');
  if (error) return error;
  state.dice = [rollDie(state), rollDie(state)];
  state.phase = 'announce';
  log(state, 'roll', { player: currentPlayer(state).name });
}

function announce(state, { playerId, value }) {
  const error = checkTurn(state, playerId, 'announce');
  if (error) return error;
  if (!VALUES.includes(value)) return 'Unbekannter Wert';
  if (!isHigher(value, state.announced)) return 'Die Ansage muss höher sein als die letzte';
  state.announced = value;
  state.announcerId = playerId;
  log(state, 'announce', { player: currentPlayer(state).name, value });
  state.current = nextAlive(state, state.current);
  state.phase = 'decide';
  state.turnNumber++;
}

// Glauben heißt selbst würfeln und höher ansagen; ein Mäxchen kann man nicht überbieten und verliert ein Leben.
function believe(state, { playerId }) {
  const error = checkTurn(state, playerId, 'decide');
  if (error) return error;
  const player = currentPlayer(state);
  if (state.announced === MAEXCHEN) {
    log(state, 'giveUp', { player: player.name });
    loseLives(state, player, 1);
    startRound(state, player);
    return;
  }
  log(state, 'believe', { player: player.name });
  state.phase = 'roll';
}

function doubt(state, { playerId }) {
  const error = checkTurn(state, playerId, 'decide');
  if (error) return error;
  const doubter = currentPlayer(state);
  const announcer = findPlayer(state, state.announcerId);
  const lied = rank(valueOf(state.dice)) < rank(state.announced);
  const loser = lied ? announcer : doubter;
  const lost = !lied && state.announced === MAEXCHEN ? MAEXCHEN_PENALTY : 1;
  if (lied) {
    announcer.lies++;
    doubter.goodDoubts++;
  }
  log(state, 'reveal', {
    player: doubter.name, target: announcer.name, dice: state.dice, announced: state.announced, lied,
    loser: loser.name, lost,
  });
  loseLives(state, loser, lost);
  startRound(state, loser);
}

// Ein Spieler verlässt die Partie; die laufende Runde beginnt neu.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  log(state, 'left', { player: state.players[index].name });
  state.players.splice(index, 1);
  state.out = state.out.filter((id) => id !== playerId);
  if (state.phase === 'gameOver' || state.players.length === 0) return;
  if (index < state.current) state.current--;
  startRound(state, state.players[index % state.players.length]);
}

// leave löst nur der Host aus.
const handlers = { roll, announce, believe, doubt, leave };

function loseLives(state, player, count) {
  player.lives = Math.max(0, player.lives - count);
  if (player.lives > 0) return;
  state.out.push(player.id);
  log(state, 'out', { player: player.name });
}

// Neue Runde ohne Ansage; es beginnt der Verlierer oder, falls er raus ist, der Nächste nach ihm.
function startRound(state, starter) {
  state.dice = null;
  state.announced = null;
  state.announcerId = null;
  state.turnNumber++;
  if (state.players.filter(isAlive).length <= 1) {
    state.phase = 'gameOver';
    return;
  }
  const index = state.players.indexOf(starter);
  state.current = isAlive(starter) ? index : nextAlive(state, index);
  state.phase = 'roll';
}

function nextAlive(state, index) {
  let next = index;
  do next = (next + 1) % state.players.length;
  while (!isAlive(state.players[next]));
  return next;
}

function isAlive(player) {
  return player.lives > 0;
}

function checkTurn(state, playerId, phase) {
  if (state.phase === 'gameOver') return 'Die Partie ist vorbei';
  if (currentPlayer(state).id !== playerId) return 'Du bist nicht am Zug';
  if (state.phase !== phase) return PHASE_HINTS[state.phase];
}

const PHASE_HINTS = {
  roll: 'Erst würfeln',
  announce: 'Sag erst deinen Wurf an',
  decide: 'Glaub es oder deck auf',
};

function currentPlayer(state) {
  return state.players[state.current];
}

function findPlayer(state, playerId) {
  return state.players.find((p) => p.id === playerId);
}

function log(state, type, details) {
  const id = (state.events.at(-1)?.id ?? 0) + 1;
  state.events = [...state.events.slice(1 - MAX_EVENTS), { id, type, ...details }];
}

function rollDie(state) {
  return 1 + Math.floor(random(state) * 6);
}

function random(state) {
  const [value, seed] = nextRandom(state.seed);
  state.seed = seed;
  return value;
}
