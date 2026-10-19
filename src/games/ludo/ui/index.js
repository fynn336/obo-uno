import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playEffect } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { diePips } from '../../../ui/dice.js';
import { h } from '../../../ui/dom.js';
import { backButton } from '../../../ui/shell.js';
import { timerBar } from '../../../ui/timer.js';
import { BASE, fieldOf } from '../game.js';
import { boardLayout, cellKey, pathKeys, rotate, startColor, turnFor } from './board.js';

const COLOR_NAMES = ['Rot', 'Blau', 'Grün', 'Gelb', 'Orange', 'Lila'];
// Größen in Feldbreiten
const FIELD_SIZE = 0.84;
const PIECE_SIZE = 0.95;
const YARD_SIZE = 3;
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
  const boardElement = board(view, rolled);
  root.replaceChildren(
    h('div', { class: 'ludo' },
      h('header', { class: 'info' },
        backButton(abort),
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
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(view, event))))))),
  );
  animateMove(view, boardElement, lastMove);
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

// Das Brett ist so gedreht, dass die eigene Farbe links unten liegt.
function board(view, rolled) {
  const layout = boardLayout(view.colors);
  const me = view.players.find((p) => p.id === view.you);
  const turn = turnFor(layout, me.color);
  const spot = (point, size, extra = '') => {
    const [x, y] = rotate(point, turn);
    return `left:${50 + (x / layout.extent) * 50}%;top:${50 + (y / layout.extent) * 50}%;--s:${size}${extra}`;
  };
  const used = new Map(view.players.map((p) => [p.color, p]));
  const current = currentPlayer(view);
  const colors = Array.from({ length: view.colors }, (_, color) => color);
  const field = (point, key, classes, extra = '') => h('div', {
    class: `spot field ${classes}`, style: spot(point, FIELD_SIZE, extra), 'data-cell': key,
  });
  const dieSize = Math.min(1.6, 2 * layout.inner - 1);
  return h('div', { class: 'ludo-board', style: `--u:${50 / layout.extent}%` },
    colors.map((color) => {
      const owner = used.get(color);
      const classes = ['spot yard', `team-${color}`, !owner && 'unused', owner === current && 'current'];
      return h('div', { class: classes.filter(Boolean).join(' '), style: spot(layout.yards[color], YARD_SIZE) });
    }),
    colors.map((color) => used.get(color) && h('span', { class: 'spot yard-name', style: spot(layout.labels[color], 0) },
      avatarBadge(used.get(color)), used.get(color).id === view.you ? 'Du' : used.get(color).name)),
    layout.track.map((point, index) => {
      const owner = startColor(index);
      if (owner === null) return field(point, `t${index}`, '');
      const next = layout.track[(index + 1) % layout.track.length];
      const arrow = `;--arrow:${arrowAngle(rotate(point, turn), rotate(next, turn))}deg`;
      return field(point, `t${index}`, `start team-${owner}`, arrow);
    }),
    colors.flatMap((color) => layout.goals[color].map((point, i) => field(point, `g${color}-${i}`, `goal team-${color}`,
      `;--depth:${i}`))),
    colors.flatMap((color) => layout.houses[color].map((point, i) => field(point, `h${color}-${i}`, `house team-${color}`))),
    h('div', { class: `spot board-center team-${current.color}`, style: spot([0, 0], dieSize) },
      h('button', {
        type: 'button',
        class: `die${rolled ? ' rolling' : ''}${view.die ? '' : ' idle'}`,
        disabled: !canRoll(view),
        title: canRoll(view) ? 'Würfeln (Leertaste)' : null,
        'aria-label': view.die ? `Würfel: ${view.die}` : 'Würfel',
        onClick: roll,
      }, diePips(view.die ?? 6))),
    view.players.flatMap((p) => p.pieces.map((position, piece) => pawn(view, p, position, piece, layout, spot))));
}

// Klassische Spielfigur mit Kopf und Körper; eigene Figuren tragen ihre Nummer für die Tasten 1–4.
function pawn(view, player, position, piece, layout, spot) {
  const mine = player.id === view.you;
  const movable = mine && isMyTurn(view) && view.movable.includes(piece);
  return h('button', {
    type: 'button',
    class: `spot piece team-${player.color}${movable ? ' movable' : ''}`,
    style: spot(pointOf(view, layout, player.color, position, piece), PIECE_SIZE),
    'data-color': player.color,
    'data-piece': piece,
    disabled: !movable,
    title: movable ? `Figur ${piece + 1} ziehen (${piece + 1})` : null,
    'aria-label': `${player.name}, Figur ${piece + 1}${position === BASE ? ' im Haus' : ''}`,
    onClick: () => move(piece),
  }, h('span', {}, mine ? String(piece + 1) : ''));
}

function pointOf(view, layout, color, position, piece) {
  if (position === BASE) return layout.houses[color][piece];
  if (position < view.track) return layout.track[fieldOf(view, color, position)];
  return layout.goals[color][position - view.track];
}

// Die Figur hüpft Feld für Feld; eine geschlagene Figur fliegt danach zurück ins Haus.
function animateMove(view, boardElement, event) {
  if (!event || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pieceOf = (color, piece) => boardElement.querySelector(`.piece[data-color="${color}"][data-piece="${piece}"]`);
  const centerOf = (key) => {
    const rect = boardElement.querySelector(`[data-cell="${key}"]`).getBoundingClientRect();
    return [rect.left + rect.width / 2, rect.top + rect.height / 2];
  };
  const keys = [cellKey(view, event.color, event.from, event.piece),
    ...pathKeys(view, event.color, event.piece, event.from, event.to)];
  const points = keys.map(centerOf);
  const [endX, endY] = points.at(-1);
  const walker = pieceOf(event.color, event.piece);
  walker.classList.add('walking');
  hop(walker, points.map(([x, y]) => [x - endX, y - endY]), { stepMs: STEP_MS, height: HOP_PX, delay: 0 });
  if (event.victim === null) return;
  const [homeX, homeY] = centerOf(cellKey(view, event.victimColor, BASE, event.victimPiece));
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

function arrowAngle([x, y], [nextX, nextY]) {
  return Math.round((Math.atan2(nextY - y, nextX - x) * 180) / Math.PI);
}

function playerRow(view, player) {
  const inGoal = player.pieces.filter((position) => position >= view.track).length;
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

function describe(view, event) {
  if (event.type === 'roll') return `${event.player} würfelt ${event.face}${event.stuck ? ' – kein Zug möglich' : ''}`;
  if (event.type === 'move') {
    if (event.victim) return `${event.player} wirft ${event.victim} raus`;
    if (event.from === BASE) return `${event.player} kommt raus`;
    if (event.to >= view.track && event.from < view.track) return `${event.player} zieht ins Ziel`;
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
