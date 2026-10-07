import { h } from './dom.js';

const PIECES = 80;
const DURATION_MS = 4500;
const COLORS = ['var(--red)', 'var(--yellow)', 'var(--green)', 'var(--blue)', '#fff'];

export function throwConfetti() {
  const pieces = Array.from({ length: PIECES }, (_, i) => h('span', {
    style: `left:${Math.random() * 100}%;background:${COLORS[i % COLORS.length]};`
      + `animation-delay:${Math.random() * 0.6}s;animation-duration:${2 + Math.random() * 1.5}s;--spin:${Math.random() * 720 - 360}deg`,
  }));
  const confetti = h('div', { class: 'confetti', 'aria-hidden': 'true' }, pieces);
  document.body.append(confetti);
  setTimeout(() => confetti.remove(), DURATION_MS);
}
