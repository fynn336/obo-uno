import { GAMES } from '../games/index.js';
import { readFields } from '../shared/fields.js';
import { nextRandom } from '../shared/rng.js';
import { AVATAR_COLORS, AVATAR_EMOJIS } from './avatars.js';

export const MAX_PLAYERS = 8;
export const BOT_LEVELS = ['easy', 'medium', 'hard'];
const MAX_NAME_LENGTH = 16;
const BOT_NAMES = ['Bot Anton', 'Bot Berta', 'Bot Carla', 'Bot Dieter', 'Bot Emil', 'Bot Frieda', 'Bot Gustav'];
const BOT_EMOJI = '🤖';
// Lounge-Punkte für Platz 1, 2 und 3 einer Partie
const PLACE_POINTS = [3, 2, 1];
const PODIUM_PLACES = 3;

export function createLounge({ hostId, hostName, seed }) {
  const firstGame = Object.values(GAMES)[0];
  const state = {
    phase: 'lounge',
    hostId,
    players: [],
    selectedGameId: firstGame.id,
    botLevel: 'medium',
    settings: Object.fromEntries(Object.values(GAMES).map((game) => [game.id, defaultSettings(game)])),
    gameId: null,
    game: null,
    participants: [],
    lastResult: null,
    resultCount: 0,
    // gewertete Partien des Abends für den Rückblick
    history: [],
    recap: null,
    seed,
  };
  return reduce(state, { type: 'join', playerId: hostId, name: hostName });
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  const error = handlers[action.type](next, action);
  return error ? { state, error } : { state: next, error: null };
}

export function isPlaying(state, playerId) {
  return state.phase === 'game' && state.participants.includes(playerId);
}

// Uhr des laufenden Spiels: { key, playerId, seconds } oder null
export function turnTimer(state) {
  if (state.phase !== 'game') return null;
  return GAMES[state.gameId].timer?.(state.game) ?? null;
}

// Nächster Zug eines Computer-Gegners: { playerId, move } oder null
export function nextBotMove(state) {
  if (state.phase !== 'game') return null;
  for (const playerId of state.participants) {
    if (!findPlayer(state, playerId).bot) continue;
    const move = GAMES[state.gameId].botMove(state.game, playerId, state.botLevel);
    if (move) return { playerId, move };
  }
  return null;
}

export function viewFor(state, playerId) {
  return {
    you: playerId,
    phase: state.phase,
    hostId: state.hostId,
    players: state.players.map(({ id, name, bot, connected, avatar, points }) => ({ id, name, bot, connected, avatar, points })),
    selectedGameId: state.selectedGameId,
    botLevel: state.botLevel,
    settings: state.settings,
    gameId: state.gameId,
    participants: state.participants,
    lastResult: state.lastResult,
    recap: state.recap,
    game: isPlaying(state, playerId) ? withPeople(state, GAMES[state.gameId].viewFor(state.game, playerId)) : null,
  };
}

function join(state, { playerId, name }) {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    return `Der Name muss 1–${MAX_NAME_LENGTH} Zeichen lang sein`;
  }
  if (state.players.length >= MAX_PLAYERS) return 'Die Lounge ist voll';
  if (isNameTaken(state, trimmed)) return 'Dieser Name ist schon vergeben';
  addPlayer(state, playerId, trimmed, false);
}

function addBot(state, { playerId }) {
  const error = checkHostInLounge(state, playerId);
  if (error) return error;
  if (state.players.length >= MAX_PLAYERS) return 'Die Lounge ist voll';
  const index = BOT_NAMES.findIndex((name) => !isNameTaken(state, name));
  if (index === -1) return 'Keine Computer-Gegner mehr frei';
  addPlayer(state, `bot-${index}`, BOT_NAMES[index], true);
}

function removeBot(state, { playerId, targetId }) {
  const error = checkHostInLounge(state, playerId);
  if (error) return error;
  const index = state.players.findIndex((p) => p.id === targetId && p.bot);
  if (index === -1) return 'Kein Computer-Gegner';
  state.players.splice(index, 1);
}

