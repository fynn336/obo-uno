import { BASE, fieldOf, TRACK } from '../game.js';

// Brett mit 11 × 11 Zellen als [Spalte, Zeile]. Beschrieben ist das Viertel von Rot (links oben),
// die anderen Farben sind jeweils um 90° im Uhrzeigersinn gedreht.
const SIZE = 11;
const QUARTER = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0]];
const GOAL = [[1, 5], [2, 5], [3, 5], [4, 5]];
const HOUSE = [[0, 0], [1, 0], [0, 1], [1, 1]];
// Freie Ecke von Rot für Namensschild und Haus
const YARD = { from: [0, 0], to: [3, 3] };
export const CENTER = [5, 5];
export const COLORS = [0, 1, 2, 3];

export const TRACK_CELLS = COLORS.flatMap((color) => QUARTER.map((cell) => rotate(cell, color)));

export function goalCells(color) {
  return GOAL.map((cell) => rotate(cell, color));
}

export function houseCells(color) {
  return HOUSE.map((cell) => rotate(cell, color));
}

export function yardArea(color) {
  const [a, b] = [rotate(YARD.from, color), rotate(YARD.to, color)];
  return area([Math.min(a[0], b[0]), Math.min(a[1], b[1])], [Math.max(a[0], b[0]), Math.max(a[1], b[1])]);
}

// Zelle einer Figur; im Haus hat jede Figur ihren festen Platz.
export function cellOf(color, position, piece) {
  if (position === BASE) return houseCells(color)[piece];
  if (position < TRACK) return TRACK_CELLS[fieldOf(color, position)];
  return goalCells(color)[position - TRACK];
}

// CSS grid-area für eine Zelle oder einen Bereich
export function area([column, row], [toColumn, toRow] = [column, row]) {
  return `grid-area: ${row + 1} / ${column + 1} / ${toRow + 2} / ${toColumn + 2}`;
}

function rotate(cell, times) {
  let [column, row] = cell;
  for (let i = 0; i < times; i++) [column, row] = [SIZE - 1 - row, column];
  return [column, row];
}
