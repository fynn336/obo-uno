import { COLOR_NAMES, cardBack, cardFace } from './cards.js';
import { h } from './dom.js';

const COLOR_KEYS = { r: 'red', y: 'yellow', g: 'green', b: 'blue' };
const COLOR_ORDER = ['red', 'yellow', 'green', 'blue', null];
const VALUE_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2', 'wild', 'wild4'];
const RULE_NAMES = { stacking: 'Stapeln', challenge: 'Anfechtung', drawUntilPlayable: 'Ziehen bis spielbar' };
const SEAT_COLORS = ['#e0322b', '#1c6fd1', '#2f9e44', '#f2c40f', '#9c4dcc', '#e8792b', '#1aa6a6', '#d6488f'];
const MAX_MINI_CARDS = 10;
const PULSE_MS = 2000;
const DIRECTION_SPIN_MS = 30000;

let latest = null;
let previous = null;
let selectedId = null;

export function renderTable(root, view, send) {
  const last = root.querySelector('.table') ? previous : null;
  const isNewView = view !== previous;
  const flySource = isNewView ? playedCardSource(root, last, view) : null;
  latest = { root, view, send };
  previous = view;
  const hand = sortHand(view.hand);
  if (isNewView) selectedId = pickSelection(view, hand);
  root.replaceChildren(
    h('div', { class: 'table' },
      infoBar(view),
      h('section', { class: 'room' },
        h('div', { class: 'rim' },
          h('div', { class: 'felt' },
            h('div', {
              class: `direction ${view.direction === 1 ? '' : 'ccw'}`,
              style: `animation-delay:-${Date.now() % DIRECTION_SPIN_MS}ms`,
            }),
            h('div', { class: 'center' },
              piles(view, send),
              view.notice && h('p', { class: 'notice' }, view.notice),
              h('p', { class: 'status' }, statusText(view)),
              actions(view, send))),
          seats(view, send))),
      handArea(view, hand, send),
    ),
  );
  if (isNewView) animateChanges(root, last, view, flySource);
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

// Mitspieler sitzen in Spielreihenfolge von links über oben nach rechts um den Tisch.
function seats(view, send) {
  const me = view.players.findIndex((p) => p.id === view.you);
  const others = [...view.players.slice(me + 1), ...view.players.slice(0, me)];
  return others.map((player, i) => {
    const angle = Math.PI - ((i + 1) * Math.PI) / (others.length + 1);
    const isCurrent = player.id === view.currentId;
    return h('div', {
      class: `seat${isCurrent ? ' current' : ''}${player.connected ? '' : ' offline'}`,
      'data-player': player.id,
      style: `left:${50 + 48 * Math.cos(angle)}%;top:${50 - 50 * Math.sin(angle)}%`,
    },
    avatar(view, player),
    h('div', { class: 'seat-name' }, player.name),
    h('div', { class: 'mini-fan' }, miniCards(player.cardCount)),
    h('div', { class: 'seat-count' }, cardCount(player.cardCount)),
    h('div', { class: 'badges' },
      player.saidUno && h('span', { class: 'badge uno' }, 'UNO!'),
      !player.connected && h('span', { class: 'badge offline' }, 'getrennt'),
      player.catchable && h('button', {
        class: 'catch',
        type: 'button',
        onClick: () => send({ type: 'catchUno', targetId: player.id }),
      }, 'Erwischt!')));
  });
}

function avatar(view, player) {
  const index = view.players.findIndex((p) => p.id === player.id);
  const isCurrent = player.id === view.currentId;
  return h('div', {
    class: 'avatar',
    style: `--seat-color:${SEAT_COLORS[index % SEAT_COLORS.length]};${isCurrent ? pulseDelay() : ''}`,
  }, player.name.charAt(0).toUpperCase());
}

function miniCards(count) {
  const shown = Math.min(count, MAX_MINI_CARDS);
  return Array.from({ length: shown }, (_, i) => h('span', {
    class: 'mini-card',
    style: `--rot:${(i - (shown - 1) / 2) * 7}deg`,
  }));
}

function piles(view, send) {
  return h('div', { class: 'piles' },
    h('div', { class: 'pile draw-pile' },
      cardBack({ title: 'Karte ziehen (Leertaste)', onClick: () => send({ type: 'draw' }) }),
      h('span', { class: 'pile-label' }, `${view.drawPileCount} im Stapel`)),
    h('div', { class: 'pile' },
      h('div', { class: `discard ${view.activeColor ?? ''}` }, cardFace(view.topCard, { title: 'Ablagestapel', tabindex: -1 })),
      h('span', { class: 'pile-label' }, COLOR_NAMES[view.activeColor] ?? 'Farbe wird gewählt')),
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

function handArea(view, hand, send) {
  const me = view.players.find((p) => p.id === view.you);
  const playable = new Set(view.playableIds);
  const myTurn = isMyTurn(view);
  const classesFor = (card) => [
    playable.has(card.id) ? 'playable' : myTurn && 'dim',
    card.id === selectedId && 'selected',
  ].filter(Boolean).join(' ');
  const spread = Math.min(5, 50 / Math.max(hand.length, 1));
  const mid = (hand.length - 1) / 2;
  return h('section', {
    class: `hand${myTurn ? ' current' : ''}`,
    'data-player': view.you,
    style: myTurn ? pulseDelay() : null,
  },
  h('div', { class: 'hand-head' },
    avatar(view, me),
    h('span', { class: 'hand-name' }, `${me.name} (du)`),
    h('span', { class: 'seat-count' }, cardCount(hand.length)),
    me.saidUno && h('span', { class: 'badge uno' }, 'UNO!')),
  h('div', { class: 'fan', style: `--advance:${Math.max(28, Math.min(70, 960 / Math.max(hand.length, 1)))}px` },
    hand.map((card, i) => cardFace(card, {
      classes: classesFor(card),
      style: `--rot:${(i - mid) * spread}deg;--drop:${Math.min(24, (i - mid) ** 2 * (spread / 4))}px;--z:${i}`,
      onClick: () => {
        selectedId = card.id;
        send({ type: 'play', cardId: card.id });
      },
    }))),
  );
}

function playedCardSource(root, last, view) {
  if (!last?.topCard || !view.topCard || last.topCard.id === view.topCard.id) return null;
  const source = root.querySelector(`.fan [data-card="${view.topCard.id}"]`)
    ?? root.querySelector(`[data-player="${last.currentId}"] .avatar`);
  return source?.getBoundingClientRect() ?? null;
}

function animateChanges(root, last, view, flySource) {
  if (flySource) flyFrom(root.querySelector('.discard .card'), flySource, 'fly-in', 0);
  const known = new Set((last?.hand ?? []).map((card) => card.id));
  const pile = root.querySelector('.draw-pile .card').getBoundingClientRect();
  let order = 0;
  for (const element of root.querySelectorAll('.fan .card')) {
    if (!known.has(Number(element.dataset.card))) flyFrom(element, pile, 'arrive', order++);
  }
}

function flyFrom(element, from, className, order) {
  const to = element.getBoundingClientRect();
  element.style.setProperty('--from-x', `${from.left + from.width / 2 - (to.left + to.width / 2)}px`);
  element.style.setProperty('--from-y', `${from.top + from.height / 2 - (to.top + to.height / 2)}px`);
  element.style.setProperty('--order', order);
  element.classList.add(className);
}

// Hält Puls und Drehung beim Neuzeichnen im Takt, statt sie neu starten zu lassen.
function pulseDelay() {
  return `animation-delay:-${Date.now() % PULSE_MS}ms`;
}

function cardCount(count) {
  return `${count} ${count === 1 ? 'Karte' : 'Karten'}`;
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
  const stillUseful = view.playableIds.length === 0 || view.playableIds.includes(selectedId);
  if (stillUseful && hand.some((card) => card.id === selectedId)) return selectedId;
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
