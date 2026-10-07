import { gameAwards } from './awards.js';
import { botAction } from './bot.js';
import { createGame, handPoints, isRunning, reduce } from './game.js';
import { viewFor } from './view.js';
import { TURN_TIME_SETTING } from '../turns.js';

// Uno heißt in der Lounge „Farbenchaos“; im Spiel selbst bleibt es Uno.
export const uno = {
  id: 'uno',
  name: 'Farbenchaos',
  icon: '🃏',
  description: 'Karten nach Farbe oder Zahl ablegen – wer zuerst keine mehr hat, gewinnt die Runde.',
  minPlayers: 2,
  maxPlayers: 8,
  rules: [
    'Ziel: als Erster alle Karten loswerden. Der Rundensieger bekommt die Punkte der Karten, die die anderen noch auf der Hand haben (Zahlen = Augenwert, Aktionskarten 20, Farbwahl 50). Wer das Punkteziel erreicht, gewinnt die Partie.',
    'Eine Karte passt, wenn Farbe oder Wert gleich sind. Farbwahl-Karten passen immer.',
    'Wer nicht legen kann oder will, zieht eine Karte. Passt sie, darf man genau diese sofort legen.',
    'Aussetzen (⊘): Der Nächste setzt aus. Richtungswechsel (⇄): Die Reihenfolge dreht sich. +2: Der Nächste zieht 2 und setzt aus. Farbwahl +4: Der Nächste zieht 4 und setzt aus.',
    'Mit 2 Karten auf der Hand ruft man beim Legen UNO (Taste U). Wer es vergisst, kann von allen „Erwischt!“ werden und zieht 2 Karten.',
    'Hausregeln, wenn der Host sie einschaltet: +2 und +4 stapeln, ein +4 anfechten, ziehen bis eine Karte passt, Reinwerfen mit genau der gleichen Karte, 7-0 (7 = Karten tauschen, 0 = alle Hände wandern weiter).',
    'Tasten: ← → Karte wählen, Enter legen, Leertaste ziehen, U für UNO, die Buchstaben im Farbrad für die Farbwahl.',
  ],
  settings: [
    { key: 'stacking', label: 'Stapeln von +2/+4', type: 'toggle', default: false },
    { key: 'challenge', label: 'Wild-+4-Anfechtung', type: 'toggle', default: false },
    { key: 'drawUntilPlayable', label: 'Ziehen bis spielbar', type: 'toggle', default: false },
    { key: 'jumpIn', label: 'Reinwerfen', type: 'toggle', default: false },
    { key: 'sevenZero', label: '7-0: tauschen und weitergeben', type: 'toggle', default: false },
    {
      key: 'deck', label: 'Kartendesign', type: 'choice', values: ['classic', 'bloom'], default: 'classic',
      describe: (deck) => (deck === 'bloom' ? 'Blütenzauber' : 'Klassisch'),
    },
    {
      key: 'target', label: 'Partie gewonnen bei', type: 'choice', values: [200, 300, 500], default: 500,
      describe: (points) => `${points} Punkten`,
    },
    TURN_TIME_SETTING,
  ],
  moves: {
    play: { cardId: 'number' },
    chooseColor: { color: 'string' },
    swapHands: { targetId: 'string' },
    draw: {},
    pass: {},
    challenge: {},
    callUno: {},
    catchUno: { targetId: 'string' },
    nextRound: {},
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  timeout: (state, playerId) => reduce(state, { type: 'timeout', playerId }),
  botMove: botAction,

  // Ergebnis nach Partieende: zuerst nach Punkten, bei Gleichstand gewinnt, wer weniger Restpunkte auf der Hand hat.
  result(state) {
    if (state.phase !== 'gameOver') return null;
    const compare = (a, b) => b.score - a.score || handPoints(a.hand) - handPoints(b.hand);
    const sorted = [...state.players].sort(compare);
    const ranking = sorted.map((p) => ({
      playerId: p.id,
      place: sorted.findIndex((other) => compare(other, p) === 0) + 1,
      detail: p.hand.length === 0 ? `${p.score} Punkte` : `${p.score} Punkte · ${handPoints(p.hand)} Restpunkte`,
    }));
    return { ranking, awards: gameAwards(state.players) };
  },

  timer(state) {
    if (!isRunning(state) || state.turnTime === 0) return null;
    const current = state.players[state.current];
    return {
      key: `${state.turnNumber}|${state.phase}|${state.drawnCardId}|${current.id}`,
      playerId: current.id,
      seconds: state.turnTime,
    };
  },
};
