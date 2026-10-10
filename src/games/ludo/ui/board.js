import { BASE, FIELDS_PER_COLOR, fieldOf } from '../game.js';

// Das Brett ist ein Stern mit einem Arm je Farbe: 4 Arme ergeben das bekannte Kreuz, 6 Arme das große Brett.
// Koordinaten in Feldbreiten um die Mitte (0, 0), y nach unten; Rot (Arm 0) zeigt nach links.
// Je Farbe 10 Felder Laufbahn: 4 auf dem eigenen Arm nach innen, die Ecke zum Nachbarn, 4 auf dessen Arm nach
// außen und seine Spitze. In der Mitte jedes Arms liegt der Zielweg, das Haus im Zwickel neben dem Startfeld.
const LANE = 4;
const HOUSE_DISTANCE = 5.3;
const LABEL_DISTANCE = 1.9;
const MARGIN = 0.9;
// Eigene Farbe links unten (Winkel des Hauses auf dem Bildschirm)
const OWN_HOUSE_ANGLE = (3 * Math.PI) / 4;
const HOUSE_SPOTS = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];

export function boardLayout(colors) {
  const step = (2 * Math.PI) / colors;
  // Abstand der Ecke zwischen zwei Armen, gemessen entlang des Arms
  const inner = 1 / Math.tan(Math.PI / colors);
  const point = (arm, along, side) => {
    const angle = Math.PI + arm * step;
    const [ux, uy] = [Math.cos(angle), Math.sin(angle)];
    return [ux * along - uy * side, uy * along + ux * side];
  };
  const track = Array.from({ length: colors }, (_, arm) => [
    ...Array.from({ length: LANE }, (__, i) => point(arm, inner + LANE - i, 1)),
    point(arm, inner, 1),
    ...Array.from({ length: LANE }, (__, i) => point(arm + 1, inner + 1 + i, -1)),
    point(arm + 1, inner + LANE, 0),
  ]).flat();
  const goals = Array.from({ length: colors },
    (_, arm) => Array.from({ length: LANE }, (__, i) => point(arm, inner + LANE - 1 - i, 0)));
  const houseAngle = (color) => Math.PI + color * step + step / 2;
  const toward = (angle, distance, [a, b] = [0, 0]) => [
    Math.cos(angle) * (distance + a) - Math.sin(angle) * b,
    Math.sin(angle) * (distance + a) + Math.cos(angle) * b,
  ];
  const houses = Array.from({ length: colors },
    (_, color) => HOUSE_SPOTS.map((spot) => toward(houseAngle(color), inner + HOUSE_DISTANCE, spot)));
  const yards = Array.from({ length: colors }, (_, color) => toward(houseAngle(color), inner + HOUSE_DISTANCE));
  const labels = Array.from({ length: colors }, (_, color) => toward(houseAngle(color), inner + HOUSE_DISTANCE + LABEL_DISTANCE));
  const all = [...track, ...goals.flat(), ...houses.flat(), ...labels];
  const extent = Math.max(...all.flat().map(Math.abs)) + MARGIN;
  return { track, goals, houses, yards, labels, extent, inner, houseAngle };
}

// Drehwinkel, damit das Haus der eigenen Farbe links unten liegt
export function turnFor(layout, color) {
  return OWN_HOUSE_ANGLE - layout.houseAngle(color);
}

export function rotate([x, y], angle) {
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
}

// Name eines Felds für data-cell; im Haus hat jede Figur ihren festen Platz.
export function cellKey(view, color, position, piece) {
  if (position === BASE) return `h${color}-${piece}`;
  if (position < view.track) return `t${fieldOf(view, color, position)}`;
  return `g${color}-${position - view.track}`;
}

// Felder, über die eine Figur von from nach to läuft, ohne das Startfeld
export function pathKeys(view, color, piece, from, to) {
  const start = from === BASE ? to : from + 1;
  return Array.from({ length: to - start + 1 }, (_, i) => cellKey(view, color, start + i, piece));
}

// Farbe, deren Startfeld das ist, sonst null
export function startColor(index) {
  return index % FIELDS_PER_COLOR === 0 ? index / FIELDS_PER_COLOR : null;
}
