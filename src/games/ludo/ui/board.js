import { BASE, fieldOf, TRACK } from '../game.js';

// Brett mit 11 × 11 Zellen als [Spalte, Zeile]. Beschrieben ist das Viertel von Rot (links oben),
// die anderen Farben sind jeweils um 90° im Uhrzeigersinn gedreht.
const SIZE = 11;
const QUARTER = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0]];
const GOAL = [[1, 5], [2, 5], [3, 5], [4, 5]];
const HOUSE = [[0, 0], [1, 0], [0, 1], [1, 1]];
// Freie Ecke von Rot für Namensschild und Haus
const YARD = [[0, 0], [3, 3]];
export const CENTER = [5, 5];
export const COLORS = [0, 1, 2, 3];
// Ecke links unten, in der jeder seine eigene Farbe sieht
export const OWN_CORNER = 3;

export const TRACK_CELLS = COLORS.flatMap((color) => QUARTER.map((cell) => rotate(cell, color)));

export function goalCells(color) {
  return GOAL.map((cell) => rotate(cell, color));
}

export function houseCells(color) {
  return HOUSE.map((cell) => rotate(cell, color));
}

export function yardCells(color) {
  return YARD.map((cell) => rotate(cell, color));
}

// Zelle einer Figur; im Haus hat jede Figur ihren festen Platz.
export function cellOf(color, position, piece) {
  if (position === BASE) return houseCells(color)[piece];
  if (position < TRACK) return TRACK_CELLS[fieldOf(color, position)];
  return goalCells(color)[position - TRACK];
}

// Alle Zellen, über die eine Figur von from nach to läuft, ohne die Startzelle
export function pathCells(color, piece, from, to) {
  const start = from === BASE ? to : from + 1;
  return Array.from({ length: to - start + 1 }, (_, i) => cellOf(color, start + i, piece));
}

// CSS grid-area, die alle Zellen umfasst
export function area(...cells) {
  const columns = cells.map(([column]) => column);
  const rows = cells.map(([, row]) => row);
  return `grid-area: ${Math.min(...rows) + 1} / ${Math.min(...columns) + 1} / ${Math.max(...rows) + 2} / ${Math.max(...columns) + 2}`;
}

// Dreht eine Zelle um times × 90° im Uhrzeigersinn um die Brettmitte.
export function rotate(cell, times) {
  let [column, row] = cell;
  for (let i = 0; i < times; i++) [column, row] = [SIZE - 1 - row, column];
  return [column, row];
}
