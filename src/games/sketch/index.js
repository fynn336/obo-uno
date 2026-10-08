import { awardsFor } from '../awards.js';
import { createGame, phaseSeconds, reduce, viewFor } from './game.js';

export const sketch = {
  id: 'sketch',
  name: 'Montagsmaler',
  icon: '🎨',
  description: 'Einer zeichnet, alle raten – wer das Wort zuerst errät, bekommt die meisten Punkte.',
  minPlayers: 2,
  maxPlayers: 8,
  // Computer-Gegner können weder zeichnen noch raten; sie warten in der Lounge.
  bots: false,
  rules: [
    'Reihum zeichnet jeder ein Bild. Wer dran ist, wählt eins von drei Wörtern und zeichnet es – ohne Buchstaben und Zahlen.',
    'Alle anderen raten, indem sie Wörter eintippen, so oft sie wollen. Groß- und Kleinschreibung und Umlaute sind egal.',
    'Wer zuerst richtig rät, bekommt 10 Punkte, dann 8, 6 und danach je 5. Der Zeichner bekommt 3 Punkte für jeden, der es errät.',
    'Knapp daneben (ein Buchstabe falsch)? Das verrät dir ein Hinweis, den nur du siehst.',
    'Wer es erraten hat, kann weiter schreiben – das sehen dann nur der Zeichner und die anderen, die es schon wissen.',
    'Das Bild endet, wenn alle es erraten haben oder die Zeit abläuft. Nach allen Runden gewinnt, wer die meisten Punkte hat.',
  ],
  settings: [
    { key: 'rounds', label: 'Runden', type: 'choice', values: [1, 2, 3], default: 2, describe: (n) => `${n} × jeder zeichnet` },
    { key: 'drawTime', label: 'Zeit pro Bild', type: 'choice', values: [60, 80, 100], default: 80, describe: (s) => `${s} Sekunden` },
  ],
  moves: {
    choose: { index: 'number' },
    stroke: { color: 'string', size: 'number', points: 'object' },
    clear: {},
    guess: { text: 'string' },
  },
  create: createGame,
  reduce,
  viewFor,
  removePlayer: (state, playerId) => reduce(state, { type: 'leave', playerId }).state,
  timeout: (state, playerId) => reduce(state, { type: 'timeout', playerId }),

  // Wortwahl, Zeichnen und Auflösung laufen jeweils auf Zeit; die Uhr hängt am Zeichner.
  timer(state) {
    if (state.phase === 'gameOver') return null;
    return { key: `${state.phase}|${state.turnNumber}`, playerId: state.players[state.drawer].id, seconds: phaseSeconds(state) };
  },

  result(state) {
    if (state.phase !== 'gameOver') return null;
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const ranking = sorted.map((p) => ({
      playerId: p.id,
      place: sorted.findIndex((other) => other.score === p.score) + 1,
      detail: `${p.score} Punkte`,
    }));
    return { ranking, awards: awardsFor(state.players, AWARDS) };
  },
};

const AWARDS = [
  { icon: '⚡', title: 'Blitzmerker', count: (p) => p.firsts, describe: (n) => `${n}-mal als Erster erraten` },
  { icon: '🖌️', title: 'Künstler', count: (p) => p.fans, describe: (n) => `${n}-mal wurde ein Bild erraten` },
];
