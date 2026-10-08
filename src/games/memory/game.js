import { nextRandom } from '../../shared/rng.js';

export const MOTIFS = [
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐸', '🦁', '🐯', '🐨', '🐷', '🐮', '🐵', '🦄', '🐙', '🦋', '🐝',
  '🐢', '🦉', '🐧', '🐳', '🍎', '🍌', '🍓', '🍉', '🍇', '🍒', '🍍', '🌻', '🌈', '⭐', '🚀', '🎈',
];
// So lange bleibt ein falsches Paar offen, damit sich alle die Karten merken können
export const PEEK_SECONDS = 2;
const MAX_EVENTS = 30;
const VISIBLE_EVENTS = 8;

// Ablauf: flip (zwei Karten aufdecken) → bei einem Paar weiter, sonst peek (kurz offen) → nächster Spieler
export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'flip',
    hostId,
    turnTime: settings.turnTime,
    players: players.map(({ id, name }) => ({ id, name, pairs: 0, streak: 0, bestStreak: 0, forgot: 0 })),
    cards: [],
    // aufgedeckte Karten dieses Zugs und alle jemals aufgedeckten in Reihenfolge (das sehen alle)
    open: [],
    history: [],
    current: 0,
    turnNumber: 0,
    events: [],
    seed,
  };
  const motifs = MOTIFS.slice(0, settings.pairs).flatMap((motif) => [motif, motif]);
  for (let i = motifs.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [motifs[i], motifs[j]] = [motifs[j], motifs[i]];
  }
  state.cards = motifs.map((motif) => ({ motif, owner: null }));
  state.current = Math.floor(random(state) * players.length);
  return state;
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  const error = handlers[action.type](next, action);
  return error ? { state, error } : { state: next, error: null };
}

// Motive sind nur sichtbar, solange eine Karte offen liegt oder schon zu einem Paar gehört.
export function viewFor(state, playerId) {
  return {
    you: playerId,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(({ id, name, pairs }) => ({ id, name, pairs })),
    cards: state.cards.map((card, index) => ({
      motif: card.owner !== null || state.open.includes(index) ? card.motif : null,
      owner: card.owner,
    })),
    open: state.open,
    currentId: state.phase === 'gameOver' ? null : state.players[state.current].id,
    turnTime: state.turnTime,
    turnNumber: state.turnNumber,
    events: state.events.slice(-VISIBLE_EVENTS),
  };
}

function flip(state, { playerId, index }) {
  if (state.phase !== 'flip') return state.phase === 'peek' ? 'Gleich ist der Nächste dran' : 'Die Partie ist vorbei';
  const player = state.players[state.current];
  if (player.id !== playerId) return 'Du bist nicht am Zug';
  if (!Number.isInteger(index) || !state.cards[index]) return 'Diese Karte gibt es nicht';
  if (state.cards[index].owner !== null || state.open.includes(index)) return 'Diese Karte liegt schon offen';
  const seenBefore = [...state.history];
  state.open.push(index);
  state.history.push(index);
  log(state, 'flip', { player: player.name, index, motif: state.cards[index].motif });
  if (state.open.length < 2) return;
  const [first, second] = state.open.map((i) => state.cards[i]);
  if (first.motif === second.motif) {
    claimPair(state, player);
    return;
  }
  // Goldfisch: Die passende Karte zur ersten lag schon einmal offen.
  if (seenBefore.some((i) => i !== state.open[0] && state.cards[i].motif === first.motif)) player.forgot++;
  player.streak = 0;
  state.phase = 'peek';
  state.turnNumber++;
}

// Zeit um: Ein falsches Paar wird wieder umgedreht, sonst verliert der Spieler seinen Zug.
function timeout(state, { playerId }) {
  if (state.phase === 'gameOver' || state.players[state.current].id !== playerId) return 'Kein laufender Zug dieses Spielers';
  if (state.phase === 'flip') log(state, 'timeout', { player: state.players[state.current].name });
  nextPlayer(state);
}

// Ein Spieler verlässt die Partie; seine Paare bleiben vom Tisch, war er dran, geht es weiter.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  log(state, 'left', { player: state.players[index].name });
  state.players.splice(index, 1);
  if (state.players.length === 0 || state.phase === 'gameOver') return;
  if (index < state.current) state.current--;
  else if (index === state.current) {
    state.current = (state.current - 1 + state.players.length) % state.players.length;
    nextPlayer(state);
  }
}

// leave und timeout löst nur der Host aus.
const handlers = { flip, timeout, leave };

function claimPair(state, player) {
  for (const index of state.open) state.cards[index].owner = player.id;
  player.pairs++;
  player.streak++;
  player.bestStreak = Math.max(player.bestStreak, player.streak);
  log(state, 'pair', { player: player.name, motif: state.cards[state.open[0]].motif, streak: player.streak });
  state.open = [];
  state.turnNumber++;
  if (state.cards.every((card) => card.owner !== null)) state.phase = 'gameOver';
}

function nextPlayer(state) {
  state.players[state.current].streak = 0;
  state.open = [];
  state.phase = 'flip';
  state.current = (state.current + 1) % state.players.length;
  state.turnNumber++;
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
