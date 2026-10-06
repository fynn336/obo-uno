import { COLOR_NAMES, cardBack, cardFace } from './cards.js';
import { h } from './dom.js';

const COLOR_KEYS = { r: 'red', y: 'yellow', g: 'green', b: 'blue' };
const COLOR_ORDER = ['red', 'yellow', 'green', 'blue', null];
const VALUE_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2', 'wild', 'wild4'];
const RULE_NAMES = { stacking: 'Stapeln', challenge: 'Anfechtung', drawUntilPlayable: 'Ziehen bis spielbar' };

let latest = null;
let selectedId = null;

export function renderTable(root, view, send) {
  latest = { root, view, send };
  const hand = sortHand(view.hand);
  selectedId = pickSelection(view, hand);
  root.replaceChildren(
    h('div', { class: 'table' },
      infoBar(view),
      playerList(view, send),
      h('section', { class: 'center' },
        piles(view, send),
        view.notice && h('p', { class: 'notice' }, view.notice),
        h('p', { class: 'status' }, statusText(view)),
        actions(view, send)),
      handRow(view, hand, send),
    ),
  );
}

export function handleTableKey(event) {
  const key = event.key.toLowerCase();
  const isArrow = key === 'arrowleft' || key === 'arrowright';
  if (!latest || event.ctrlKey || event.metaKey || event.altKey || (event.repeat && !isArrow)) return;
  const { view, send } = latest;
  if (isArrow) moveSelection(key === 'arrowleft' ? -1 : 1);
  else if (key === 'enter' && selectedId !== null) send({ type: 'play', cardId: selectedId });
  else if (key === ' ') send({ type: 'draw' });
  else if (key === 'u') send({ type: 'callUno' });
  else if (COLOR_KEYS[key] && view.phase === 'chooseColor') send({ type: 'chooseColor', color: COLOR_KEYS[key] });
  else return;
  event.preventDefault();
}

