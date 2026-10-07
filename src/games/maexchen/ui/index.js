import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playEffect } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { diePips } from '../../../ui/dice.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { isHigher, MAEXCHEN, valueLabel, valueOf, VALUES } from '../values.js';

let latest = null;
let lastEventId = null;

export function renderMaexchen(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.maexchen') && isMyTurn(latest.view);
  latest = { root, view, send };
  const fresh = freshEvents(view);
  const rolled = fresh.some((e) => e.type === 'roll');
  root.replaceChildren(
    h('div', { class: 'dice-game maexchen' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`)),
      h('div', { class: 'dice-board' },
        h('section', { class: 'dice-zone' },
          announcementPlate(view),
          h('div', { class: 'maex-table' }, cup(view, rolled), view.myDice && h('div', { class: 'dice' },
            view.myDice.map((face) => h('div', { class: `die${rolled ? ' rolling' : ''}` }, diePips(face))))),
          h('p', { class: 'status' }, statusText(view)),
          view.turnEndsIn !== null && timerBar(view.turnTime, view.turnEndsIn),
          actions(view)),
        h('aside', { class: 'maex-side panel' },
          h('ul', { class: 'maex-players' }, view.players.map((p) => playerRow(view, p))),
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event)))))),
    ),
  );
  announce(fresh);
  if (isMyTurn(view) && !wasMyTurn) alertTurn(() => latest.root.querySelector('.maexchen') && isMyTurn(latest.view));
}

export function handleMaexchenKey(event) {
  if (!latest || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.key !== ' ') return;
  roll();
  event.preventDefault();
}

// Tafel mit der letzten Ansage; nach dem Aufdecken stehen dort die echten Würfel.
function announcementPlate(view) {
  if (view.announced !== null) {
    const announcer = view.players.find((p) => p.id === view.announcerId);
    return h('div', { class: 'plate' },
      h('span', { class: 'hint' }, `${announcer.id === view.you ? 'Du hast' : `${announcer.name} hat`} angesagt`),
      h('strong', {}, valueLabel(view.announced)));
  }
  const reveal = view.events.at(-1)?.type === 'reveal' ? view.events.at(-1) : null;
  if (!reveal) return h('div', { class: 'plate' }, h('span', { class: 'hint' }, 'Neue Runde'), h('strong', {}, '–'));
  return h('div', { class: 'plate' },
    h('span', { class: 'hint' }, `Aufgedeckt: angesagt ${valueLabel(reveal.announced)}, gewürfelt`),
    h('strong', {}, valueLabel(valueOf(reveal.dice))));
}

function cup(view, rolled) {
  const canRoll = isMyTurn(view) && view.phase === 'roll';
  return h('button', {
    type: 'button',
    class: `cup${rolled ? ' shaking' : ''}${canRoll ? ' full' : ''}`,
    disabled: !canRoll,
    title: canRoll ? 'Würfeln (Leertaste)' : null,
    'aria-label': 'Würfeln',
    onClick: roll,
  }, h('span', { class: 'cup-label' }, view.phase === 'roll' ? '' : '?'));
}

function actions(view) {
  if (!isMyTurn(view)) return null;
  if (view.phase === 'roll') return h('div', { class: 'actions' }, button('Würfeln', roll, 'primary', 'Leertaste'));
  if (view.phase === 'decide') {
    const believeLabel = view.announced === MAEXCHEN ? 'Glauben – 1 Leben weg' : 'Glauben und selbst würfeln';
    return h('div', { class: 'actions' },
      button(believeLabel, () => latest.send({ type: 'believe' })),
      button('Aufdecken!', () => latest.send({ type: 'doubt' }), 'primary'));
  }
  // Ansagen: alle Werte über der letzten Ansage; der echte Wurf ist markiert.
  const truth = valueOf(view.myDice);
  return h('div', { class: 'values' }, VALUES.map((value) => h('button', {
    type: 'button',
    class: `value${value === truth ? ' truth' : ''}`,
    disabled: !isHigher(value, view.announced),
    title: value === truth ? 'Das ist dein echter Wurf' : 'Bluff',
    onClick: () => latest.send({ type: 'announce', value }),
  }, valueLabel(value))));
}

function button(label, onClick, classes = '', key = null) {
  return h('button', { type: 'button', class: classes, onClick }, label, key && h('kbd', {}, key));
}

function playerRow(view, player) {
  const out = player.lives === 0;
  return h('li', { class: `${player.id === view.currentId ? 'current' : ''}${out ? ' out' : ''}` },
    avatarBadge(player),
    h('span', { class: 'name' }, player.id === view.you ? `${player.name} (du)` : player.name),
    h('span', { class: 'lives' }, out ? 'raus' : '❤️'.repeat(player.lives)));
}

function statusText(view) {
  const name = currentPlayer(view).name;
  if (!isMyTurn(view)) {
    if (view.phase === 'roll') return `${name} schüttelt den Becher …`;
    if (view.phase === 'announce') return `${name} schaut unter den Becher …`;
    return `${name} überlegt: glauben oder aufdecken?`;
  }
  if (view.phase === 'roll') return view.announced === null ? 'Neue Runde – du beginnst!' : `Überbiete ${valueLabel(view.announced)}!`;
  if (view.phase === 'announce') return `Du hast ${valueLabel(valueOf(view.myDice))} – was sagst du an?`;
  return 'Glaubst du das?';
}

function describe(event) {
  if (event.type === 'roll') return `${event.player} würfelt`;
  if (event.type === 'announce') return `${event.player} sagt ${valueLabel(event.value)} an`;
  if (event.type === 'believe') return `${event.player} glaubt`;
  if (event.type === 'giveUp') return `${event.player} glaubt das Mäxchen und verliert ein Leben`;
  if (event.type === 'reveal') {
    const result = event.lied ? 'gelogen' : 'stimmt';
    return `${event.player} deckt auf: ${valueLabel(valueOf(event.dice))} – ${result}, ${event.loser} −${event.lost} ❤️`;
  }
  if (event.type === 'out') return `${event.player} ist raus`;
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
    if (event.type === 'reveal') {
      showBanner([event.lied ? 'Gelogen!' : 'Stimmt!', `${event.loser} verliert ${event.lost} ❤️`]);
    }
    if (event.type === 'out') showBanner(['Raus!', `${event.player} hat keine Leben mehr`]);
  }
}

function roll() {
  const { view } = latest;
  if (isMyTurn(view) && view.phase === 'roll') latest.send({ type: 'roll' });
}

function currentPlayer(view) {
  return view.players.find((p) => p.id === view.currentId);
}

function isMyTurn(view) {
  return view.currentId === view.you;
}
