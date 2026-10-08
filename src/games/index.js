import { hangman } from './hangman/index.js';
import { kniffel } from './kniffel/index.js';
import { ludo } from './ludo/index.js';
import { maexchen } from './maexchen/index.js';
import { memory } from './memory/index.js';
import { ships } from './ships/index.js';
import { sketch } from './sketch/index.js';
import { uno } from './uno/index.js';

// Alle Spiele der Lounge, in der Reihenfolge, in der sie angezeigt werden
const ORDER = [uno, kniffel, ludo, maexchen, ships, sketch, hangman, memory];
export const GAMES = Object.fromEntries(ORDER.map((game) => [game.id, game]));
