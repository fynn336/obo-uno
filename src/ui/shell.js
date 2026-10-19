import { avatarBadge } from './avatar.js';
import { h } from './dom.js';
import { icon } from './icons.js';

// Gemeinsamer Rahmen aller Spieloberflächen: Kopfzeile, Seitenleiste mit Spielern und Verlauf.

// Zurück in die Lounge; nur der Host bekommt abort und damit den Knopf.
export function backButton(abort) {
  return abort ? h('button', { type: 'button', class: 'leave-game', onClick: abort }, icon('back'), 'Lounge') : null;
}

// Kopfzeile: Zurück, wer dran ist (mit Avatar), dazu Angaben wie Runde oder Ziel (Text oder fertige Elemente).
export function gameHeader({ abort, player = null, turn, facts = [] }) {
  return h('header', { class: 'info' },
    backButton(abort),
    h('span', { class: 'turn' }, player && avatarBadge(player), turn),
    facts.filter(Boolean).map((fact) => (fact instanceof Node ? fact : h('span', { class: 'fact' }, fact))));
}

// „Du bist am Zug“ oder „Anna ist am Zug“; verb ersetzt „ist am Zug“ (z. B. „zeichnet“).
export function turnText(view, player, { mine = 'Du bist am Zug', verb = 'ist am Zug' } = {}) {
  if (!player) return '…';
  return player.id === view.you ? mine : `${player.name} ${verb}`;
}

export function sidePanel(...children) {
  return h('aside', { class: 'panel game-side' }, children);
}

// Spieler mit Avatar und einer Angabe rechts (Punkte, Leben …); lead steht vor dem Avatar.
export function playerList(view, players, detail, { current = view.currentId, classOf = () => '', lead = () => null } = {}) {
  return h('ul', { class: 'player-list' }, players.map((p) => h('li', {
    class: [p.id === current && 'current', classOf(p)].filter(Boolean).join(' '),
  },
  lead(p),
  avatarBadge(p),
  h('span', { class: 'name' }, p.id === view.you ? `${p.name} (du)` : p.name),
  h('span', { class: 'detail' }, detail(p)))));
}

export function eventLog(events, describe) {
  return h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, events.map((event) => h('li', {}, describe(event))));
}
