import { uno } from './uno/index.js';

// Alle Spiele der Lounge, in der Reihenfolge, in der sie angezeigt werden
export const GAMES = Object.fromEntries([uno].map((game) => [game.id, game]));
