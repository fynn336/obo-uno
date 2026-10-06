export const COLORS = ['red', 'yellow', 'green', 'blue'];

const DOUBLE_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

export function createDeck() {
  const cards = [];
  for (const color of COLORS) {
    cards.push({ color, value: '0' });
    for (const value of DOUBLE_VALUES) cards.push({ color, value }, { color, value });
  }
  for (let i = 0; i < 4; i++) cards.push({ color: null, value: 'wild' }, { color: null, value: 'wild4' });
  return cards.map((card, id) => ({ id, ...card }));
}

export function isPlayable(card, topCard, activeColor) {
  return card.color === null || card.color === activeColor || card.value === topCard.value;
}
