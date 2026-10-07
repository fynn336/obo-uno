import { nextRandom } from '../../../shared/rng.js';
import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playEffect } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { diePips } from '../../../ui/dice.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { bestCategory } from '../bot.js';
import { CATEGORIES, scoreFor } from '../scoring.js';

const ROLLS_PER_TURN = 3;
const ROUNDS = CATEGORIES.length;
const LABELS = Object.fromEntries(CATEGORIES.map((category) => [category.key, category.label]));
const BANNERS = {
  kniffel: (e) => ['KNIFFEL!', e.player],
  largeStraight: (e) => ['Große Straße', `${e.player} +40`],
};

let latest = null;
let lastEventId = null;

export function renderKniffel(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.dice-game') && isMyTurn(latest.view);
  latest = { root, view, send };
  const fresh = freshEvents(view);
  const rolled = fresh.some((e) => e.type === 'roll');
  const written = fresh.findLast((e) => e.type === 'score');
  root.replaceChildren(
    h('div', { class: 'dice-game' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`),
        h('span', {}, `Runde ${round(view)} von ${ROUNDS}`),
        h('span', {}, `Wurf ${ROLLS_PER_TURN - view.rollsLeft} von ${ROLLS_PER_TURN}`)),
      h('div', { class: 'dice-board' },
        h('section', { class: 'dice-zone' },
          heldStrip(view),
          h('div', { class: 'tray-row' }, cup(view, rolled), tray(view, rolled)),
          h('p', { class: 'status' }, statusText(view)),
          view.turnEndsIn !== null && timerBar(view.turnTime, view.turnEndsIn),
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event))))),
        scoreSheet(view, written)),
    ),
  );
  announce(fresh);
  if (isMyTurn(view) && !wasMyTurn) {
    alertTurn(() => latest.root.querySelector('.dice-game') && isMyTurn(latest.view));
  }
}

export function handleKniffelKey(event) {
  if (!latest || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const slot = Number(event.key) - 1;
  if (event.key === ' ') roll();
  else if (slot >= 0 && slot < latest.view.dice.length) toggle(slot);
  else return;
  event.preventDefault();
}

// Leiste über der Schale: gehaltene Würfel, für alle sichtbar
function heldStrip(view) {
  const name = currentPlayer(view).name;
  const anyKept = hasRolled(view) && view.kept.some(Boolean);
  let caption = `${name} hält nichts`;
  if (isMyTurn(view)) caption = anyKept ? 'Gehalten – antippen zum Zurücklegen' : 'Würfel antippen (1–5) zum Halten';
  else if (anyKept) caption = `${name} hält`;
  return h('div', { class: 'held' },
    h('span', { class: 'held-caption' }, hasRolled(view) ? caption : ''),
    h('div', { class: 'held-slots' }, view.dice.map((face, i) => (hasRolled(view) && view.kept[i]
      ? die(view, face, i, {})
      : h('span', { class: 'slot' })))));
}

function cup(view, rolled) {
  return h('button', {
    type: 'button',
    class: `cup${rolled ? ' shaking' : ''}${hasRolled(view) ? '' : ' full'}`,
    disabled: !canRoll(view),
    title: canRoll(view) ? 'Würfeln (Leertaste)' : null,
    'aria-label': view.rollsLeft === ROLLS_PER_TURN ? 'Würfeln' : `Nochmal würfeln, noch ${view.rollsLeft}`,
    onClick: roll,
  }, h('span', { class: 'cup-label' }, canRoll(view) ? `${view.rollsLeft}×` : ''));
}

// Lose Würfel liegen verstreut; die Lage hängt nur vom Wurf ab, damit alle dasselbe sehen.
function tray(view, rolled) {
  const loose = hasRolled(view) ? view.dice.map((face, i) => (view.kept[i] ? null : die(view, face, i, {
    style: scatter(view, i),
    rolling: rolled,
  }))) : [];
  return h('div', { class: 'tray' }, loose);
}

function die(view, face, index, { style = null, rolling = false }) {
  return h('button', {
    type: 'button',
    class: `die${rolling ? ' rolling' : ''}`,
    style,
    disabled: !canHold(view),
    'aria-label': `Würfel ${index + 1}: ${face}${view.kept[index] ? ' (gehalten)' : ''}`,
    title: canHold(view) ? `Halten an/aus (${index + 1})` : null,
    onClick: () => toggle(index),
  }, diePips(face));
}

function scatter(view, index) {
  let seed = (view.turnNumber * 7 + view.rollsLeft) * 31 + index + 1;
  const next = () => {
    const [value, following] = nextRandom(seed);
    seed = following;
    return value;
  };
  const [x, y, angle] = [next(), next(), next()];
  return `--slot: ${index}; --x: ${index * 19 + x * 4}%; --y: ${8 + y * 50}%; --r: ${Math.round((angle - 0.5) * 60)}deg`;
}

function scoreSheet(view, written) {
  const me = view.players.find((p) => p.id === view.you);
  const canScore = isMyTurn(view) && hasRolled(view);
  const open = CATEGORIES.filter((category) => me.sheet[category.key] === null);
  const tip = canScore && open.length > 0 ? bestCategory(open, view.dice).key : null;
  const cell = (player, key) => {
    const points = player.sheet[key];
    const justWritten = written?.player === player.name && written.category === key;
    if (points !== null) {
      const classes = [points === 0 && 'struck', justWritten && 'written'].filter(Boolean).join(' ');
      return h('td', { class: classes }, points === 0 ? '' : String(points));
    }
    if (player !== me || !canScore) return h('td', {});
    const preview = scoreFor(key, view.dice);
    const action = preview === 0 ? `${LABELS[key]} streichen` : `${preview} Punkte bei ${LABELS[key]} eintragen`;
    return h('td', {}, h('button', {
      type: 'button',
      class: `preview${preview === 0 ? ' zero' : ''}${key === tip ? ' best' : ''}`,
      title: key === tip ? `Tipp: ${action}` : action,
      onClick: () => latest.send({ type: 'score', category: key }),
    }, preview === 0 ? 'streichen' : `+${preview}`));
  };
  const row = (label, cells, classes = '') => h('tr', { class: classes }, h('th', { scope: 'row' }, label), cells);
  const columns = (render) => view.players.map((p) => render(p));
  return h('section', { class: 'sheet' },
    h('h2', {}, 'Spielblock'),
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
  const name = currentPlayer(view).name;
  if (!isMyTurn(view)) return hasRolled(view) ? `${name} überlegt …` : `${name} schüttelt den Becher …`;
  if (!hasRolled(view)) return 'Du bist dran – Becher antippen oder Leertaste!';
  if (view.rollsLeft === 0) return 'Trag dein Ergebnis im Block ein';
  return 'Nochmal würfeln (Leertaste) oder im Block eintragen';
}

function describe(event) {
  if (event.type === 'roll') return `${event.player} würfelt ${event.dice.join(' ')}`;
  if (event.type === 'score') return `${event.player}: ${LABELS[event.category]} ${event.points === 0 ? 'gestrichen' : `+${event.points}`}`;
  return `${event.player} hat die Partie verlassen`;
}

function freshEvents(view) {
  const newestId = view.events.at(-1)?.id ?? 0;
  const fresh = lastEventId === null || newestId < lastEventId ? [] : view.events.filter((e) => e.id > lastEventId);
  lastEventId = newestId;
  return fresh;
}

function announce(fresh) {
  for (const event of fresh) {
    if (event.type === 'roll') playEffect('dice');
    if (event.type === 'score' && event.points > 0 && BANNERS[event.category]) showBanner(BANNERS[event.category](event));
  }
}

function roll() {
  if (canRoll(latest.view)) latest.send({ type: 'roll' });
}

function toggle(index) {
  const { view } = latest;
  if (!canHold(view)) return;
  latest.send({ type: 'hold', keep: view.kept.map((kept, i) => (i === index ? !kept : kept)) });
}

function hasRolled(view) {
  return view.rollsLeft < ROLLS_PER_TURN;
}

function canRoll(view) {
  return isMyTurn(view) && view.rollsLeft > 0;
}

function canHold(view) {
  return isMyTurn(view) && hasRolled(view) && view.rollsLeft > 0;
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
