import { awardsFor } from '../awards.js';
import { playOutTurn, TURN_TIME_SETTING } from '../turns.js';
import { botMove } from './bot.js';
import { createGame, reduce, viewFor } from './game.js';

export const ships = {
  id: 'ships',
  name: 'Schiffe versenken',
  icon: '🚢',
  description: 'Flotte verteilen, reihum aufs Meer der anderen schießen – bei einem Treffer darf man nochmal.',
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    'Ziel: als Letzter noch Schiffe im Wasser haben.',
    'Jeder hat fünf Schiffe mit 5, 4, 3, 3 und 2 Feldern, die sich nicht berühren, auch nicht über Eck.',
    'Vor dem Start Schiffe verschieben (ziehen) und drehen (antippen und R oder Doppelklick) oder alles neu verteilen lassen, dann „Bereit!“.',
    'Reihum schießt man auf ein Feld im Meer eines Gegners. Treffer: noch einmal schießen. Wasser: Der Nächste ist dran.',
    'Fremde Schiffe sieht man erst, wenn sie versenkt sind. Wessen Flotte komplett versenkt ist, scheidet aus.',
  ],
  settings: [TURN_TIME_SETTING],
  moves: {
    shuffleFleet: {},
    placeShip: { index: 'number', x: 'number', y: 'number', across: 'boolean' },
    ready: {},
    shoot: { targetId: 'string', x: 'number', y: 'number' },
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  botMove,
  timeout: (state, playerId) => playOutTurn(state, playerId, { reduce, botMove }),

  // Die Uhr läuft nur beim Schießen; jeder Schuss startet sie neu.
  timer(state) {
    if (state.phase !== 'playing' || state.turnTime === 0) return null;
    return { key: String(state.turnNumber), playerId: state.players[state.current].id, seconds: state.turnTime };
  },

  // Sieger ist, wessen Flotte übrig bleibt; danach zählt, wer später untergegangen ist.
  result(state) {
    if (state.phase !== 'gameOver') return null;
    const afloat = state.players.filter((p) => !state.out.includes(p.id));
    const sunkLast = [...state.out].reverse().map((id) => state.players.find((p) => p.id === id)).filter(Boolean);
    const ranking = [...afloat, ...sunkLast].map((p, i) => ({
      playerId: p.id,
      place: i < afloat.length ? 1 : i + 1,
      detail: `${p.hits} Treffer`,
    }));
    return { ranking, awards: awardsFor(state.players, AWARDS) };
  },
};

const AWARDS = [
  { icon: '🎯', title: 'Scharfschütze', count: (p) => p.hits, describe: (n) => `${n} Treffer` },
  { icon: '💣', title: 'Versenker', count: (p) => p.sinks, describe: (n) => `${n} Schiffe versenkt` },
];
