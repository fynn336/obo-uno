import { nextRandom } from '../../shared/rng.js';
import { COLORS, cardPoints, createDeck, isPlayable } from './deck.js';

const HAND_SIZE = 7;
const MAX_EVENTS = 30;
const PENALTIES = { draw2: 2, wild4: 4 };
const RUNNING_PHASES = ['playing', 'chooseColor', 'challengeWindow'];
const UNO_WINDOW_CLOSERS = ['play', 'draw', 'pass', 'chooseColor', 'challenge', 'callUno', 'timeout'];
const PHASE_HINTS = {
  playing: 'Das geht gerade nicht',
  chooseColor: 'Wähle zuerst eine Farbe',
  challengeWindow: 'Fechte an oder ziehe',
};

// Neue Partie mit den Spielern aus der Lounge; die erste Runde wird sofort ausgeteilt.
export function createGame({ players, hostId, settings, seed }) {
  const state = {
    phase: 'playing',
    hostId,
    rules: { stacking: settings.stacking, challenge: settings.challenge, drawUntilPlayable: settings.drawUntilPlayable },
    target: settings.target,
    // Sekunden pro Zug, 0 = aus; die Uhr selbst läuft beim Host
    turnTime: settings.turnTime,
    // zählt jeden Spielerwechsel, damit der Host-Timer einen neuen Zug erkennt
    turnNumber: 0,
    players: players.map(({ id, name }) => ({ id, name, hand: [], saidUno: false, score: 0, stats: emptyStats() })),
    drawPile: [],
    discardPile: [],
    current: 0,
    direction: 1,
    activeColor: null,
    pendingDraw: 0,
    // Karte, die der Spieler gerade gezogen hat und als einzige legen darf
    drawnCardId: null,
    // { playerId, guilty } des obersten +4; guilty wird beim Legen festgehalten
    wild4: null,
    // Spieler mit 1 Karte ohne Uno-Ruf, bis ein anderer Spieler handelt
    unoWindow: null,
    // Startkarte ist Wild: der Startspieler wählt die Farbe und bleibt am Zug
    startWild: false,
    winnerId: null,
    // öffentliches Ereignisprotokoll für Verlauf und Einblendungen, nie mit verdeckten Karten
    events: [],
    seed,
  };
  startRound(state);
  return state;
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  if (UNO_WINDOW_CLOSERS.includes(action.type) && next.unoWindow !== action.playerId) next.unoWindow = null;
  const error = handlers[action.type](next, action);
  return error ? { state, error } : { state: next, error: null };
}

export function isRunning(state) {
  return RUNNING_PHASES.includes(state.phase);
}

export function playableCardIds(state, playerId) {
  if (checkTurn(state, playerId, ['playing', 'challengeWindow'])) return [];
  return currentPlayer(state).hand
    .filter((card) => state.drawnCardId === null || card.id === state.drawnCardId)
    .filter((card) => canPlay(state, card))
    .map((card) => card.id);
}

// Deckt die oberste Karte des Ziehstapels als Startkarte auf. state.current ist der Startspieler.
export function revealStartCard(state) {
  let card = state.drawPile.pop();
  while (card.value === 'wild4') {
    state.drawPile.push(card);
    shuffle(state, state.drawPile);
    card = state.drawPile.pop();
  }
  state.discardPile.push(card);
  state.activeColor = card.color;
  state.phase = 'playing';
  if (card.value === 'wild') {
    state.phase = 'chooseColor';
    state.startWild = true;
  } else if (card.value === 'reverse') {
    state.direction = -1;
    advance(state, 1);
  } else {
    // Die Karte wirkt, als hätte sie der Spieler vor dem Startspieler gelegt.
    advance(state, -1);
    applyEffect(state, card);
  }
}

// Zeit abgelaufen: Farbwahl zufällig, offene Strafe ziehen, gezogene Karte behalten, sonst 1 Karte ziehen.
function timeout(state, { playerId }) {
  if (!isRunning(state) || currentPlayer(state).id !== playerId) return 'Kein laufender Zug dieses Spielers';
  const player = currentPlayer(state);
  log(state, 'timeout', { player: player.name });
  if (state.phase === 'chooseColor') {
    applyColor(state, randomColor(state));
  } else if (state.pendingDraw > 0) {
    takePenalty(state);
  } else {
    if (state.drawnCardId === null) {
      log(state, 'draw', { player: player.name, count: drawCards(state, player, 1).length });
    }
    advance(state, 1);
  }
}

// Ein Spieler verlässt die Partie. Zwischen den Runden wird er einfach entfernt.
function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  if (!isRunning(state)) {
    state.players.splice(index, 1);
    return;
  }
  log(state, 'left', { player: state.players[index].name });
  if (state.players.length === 2) {
    removePlayer(state, index);
    endRound(state, state.players[0].id, false);
    return;
  }
  if (index === state.current) abandonTurn(state);
  removePlayer(state, index);
}

