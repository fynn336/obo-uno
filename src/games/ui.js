import { handleKniffelKey, renderKniffel } from './kniffel/ui/index.js';
import { handleLudoKey, renderLudo } from './ludo/ui/index.js';
import { handleMaexchenKey, renderMaexchen } from './maexchen/ui/index.js';
import { handleUnoKey, renderUno } from './uno/ui/index.js';

// Oberflächen der Spiele, getrennt von src/games/index.js, damit die Spiellogik ohne DOM auskommt
export const GAME_UIS = {
  uno: { render: renderUno, handleKey: handleUnoKey },
  kniffel: { render: renderKniffel, handleKey: handleKniffelKey },
  ludo: { render: renderLudo, handleKey: handleLudoKey },
  maexchen: { render: renderMaexchen, handleKey: handleMaexchenKey },
};
