import { COLORS, createDeck, isPlayable } from './deck.js';
import { nextRandom } from './rng.js';

const HAND_SIZE = 7;
const MAX_PLAYERS = 8;
const MAX_NAME_LENGTH = 16;
const PENALTIES = { draw2: 2, wild4: 4 };
const RUNNING_PHASES = ['playing', 'chooseColor', 'challengeWindow'];
const UNO_WINDOW_CLOSERS = ['play', 'draw', 'pass', 'chooseColor', 'challenge', 'callUno'];
const PHASE_HINTS = {
  playing: 'Das geht gerade nicht',
  chooseColor: 'Wähle zuerst eine Farbe',
  challengeWindow: 'Fechte an oder ziehe',
};

export function createGame({ hostId, hostName, seed }) {
  const state = {
    phase: 'lobby',
    hostId,
    rules: { stacking: false, challenge: false, drawUntilPlayable: false },
    players: [],
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
    notice: null,
    seed,
  };
  return reduce(state, { type: 'join', playerId: hostId, name: hostName });
}

export function reduce(state, action) {
  if (!Object.hasOwn(handlers, action.type)) return { state, error: 'Unbekannte Aktion' };
  const next = structuredClone(state);
  next.notice = null;
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

function join(state, { playerId, name }) {
  if (isRunning(state)) return 'Das Spiel läuft bereits';
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    return `Der Name muss 1–${MAX_NAME_LENGTH} Zeichen lang sein`;
  }
  if (state.players.length >= MAX_PLAYERS) return 'Die Lobby ist voll';
  if (state.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    return 'Dieser Name ist schon vergeben';
  }
  state.players.push({ id: playerId, name: trimmed, connected: true, hand: [], saidUno: false });
}

function leave(state, { playerId }) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return 'Unbekannter Spieler';
  if (!isRunning(state)) {
    state.players.splice(index, 1);
    return;
  }
  state.notice = `${state.players[index].name} wurde entfernt (Verbindung verloren)`;
  if (state.players.length === 2) {
    removePlayer(state, index);
    endRound(state, state.players[0].id);
    return;
  }
  if (index === state.current) abandonTurn(state);
  removePlayer(state, index);
}

function setConnected(state, { playerId, connected }) {
  const player = findPlayer(state, playerId);
  if (!player) return 'Unbekannter Spieler';
  player.connected = connected;
}

function setRule(state, { playerId, rule, value }) {
  if (playerId !== state.hostId) return 'Nur der Host kann die Regeln ändern';
  if (isRunning(state)) return 'Regeln können nur in der Lobby geändert werden';
  if (!Object.hasOwn(state.rules, rule)) return 'Unbekannte Regel';
  state.rules[rule] = value;
}

function start(state, { playerId }) {
  if (playerId !== state.hostId) return 'Nur der Host kann starten';
  if (isRunning(state)) return 'Das Spiel läuft bereits';
  if (state.players.length < 2) return 'Es braucht mindestens 2 Spieler';
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
  }
  player.hand.splice(player.hand.indexOf(card), 1);
  state.discardPile.push(card);
  state.drawnCardId = null;
  if (player.hand.length === 0) {
    endRound(state, playerId);
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
  const card = state.rules.drawUntilPlayable
    ? drawUntilPlayable(state)
    : drawCards(state, currentPlayer(state), 1)[0];
  if (card && canPlay(state, card)) state.drawnCardId = card.id;
  else advance(state, 1);
}

function pass(state, { playerId }) {
  const error = checkTurn(state, playerId, ['playing']);
  if (error) return error;
  if (state.drawnCardId === null) return 'Du musst zuerst ziehen';
  advance(state, 1);
}

function challenge(state, { playerId }) {
  const error = checkTurn(state, playerId, ['challengeWindow']);
  if (error) return error;
  const challenger = currentPlayer(state);
  if (!state.wild4.guilty) {
    state.pendingDraw += 2;
    state.notice = `Anfechtung gescheitert: ${challenger.name} zieht ${state.pendingDraw}`;
    takePenalty(state);
    return;
  }
  const layer = findPlayer(state, state.wild4.playerId);
  if (layer) drawCards(state, layer, PENALTIES.wild4);
  state.pendingDraw -= PENALTIES.wild4;
  state.notice = layer ? `Anfechtung erfolgreich: ${layer.name} zieht 4` : 'Anfechtung erfolgreich';
  if (state.pendingDraw > 0) {
    state.notice += `, ${challenger.name} zieht ${state.pendingDraw}`;
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
}

function catchUno(state, { playerId, targetId }) {
  const catcher = findPlayer(state, playerId);
  const target = findPlayer(state, targetId);
  if (!catcher || !target) return 'Unbekannter Spieler';
  if (catcher === target) return 'Du kannst dich nicht selbst erwischen';
  if (state.unoWindow !== targetId) return 'Da gibt es nichts zu erwischen';
  drawCards(state, target, 2);
  state.notice = `${catcher.name} hat ${target.name} erwischt: ${target.name} zieht 2`;
}

const handlers = { join, leave, setConnected, setRule, start, play, chooseColor, draw, pass, challenge, callUno, catchUno };

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
  state.activeColor = color;
  state.phase = 'playing';
  if (state.startWild) state.startWild = false;
  else applyEffect(state, topCard(state));
}

function applyEffect(state, card) {
  if (card.value === 'skip') advance(state, 2);
  else if (card.value === 'reverse') reverse(state);
  else if (Object.hasOwn(PENALTIES, card.value)) addPenalty(state, card);
  else advance(state, 1);
}

function reverse(state) {
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
  drawCards(state, currentPlayer(state), state.pendingDraw);
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
  if (state.phase === 'chooseColor') applyColor(state, COLORS[Math.floor(random(state) * COLORS.length)]);
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

function endRound(state, winnerId) {
  state.phase = 'roundOver';
  state.winnerId = winnerId;
  state.pendingDraw = 0;
  state.drawnCardId = null;
  state.wild4 = null;
  state.unoWindow = null;
  state.startWild = false;
}

function advance(state, steps) {
  const count = state.players.length;
  state.current = (((state.current + state.direction * steps) % count) + count) % count;
  state.drawnCardId = null;
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
