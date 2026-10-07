import { h } from './dom.js';

// Ablaufender Balken für den Zug-Timer; die CSS-Animation startet mitten drin, wenn schon Zeit vergangen ist.
export function timerBar(seconds, remainingMs) {
  const elapsed = seconds - Math.max(0, remainingMs) / 1000;
  return h('div', {
    class: 'turn-timer',
    role: 'timer',
    style: `--duration:${seconds}s;--delay:-${elapsed}s`,
  }, h('span'));
}
