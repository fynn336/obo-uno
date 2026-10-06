import { createGame, reduce } from '../src/game/game.js';

const COLOR_BY_CODE = { r: 'red', y: 'yellow', g: 'green', b: 'blue' };
const VALUE_BY_CODE = { S: 'skip', R: 'reverse', '+2': 'draw2' };
const CODE_BY_COLOR = { red: 'r', yellow: 'y', green: 'g', blue: 'b' };
const CODE_BY_VALUE = { skip: 'S', reverse: 'R', draw2: '+2' };

let nextCardId = 1000;

// Kürzel: r5, gS (Aussetzen), bR (Richtungswechsel), y+2, W, W+4
export function card(code) {
  const id = nextCardId++;
  if (code === 'W') return { id, color: null, value: 'wild' };
  if (code === 'W+4') return { id, color: null, value: 'wild4' };
  const rest = code.slice(1);
  return { id, color: COLOR_BY_CODE[code[0]], value: VALUE_BY_CODE[rest] ?? rest };
}

export function codes(cards) {
  return cards.map((c) => {
    if (c.value === 'wild') return 'W';
    if (c.value === 'wild4') return 'W+4';
    return CODE_BY_COLOR[c.color] + (CODE_BY_VALUE[c.value] ?? c.value);
  });
}

export function lobby(playerCount, rules = {}) {
  let { state } = createGame({ hostId: 'p0', hostName: 'P0', seed: 42 });
  for (let i = 1; i < playerCount; i++) state = act(state, { type: 'join', playerId: `p${i}`, name: `P${i}` });
  return { ...state, rules: { ...state.rules, ...rules } };
}

// Laufende Runde mit festen Karten. draw wird von vorne nach hinten gezogen.
export function game({ hands, top = 'r5', color, draw = [], discard = [], rules, current = 0, direction = 1 }) {
  const state = lobby(hands.length, rules);
  const topCard = card(top);
  state.players.forEach((player, i) => {
    player.hand = hands[i].map(card);
  });
  return {
    ...state,
    phase: 'playing',
    drawPile: draw.map(card).reverse(),
    discardPile: [...discard.map(card), topCard],
    activeColor: color ?? topCard.color,
    current,
    direction,
  };
}

export function act(state, action) {
  const result = reduce(state, action);
  if (result.error) throw new Error(`${action.type} abgelehnt: ${result.error}`);
  return result.state;
}

export function rejected(state, action) {
  const result = reduce(state, action);
  if (!result.error) throw new Error(`${action.type} hätte abgelehnt werden müssen`);
  if (result.state !== state) throw new Error('State wurde trotz Fehler verändert');
  return result.error;
}

export function play(state, playerId, code) {
  const target = player(state, playerId).hand.find((c) => codes([c])[0] === code);
  if (!target) throw new Error(`${playerId} hat keine Karte ${code}`);
  return act(state, { type: 'play', playerId, cardId: target.id });
}

export function player(state, playerId) {
  return state.players.find((p) => p.id === playerId);
}

export function handOf(state, playerId) {
  return codes(player(state, playerId).hand);
}

export function currentId(state) {
  return state.players[state.current].id;
}
