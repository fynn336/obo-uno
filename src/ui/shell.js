import { h } from './dom.js';
import { icon } from './icons.js';

// Gemeinsame Bausteine aller Spieloberflächen.

// Zurück in die Lounge; nur der Host bekommt abort und damit den Knopf.
export function backButton(abort) {
  return abort ? h('button', { type: 'button', class: 'leave-game', onClick: abort }, icon('back'), 'Lounge') : null;
}
