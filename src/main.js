import { GAME_UIS } from './games/ui.js';
import { joinGame, savedSession } from './net/client.js';
import { hostLounge } from './net/host.js';
import { unlockAudio } from './ui/audio.js';
import { renderCorner } from './ui/corner.js';
import { renderLounge, renderStart, renderWaiting } from './ui/lounge.js';
import { updateIfOutdated } from './update.js';

const TOAST_MS = 3000;
const app = document.getElementById('app');
const toast = document.getElementById('toast');
const inviteCode = new URLSearchParams(location.search).get('code')?.match(/^\d{4}$/)?.[0];
let session = null;
let code = '';
let view = null;
let toastTimer = null;

const events = {
  onReady: (info) => {
    code = info.code;
  },
  onView: (next) => {
    view = next;
    render();
  },
  onError: showToast,
  onEnd: showStart,
};

function showStart(message) {
  session = null;
  view = null;
  window.removeEventListener('beforeunload', confirmLeave);
  renderStart(app, { message, inviteCode, onCreate: create, onJoin: join });
}

function create(name) {
  renderWaiting(app, 'Lounge wird eröffnet …');
  session = hostLounge(name, events);
  if (session) window.addEventListener('beforeunload', confirmLeave);
}

function join(joinCode, name) {
  code = joinCode;
  renderWaiting(app, 'Verbinde …');
  session = joinGame(joinCode, name, events);
}

function send(action) {
  session?.send(action);
}

function sendMove(move) {
  send({ type: 'move', move });
}

function abortGame() {
  if (confirm('Partie wirklich beenden? Es gibt dann keine Punkte.')) send({ type: 'abortGame' });
}

function render() {
  if (!view.game) {
    renderLounge(app, view, code, send);
    return;
  }
  const gameView = { ...view.game, turnEndsIn: view.turnEndsIn };
  GAME_UIS[view.gameId].render(app, gameView, sendMove, view.you === view.hostId ? abortGame : null);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), TOAST_MS);
}

function confirmLeave(event) {
  event.preventDefault();
}

document.addEventListener('keydown', (event) => {
  const dialogOpen = document.querySelector('dialog[open]') !== null;
  const inControl = event.target.closest('input, select');
  if (view?.game && !dialogOpen && !inControl) GAME_UIS[view.gameId].handleKey(event, view.game);
});

if (!(await updateIfOutdated())) {
  renderCorner(document.getElementById('corner'));
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
  const saved = savedSession();
  if (saved) join(saved.code, saved.name);
  else showStart();
}
