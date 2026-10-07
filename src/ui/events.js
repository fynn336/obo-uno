import { COLOR_NAMES, cardLabel } from './cards.js';

const TEXTS = {
  start: () => 'Neue Runde',
  play: (e) => `${e.player} legt ${cardLabel(e.card)}`,
  draw: (e) => `${e.player} zieht ${cards(e.count)}`,
  pass: (e) => `${e.player} behält die gezogene Karte`,
  penalty: (e) => `${e.player} muss ${cards(e.count)} ziehen`,
  color: (e) => `${e.player} wählt ${COLOR_NAMES[e.color]}`,
  skipped: (e) => `${e.player} setzt aus`,
  reverse: () => 'Richtungswechsel',
  uno: (e) => `${e.player} ruft UNO!`,
  caught: (e) => `${e.player} erwischt ${e.target}: +2`,
  challenge: (e) => `${e.player} ficht an: ${e.success ? 'erfolgreich' : 'gescheitert'}`,
  left: (e) => `${e.player} wurde entfernt (Verbindung verloren)`,
  win: (e) => `${e.player} gewinnt die Runde`,
};

const BANNERS = {
  uno: (e) => ['UNO!', e.player],
  caught: (e) => ['Erwischt!', `${e.target} zieht 2`],
  penalty: (e) => (e.count >= 2 ? [`+${e.count}`, `für ${e.player}`] : null),
  skipped: (e) => ['Aussetzen', e.player],
  reverse: () => ['⇄', 'Richtungswechsel'],
  challenge: (e) => [e.success ? 'Anfechtung erfolgreich' : 'Anfechtung gescheitert', e.success ? `${e.target} zieht 4` : e.player],
  left: (e) => ['Raus', `${e.player} ist nicht zurückgekommen`],
};

export function describeEvent(event) {
  return TEXTS[event.type](event);
}

// Liefert [Titel, Untertitel] für Ereignisse, die groß eingeblendet werden, sonst null.
export function bannerFor(event) {
  return BANNERS[event.type]?.(event) ?? null;
}

function cards(count) {
  return count === 1 ? 'eine Karte' : `${count} Karten`;
}