function infoBar(view) {
  const activeRules = Object.keys(RULE_NAMES).filter((rule) => view.rules[rule]);
  return h('header', { class: 'info' },
    h('span', { class: 'turn' }, isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`),
    h('span', {}, view.direction === 1 ? '↻ Im Uhrzeigersinn' : '↺ Gegen den Uhrzeigersinn'),
    h('span', {}, 'Farbe: ', h('span', { class: `swatch ${view.activeColor ?? ''}` }), COLOR_NAMES[view.activeColor] ?? 'wird gewählt'),
    h('span', { class: 'rules' },
      activeRules.length > 0
        ? activeRules.map((rule) => h('span', { class: 'chip' }, RULE_NAMES[rule]))
        : h('span', { class: 'chip' }, 'Offizielle Regeln')),
  );
}

function playerList(view, send) {
  return h('aside', { class: 'players' },
    h('h2', {}, 'Spieler ', h('span', { title: 'Spielrichtung' }, view.direction === 1 ? '↓' : '↑')),
    h('ol', {}, view.players.map((p) => h('li', { class: p.id === view.currentId ? 'current' : '' },
      h('span', { class: 'name' }, p.name, p.id === view.you && ' (du)'),
      h('span', { class: 'count' }, `${p.cardCount} ${p.cardCount === 1 ? 'Karte' : 'Karten'}`),
      p.saidUno && h('span', { class: 'badge uno' }, 'UNO!'),
      !p.connected && h('span', { class: 'badge offline' }, 'getrennt'),
      p.catchable && p.id !== view.you && h('button', {
        class: 'catch',
        type: 'button',
        onClick: () => send({ type: 'catchUno', targetId: p.id }),
      }, 'Erwischt!'),
    ))),
  );
}

function piles(view, send) {
  return h('div', { class: 'piles' },
    h('div', { class: 'pile' },
      cardBack({ title: 'Karte ziehen (Leertaste)', onClick: () => send({ type: 'draw' }) }),
      h('span', { class: 'hint' }, `${view.drawPileCount} im Stapel`)),
    h('div', { class: 'pile' },
      h('div', { class: `discard ${view.activeColor ?? ''}` }, cardFace(view.topCard, { title: 'Ablagestapel' })),
      h('span', { class: 'hint' }, 'Ablage')),
  );
}

function statusText(view) {
  const current = currentPlayer(view);
  const pending = view.pendingDraw;
  if (!current.connected) return `${current.name} ist getrennt – der Platz bleibt 60 Sekunden reserviert`;
  if (!isMyTurn(view)) {
    if (view.phase === 'chooseColor') return `${current.name} wählt eine Farbe …`;
    if (view.phase === 'challengeWindow') return `${current.name} entscheidet: anfechten oder ${pending} ziehen …`;
    return `Warte auf ${current.name} …`;
  }
  if (view.phase === 'chooseColor') return 'Wähle eine Farbe (R, G, B, Y)';
  const stackHint = view.rules.stacking ? ', stapeln' : '';
  if (view.phase === 'challengeWindow') return `+${pending} gegen dich: anfechten${stackHint} oder ${pending} Karten ziehen`;
  if (pending > 0) return `+${pending} gegen dich: stapeln oder ${pending} Karten ziehen`;
  if (view.drawnCardId !== null) return 'Gezogene Karte legen (Enter) oder weitergeben';
  return 'Leg eine Karte (← → und Enter) oder zieh eine (Leertaste)';
}

function actions(view, send) {
  const myTurn = isMyTurn(view);
  const canAct = myTurn && (view.phase === 'playing' || view.phase === 'challengeWindow');
  const me = view.players.find((p) => p.id === view.you);
  const button = (label, key, action, extra = {}) => h('button', { type: 'button', onClick: () => send(action), ...extra },
    label, key && h('kbd', {}, key));
  return h('div', { class: 'actions' },
    canAct && view.drawnCardId === null && button(
      view.pendingDraw > 0 ? `${view.pendingDraw} Karten ziehen` : 'Karte ziehen', 'Leertaste', { type: 'draw' }),
    myTurn && view.drawnCardId !== null && button('Weitergeben', null, { type: 'pass' }),
    myTurn && view.phase === 'challengeWindow' && button('Anfechten', null, { type: 'challenge' }, { class: 'primary' }),
    myTurn && view.phase === 'chooseColor' && Object.entries(COLOR_KEYS).map(([key, color]) =>
      button(COLOR_NAMES[color], key.toUpperCase(), { type: 'chooseColor', color }, { class: `color-choice ${color}` })),
    button('UNO!', 'U', { type: 'callUno' }, {
      class: 'uno',
      disabled: !(canAct && view.hand.length === 2 && !me.saidUno),
    }),
  );
}

function handRow(view, hand, send) {
  const playable = new Set(view.playableIds);
  const classesFor = (card) => [
    playable.has(card.id) ? 'playable' : isMyTurn(view) && 'dim',
    card.id === selectedId && 'selected',
  ].filter(Boolean).join(' ');
  return h('section', { class: 'hand' },
    h('h2', {}, `Deine Hand (${hand.length})`),
    h('div', { class: 'cards' }, hand.map((card) => cardFace(card, {
      classes: classesFor(card),
      onClick: () => {
        selectedId = card.id;
        send({ type: 'play', cardId: card.id });
      },
    }))),
  );
}

function moveSelection(step) {
  const hand = sortHand(latest.view.hand);
  if (hand.length === 0) return;
  const index = hand.findIndex((card) => card.id === selectedId);
  selectedId = hand[(index + step + hand.length) % hand.length].id;
  renderTable(latest.root, latest.view, latest.send);
}

function pickSelection(view, hand) {
  if (view.drawnCardId !== null) return view.drawnCardId;
  if (hand.some((card) => card.id === selectedId)) return selectedId;
  return view.playableIds[0] ?? hand[0]?.id ?? null;
}

function sortHand(hand) {
  return [...hand].sort((a, b) =>
    COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color) || VALUE_ORDER.indexOf(a.value) - VALUE_ORDER.indexOf(b.value));
}

function currentPlayer(view) {
  return view.players.find((p) => p.id === view.currentId);
}

function isMyTurn(view) {
  return view.currentId === view.you;
}