function nextRound(state, { playerId }) {
  if (playerId !== state.hostId) return 'Nur der Host startet die nächste Runde';
  if (state.phase !== 'roundOver') return 'Die Runde läuft noch';
  if (state.players.length < 2) return 'Es braucht mindestens 2 Spieler';
  startRound(state);
}

function startRound(state) {
  const deck = createDeck();
  shuffle(state, deck);
  for (const player of state.players) {
    player.hand = deck.splice(0, HAND_SIZE);
    player.saidUno = false;
  }
  state.drawPile = deck;
  state.discardPile = [];
  state.direction = 1;
  state.winnerId = null;
  state.current = Math.floor(random(state) * state.players.length);
  log(state, 'start');
  revealStartCard(state);
}

function play(state, { playerId, cardId }) {
  const error = checkTurn(state, playerId, ['playing', 'challengeWindow']);
  if (error) return error;
  const player = currentPlayer(state);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return 'Diese Karte hast du nicht';
  if (state.drawnCardId !== null && card.id !== state.drawnCardId) return 'Du darfst nur die gezogene Karte legen';
  if (!canPlay(state, card)) return 'Diese Karte passt nicht';

  if (card.value === 'wild4') {
    state.wild4 = { playerId, guilty: player.hand.some((c) => c.color === state.activeColor) };
    player.stats.wild4++;
  }
  player.hand.splice(player.hand.indexOf(card), 1);
  state.discardPile.push(card);
  log(state, 'play', { player: player.name, card });
  state.drawnCardId = null;
  if (player.hand.length === 0) {
    endRound(state, playerId, true);
    return;
  }
  if (player.hand.length === 1 && !player.saidUno) state.unoWindow = playerId;
  if (card.color === null) {
    state.phase = 'chooseColor';
  } else {
    state.activeColor = card.color;
    applyEffect(state, card);
  }
}

function chooseColor(state, { playerId, color }) {
  const error = checkTurn(state, playerId, ['chooseColor']);
  if (error) return error;
  if (!COLORS.includes(color)) return 'Unbekannte Farbe';
  applyColor(state, color);
}

function draw(state, { playerId }) {
  const error = checkTurn(state, playerId, ['playing', 'challengeWindow']);
  if (error) return error;
  if (state.pendingDraw > 0) {
    takePenalty(state);
    return;
  }
  if (state.drawnCardId !== null) return 'Du hast schon gezogen';
  const player = currentPlayer(state);
  const before = player.hand.length;
  const card = state.rules.drawUntilPlayable ? drawUntilPlayable(state) : drawCards(state, player, 1)[0];
  log(state, 'draw', { player: player.name, count: player.hand.length - before });
  if (card && canPlay(state, card)) state.drawnCardId = card.id;
  else advance(state, 1);
}

function pass(state, { playerId }) {
  const error = checkTurn(state, playerId, ['playing']);
  if (error) return error;
  if (state.drawnCardId === null) return 'Du musst zuerst ziehen';
  log(state, 'pass', { player: currentPlayer(state).name });
  advance(state, 1);
}

function challenge(state, { playerId }) {
  const error = checkTurn(state, playerId, ['challengeWindow']);
  if (error) return error;
  const layer = findPlayer(state, state.wild4.playerId);
  const success = state.wild4.guilty;
  log(state, 'challenge', { player: currentPlayer(state).name, target: layer?.name ?? null, success });
  if (!success) {
    state.pendingDraw += 2;
    takePenalty(state);
    return;
  }
  if (layer) drawCards(state, layer, PENALTIES.wild4);
  state.pendingDraw -= PENALTIES.wild4;
  if (state.pendingDraw > 0) {
    takePenalty(state);
  } else {
    clearPenalty(state);
  }
}

function callUno(state, { playerId }) {
  const error = checkTurn(state, playerId, ['playing', 'challengeWindow']);
  if (error) return error;
  const player = currentPlayer(state);
  if (player.hand.length !== 2) return 'Uno geht nur mit genau 2 Karten';
  player.saidUno = true;
  log(state, 'uno', { player: player.name });
}

function catchUno(state, { playerId, targetId }) {
  const catcher = findPlayer(state, playerId);
  const target = findPlayer(state, targetId);
  if (!catcher || !target) return 'Unbekannter Spieler';
  if (catcher === target) return 'Du kannst dich nicht selbst erwischen';
  if (state.unoWindow !== targetId) return 'Da gibt es nichts zu erwischen';
  drawCards(state, target, 2);
  target.stats.caught++;
  catcher.stats.catches++;
  log(state, 'caught', { player: catcher.name, target: target.name });
}

// leave und timeout löst nur der Host aus, alle anderen sind Spielzüge.
const handlers = { leave, timeout, nextRound, play, chooseColor, draw, pass, challenge, callUno, catchUno };

export function handPoints(hand) {
  return hand.reduce((sum, card) => sum + cardPoints(card), 0);
}

function checkTurn(state, playerId, phases) {
  if (!isRunning(state)) return 'Die Runde läuft gerade nicht';
  if (currentPlayer(state).id !== playerId) return 'Du bist nicht am Zug';
  if (!phases.includes(state.phase)) return PHASE_HINTS[state.phase];
}

