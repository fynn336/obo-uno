import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playEffect } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { diePips } from '../../../ui/dice.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { BASE, TRACK } from '../game.js';
import {
  area, CENTER, cellOf, COLORS, goalCells, houseCells, OWN_CORNER, pathCells, rotate, TRACK_CELLS, yardCells,
} from './board.js';

const COLOR_NAMES = ['Rot', 'Blau', 'Grün', 'Gelb'];
const STEP_MS = 110;
const HOP_PX = 10;
const FLY_HOME_MS = 400;
const FLY_HOME_PX = 60;

let latest = null;
let lastEventId = null;

export function renderLudo(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.ludo') && isMyTurn(latest.view);
  latest = { root, view, send };
  const fresh = freshEvents(view);
  const lastMove = fresh.findLast((e) => e.type === 'move');
  const rolled = fresh.some((e) => e.type === 'roll');
  // Das Brett ist so gedreht, dass die eigene Farbe links unten liegt.
  const me = view.players.find((p) => p.id === view.you);
  const turn = (OWN_CORNER - me.color + COLORS.length) % COLORS.length;
  const at = (cell) => rotate(cell, turn);
  const boardElement = board(view, turn, at, rolled);
  root.replaceChildren(
    h('div', { class: 'ludo' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`)),
      h('div', { class: 'ludo-main' },
        boardElement,
        h('aside', { class: 'ludo-side panel' },
          h('ul', { class: 'ludo-players' }, view.players.map((p) => playerRow(view, p))),
          h('p', { class: 'status' }, statusText(view)),
          view.turnEndsIn !== null && timerBar(view.turnTime, view.turnEndsIn),
          h('button', {
            type: 'button',
            class: 'primary',
            disabled: !canRoll(view),
            onClick: roll,
          }, 'Würfeln', h('kbd', {}, 'Leertaste')),
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event))))))),
  );
  animateMove(boardElement, lastMove, at);
  announce(fresh);
  if (isMyTurn(view) && !wasMyTurn) alertTurn(() => latest.root.querySelector('.ludo') && isMyTurn(latest.view));
}

export function handleLudoKey(event) {
  if (!latest || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const { view } = latest;
  const piece = Number(event.key) - 1;
  if (event.key === ' ' && canRoll(view)) roll();
  else if (event.key === ' ' && isMyTurn(view) && view.movable.length === 1) move(view.movable[0]);
  else if (isMyTurn(view) && view.movable.includes(piece)) move(piece);
  else return;
  event.preventDefault();
}

function board(view, turn, at, rolled) {
  const used = new Map(view.players.map((p) => [p.color, p]));
  const place = (...cells) => area(...cells.map(at));
  const field = (cell, classes, extraStyle = '') => h('div', {
    class: `field ${classes}`,
    style: `${place(cell)}${extraStyle}`,
    'data-cell': at(cell).join(','),
  });
  const current = currentPlayer(view);
  return h('div', { class: 'ludo-board' },
    COLORS.map((color) => {
      const owner = used.get(color);
      const classes = [`yard team-${color} corner-${(color + turn) % COLORS.length}`, !owner && 'unused',
        owner === current && 'current'];
      return h('div', { class: classes.filter(Boolean).join(' '), style: place(...yardCells(color)) },
        owner && h('span', { class: 'yard-name' }, avatarBadge(owner), owner.id === view.you ? 'Du' : owner.name));
    }),
    TRACK_CELLS.map((cell, index) => {
      const startOf = index % (TRACK / COLORS.length) === 0 ? index / (TRACK / COLORS.length) : null;
      if (startOf === null) return field(cell, '');
      const direction = `; --arrow: ${angle(at(cell), at(TRACK_CELLS[index + 1]))}deg`;
      return field(cell, `start team-${startOf}`, direction);
    }),
    COLORS.flatMap((color) => goalCells(color).map((cell, i) => field(cell, `goal team-${color}`, `; --depth: ${i}`))),
    COLORS.flatMap((color) => houseCells(color).map((cell) => field(cell, `house team-${color}`))),
    h('div', { class: `board-center team-${current.color}`, style: place(CENTER) },
      h('button', {
        type: 'button',
        class: `die${rolled ? ' rolling' : ''}${view.die ? '' : ' idle'}`,
        disabled: !canRoll(view),
        title: canRoll(view) ? 'Würfeln (Leertaste)' : null,
        'aria-label': view.die ? `Würfel: ${view.die}` : 'Würfel',
        onClick: roll,
      }, diePips(view.die ?? 6))),
    view.players.flatMap((p) => p.pieces.map((position, piece) => pawn(view, p, position, piece, place))));
}

// Klassische Spielfigur mit Kopf und Körper; eigene Figuren tragen ihre Nummer für die Tasten 1–4.
function pawn(view, player, position, piece, place) {
  const mine = player.id === view.you;
  const movable = mine && isMyTurn(view) && view.movable.includes(piece);
  return h('button', {
    type: 'button',
    class: `piece team-${player.color}${movable ? ' movable' : ''}`,
    style: place(cellOf(player.color, position, piece)),
    'data-color': player.color,
    'data-piece': piece,
    disabled: !movable,
    title: movable ? `Figur ${piece + 1} ziehen (${piece + 1})` : null,
    'aria-label': `${player.name}, Figur ${piece + 1}${position === BASE ? ' im Haus' : ''}`,
    onClick: () => move(piece),
  }, h('span', {}, mine ? String(piece + 1) : ''));
}

// Die Figur hüpft Feld für Feld; eine geschlagene Figur fliegt danach zurück ins Haus.
function animateMove(boardElement, event, at) {
  if (!event || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pieceOf = (color, piece) => boardElement.querySelector(`.piece[data-color="${color}"][data-piece="${piece}"]`);
  const centerOf = (cell) => {
    const rect = boardElement.querySelector(`[data-cell="${at(cell).join(',')}"]`).getBoundingClientRect();
    return [rect.left + rect.width / 2, rect.top + rect.height / 2];
  };
  const cells = [cellOf(event.color, event.from, event.piece), ...pathCells(event.color, event.piece, event.from, event.to)];
  const points = cells.map(centerOf);
  const [endX, endY] = points.at(-1);
  const walker = pieceOf(event.color, event.piece);
  walker.classList.add('walking');
  hop(walker, points.map(([x, y]) => [x - endX, y - endY]), { stepMs: STEP_MS, height: HOP_PX, delay: 0 });
  if (event.victim === null) return;
  const [homeX, homeY] = centerOf(houseCells(event.victimColor)[event.victimPiece]);
  hop(pieceOf(event.victimColor, event.victimPiece), [[endX - homeX, endY - homeY], [0, 0]],
    { stepMs: FLY_HOME_MS, height: FLY_HOME_PX, delay: (points.length - 1) * STEP_MS });
}

function hop(element, offsets, { stepMs, height, delay }) {
  const frames = offsets.flatMap(([x, y], i) => {
    const frame = { transform: `translate(${x}px, ${y}px)` };
    if (i === 0) return [frame];
    const [previousX, previousY] = offsets[i - 1];
    return [{ transform: `translate(${(previousX + x) / 2}px, ${(previousY + y) / 2 - height}px)` }, frame];
  });
  element.animate(frames, { duration: (offsets.length - 1) * stepMs, delay, fill: 'backwards' });
}

function angle([column, row], [nextColumn, nextRow]) {
  return Math.round((Math.atan2(nextRow - row, nextColumn - column) * 180) / Math.PI);
}

function playerRow(view, player) {
  const inGoal = player.pieces.filter((position) => position >= TRACK).length;
  return h('li', { class: `team-${player.color}${player.id === view.currentId ? ' current' : ''}` },
    h('span', { class: 'swatch', title: COLOR_NAMES[player.color] }),
    avatarBadge(player),
    h('span', { class: 'name' }, player.id === view.you ? `${player.name} (du)` : player.name),
    h('span', { class: 'hint' }, player.place ? `🏁 Platz ${player.place}` : `${inGoal}/4 im Ziel`));
}

function statusText(view) {
  if (!isMyTurn(view)) return `${currentPlayer(view).name} ${view.mustMove ? 'zieht' : 'würfelt'} …`;
  if (view.mustMove) return 'Figur antippen (1–4) zum Ziehen';
  if (view.triesLeft > 1) return `Würfle eine 6 – noch ${view.triesLeft} Versuche`;
  return 'Du bist dran – würfle!';
}

function describe(event) {
  if (event.type === 'roll') return `${event.player} würfelt ${event.face}${event.stuck ? ' – kein Zug möglich' : ''}`;
  if (event.type === 'move') {
    if (event.victim) return `${event.player} wirft ${event.victim} raus`;
    if (event.from === BASE) return `${event.player} kommt raus`;
    if (event.to >= TRACK && event.from < TRACK) return `${event.player} zieht ins Ziel`;
    const steps = event.to - event.from;
    return `${event.player} zieht ${steps} ${steps === 1 ? 'Feld' : 'Felder'}`;
  }
  if (event.type === 'finished') return `${event.player} ist fertig – Platz ${event.place}`;
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
    if (event.type === 'move') playSteps(event);
    if (event.type === 'move' && event.victim) showBanner(['Rausgeworfen!', `${event.player} schlägt ${event.victim}`]);
    if (event.type === 'finished') showBanner([`${event.player} ist im Ziel`, `Platz ${event.place}`]);
  }
}

// Ein Klacken pro Feld, im Takt der Hüpf-Animation
function playSteps(event) {
  const steps = event.from === BASE ? 1 : event.to - event.from;
  for (let i = 0; i < steps; i++) setTimeout(() => playEffect('step'), i * STEP_MS);
}

function roll() {
  if (canRoll(latest.view)) latest.send({ type: 'roll' });
}

function move(piece) {
  latest.send({ type: 'move', piece });
}

function canRoll(view) {
  return isMyTurn(view) && !view.mustMove;
}

function currentPlayer(view) {
  return view.players.find((p) => p.id === view.currentId);
}

function isMyTurn(view) {
  return view.currentId === view.you;
}
