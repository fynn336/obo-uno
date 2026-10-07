import { isRunning } from '../game.js';
import { renderRound } from './round.js';
import { handleTableKey, renderTable } from './table.js';

export function renderUno(root, view, send, abort) {
  if (view.phase === 'roundOver') renderRound(root, view, send, abort);
  else renderTable(root, view, send, abort);
}

export function handleUnoKey(event, view) {
  if (isRunning(view)) handleTableKey(event);
}
