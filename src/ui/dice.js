import { h } from './dom.js';

// Positionen der Augen im 3×3-Raster
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export function diePips(face) {
  return Array.from({ length: 9 }, (_, cell) => h('span', { class: PIPS[face].includes(cell) ? 'pip' : '' }));
}