// Ein Spieler verlässt die Lounge; spielt er gerade mit, verlässt er auch die Partie.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  state.players.splice(index, 1);
  if (!state.participants.includes(playerId)) return;
  const game = GAMES[state.gameId];
  state.participants = state.participants.filter((id) => id !== playerId);
  state.game = game.removePlayer(state.game, playerId);
  if (state.participants.length < game.minPlayers) endGame(state, null);
  else finishIfOver(state);
}

function setConnected(state, { playerId, connected }) {
  const player = findPlayer(state, playerId);
  if (!player) return 'Unbekannter Spieler';
  player.connected = connected;
}

function setAvatar(state, { playerId, emoji, color }) {
  const player = findPlayer(state, playerId);
  if (!player) return 'Unbekannter Spieler';
  if (!AVATAR_EMOJIS.includes(emoji) || !Number.isInteger(color) || !AVATAR_COLORS[color]) return 'Ungültiger Avatar';
  player.avatar = { emoji, color };
}

// Stärke aller Computer-Gegner; der Host darf sie jederzeit ändern, auch mitten in der Partie.
function setBotLevel(state, { playerId, level }) {
  if (playerId !== state.hostId) return 'Das darf nur der Host';
  if (!BOT_LEVELS.includes(level)) return 'Unbekannte Stärke';
  state.botLevel = level;
}

function selectGame(state, { playerId, gameId }) {
  const error = checkHostInLounge(state, playerId);
  if (error) return error;
  if (!Object.hasOwn(GAMES, gameId)) return 'Unbekanntes Spiel';
  state.selectedGameId = gameId;
}

function setSetting(state, { playerId, gameId, key, value }) {
  const error = checkHostInLounge(state, playerId);
  if (error) return error;
  const setting = Object.hasOwn(GAMES, gameId) && GAMES[gameId].settings.find((s) => s.key === key);
  if (!setting) return 'Unbekannte Einstellung';
  const valid = setting.type === 'toggle' ? typeof value === 'boolean' : setting.values.includes(value);
  if (!valid) return 'Ungültiger Wert';
  state.settings[gameId][key] = value;
}

function startGame(state, { playerId }) {
  const error = checkHostInLounge(state, playerId);
  if (error) return error;
  const game = GAMES[state.selectedGameId];
  const players = playersFor(state, game);
  if (players.length < game.minPlayers || players.length > game.maxPlayers) {
    return `${game.name} braucht ${game.minPlayers}–${game.maxPlayers} Spieler`;
  }
  const [random, seed] = nextRandom(state.seed);
  state.seed = seed;
  state.game = game.create({
    players: players.map(({ id, name }) => ({ id, name })),
    hostId: state.hostId,
    settings: state.settings[game.id],
    seed: Math.floor(random * 2 ** 32),
  });
  state.phase = 'game';
  state.gameId = game.id;
  state.participants = players.map((p) => p.id);
  state.lastResult = null;
  state.recap = null;
}

// Wer mitspielt: alle in der Lounge, bei Spielen ohne Computer-Gegner nur die Menschen
export function playersFor(state, game) {
  return state.players.filter((p) => game.bots !== false || !p.bot);
}

function abortGame(state, { playerId }) {
  if (playerId !== state.hostId) return 'Nur der Host kann die Partie beenden';
  if (state.phase !== 'game') return 'Gerade läuft keine Partie';
  endGame(state, null);
}

// Schließt den Abend mit einem Rückblick ab und setzt die Sterne zurück.
function newEvening(state, { playerId }) {
  const error = checkHostInLounge(state, playerId);
  if (error) return error;
  state.resultCount++;
  state.recap = state.history.length > 0 ? recapOf(state) : null;
  for (const player of state.players) player.points = 0;
  state.history = [];
  state.lastResult = null;
}

function move(state, { playerId, move: raw }) {
  if (!isPlaying(state, playerId)) return 'Du spielst gerade nicht mit';
  const game = GAMES[state.gameId];
  const action = readFields(raw, game.moves);
  if (!action) return 'Ungültiger Zug';
  return applyGameStep(state, game.reduce(state.game, { ...action, playerId }));
}

function timeout(state, { playerId }) {
  if (!isPlaying(state, playerId)) return 'Kein laufender Zug dieses Spielers';
  return applyGameStep(state, GAMES[state.gameId].timeout(state.game, playerId));
}

// join, leave, setConnected und timeout löst nur der Host aus.
const handlers = {
  join, addBot, removeBot, setBotLevel, leave, setConnected, setAvatar, selectGame, setSetting, startGame, abortGame,
  newEvening, move, timeout,
};

