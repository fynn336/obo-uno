import { playTurnGong } from './audio.js';
import { h } from './dom.js';

const TITLE_BLINK_MS = 1000;
let titleBlinking = false;

// Gong; liegt der Tab im Hintergrund, blinkt der Titel, solange stillMyTurn() wahr ist.
export function alertTurn(stillMyTurn) {
  playTurnGong();
  if (!document.hidden || titleBlinking) return;
  titleBlinking = true;
  const title = document.title;
  const stop = () => {
    clearInterval(blink);
    document.removeEventListener('visibilitychange', stop);
    document.title = title;
    titleBlinking = false;
  };
  const blink = setInterval(() => {
    if (!stillMyTurn()) stop();
    else document.title = document.title === title ? '🔔 Du bist dran!' : title;
  }, TITLE_BLINK_MS);
  document.addEventListener('visibilitychange', stop);
}

// Große Einblendung über dem Spiel: [Titel, Untertitel]
export function showBanner([title, subtitle]) {
  const banner = document.getElementById('banner');
  banner.replaceChildren(h('strong', {}, title), h('span', {}, subtitle));
  banner.classList.remove('show');
  void banner.offsetWidth; // Layout erzwingen, damit die Animation neu startet
  banner.classList.add('show');
}
