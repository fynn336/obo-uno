import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playShot } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { fitsFleet, isAcross, key, shipCells, SIZE } from '../game.js';

const COLUMNS = 'ABCDEFGHIJ';
// Feldgröße in Pixeln: gegnerische Meere groß, das eigene kleiner; zu viert enger
const CELL = { target: { 2: 34, 3: 27, 4: 24 }, own: { 2: 24, 3: 20, 4: 20 }, setup: 36 };

const DOUBLE_TAP_MS = 400;

// Beim Aufstellen angetipptes Schiff (Index), das R oder „Drehen“ dreht; lastTap erkennt den Doppelklick.
let picked = null;
let lastTap = null;
let latest = null;
let lastEventId = null;

export function renderShips(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.ships') && isMyTurn(latest.view);
  latest = { root, view, send, abort };
  if (view.phase !== 'setup' || me(view).ready) picked = null;
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

export function handleShipsKey(event) {
  if (!latest || picked === null || event.key.toLowerCase() !== 'r' || event.ctrlKey || event.metaKey) return;
  rotate(picked);
  event.preventDefault();
}

function setup(view) {
  const own = me(view);
  const waiting = view.players.filter((p) => !p.ready).map((p) => p.name);
  const sea = board(view, own, { cell: CELL.setup, editable: !own.ready });
  if (!own.ready) fleetEditor(sea, own);
  let status = 'Schiff ziehen zum Verschieben, antippen zum Drehen – oder neu verteilen lassen';
  if (picked !== null) status = 'Drehen mit R, Doppelklick oder „Drehen“';
  if (own.ready) status = `Warte auf ${waiting.join(', ')} …`;
  return h('div', { class: 'ships-setup' },
    h('section', { class: 'sea-zone' },
      h('h2', {}, 'Deine Flotte'),
      sea,
      h('p', { class: 'status' }, status),
      h('div', { class: 'actions' },
        h('button', { type: 'button', disabled: own.ready || picked === null, onClick: () => rotate(picked) }, '↻ Drehen', h('kbd', {}, 'R')),
        h('button', { type: 'button', disabled: own.ready, onClick: () => latest.send({ type: 'shuffleFleet' }) }, '🎲 Neu verteilen'),
        h('button', { type: 'button', class: 'primary', disabled: own.ready, onClick: () => latest.send({ type: 'ready' }) }, 'Bereit!'))),
    h('aside', { class: 'panel ships-side' },
      h('ul', { class: 'maex-players' }, view.players.map((p) => h('li', {},
        avatarBadge(p), h('span', { class: 'name' }, p.id === view.you ? `${p.name} (du)` : p.name),
        h('span', { class: 'lives' }, p.ready ? '✓ bereit' : '… stellt auf'))))));
}

function battle(view, lastShot) {
  const count = view.players.length;
  const opponents = view.players.filter((p) => p.id !== view.you);
  return h('div', { class: 'ships-battle' },
    h('div', { class: 'seas' },
      opponents.map((p) => sea(view, p, { cell: CELL.target[count], target: true, lastShot })),
      sea(view, me(view), { cell: CELL.own[count], target: false, lastShot })),
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

// Meer mit Koordinaten A–J und 1–10; beschießbare Felder sind Knöpfe, beim Aufstellen lassen sich Schiffe greifen.
function board(view, player, { cell, shootable = false, editable = false, lastShot = null }) {
  const ships = new Map();
  player.ships.forEach((ship, index) => {
    for (const [x, y] of ship.cells) ships.set(key(x, y), { sunk: ship.sunk, index });
  });
  const fresh = lastShot && lastShot.target === player.name ? key(lastShot.x, lastShot.y) : null;
  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const id = key(x, y);
      const shot = player.shots[id];
      const ship = ships.get(id);
      const classes = ['cell', ship && 'ship', ship?.sunk && 'sunk', shot, id === fresh && 'fresh',
        editable && ship?.index === picked && 'picked'];
      const label = `${coordinate(x, y)}${shot === 'hit' ? ' Treffer' : ''}${shot === 'miss' ? ' Wasser' : ''}`;
      cells.push(shootable && !shot
        ? h('button', {
          type: 'button',
          class: classes.filter(Boolean).join(' '),
          'aria-label': `${player.name}: ${label}`,
          onClick: () => latest.send({ type: 'shoot', targetId: player.id, x, y }),
        })
        : h('div', {
          class: classes.filter(Boolean).join(' '),
          title: label,
          'data-x': x,
          'data-y': y,
          'data-ship': editable && ship ? ship.index : null,
        }));
    }
  }
  return h('div', { class: `sea${editable ? ' editable' : ''}`, style: `--cell:${cell}px` },
    h('span', {}),
    [...COLUMNS].map((letter) => h('span', { class: 'axis' }, letter)),
    Array.from({ length: SIZE }, (_, y) => [h('span', { class: 'axis' }, String(y + 1)), ...cells.slice(y * SIZE, (y + 1) * SIZE)]).flat());
}

// Ziehen verschiebt ein Schiff (Vorschau grün = passt, rot = passt nicht), Antippen wählt es, zweimal Antippen dreht es.
// Der Doppelklick wird selbst erkannt, weil das erste Antippen das Meer neu zeichnet.
function fleetEditor(sea, player) {
  let drag = null;
  const cellAt = (event) => document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-x]');
  sea.addEventListener('pointerdown', (event) => {
    const cell = event.target.closest('[data-ship]');
    if (!cell) return;
    const index = Number(cell.dataset.ship);
    const [x, y] = player.ships[index].cells[0];
    drag = { index, grab: [Number(cell.dataset.x) - x, Number(cell.dataset.y) - y], at: [x, y], moved: false };
    sea.setPointerCapture(event.pointerId);
  });
  sea.addEventListener('pointermove', (event) => {
    const cell = drag && cellAt(event);
    if (!cell || !sea.contains(cell)) return;
    const at = [Number(cell.dataset.x) - drag.grab[0], Number(cell.dataset.y) - drag.grab[1]];
    if (at[0] === drag.at[0] && at[1] === drag.at[1]) return;
    drag.at = at;
    drag.moved = true;
    const ship = player.ships[drag.index];
    const cells = shipCells(at[0], at[1], ship.cells.length, isAcross(ship));
    preview(sea, cells, fitsFleet(player.ships, drag.index, cells), drag.index);
  });
  sea.addEventListener('pointerup', () => {
    if (!drag) return;
    const { index, at, moved } = drag;
    drag = null;
    preview(sea, [], true, null);
    const doubleTap = !moved && lastTap?.index === index && Date.now() - lastTap.time < DOUBLE_TAP_MS;
    lastTap = moved ? null : { index, time: Date.now() };
    if (moved) {
      picked = index;
      latest.send({ type: 'placeShip', index, x: at[0], y: at[1], across: isAcross(player.ships[index]) });
    } else if (doubleTap) {
      rotate(index);
    } else {
      picked = picked === index ? null : index;
      renderShips(latest.root, latest.view, latest.send, latest.abort);
    }
  });
  sea.addEventListener('pointercancel', () => {
    drag = null;
    preview(sea, [], true, null);
  });
}

function preview(sea, cells, fits, lifted) {
  for (const cell of sea.querySelectorAll('.ghost, .ghost-bad, .lifted')) cell.classList.remove('ghost', 'ghost-bad', 'lifted');
  for (const cell of sea.querySelectorAll(`[data-ship="${lifted}"]`)) cell.classList.add('lifted');
  for (const [x, y] of cells) sea.querySelector(`[data-x="${x}"][data-y="${y}"]`)?.classList.add(fits ? 'ghost' : 'ghost-bad');
}

// Dreht um das Feld oben links; passt es so nicht, meldet der Host das.
function rotate(index) {
  const ship = me(latest.view).ships[index];
  const [x, y] = ship.cells[0];
  picked = index;
  latest.send({ type: 'placeShip', index, x, y, across: !isAcross(ship) });
}

function me(view) {
  return view.players.find((p) => p.id === view.you);
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
