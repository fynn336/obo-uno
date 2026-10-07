import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playCardSound } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { h } from '../../../ui/dom.js';
import { CATEGORIES, scoreFor } from '../scoring.js';

const ROLLS_PER_TURN = 3;
const ROUNDS = CATEGORIES.length;
// Positionen der Augen im 3×3-Raster
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const LABELS = Object.fromEntries(CATEGORIES.map((category) => [category.key, category.label]));
const ROLL_SOUND_RATE = 0.75;
const BANNERS = {
  kniffel: (e) => ['KNIFFEL!', e.player],
  largeStraight: (e) => ['Große Straße', `${e.player} +40`],
};

let latest = null;
let previous = null;
let kept = [false, false, false, false, false];
let keptForTurn = null;
let lastEventId = null;

export function renderKniffel(root, view, send, abort) {
  const last = root.querySelector('.dice-game') ? previous : null;
  const isNewView = view !== previous;
  latest = { root, view, send, abort };
  previous = view;
  if (keptForTurn !== view.turnNumber || view.rollsLeft === ROLLS_PER_TURN) {
    kept = [false, false, false, false, false];
    keptForTurn = view.turnNumber;
  }
  const rolling = isNewView && last ? rollingDice(last, view) : [];
  root.replaceChildren(
    h('div', { class: 'dice-game' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`),
        h('span', {}, `Runde ${round(view)} von ${ROUNDS}`),
        h('span', {}, `Wurf ${ROLLS_PER_TURN - view.rollsLeft} von ${ROLLS_PER_TURN}`)),
      h('div', { class: 'dice-board' },
        h('section', { class: 'dice-zone' },
          h('div', { class: 'dice' }, view.dice.map((face, i) => die(view, face, i, rolling.includes(i)))),
          h('p', { class: 'status' }, statusText(view)),
          h('div', { class: 'actions' },
            h('button', {
              type: 'button',
              class: 'primary',
              disabled: !canRoll(view),
              onClick: roll,
            }, view.rollsLeft === ROLLS_PER_TURN ? 'Würfeln' : `Nochmal würfeln (${view.rollsLeft})`, h('kbd', {}, 'Leertaste'))),
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event))))),
        scoreSheet(view)),
    ),
  );
  if (!isNewView) return;
  announce(view);
  if (isMyTurn(view) && !(last && isMyTurn(last))) {
    alertTurn(() => latest.root.querySelector('.dice-game') && isMyTurn(latest.view));
  }
}

export function handleKniffelKey(event) {
  if (!latest || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const slot = Number(event.key) - 1;
  if (event.key === ' ') roll();
  else if (slot >= 0 && slot < kept.length) toggle(slot);
  else return;
  event.preventDefault();
}

function die(view, face, index, isRolling) {
  const idle = view.rollsLeft === ROLLS_PER_TURN;
  const classes = ['die', kept[index] && 'kept', isRolling && 'rolling', idle && 'idle'].filter(Boolean).join(' ');
  return h('button', {
    type: 'button',
    class: classes,
    disabled: !canHold(view),
    'aria-label': `Würfel ${index + 1}: ${face}${kept[index] ? ' (gehalten)' : ''}`,
    title: canHold(view) ? `Halten an/aus (${index + 1})` : null,
    onClick: () => toggle(index),
  }, Array.from({ length: 9 }, (_, cell) => h('span', { class: PIPS[face].includes(cell) ? 'pip' : '' })));
}

function scoreSheet(view) {
  const me = view.players.find((p) => p.id === view.you);
  const canScore = isMyTurn(view) && view.rollsLeft < ROLLS_PER_TURN;
  const cell = (player, key) => {
    const points = player.sheet[key];
    if (points !== null) return h('td', { class: points === 0 ? 'struck' : '' }, points === 0 ? '–' : String(points));
    if (player !== me || !canScore) return h('td', {});
    const preview = scoreFor(key, view.dice);
    return h('td', {}, h('button', {
      type: 'button',
      class: `preview${preview === 0 ? ' zero' : ''}`,
      title: preview === 0 ? `${LABELS[key]} streichen` : `${preview} Punkte bei ${LABELS[key]} eintragen`,
      onClick: () => latest.send({ type: 'score', category: key }),
    }, preview === 0 ? 'streichen' : `+${preview}`));
  };
  const row = (label, cells, classes = '') => h('tr', { class: classes }, h('th', { scope: 'row' }, label), cells);
  const columns = (render) => view.players.map((p) => render(p));
  return h('section', { class: 'sheet panel' },
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}), columns((p) => h('th', { class: p.id === view.currentId ? 'current' : '' },
        avatarBadge(p), h('span', { class: 'name' }, p.id === view.you ? `${p.name} (du)` : p.name))))),
      h('tbody', {},
        CATEGORIES.filter((c) => c.upper).map((c) => row(c.label, columns((p) => cell(p, c.key)))),
        row('Summe oben', columns((p) => h('td', {}, `${p.upper} / 63`)), 'subtotal'),
        row('Bonus', columns((p) => h('td', {}, p.bonus ? '+35' : '')), 'subtotal'),
        CATEGORIES.filter((c) => !c.upper).map((c) => row(c.label, columns((p) => cell(p, c.key)))),
        row('Gesamt', columns((p) => h('td', {}, String(p.total))), 'total'))));
}

function statusText(view) {
  if (!isMyTurn(view)) return `${currentPlayer(view).name} würfelt …`;
  if (view.rollsLeft === ROLLS_PER_TURN) return 'Du bist dran – würfle!';
  if (view.rollsLeft === 0) return 'Trag dein Ergebnis im Block ein';
  return 'Würfel antippen (1–5) zum Halten, nochmal würfeln oder im Block eintragen';
}

function describe(event) {
  if (event.type === 'roll') return `${event.player} würfelt ${event.dice.join(' ')}`;
  if (event.type === 'score') return `${event.player}: ${LABELS[event.category]} ${event.points === 0 ? 'gestrichen' : `+${event.points}`}`;
  return `${event.player} hat die Partie verlassen`;
}

function announce(view) {
  const newestId = view.events.at(-1)?.id ?? 0;
  const fresh = lastEventId === null || newestId < lastEventId ? [] : view.events.filter((e) => e.id > lastEventId);
  lastEventId = newestId;
  for (const event of fresh) {
    if (event.type === 'roll') playCardSound(ROLL_SOUND_RATE);
    if (event.type === 'score' && event.points > 0 && BANNERS[event.category]) showBanner(BANNERS[event.category](event));
  }
}

// Beim ersten Wurf eines Zugs rollen alle Würfel, danach nur die, deren Augenzahl sich geändert hat.
function rollingDice(last, view) {
  if (view.rollsLeft === last.rollsLeft && view.turnNumber === last.turnNumber) return [];
  if (view.rollsLeft === ROLLS_PER_TURN) return [];
  const isFirstRoll = view.rollsLeft === ROLLS_PER_TURN - 1;
  return view.dice.map((face, i) => (isFirstRoll || face !== last.dice[i] ? i : -1)).filter((i) => i >= 0);
}

function roll() {
  if (canRoll(latest.view)) latest.send({ type: 'roll', keep: kept });
}

function toggle(index) {
  if (!canHold(latest.view)) return;
  kept = kept.map((value, i) => (i === index ? !value : value));
  renderKniffel(latest.root, latest.view, latest.send, latest.abort);
}

function canRoll(view) {
  return isMyTurn(view) && view.rollsLeft > 0;
}

function canHold(view) {
  return isMyTurn(view) && view.rollsLeft > 0 && view.rollsLeft < ROLLS_PER_TURN;
}

function round(view) {
  const filled = (p) => Object.values(p.sheet).filter((points) => points !== null).length;
  return Math.min(ROUNDS, Math.min(...view.players.map(filled)) + 1);
}

function currentPlayer(view) {
  return view.players.find((p) => p.id === view.currentId);
}

function isMyTurn(view) {
  return view.currentId === view.you;
}