function canPlay(state, card) {
  if (state.pendingDraw > 0) return state.rules.stacking && card.value === topCard(state).value;
  return isPlayable(card, topCard(state), state.activeColor);
}

function applyColor(state, color) {
  log(state, 'color', { player: currentPlayer(state).name, color });
  state.activeColor = color;
  state.phase = 'playing';
  if (state.startWild) state.startWild = false;
  else applyEffect(state, topCard(state));
}

function applyEffect(state, card) {
  if (card.value === 'skip') skip(state);
  else if (card.value === 'reverse') reverse(state);
  else if (Object.hasOwn(PENALTIES, card.value)) addPenalty(state, card);
  else advance(state, 1);
}

function skip(state) {
  log(state, 'skipped', { player: state.players[nextIndex(state, 1)].name });
  advance(state, 2);
}

function reverse(state) {
  log(state, 'reverse');
  if (state.players.length === 2) {
    advance(state, 2);
    return;
  }
  state.direction *= -1;
  advance(state, 1);
}

function addPenalty(state, card) {
  state.pendingDraw += PENALTIES[card.value];
  advance(state, 1);
  if (card.value === 'wild4' && state.rules.challenge) state.phase = 'challengeWindow';
  else if (!state.rules.stacking) takePenalty(state);
}

function takePenalty(state) {
  const player = currentPlayer(state);
  log(state, 'penalty', { player: player.name, count: drawCards(state, player, state.pendingDraw).length });
  clearPenalty(state);
  advance(state, 1);
}

function clearPenalty(state) {
  state.pendingDraw = 0;
  state.wild4 = null;
  state.phase = 'playing';
}

function drawUntilPlayable(state) {
  const player = currentPlayer(state);
  for (;;) {
    const [card] = drawCards(state, player, 1);
    if (!card || canPlay(state, card)) return card;
  }
}

function drawCards(state, player, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0) reshuffleDiscardPile(state);
    if (state.drawPile.length === 0) break;
    drawn.push(state.drawPile.pop());
  }
  if (drawn.length > 0) {
    player.hand.push(...drawn);
    player.stats.drawn += drawn.length;
    player.saidUno = false;
    if (state.unoWindow === player.id) state.unoWindow = null;
  }
  return drawn;
}

function reshuffleDiscardPile(state) {
  const top = state.discardPile.pop();
  state.drawPile = state.discardPile;
  shuffle(state, state.drawPile);
  state.discardPile = [top];
}

// Der Ausscheidende ist am Zug: offene Farbwahl zufällig abschließen, offene Strafe verfällt.
function abandonTurn(state) {
  const leaving = currentPlayer(state);
  if (state.phase === 'chooseColor') applyColor(state, randomColor(state));
  if (currentPlayer(state) !== leaving) return;
  clearPenalty(state);
  advance(state, 1);
}

function removePlayer(state, index) {
  const [player] = state.players.splice(index, 1);
  state.drawPile.unshift(...player.hand);
  if (index < state.current) state.current--;
  if (state.unoWindow === player.id) state.unoWindow = null;
}

// Nur ein regulärer Sieg bringt Punkte, nicht das Rundenende durch einen Rauswurf.
function endRound(state, winnerId, scored) {
  const winner = findPlayer(state, winnerId);
  const points = scored ? state.players.reduce((sum, p) => sum + handPoints(p.hand), 0) : 0;
  winner.score += points;
  const wonGame = winner.score >= state.target;
  state.phase = wonGame ? 'gameOver' : 'roundOver';
  state.winnerId = winnerId;
  log(state, 'win', { player: winner.name, points, champion: wonGame });
  state.pendingDraw = 0;
  state.drawnCardId = null;
  state.wild4 = null;
  state.unoWindow = null;
  state.startWild = false;
}

function advance(state, steps) {
  state.current = nextIndex(state, steps);
  state.drawnCardId = null;
  state.turnNumber++;
}

// Zähler für die Auszeichnungen am Ende der Partie
function emptyStats() {
  return { wild4: 0, drawn: 0, caught: 0, catches: 0 };
}

function randomColor(state) {
  return COLORS[Math.floor(random(state) * COLORS.length)];
}

function nextIndex(state, steps) {
  const count = state.players.length;
  return (((state.current + state.direction * steps) % count) + count) % count;
}

function log(state, type, details = {}) {
  const id = (state.events.at(-1)?.id ?? 0) + 1;
  state.events = [...state.events.slice(1 - MAX_EVENTS), { id, type, ...details }];
}

function currentPlayer(state) {
  return state.players[state.current];
}

function findPlayer(state, playerId) {
  return state.players.find((p) => p.id === playerId);
}

function topCard(state) {
  return state.discardPile.at(-1);
}

function random(state) {
  const [value, seed] = nextRandom(state.seed);
  state.seed = seed;
  return value;
}

function shuffle(state, cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}
