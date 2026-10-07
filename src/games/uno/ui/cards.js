import { h } from '../../../ui/dom.js';

// Jedes Kartendesign benennt die vier Farben selbst und hat eigene Tasten für die Farbwahl.
const DECKS = {
  classic: {
    names: { red: 'Rot', yellow: 'Gelb', green: 'Grün', blue: 'Blau' },
    keys: { r: 'red', y: 'yellow', g: 'green', b: 'blue' },
  },
  bloom: {
    names: { red: 'Lila', yellow: 'Orange', green: 'Grün', blue: 'Türkis' },
    keys: { l: 'red', o: 'yellow', g: 'green', t: 'blue' },
  },
};

let deck = DECKS.classic;

// Der Tisch setzt das Design der laufenden Partie, bevor er Karten und Texte baut.
export function useDeck(id) {
  deck = DECKS[id] ?? DECKS.classic;
}

export function colorName(color) {
  return deck.names[color];
}

export function colorKeys() {
  return deck.keys;
}

const SYMBOLS = { skip: '⊘', reverse: '⇄', draw2: '+2', wild: '', wild4: '+4' };
const VALUE_NAMES = { skip: 'Aussetzen', reverse: 'Richtungswechsel', draw2: '+2', wild: 'Farbwahl', wild4: 'Farbwahl +4' };

export function cardLabel(card) {
  const value = VALUE_NAMES[card.value] ?? card.value;
  return card.color ? `${colorName(card.color)} ${value}` : value;
}

export function cardFace(card, { classes = '', ...props } = {}) {
  const symbol = SYMBOLS[card.value] ?? card.value;
  return h(
    'button',
    { class: `card ${card.color ?? 'wild'} ${classes}`, 'aria-label': cardLabel(card), 'data-card': card.id, type: 'button', ...props },
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