function applyGameStep(state, { state: game, error }) {
  if (error) return error;
  state.game = game;
  finishIfOver(state);
}

function finishIfOver(state) {
  const result = GAMES[state.gameId].result(state.game);
  if (result) endGame(state, result);
}

// Beendet die Partie; ohne Ergebnis (abgebrochen) gibt es keine Lounge-Punkte.
function endGame(state, result) {
  state.resultCount++;
  state.lastResult = { id: state.resultCount, gameId: state.gameId, aborted: !result, standings: [], awards: [] };
  if (result) {
    state.lastResult.standings = standingsFor(state, result.ranking);
    state.lastResult.awards = result.awards ?? [];
    state.history.push({ gameId: state.gameId, standings: state.lastResult.standings, awards: state.lastResult.awards });
  }
  state.phase = 'lounge';
  state.gameId = null;
  state.game = null;
  state.participants = [];
}

// Die Plätze berechnet das Spiel; ein geteilter Platz bringt allen dieselben Lounge-Punkte.
function standingsFor(state, ranking) {
  return ranking.map(({ playerId, place, detail }) => {
    const player = findPlayer(state, playerId);
    const points = PLACE_POINTS[place - 1] ?? 0;
    if (player) player.points += points;
    return { playerId, name: player?.name ?? '?', place, detail, points };
  });
}

// Rückblick: Siegerpodest nach Sternen, Sieger je Spiel und die häufigsten Auszeichnungen des Abends
function recapOf(state) {
  const ranked = [...state.players].filter((p) => p.points > 0).sort((a, b) => b.points - a.points);
  const podium = ranked
    .map((p) => ({ playerId: p.id, name: p.name, avatar: p.avatar, points: p.points,
      place: ranked.findIndex((other) => other.points === p.points) + 1 }))
    .filter((entry) => entry.place <= PODIUM_PLACES);
  const games = [...new Set(state.history.map((entry) => entry.gameId))].map((gameId) => {
    const played = state.history.filter((entry) => entry.gameId === gameId);
    const wins = countNames(played.flatMap((entry) => entry.standings.filter((s) => s.place === 1).map((s) => s.name)));
    const { names, count } = mostOften(wins);
    return { gameId, played: played.length, winners: names, wins: count };
  });
  const titles = [...new Set(state.history.flatMap((entry) => entry.awards.map((award) => award.title)))];
  const awards = titles.map((title) => {
    const given = state.history.flatMap((entry) => entry.awards.filter((award) => award.title === title));
    return { icon: given[0].icon, title, ...mostOften(countNames(given.flatMap((award) => award.names))) };
  });
  return { id: state.resultCount, games: state.history.length, podium, perGame: games, awards };
}

function countNames(names) {
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return counts;
}

// { names, count } der Namen, die am häufigsten vorkommen
function mostOften(counts) {
  const count = Math.max(0, ...counts.values());
  return { names: [...counts].filter(([, n]) => n === count).map(([name]) => name), count };
}

// Ergänzt die Spielersicht eines Spiels um Avatar, Verbindung und Bot-Kennung aus der Lounge.
function withPeople(state, view) {
  if (!view.players) return view;
  return {
    ...view,
    players: view.players.map((p) => {
      const { avatar, connected, bot } = findPlayer(state, p.id);
      return { ...p, avatar, connected, bot };
    }),
  };
}

function defaultSettings(game) {
  return Object.fromEntries(game.settings.map((setting) => [setting.key, setting.default]));
}

function addPlayer(state, id, name, bot) {
  const avatar = { emoji: bot ? BOT_EMOJI : '', color: state.players.length % AVATAR_COLORS.length };
  state.players.push({ id, name, bot, connected: true, avatar, points: 0 });
}

function checkHostInLounge(state, playerId) {
  if (playerId !== state.hostId) return 'Das darf nur der Host';
  if (state.phase !== 'lounge') return 'Das geht nur in der Lounge, nicht während einer Partie';
}

function isNameTaken(state, name) {
  return state.players.some((p) => p.name.toLowerCase() === name.toLowerCase());
}

function findPlayer(state, playerId) {
  return state.players.find((p) => p.id === playerId);
}
