// Gemeinsame Bausteine für Spiele mit Zug-Timer

export const TURN_TIME_SETTING = {
  key: 'turnTime', label: 'Zeit pro Zug', type: 'choice', values: [0, 30, 60], default: 0,
  describe: (seconds) => (seconds ? `${seconds} Sekunden` : 'unbegrenzt'),
};

const MAX_STEPS = 50;

// Läuft die Zeit ab, spielt der Bot den ganzen Zug zu Ende, damit die Uhr nicht bei jedem Schritt neu startet.
export function playOutTurn(state, playerId, { reduce, botMove }) {
  let current = state;
  for (let step = 0; step < MAX_STEPS; step++) {
    const move = botMove(current, playerId);
    if (!move) break;
    const result = reduce(current, { ...move, playerId });
    if (result.error) return result;
    current = result.state;
  }
  return current === state ? { state, error: 'Kein laufender Zug dieses Spielers' } : { state: current, error: null };
}
