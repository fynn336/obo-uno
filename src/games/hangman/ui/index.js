import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playEffect } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { ALPHABET, letterOf, MAX_MISSES, REVEAL_SECONDS } from '../game.js';

const SVG = 'http://www.w3.org/2000/svg';
// Teile des Galgens in der Reihenfolge, in der sie bei Fehlern erscheinen
const GALLOWS = [
  ['line', { x1: 20, y1: 210, x2: 140, y2: 210 }],
  ['line', { x1: 50, y1: 210, x2: 50, y2: 20 }],
  ['line', { x1: 50, y1: 20, x2: 140, y2: 20 }],
  ['line', { x1: 50, y1: 55, x2: 85, y2: 20 }],
  ['line', { x1: 140, y1: 20, x2: 140, y2: 50 }],
  ['circle', { cx: 140, cy: 70, r: 20 }],
  ['line', { x1: 140, y1: 90, x2: 140, y2: 150 }],
  ['path', { d: 'M110 115 L140 100 L170 115' }],
  ['line', { x1: 140, y1: 150, x2: 115, y2: 190 }],
  ['line', { x1: 140, y1: 150, x2: 165, y2: 190 }],
];
const HIT_SOUND_RATE = 1.4;
const MISS_SOUND_RATE = 0.6;

let latest = null;
let lastEventId = null;

export function renderHangman(root, view, send, abort) {
  const wasMyTurn = latest?.root.querySelector('.hangman') && isMyTurn(latest.view);
  latest = { root, view, send };
  const fresh = freshEvents(view);
  root.replaceChildren(
    h('div', { class: 'hangman' },
      h('header', { class: 'info' },
        abort && h('button', { type: 'button', class: 'leave-game', onClick: abort }, '← Lounge'),
        h('span', { class: 'turn' }, turnText(view)),
        h('span', {}, `Wort ${view.wordNumber} von ${view.wordCount}`)),
      h('div', { class: 'hangman-main' },
        h('section', { class: 'chalkboard' },
          h('div', { class: 'hm-top' }, gallows(view.misses), h('div', { class: 'hm-misses' }, `${view.misses} / ${MAX_MISSES}`)),
          h('div', { class: 'hm-word' }, view.masked.map((char) => h('span', { class: char === null ? 'hm-slot' : 'hm-slot shown' }, char ?? ''))),
          view.phase === 'reveal' && revealNote(view),
          keyboard(view),
          solveForm(view)),
        h('aside', { class: 'panel hangman-side' },
          h('ul', { class: 'maex-players' }, view.players.map((p) => h('li', { class: p.id === view.currentId ? 'current' : '' },
            avatarBadge(p), h('span', { class: 'name' }, p.id === view.you ? `${p.name} (du)` : p.name),
            h('span', { class: 'lives' }, String(p.score))))),
          h('p', { class: 'status' }, statusText(view)),
          view.turnEndsIn !== null && view.phase !== 'gameOver'
            && timerBar(view.phase === 'reveal' ? REVEAL_SECONDS : view.turnTime, view.turnEndsIn),
          h('ol', { class: 'event-log', 'aria-label': 'Verlauf' }, view.events.map((event) => h('li', {}, describe(event))))))),
  );
  announce(fresh);
  if (isMyTurn(view) && view.phase === 'guess' && !wasMyTurn) {
    alertTurn(() => latest.root.querySelector('.hangman') && isMyTurn(latest.view));
  }
}

// Buchstabentasten raten, solange man dran ist; im Lösungsfeld tippt man normal.
export function handleHangmanKey(event) {
  if (!latest || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
  const letter = letterOf(event.key);
  if (!ALPHABET.includes(letter) || !canGuess(latest.view) || latest.view.guessed.includes(letter)) return;
  latest.send({ type: 'letter', letter });
  event.preventDefault();
}

function gallows(misses) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 200 220');
  svg.setAttribute('class', 'gallows');
  svg.setAttribute('aria-label', `Galgen: ${misses} von ${MAX_MISSES} Teilen`);
  GALLOWS.slice(0, misses).forEach(([tag, attributes], i) => {
    const part = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attributes)) part.setAttribute(name, value);
    if (i === misses - 1) part.setAttribute('class', 'newest');
    svg.append(part);
  });
  return svg;
}

function keyboard(view) {
  const inWord = new Set(view.masked.filter((char) => char !== null).map(letterOf));
  return h('div', { class: 'hm-letters' }, ALPHABET.map((letter) => {
    const used = view.guessed.includes(letter);
    const state = used && (inWord.has(letter) ? 'hit' : 'miss');
    return h('button', {
      type: 'button',
      class: `hm-letter${state ? ` ${state}` : ''}`,
      disabled: used || !canGuess(view),
      onClick: () => latest.send({ type: 'letter', letter }),
    }, letter);
  }));
}

function solveForm(view) {
  if (!canGuess(view)) return null;
  const input = h('input', { placeholder: 'Ganzes Wort lösen …', maxlength: 40, autocomplete: 'off', 'aria-label': 'Lösung' });
  return h('form', { class: 'hm-solve', onSubmit: (event) => {
    event.preventDefault();
    if (input.value.trim()) latest.send({ type: 'solve', text: input.value });
  } }, input, h('button', { type: 'submit', class: 'primary' }, 'Lösen'));
}

function revealNote(view) {
  const solver = [...view.events].reverse().find((e) => e.type === 'solved');
  return h('p', { class: 'reveal-note' }, view.outcome === 'solved'
    ? `${solver?.player ?? ''} hat „${view.word}“ gelöst!`
    : `Der Galgen ist komplett – gesucht war „${view.word}“.`);
}

function turnText(view) {
  if (view.phase === 'gameOver') return 'Vorbei';
  if (view.phase === 'reveal') return 'Auflösung';
  return isMyTurn(view) ? 'Du bist am Zug' : `${currentPlayer(view).name} ist am Zug`;
}

function statusText(view) {
  if (view.phase !== 'guess') return 'Gleich kommt das nächste Wort …';
  if (isMyTurn(view)) return 'Buchstabe tippen oder das ganze Wort lösen';
  return `${currentPlayer(view).name} überlegt …`;
}

function describe(event) {
  if (event.type === 'letter') return `${event.player}: ${event.letter} – ${event.hits ? `${event.hits}× drin` : 'nicht drin'}`;
  if (event.type === 'wrongSolve') return `${event.player} versucht „${event.text}“ – falsch`;
  if (event.type === 'solved') return `${event.player} löst „${event.word}“ (+${event.points})`;
  if (event.type === 'hanged') return `Galgen komplett – es war „${event.word}“`;
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
    if (event.type === 'letter') playEffect('card', event.hits ? HIT_SOUND_RATE : MISS_SOUND_RATE);
    if (event.type === 'solved') showBanner(['Gelöst!', `${event.player} +${event.points}`]);
    if (event.type === 'hanged') showBanner(['Galgen komplett', event.word]);
  }
}

function canGuess(view) {
  return view.phase === 'guess' && isMyTurn(view);
}

function currentPlayer(view) {
  return view.players.find((p) => p.id === view.currentId);
}

function isMyTurn(view) {
  return view.currentId === view.you;
}
