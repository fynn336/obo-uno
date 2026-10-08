import { handleHangmanKey, renderHangman } from './hangman/ui/index.js';
import { handleKniffelKey, renderKniffel } from './kniffel/ui/index.js';
import { handleLudoKey, renderLudo } from './ludo/ui/index.js';
import { handleMaexchenKey, renderMaexchen } from './maexchen/ui/index.js';
import { renderMemory } from './memory/ui/index.js';
import { handleShipsKey, renderShips } from './ships/ui/index.js';
import { handleSketchKey, renderSketch } from './sketch/ui/index.js';
import { handleUnoKey, renderUno } from './uno/ui/index.js';

// Oberflächen der Spiele, getrennt von src/games/index.js, damit die Spiellogik ohne DOM auskommt.
// handleKey brauchen nur Spiele mit Tastatursteuerung.
export const GAME_UIS = {
  uno: { render: renderUno, handleKey: handleUnoKey },
  kniffel: { render: renderKniffel, handleKey: handleKniffelKey },
  ludo: { render: renderLudo, handleKey: handleLudoKey },
  maexchen: { render: renderMaexchen, handleKey: handleMaexchenKey },
  ships: { render: renderShips, handleKey: handleShipsKey },
  sketch: { render: renderSketch, handleKey: handleSketchKey },
  hangman: { render: renderHangman, handleKey: handleHangmanKey },
  memory: { render: renderMemory },
};
