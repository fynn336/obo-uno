import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playCardSound } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { diePips } from '../../../ui/dice.js';
import { h } from '../../../ui/dom.js';
import { BASE, TRACK } from '../game.js';
import { area, CENTER, cellOf, COLORS, goalCells, houseCells, TRACK_CELLS, yardArea } from './board.js';

const COLOR_NAMES = ['Rot', 'Blau', 'Grün', 'Gelb'];
const ROLL_SOUND_RATE = 0.75;
const MOVE_SOUND_RATE = 1.3;

let latest = null;
let lastEventId = null;

export function renderLudo(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.ludo') && isMyTurn(latest.view);
  latest = { root, view, send };
  const fresh = freshEvents(view);
  const lastMove = fresh.findLast((e) => e.type === 'move');
  const rolled = fresh.some((e) => e.type === 'roll');
  root.replaceChildren(
    h('div', { class: 'ludo' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`)),
      h('div', { class: 'ludo-main' },
        board(view, lastMove),
        h('aside', { class: 'ludo-side panel' },
          h('ul', { class: 'ludo-players' }, view.players.map((p) => playerRow(view, p))),
          h('div', { class: `die ludo-die${rolled ? ' rolling' : ''}${view.die ? '' : ' idle'}` }, diePips(view.die ?? 6)),
          h('p', { class: 'status' }, statusText(view)),
          h('button', {
            type: 'button',
            class: 'primary',
            disabled: !canRoll(view),
            onClick: roll,
          }, 'Würfeln', h('kbd', {}, 'Leertaste')),
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event))))))),
  );
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

function board(view, lastMove) {
  const used = new Map(view.players.map((p) => [p.color, p]));
  const cells = (list, classes) => list.map((cell) => h('div', { class: classes, style: area(cell) }));
  return h('div', { class: 'ludo-board' },
    COLORS.map((color) => {
      const owner = used.get(color);
      return h('div', { class: `yard team-${color}${owner ? '' : ' unused'}`, style: yardArea(color) },
        owner && h('span', { class: 'yard-name' }, avatarBadge(owner), owner.id === view.you ? 'Du' : owner.name));
    }),
    TRACK_CELLS.map((cell, field) => h('div', {
      class: field % (TRACK / 4) === 0 ? `field start team-${field / (TRACK / 4)}` : 'field',
      style: area(cell),
    })),
    COLORS.flatMap((color) => cells(goalCells(color), `field goal team-${color}`)),
    COLORS.flatMap((color) => cells(houseCells(color), `field house team-${color}`)),
    h('div', { class: `center team-${currentPlayer(view).color}`, style: area(CENTER) }),
    view.players.flatMap((p) => p.pieces.map((position, piece) => pieceButton(view, p, position, piece, lastMove))));
}

function pieceButton(view, player, position, piece, lastMove) {
  const mine = player.id === view.you;
  const movable = mine && isMyTurn(view) && view.movable.includes(piece);
  const moved = lastMove && lastMove.color === player.color && lastMove.piece === piece;
  return h('button', {
    type: 'button',
    class: `piece team-${player.color}${movable ? ' movable' : ''}${moved ? ' moved' : ''}`,
    style: area(cellOf(player.color, position, piece)),
    disabled: !movable,
    title: movable ? `Figur ${piece + 1} ziehen (${piece + 1})` : null,
    'aria-label': `${player.name}, Figur ${piece + 1}${position === BASE ? ' im Haus' : ''}`,
    onClick: () => move(piece),
  }, mine ? String(piece + 1) : '');
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
    if (event.type === 'roll') playCardSound(ROLL_SOUND_RATE);
    if (event.type === 'move') playCardSound(MOVE_SOUND_RATE);
    if (event.type === 'move' && event.victim) showBanner(['Rausgeworfen!', `${event.player} schlägt ${event.victim}`]);
    if (event.type === 'finished') showBanner([`${event.player} ist im Ziel`, `Platz ${event.place}`]);
  }
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
