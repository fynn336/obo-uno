import { nextRandom } from '../../shared/rng.js';
import { WORDS } from './words.js';

// Zeichenfläche in festen Koordinaten 0–1000; die Oberfläche skaliert auf ihre Größe.
export const CANVAS = 1000;
export const PALETTE = ['#1d1712', '#ffffff', '#e0322b', '#f28c28', '#f2c40f', '#2f9e44', '#1c6fd1', '#8e44c9'];
export const SIZES = [4, 10, 24];
export const CHOICES = 3;
export const CHOOSE_SECONDS = 15;
export const REVEAL_SECONDS = 5;
const MAX_POINTS_PER_STROKE = 200;
const MAX_GUESS_LENGTH = 40;
const MAX_CHAT = 40;
const VISIBLE_CHAT = 14;
// Wer zuerst rät, bekommt am meisten; der Zeichner bekommt etwas für jeden, der es errät.
const GUESS_POINTS = [10, 8, 6];
const LATE_GUESS_POINTS = 5;
const DRAWER_POINTS = 3;

// Ablauf je Bild: choose (Zeichner wählt ein Wort) → draw (zeichnen und raten) → reveal (Auflösung)
export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'choose',
    hostId,
    rounds: settings.rounds,
    drawTime: settings.drawTime,
    players: players.map(({ id, name }) => ({ id, name, score: 0, guessed: false, firsts: 0, fans: 0 })),
    drawer: 0,
    // fertige Bilder; jeder zeichnet einmal pro Runde
    drawings: 0,
    options: [],
    word: null,
    strokes: [],
    // Reihenfolge der richtigen Rater im aktuellen Bild
    guessers: [],
    usedWords: [],
    chat: [],
    turnNumber: 0,
    seed,
  };
  state.drawer = Math.floor(random(state) * players.length);
  dealOptions(state);
  return state;
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  const error = handlers[action.type](next, action);
  return error ? { state, error } : { state: next, error: null };
}

// Das Wort sehen nur der Zeichner und wer es schon erraten hat; Rater-Nachrichten danach nur die Eingeweihten.
export function viewFor(state, playerId) {
  const viewer = findPlayer(state, playerId);
  const drawer = state.players[state.drawer];
  const knows = viewer === drawer || viewer?.guessed || ['reveal', 'gameOver'].includes(state.phase);
  return {
    you: playerId,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(({ id, name, score, guessed }) => ({ id, name, score, guessed })),
    drawerId: drawer?.id ?? null,
    round: Math.min(state.rounds, Math.floor(state.drawings / state.players.length) + 1),
    rounds: state.rounds,
    options: viewer === drawer && state.phase === 'choose' ? state.options : null,
    word: knows ? state.word : null,
    pattern: state.word && wordPattern(state.word),
    strokes: state.strokes,
    chat: state.chat.filter((entry) => canSee(entry, viewer, drawer)).slice(-VISIBLE_CHAT),
    phaseSeconds: phaseSeconds(state),
    turnNumber: state.turnNumber,
  };
}

export function phaseSeconds(state) {
  if (state.phase === 'choose') return CHOOSE_SECONDS;
  if (state.phase === 'draw') return state.drawTime;
  return REVEAL_SECONDS;
}

// Großschreibung, Umlaute, Bindestriche und Leerzeichen zählen beim Raten nicht.
export function normalize(text) {
  return text.trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z]/g, '');
}

function choose(state, { playerId, index }) {
  const error = checkDrawer(state, playerId, 'choose');
  if (error) return error;
  if (!Number.isInteger(index) || !state.options[index]) return 'Unbekanntes Wort';
  startDrawing(state, state.options[index]);
}

function stroke(state, { playerId, color, size, points }) {
  const error = checkDrawer(state, playerId, 'draw');
  if (error) return error;
  const valid = PALETTE.includes(color) && SIZES.includes(size) && Array.isArray(points)
    && points.length > 0 && points.length <= MAX_POINTS_PER_STROKE
    && points.every((p) => Array.isArray(p) && p.length === 2
      && p.every((v) => Number.isInteger(v) && v >= 0 && v <= CANVAS));
  if (!valid) return 'Ungültiger Strich';
  state.strokes.push({ color, size, points });
}

function clear(state, { playerId }) {
  const error = checkDrawer(state, playerId, 'draw');
  if (error) return error;
  state.strokes = [];
}

