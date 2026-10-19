// Einheitliche Strich-Icons (24 × 24, Farbe aus currentColor) statt Emojis für Bedienelemente.
const SVG = 'http://www.w3.org/2000/svg';
const MUSIC = ['M9 18V5l12-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0', 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0'];
const SPEAKER = 'M11 5 6 9H2v6h4l5 4z';
const PATHS = {
  music: MUSIC,
  musicOff: [...MUSIC, 'M2 2l20 20'],
  volume: [SPEAKER, 'M15.5 8.5a5 5 0 0 1 0 7', 'M19 5a10 10 0 0 1 0 14'],
  volumeOff: [SPEAKER, 'M22 9l-6 6', 'M16 9l6 6'],
  help: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'],
  settings: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  back: ['M19 12H5', 'M12 19l-7-7 7-7'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  check: ['M20 6 9 17l-5-5'],
  bot: ['M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2', 'M12 8V4', 'M9 13v2', 'M15 13v2'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  replay: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  rotate: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
  shuffle: ['M16 3h5v5', 'M4 20 21 3', 'M21 16v5h-5', 'M15 15l6 6', 'M4 4l5 5'],
  eraser: ['M7 21 3 17a1.5 1.5 0 0 1 0-2L13 5a1.5 1.5 0 0 1 2 0l5 5a1.5 1.5 0 0 1 0 2l-9 9z', 'M22 21H7'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
};

export function icon(name) {
  const svg = document.createElementNS(SVG, 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', class: 'icon', 'aria-hidden': 'true' })) {
    svg.setAttribute(key, value);
  }
  for (const d of PATHS[name]) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
