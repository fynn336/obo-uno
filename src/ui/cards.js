import { h } from './dom.js';

export const COLOR_NAMES = { red: 'Rot', yellow: 'Gelb', green: 'Grün', blue: 'Blau' };

const SYMBOLS = { skip: '⊘', reverse: '⇄', draw2: '+2', wild: '', wild4: '+4' };
const VALUE_NAMES = { skip: 'Aussetzen', reverse: 'Richtungswechsel', draw2: '+2', wild: 'Farbwahl', wild4: 'Farbwahl +4' };

function cardLabel(card) {
  const value = VALUE_NAMES[card.value] ?? card.value;
  return card.color ? `${COLOR_NAMES[card.color]} ${value}` : value;
}

export function cardFace(card, { classes = '', onClick, title } = {}) {
  const symbol = SYMBOLS[card.value] ?? card.value;
  return h(
    'button',
    { class: `card ${card.color ?? 'wild'} ${classes}`, 'aria-label': cardLabel(card), title, onClick, type: 'button' },
    h('span', { class: 'corner top' }, symbol),
    h('span', { class: 'oval' }, h('span', { class: 'symbol' }, symbol)),
    h('span', { class: 'corner bottom' }, symbol),
  );
}

export function cardBack({ onClick, title }) {
  return h(
    'button',
    { class: 'card back', 'aria-label': title, title, onClick, type: 'button' },
    h('span', { class: 'oval' }, h('span', { class: 'symbol' }, 'UNO')),
  );
}
