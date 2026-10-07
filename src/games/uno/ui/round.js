import { avatarBadge } from '../../../ui/avatar.js';
import { throwConfetti } from '../../../ui/confetti.js';
import { h } from '../../../ui/dom.js';

let celebratedEventId = null;

// Zwischenstand nach einer Runde; die Partie geht weiter, bis jemand das Punkteziel erreicht.
export function renderRound(root, view, send, abort) {
  const win = view.events.findLast((event) => event.type === 'win');
  const isNew = win && win.id !== celebratedEventId;
  const players = [...view.players].sort((a, b) => a.cardCount - b.cardCount);
  root.replaceChildren(
    h('div', { class: 'page' },
      win && h('div', { class: isNew ? 'winner fresh' : 'winner' },
        h('strong', {}, `🏆 ${win.player} gewinnt die Runde`),
        h('span', {}, win.points > 0 ? `+${win.points} Punkte` : 'Keine Punkte – die Runde endete durch einen Rauswurf')),
      h('section', { class: 'panel' },
        h('h2', {}, `Zwischenstand · Partie gewonnen bei ${view.target} Punkten`),
        h('ol', { class: 'lobby-players' }, players.map((p) => h('li', {},
          avatarBadge(p),
          h('span', { class: 'name' }, p.name),
          h('span', { class: 'hint' }, remainingCards(p)),
          h('span', { class: 'score' }, `${p.score} P.`))))),
      view.you === view.hostId
        ? h('div', { class: 'buttons' },
          h('button', { class: 'primary big', type: 'button', onClick: () => send({ type: 'nextRound' }) }, 'Nächste Runde'),
          h('button', { type: 'button', onClick: abort }, '← Partie beenden'))
        : h('p', { class: 'hint' }, 'Warte, bis der Host die nächste Runde startet …'),
    ),
  );
  if (isNew) {
    celebratedEventId = win.id;
    throwConfetti();
  }
}

function remainingCards(player) {
  if (player.cardCount === 0) return 'fertig';
  return `${player.cardCount} ${player.cardCount === 1 ? 'Karte' : 'Karten'} · ${player.handPoints} P.`;
}
