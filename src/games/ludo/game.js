import { nextRandom } from '../../shared/rng.js';

// Figurposition relativ zum eigenen Startfeld: BASE = im Haus, 0–39 = Laufbahn, 40–43 = Zielfelder.
export const BASE = -1;
export const TRACK = 40;
export const PIECES = 4;
const LAST = TRACK + PIECES - 1;
const SIX = 6;
const TRIES_WITHOUT_PIECE = 3;
// Farben (0 Rot, 1 Blau, 2 Grün, 3 Gelb) je Spielerzahl; zu zweit sitzt man sich gegenüber.
const SEATS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
const MAX_EVENTS = 30;
const VISIBLE_EVENTS = 8;

export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'playing',
    hostId,
    finish: settings.finish,
    players: players.map(({ id, name }, i) => ({
      id, name, color: SEATS[players.length][i], pieces: Array(PIECES).fill(BASE), captures: 0, captured: 0,
    })),
    finished: [],
    current: 0,
    die: null,
    mustMove: false,
    triesLeft: TRIES_WITHOUT_PIECE,
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
  const playing = state.phase === 'playing';
  return {
    you: playerId,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(({ id, name, color, pieces }) => ({
      id, name, color, pieces, place: state.finished.indexOf(id) + 1 || null,
    })),
    currentId: playing ? currentPlayer(state).id : null,
    die: state.die,
    mustMove: state.mustMove,
    movable: playing && state.mustMove ? legalMoves(currentPlayer(state), state) : [],
    triesLeft: state.triesLeft,
    turnNumber: state.turnNumber,
    events: state.events.slice(-VISIBLE_EVENTS),
  };
}

// Feld auf der gemeinsamen Laufbahn; jede Farbe startet zehn Felder weiter.
export function fieldOf(color, position) {
  return (color * (TRACK / 4) + position) % TRACK;
}

// Figuren, die mit dem aktuellen Wurf ziehen dürfen. Pflichten wie im Original:
// Bei einer 6 muss eine Figur aus dem Haus, und das Startfeld muss geräumt werden, solange noch Figuren im Haus sind.
export function legalMoves(player, state) {
  const face = state.die;
  const targets = player.pieces.map((position) => targetOf(position, face));
  const possible = targets
    .map((target, i) => (target !== null && target <= LAST && !player.pieces.includes(target) ? i : -1))
    .filter((i) => i >= 0);
  const leavingHouse = possible.filter((i) => player.pieces[i] === BASE);
  if (leavingHouse.length > 0) return leavingHouse;
  const onStart = player.pieces.indexOf(0);
  if (player.pieces.includes(BASE) && possible.includes(onStart)) return [onStart];
  return possible;
}

export function targetOf(position, face) {
  if (position === BASE) return face === SIX ? 0 : null;
  return position + face;
}

function roll(state, { playerId }) {
  const error = checkTurn(state, playerId);
  if (error) return error;
  if (state.mustMove) return 'Erst eine Figur ziehen';
  const player = currentPlayer(state);
  state.die = 1 + Math.floor(random(state) * 6);
  state.mustMove = legalMoves(player, state).length > 0;
  log(state, 'roll', { player: player.name, face: state.die, stuck: !state.mustMove });
  if (state.mustMove || state.die === SIX) return;
  state.triesLeft--;
  if (state.triesLeft === 0) nextTurn(state);
}

function move(state, { playerId, piece }) {
  const error = checkTurn(state, playerId);
  if (error) return error;
  if (!state.mustMove) return 'Erst würfeln';
  const player = currentPlayer(state);
  if (!legalMoves(player, state).includes(piece)) return 'Diese Figur kann nicht ziehen';
  const from = player.pieces[piece];
  const to = targetOf(from, state.die);
  player.pieces[piece] = to;
  const hit = to < TRACK ? capture(state, player, to) : null;
  log(state, 'move', {
    player: player.name, color: player.color, piece, from, to,
    victim: hit?.name ?? null, victimColor: hit?.color ?? null, victimPiece: hit?.piece ?? null,
  });
  state.mustMove = false;
  if (player.pieces.every((position) => position >= TRACK)) {
    state.finished.push(player.id);
    log(state, 'finished', { player: player.name, place: state.finished.length });
    if (isOver(state)) {
      state.phase = 'gameOver';
      return;
    }
  }
  // Nach einer 6 wird noch einmal gewürfelt.
  if (state.die === SIX && !state.finished.includes(player.id)) startTurn(state, state.current);
  else nextTurn(state);
}

// Ein Spieler verlässt die Partie, seine Figuren verschwinden; wer am Zug war, gibt den Zug ab.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  log(state, 'left', { player: state.players[index].name });
  state.players.splice(index, 1);
  state.finished = state.finished.filter((id) => id !== playerId);
  if (state.phase !== 'playing' || state.players.length === 0) return;
  if (isOver(state)) {
    state.phase = 'gameOver';
    return;
  }
  if (index < state.current) state.current--;
  else if (index === state.current) startTurn(state, nextPlayerFrom(state, index % state.players.length));
}

// leave löst nur der Host aus.
const handlers = { roll, move, leave };

// Schlägt eine fremde Figur auf diesem Feld; liefert { name, color, piece } des Geschlagenen.
function capture(state, player, position) {
  const field = fieldOf(player.color, position);
  for (const other of state.players) {
    const piece = other.pieces.findIndex((p) => p >= 0 && p < TRACK && fieldOf(other.color, p) === field);
    if (other === player || piece === -1) continue;
    other.pieces[piece] = BASE;
    other.captured++;
    player.captures++;
    return { name: other.name, color: other.color, piece };
  }
  return null;
}

// Erster im Ziel beendet die Partie, sonst wird gespielt, bis nur noch einer übrig ist.
function isOver(state) {
  const needed = state.finish === 'first' ? 1 : state.players.length - 1;
  return state.finished.length >= needed;
}

function nextTurn(state) {
  startTurn(state, nextPlayerFrom(state, (state.current + 1) % state.players.length));
}

function nextPlayerFrom(state, index) {
  let next = index;
  while (state.finished.includes(state.players[next].id)) next = (next + 1) % state.players.length;
  return next;
}

// Ohne Figur auf der Laufbahn hat man drei Versuche für eine 6.
function startTurn(state, index) {
  state.current = index;
  state.mustMove = false;
  const pieces = currentPlayer(state).pieces;
  state.triesLeft = pieces.some((p) => p >= 0 && p < TRACK) ? 1 : TRIES_WITHOUT_PIECE;
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
