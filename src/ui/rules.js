import { GAMES } from '../games/index.js';
import { h } from './dom.js';

const LOUNGE = {
  id: 'lounge',
  name: 'Lounge',
  icon: '🛋️',
  rules: [
    'Der Host wählt das Spiel und die Einstellungen und startet die Partie. Zu wenige Leute? Computer-Gegner füllen auf.',
    'Abendwertung: Platz 1 bekommt 3 ⭐, Platz 2 bekommt 2 ⭐, Platz 3 bekommt 1 ⭐. Wer vorne liegt, ist Spieler des Abends 🏆.',
    'Nach jeder Partie startet der Host dasselbe Spiel mit „Nochmal!“ direkt neu.',
    '„Neuer Abend“ zeigt einen Rückblick mit Siegerpodest und setzt die Sterne zurück.',
    'Zeit pro Zug (optional): Läuft sie ab, übernimmt der Computer den Zug.',
    'Wer die Verbindung verliert, hat 60 Sekunden, um zurückzukommen. Auch der Host darf neu laden.',
  ],
};

// Regeln aller Spiele zum Nachlesen; gameId wählt den Reiter, der zuerst offen ist.
export function openRules(gameId) {
  const topics = [...Object.values(GAMES), LOUNGE];
  const body = h('div', { class: 'rules-body' });
  const tabs = topics.map((topic) => h('button', { type: 'button', onClick: () => show(topic) }, `${topic.icon} ${topic.name}`));
  function show(topic) {
    tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(topics[i] === topic)));
    body.replaceChildren(h('ul', {}, topic.rules.map((rule) => h('li', {}, rule))));
  }
  show(topics.find((topic) => topic.id === gameId) ?? LOUNGE);
  const dialog = h('dialog', { class: 'dialog rules-dialog' },
    h('h2', {}, 'Spielregeln'),
    h('div', { class: 'rules-tabs', role: 'group', 'aria-label': 'Spiel' }, tabs),
    body,
    h('form', { method: 'dialog' }, h('button', { class: 'primary' }, 'Schließen')));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
