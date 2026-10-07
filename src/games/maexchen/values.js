// Würfe als Zahl mit der höheren Augenzahl vorne (6 und 3 → 63), aufsteigend nach Wert.
// Ganz oben: die Pasche, dann Mäxchen (21).
export const MAEXCHEN = 21;
export const VALUES = [31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65, 11, 22, 33, 44, 55, 66, MAEXCHEN];

export function valueOf([a, b]) {
  return Math.max(a, b) * 10 + Math.min(a, b);
}

export function rank(value) {
  return VALUES.indexOf(value);
}

export function isHigher(value, than) {
  return than === null || rank(value) > rank(than);
}

export function valueLabel(value) {
  if (value === MAEXCHEN) return 'Mäxchen';
  if (value % 11 === 0) return `${value / 11}er-Pasch`;
  return String(value);
}

// Anteil aller 36 Würfe, die mindestens so hoch sind wie value
export function chanceAtLeast(value) {
  let hits = 0;
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) if (rank(valueOf([a, b])) >= rank(value)) hits++;
  }
  return hits / 36;
}
