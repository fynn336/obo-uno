import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playShot } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { key, SIZE } from '../game.js';

const COLUMNS = 'ABCDEFGHIJ';
// Feldgröße in Pixeln: gegnerische Meere groß, das eigene kleiner; zu viert enger
const CELL = { target: { 2: 34, 3: 27, 4: 24 }, own: { 2: 24, 3: 20, 4: 20 }, setup: 36 };

let latest = null;
let lastEventId = null;

export function renderShips(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.ships') && isMyTurn(latest.view);
  latest = { root, view, send };
  const fresh = freshEvents(view);
  const lastShot = fresh.findLast((e) => e.type === 'shot');
  root.replaceChildren(
    h('div', { class: 'ships' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, turnText(view))),
      view.phase === 'setup' ? setup(view) : battle(view, lastShot)),
  );
  announce(fresh);
  if (isMyTurn(view) && !wasMyTurn) alertTurn(() => latest.root.querySelector('.ships') && isMyTurn(latest.view));
}

function setup(view) {
  const me = view.players.find((p) => p.id === view.you);
  const waiting = view.players.filter((p) => !p.ready).map((p) => p.name);
  return h('div', { class: 'ships-setup' },
    h('section', { class: 'sea-zone' },
      h('h2', {}, 'Deine Flotte'),
      board(view, me, { cell: CELL.setup }),
      h('p', { class: 'status' }, me.ready ? `Warte auf ${waiting.join(', ')} …` : 'Gefällt dir die Aufstellung?'),
      h('div', { class: 'actions' },
        h('button', { type: 'button', disabled: me.ready, onClick: () => latest.send({ type: 'shuffleFleet' }) }, '🎲 Neu verteilen'),
        h('button', { type: 'button', class: 'primary', disabled: me.ready, onClick: () => latest.send({ type: 'ready' }) }, 'Bereit!'))),
    h('aside', { class: 'panel ships-side' },
      h('ul', { class: 'maex-players' }, view.players.map((p) => h('li', {},
        avatarBadge(p), h('span', { class: 'name' }, p.id === view.you ? `${p.name} (du)` : p.name),
        h('span', { class: 'lives' }, p.ready ? '✓ bereit' : '… stellt auf'))))));
}

function battle(view, lastShot) {
  const count = view.players.length;
  const me = view.players.find((p) => p.id === view.you);
  const opponents = view.players.filter((p) => p.id !== view.you);
  return h('div', { class: 'ships-battle' },
    h('div', { class: 'seas' },
      opponents.map((p) => sea(view, p, { cell: CELL.target[count], target: true, lastShot })),
      sea(view, me, { cell: CELL.own[count], target: false, lastShot })),
    h('aside', { class: 'panel ships-side' },
      h('p', { class: 'status' }, statusText(view)),
      view.turnEndsIn !== null && timerBar(view.turnTime, view.turnEndsIn),
      h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event))))));
}

function sea(view, player, { cell, target, lastShot }) {
  const current = player.id === view.currentId;
  return h('section', { class: `sea-zone${player.alive ? '' : ' sunk-fleet'}${current ? ' current' : ''}` },
    h('h2', {}, avatarBadge(player),
      target ? player.name : 'Deine Flotte',
      h('span', { class: 'hint' }, player.alive ? `🚢 × ${player.shipsLeft}` : 'versenkt')),
    board(view, player, { cell, shootable: target && isMyTurn(view) && player.alive, lastShot }));
}

// Meer mit Koordinaten A–J und 1–10; beschießbare Felder sind Knöpfe.
function board(view, player, { cell, shootable = false, lastShot = null }) {
  const shipCells = new Map();
  for (const ship of player.ships) for (const [x, y] of ship.cells) shipCells.set(key(x, y), ship.sunk);
  const fresh = lastShot && lastShot.target === player.name ? key(lastShot.x, lastShot.y) : null;
  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const id = key(x, y);
      const shot = player.shots[id];
      const classes = ['cell', shipCells.has(id) && 'ship', shipCells.get(id) && 'sunk', shot, id === fresh && 'fresh'];
      const label = `${coordinate(x, y)}${shot === 'hit' ? ' Treffer' : ''}${shot === 'miss' ? ' Wasser' : ''}`;
      cells.push(shootable && !shot
        ? h('button', {
          type: 'button',
          class: classes.filter(Boolean).join(' '),
          'aria-label': `${player.name}: ${label}`,
          onClick: () => latest.send({ type: 'shoot', targetId: player.id, x, y }),
        })
        : h('div', { class: classes.filter(Boolean).join(' '), title: label }));
    }
  }
  return h('div', { class: 'sea', style: `--cell:${cell}px` },
    h('span', {}),
    [...COLUMNS].map((letter) => h('span', { class: 'axis' }, letter)),
    Array.from({ length: SIZE }, (_, y) => [h('span', { class: 'axis' }, String(y + 1)), ...cells.slice(y * SIZE, (y + 1) * SIZE)]).flat());
}

function turnText(view) {
  if (view.phase === 'setup') return 'Flotten aufstellen';
  return isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`;
}

function statusText(view) {
  if (isMyTurn(view)) return 'Feuer frei – tipp auf ein Feld in einem gegnerischen Meer!';
  return `${currentPlayer(view).name} zielt …`;
}

function describe(event) {
  if (event.type === 'start') return 'Alle Flotten stehen – los geht’s!';
  if (event.type === 'shot') {
    return `${event.player} → ${event.target} ${coordinate(event.x, event.y)}: ${event.hit ? 'Treffer!' : 'Wasser'}`;
  }
  if (event.type === 'sunk') return `${event.player} versenkt ein Schiff (${event.size}) von ${event.target}`;
  if (event.type === 'out') return `Die Flotte von ${event.player} ist versenkt`;
  return `${event.player} hat die Partie verlassen`;
}

function coordinate(x, y) {
  return `${COLUMNS[x]}${y + 1}`;
}

function freshEvents(view) {
  const newestId = view.events.at(-1)?.id ?? 0;
  const fresh = lastEventId === null || newestId < lastEventId ? [] : view.events.filter((e) => e.id > lastEventId);
  lastEventId = newestId;
  return fresh;
}

function announce(fresh) {
  for (const event of fresh) {
    if (event.type === 'shot') playShot(event.hit);
    if (event.type === 'sunk') showBanner(['Versenkt!', `${event.player} trifft ${event.target} (${event.size})`]);
    if (event.type === 'out') showBanner(['Flotte versenkt!', `${event.player} ist raus`]);
  }
}

function currentPlayer(view) {
  return view.players.find((p) => p.id === view.currentId);
}

function isMyTurn(view) {
  return view.currentId === view.you;
}
