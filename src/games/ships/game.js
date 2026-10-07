import { nextRandom } from '../../shared/rng.js';

export const SIZE = 10;
export const FLEET = [5, 4, 3, 3, 2];
const MAX_EVENTS = 30;
const VISIBLE_EVENTS = 8;

// Ablauf: setup (Flotte verteilen, bereit melden) → playing (reihum schießen) → gameOver
export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'setup',
    hostId,
    turnTime: settings.turnTime,
    // shots: eingehende Schüsse auf das eigene Meer, 'x,y' → 'hit' | 'miss'
    players: players.map(({ id, name }) => ({ id, name, ships: [], shots: {}, ready: false, hits: 0, sinks: 0 })),
    out: [],
    current: 0,
    turnNumber: 0,
    events: [],
    seed,
  };
  for (const player of state.players) player.ships = randomFleet(state);
  return state;
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  const error = handlers[action.type](next, action);
  return error ? { state, error } : { state: next, error: null };
}

// Schiffe sieht nur der Besitzer; von fremden Flotten sind nur versenkte Schiffe zu sehen.
export function viewFor(state, playerId) {
  return {
    you: playerId,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      alive: !state.out.includes(p.id),
      shots: p.shots,
      ships: p.ships.filter((ship) => p.id === playerId || ship.sunk),
      shipsLeft: p.ships.filter((ship) => !ship.sunk).length,
    })),
    currentId: state.phase === 'playing' ? state.players[state.current].id : null,
    turnNumber: state.turnNumber,
    turnTime: state.turnTime,
    events: state.events.slice(-VISIBLE_EVENTS),
  };
}

function isSunk(ship, shots) {
  return ship.cells.every(([x, y]) => shots[key(x, y)] === 'hit');
}

export function key(x, y) {
  return `${x},${y}`;
}

function shuffleFleet(state, { playerId }) {
  const player = findPlayer(state, playerId);
  if (state.phase !== 'setup' || !player) return 'Die Flotte steht schon';
  if (player.ready) return 'Du hast dich schon bereit gemeldet';
  player.ships = randomFleet(state);
}

function ready(state, { playerId }) {
  const player = findPlayer(state, playerId);
  if (state.phase !== 'setup' || !player) return 'Die Flotte steht schon';
  player.ready = true;
  startIfReady(state);
}

// Ein Treffer erlaubt einen weiteren Schuss, ein Fehlschuss gibt den Zug weiter.
function shoot(state, { playerId, targetId, x, y }) {
  if (state.phase !== 'playing') return 'Gerade wird nicht geschossen';
  const shooter = state.players[state.current];
  if (shooter.id !== playerId) return 'Du bist nicht am Zug';
  const target = findPlayer(state, targetId);
  if (!target || target === shooter || state.out.includes(targetId)) return 'Wähle ein gegnerisches Meer';
  if (![x, y].every((v) => Number.isInteger(v) && v >= 0 && v < SIZE)) return 'Dieses Feld gibt es nicht';
  if (target.shots[key(x, y)]) return 'Auf dieses Feld wurde schon geschossen';
  const ship = target.ships.find((s) => s.cells.some(([cx, cy]) => cx === x && cy === y));
  target.shots[key(x, y)] = ship ? 'hit' : 'miss';
  log(state, 'shot', { player: shooter.name, target: target.name, x, y, hit: Boolean(ship) });
  state.turnNumber++;
  if (!ship) {
    state.current = nextAlive(state, state.current);
    return;
  }
  shooter.hits++;
  if (!isSunk(ship, target.shots)) return;
  ship.sunk = true;
  shooter.sinks++;
  log(state, 'sunk', { player: shooter.name, target: target.name, size: ship.cells.length });
  if (target.ships.some((s) => !s.sunk)) return;
  state.out.push(target.id);
  log(state, 'out', { player: target.name });
  if (alivePlayers(state).length <= 1) state.phase = 'gameOver';
}

// Ein Spieler verlässt die Partie; seine Flotte verschwindet.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  log(state, 'left', { player: state.players[index].name });
  state.players.splice(index, 1);
  state.out = state.out.filter((id) => id !== playerId);
  if (state.players.length === 0) return;
  if (state.phase === 'setup') {
    startIfReady(state);
    return;
  }
  if (state.phase !== 'playing') return;
  if (alivePlayers(state).length <= 1) {
    state.phase = 'gameOver';
    return;
  }
  if (index < state.current) state.current--;
  else if (index === state.current) state.current = nextAlive(state, (index - 1 + state.players.length) % state.players.length);
  state.turnNumber++;
}

// shuffleFleet, ready und shoot sind Spielzüge, leave löst nur der Host aus.
const handlers = { shuffleFleet, ready, shoot, leave };

function startIfReady(state) {
  if (!state.players.every((p) => p.ready)) return;
  state.phase = 'playing';
  state.current = Math.floor(random(state) * state.players.length);
  state.turnNumber++;
  log(state, 'start', {});
}

// Zufällige Flotte: Schiffe liegen waagerecht oder senkrecht und berühren sich nicht, auch nicht über Eck.
function randomFleet(state) {
  const ships = [];
  const blocked = new Set();
  for (const length of FLEET) {
    for (;;) {
      const across = random(state) < 0.5;
      const x = Math.floor(random(state) * (across ? SIZE - length + 1 : SIZE));
      const y = Math.floor(random(state) * (across ? SIZE : SIZE - length + 1));
      const cells = Array.from({ length }, (_, i) => (across ? [x + i, y] : [x, y + i]));
      if (cells.some(([cx, cy]) => blocked.has(key(cx, cy)))) continue;
      for (const [cx, cy] of cells) {
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) blocked.add(key(cx + dx, cy + dy));
      }
      ships.push({ cells, sunk: false });
      break;
    }
  }
  return ships;
}

export function alivePlayers(state) {
  return state.players.filter((p) => !state.out.includes(p.id));
}

function nextAlive(state, index) {
  let next = index;
  do next = (next + 1) % state.players.length;
  while (state.out.includes(state.players[next].id));
  return next;
}

function findPlayer(state, playerId) {
  return state.players.find((p) => p.id === playerId);
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
