import { alivePlayers, key, SIZE } from './game.js';

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Der Bot nutzt nur, was alle sehen: Treffer, Fehlschüsse und versenkte Schiffe.
export function botMove(state, botId) {
  const bot = state.players.find((p) => p.id === botId);
  if (state.phase === 'setup') return bot.ready ? null : { type: 'ready' };
  if (state.phase !== 'playing' || state.players[state.current].id !== botId) return null;
  const opponents = alivePlayers(state).filter((p) => p !== bot);
  // Angeschossene Schiffe zuerst fertig machen
  for (const target of opponents) {
    const cell = finishingShot(target);
    if (cell) return shot(target, cell);
  }
  const target = opponents.reduce((best, p) => (unsunk(p) < unsunk(best) ? p : best));
  const free = openCells(target);
  const checkerboard = free.filter(([x, y]) => (x + y) % 2 === 0);
  const choices = checkerboard.length > 0 ? checkerboard : free;
  return shot(target, choices[(state.turnNumber * 7 + state.events.length * 13) % choices.length]);
}

function shot(target, [x, y]) {
  return { type: 'shoot', targetId: target.id, x, y };
}

// Feld neben einem Treffer, der noch zu keinem versenkten Schiff gehört; liegen Treffer in einer Reihe,
// geht es entlang der Reihe weiter.
function finishingShot(target) {
  const sunkCells = new Set(target.ships.filter((s) => s.sunk).flatMap((s) => s.cells.map(([x, y]) => key(x, y))));
  const openHits = Object.entries(target.shots)
    .filter(([cell, result]) => result === 'hit' && !sunkCells.has(cell))
    .map(([cell]) => cell.split(',').map(Number));
  if (openHits.length === 0) return null;
  const isHit = (x, y) => openHits.some(([hx, hy]) => hx === x && hy === y);
  const free = new Set(openCells(target).map(([x, y]) => key(x, y)));
  for (const [x, y] of openHits) {
    const inLine = NEIGHBORS.filter(([dx, dy]) => isHit(x + dx, y + dy) || isHit(x - dx, y - dy));
    for (const [dx, dy] of inLine.length > 0 ? inLine : NEIGHBORS) {
      if (free.has(key(x + dx, y + dy))) return [x + dx, y + dy];
    }
  }
  return null;
}

// Noch nicht beschossene Felder, ohne die Nachbarn versenkter Schiffe (Schiffe berühren sich nie).
function openCells(target) {
  const empty = new Set();
  for (const ship of target.ships.filter((s) => s.sunk)) {
    for (const [x, y] of ship.cells) {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) empty.add(key(x + dx, y + dy));
    }
  }
  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!target.shots[key(x, y)] && !empty.has(key(x, y))) cells.push([x, y]);
    }
  }
  return cells;
}

function unsunk(player) {
  return player.ships.filter((s) => !s.sunk).length;
}
