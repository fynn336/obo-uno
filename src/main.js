import { isRunning } from './game/game.js';
import { joinGame, savedSession } from './net/client.js';
import { hostGame } from './net/host.js';
import { renderLobby, renderStart, renderWaiting } from './ui/lobby.js';
import { handleTableKey, renderTable } from './ui/table.js';

const TOAST_MS = 3000;
const app = document.getElementById('app');
const toast = document.getElementById('toast');
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
  renderStart(app, { message, onCreate: create, onJoin: join });
}

function create(name) {
  renderWaiting(app, 'Lobby wird erstellt …');
  session = hostGame(name, events);
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

function render() {
  if (isRunning(view)) renderTable(app, view, send);
  else renderLobby(app, view, code, send);
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
  if (view && isRunning(view)) handleTableKey(event);
});

const saved = savedSession();
if (saved) join(saved.code, saved.name);
else showStart();
