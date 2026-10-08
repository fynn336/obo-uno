import { AVATAR_COLORS } from '../../../lounge/avatars.js';
import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playEffect } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { PEEK_SECONDS } from '../game.js';

const FLIP_SOUND_RATE = 1.2;
const PAIR_SOUND_RATE = 1.8;
const STREAK_BANNER = 3;
// Ab dieser Kartenzahl liegen 8 statt 6 Karten in einer Reihe
const WIDE_BOARD = 36;

let latest = null;
let lastEventId = null;

export function renderMemory(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.memory') && isMyTurn(latest.view);
  latest = { root, view, send };
  const fresh = freshEvents(view);
  const flipped = new Set(fresh.filter((e) => e.type === 'flip').map((e) => e.index));
  const left = view.cards.filter((card) => card.owner === null).length / 2;
  root.replaceChildren(
    h('div', { class: 'memory' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view)?.name ?? '…'} ist am Zug`),
        h('span', {}, `Noch ${left} ${left === 1 ? 'Paar' : 'Paare'}`)),
      h('div', { class: 'memory-main' },
        h('section', { class: `memory-table${view.cards.length > WIDE_BOARD ? ' wide' : ''}` },
          view.cards.map((card, index) => cardButton(view, card, index, flipped.has(index)))),
        h('aside', { class: 'panel memory-side' },
          h('ul', { class: 'maex-players' }, view.players.map((p) => h('li', { class: p.id === view.currentId ? 'current' : '' },
            avatarBadge(p), h('span', { class: 'name' }, p.id === view.you ? `${p.name} (du)` : p.name),
            h('span', { class: 'lives' }, `${p.pairs} ${p.pairs === 1 ? 'Paar' : 'Paare'}`)))),
          h('p', { class: 'status' }, statusText(view)),
          view.turnEndsIn !== null && view.phase !== 'gameOver'
            && timerBar(view.phase === 'peek' ? PEEK_SECONDS : view.turnTime, view.turnEndsIn),
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event))))))),
  );
  announce(fresh);
  if (isMyTurn(view) && !wasMyTurn) alertTurn(() => latest.root.querySelector('.memory') && isMyTurn(latest.view));
}

function cardButton(view, card, index, justFlipped) {
  const owner = view.players.find((p) => p.id === card.owner);
  const shown = card.motif !== null;
  const classes = ['mem-card', shown && 'shown', card.owner && 'claimed', justFlipped && 'flipping'];
  return h('button', {
    type: 'button',
    class: classes.filter(Boolean).join(' '),
    style: owner ? `--owner:${AVATAR_COLORS[owner.avatar.color]}` : null,
    disabled: shown || !canFlip(view),
    'aria-label': shown ? `Karte ${index + 1}: ${card.motif}` : `Karte ${index + 1}, verdeckt`,
    onClick: () => latest.send({ type: 'flip', index }),
  }, h('span', { class: 'mem-face' }, card.motif ?? ''));
}

function statusText(view) {
  if (view.phase === 'peek') return 'Kein Paar – gut merken!';
  if (!isMyTurn(view)) return `${currentPlayer(view)?.name ?? '…'} deckt auf …`;
  return view.open.length === 0 ? 'Deck eine Karte auf' : 'Und jetzt die zweite!';
}

function describe(event) {
  if (event.type === 'flip') return `${event.player} deckt ${event.motif} auf`;
  if (event.type === 'pair') return `${event.player} findet ein Paar ${event.motif}`;
  if (event.type === 'timeout') return `Zeit um für ${event.player}`;
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
    if (event.type === 'flip') playEffect('card', FLIP_SOUND_RATE);
    if (event.type === 'pair') playEffect('card', PAIR_SOUND_RATE);
    if (event.type === 'pair' && event.streak >= STREAK_BANNER) showBanner(['Serie!', `${event.player}: ${event.streak} Paare am Stück`]);
  }
}

function canFlip(view) {
  return isMyTurn(view) && view.phase === 'flip';
}

function currentPlayer(view) {
  return view.players.find((p) => p.id === view.currentId);
}

function isMyTurn(view) {
  return view.currentId === view.you;
}