// Jede Eingabe ist ein Rateversuch; wer es schon weiß, schreibt nur noch für Eingeweihte.
function guess(state, { playerId, text }) {
  const player = findPlayer(state, playerId);
  if (!player) return 'Unbekannter Spieler';
  const trimmed = text.trim().slice(0, MAX_GUESS_LENGTH);
  if (trimmed.length === 0) return 'Erst etwas eingeben';
  const drawer = state.players[state.drawer];
  const insider = player === drawer || player.guessed;
  if (state.phase !== 'draw' || insider) {
    const visibleTo = insider && state.phase === 'draw' ? 'insiders' : null;
    say(state, { player: player.name, text: trimmed, kind: 'chat', visibleTo });
    return;
  }
  const attempt = normalize(trimmed);
  const target = normalize(state.word);
  if (attempt !== target) {
    say(state, { player: player.name, text: trimmed, kind: 'guess', visibleTo: null });
    if (isClose(attempt, target)) say(state, { player: player.name, text: 'knapp daneben!', kind: 'close', visibleTo: player.id });
    return;
  }
  const rank = state.guessers.length;
  player.guessed = true;
  player.score += GUESS_POINTS[rank] ?? LATE_GUESS_POINTS;
  drawer.score += DRAWER_POINTS;
  drawer.fans++;
  if (rank === 0) player.firsts++;
  state.guessers.push(player.id);
  say(state, { player: player.name, text: 'hat es erraten!', kind: 'correct', visibleTo: null });
  if (state.players.every((p) => p === drawer || p.guessed)) reveal(state);
}

// Zeit abgelaufen: ein Wort wählen, das Bild auflösen oder zum nächsten Zeichner gehen.
function timeout(state, { playerId }) {
  if (state.players[state.drawer]?.id !== playerId) return 'Kein laufender Zug dieses Spielers';
  if (state.phase === 'choose') startDrawing(state, state.options[0]);
  else if (state.phase === 'draw') reveal(state);
  else if (state.phase === 'reveal') nextDrawer(state);
  else return 'Die Partie ist vorbei';
}

// Ein Spieler verlässt die Partie; ging der Zeichner, wird das Bild aufgelöst.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  const wasDrawer = index === state.drawer;
  const [gone] = state.players.splice(index, 1);
  say(state, { player: gone.name, text: 'hat die Partie verlassen', kind: 'system', visibleTo: null });
  if (state.players.length === 0 || state.phase === 'gameOver') return;
  if (index < state.drawer) state.drawer--;
  if (!wasDrawer) {
    if (state.phase === 'draw' && state.players.every((p, i) => i === state.drawer || p.guessed)) reveal(state);
    return;
  }
  state.drawer = (state.drawer - 1 + state.players.length) % state.players.length;
  if (state.phase === 'reveal') nextDrawer(state);
  else reveal(state);
}

// leave und timeout löst nur der Host aus.
const handlers = { choose, stroke, clear, guess, timeout, leave };

function startDrawing(state, word) {
  state.word = word;
  state.usedWords.push(word);
  state.phase = 'draw';
  state.turnNumber++;
}

function reveal(state) {
  state.phase = 'reveal';
  state.turnNumber++;
  say(state, { player: null, text: `Das Wort war: ${state.word}`, kind: 'system', visibleTo: null });
}

// Reihum zeichnet jeder einmal pro Runde; nach der letzten Runde ist die Partie vorbei.
function nextDrawer(state) {
  state.drawings++;
  for (const player of state.players) player.guessed = false;
  state.guessers = [];
  state.strokes = [];
  state.word = null;
  if (state.drawings >= state.players.length * state.rounds) {
    state.phase = 'gameOver';
    return;
  }
  state.drawer = (state.drawer + 1) % state.players.length;
  state.phase = 'choose';
  state.turnNumber++;
  dealOptions(state);
}

function dealOptions(state) {
  const fresh = WORDS.filter((word) => !state.usedWords.includes(word));
  const pool = fresh.length >= CHOICES ? fresh : WORDS;
  state.options = [];
  while (state.options.length < CHOICES) {
    const word = pool[Math.floor(random(state) * pool.length)];
    if (!state.options.includes(word)) state.options.push(word);
  }
}

// visibleTo: null = alle, 'insiders' = Zeichner und wer es schon erraten hat, sonst nur dieser Spieler
function say(state, { player, text, kind, visibleTo }) {
  const id = (state.chat.at(-1)?.id ?? 0) + 1;
  state.chat = [...state.chat.slice(1 - MAX_CHAT), { id, player, text, kind, visibleTo }];
}

function canSee(entry, viewer, drawer) {
  if (entry.visibleTo === null) return true;
  if (entry.visibleTo === 'insiders') return viewer === drawer || Boolean(viewer?.guessed);
  return entry.visibleTo === viewer?.id;
}

// Ein Buchstabe falsch, zu viel oder zu wenig
function isClose(a, b) {
  if (Math.abs(a.length - b.length) > 1 || b.length < 4) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
}

function wordPattern(word) {
  return [...word].map((char) => (/[A-Za-zÄÖÜäöüß]/.test(char) ? '_' : char)).join(' ');
}

function checkDrawer(state, playerId, phase) {
  if (state.players[state.drawer]?.id !== playerId) return 'Du bist nicht am Zeichnen';
  if (state.phase !== phase) return phase === 'choose' ? 'Das Wort steht schon fest' : 'Gerade wird nicht gezeichnet';
}

function findPlayer(state, playerId) {
  return state.players.find((p) => p.id === playerId);
}

function random(state) {
  const [value, seed] = nextRandom(state.seed);
  state.seed = seed;
  return value;
}
