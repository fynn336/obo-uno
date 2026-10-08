import { alertTurn, showBanner } from '../../../ui/attention.js';
import { playEffect } from '../../../ui/audio.js';
import { avatarBadge } from '../../../ui/avatar.js';
import { h } from '../../../ui/dom.js';
import { timerBar } from '../../../ui/timer.js';
import { CANVAS, PALETTE, SIZES } from '../game.js';

// Striche gehen gebündelt an den Host; sehr dichte Punkte werden ausgelassen.
const SEND_EVERY_MS = 120;
const MIN_STEP = 6;
const ERASER = '#ffffff';
const CORRECT_SOUND_RATE = 1.6;

// Gerüst mit Zeichenfläche und Eingabefeld bleibt bestehen, damit Striche und halb getippte Tipps nicht verloren gehen.
let ui = null;
let latest = null;
let tool = { color: PALETTE[0], size: SIZES[1] };
// Eigene Striche des Zeichners in diesem Bild (gesendet) und der laufende Strich (noch nicht gesendet)
let mine = [];
let pending = null;
let lastChatId = null;

export function renderSketch(root, view, send, abort) {
  const before = latest?.view;
  latest = { view, send, abort };
  if (!ui || !root.contains(ui.element)) ui = buildSkeleton(root);
  // Neues Bild (Wortwahl, Zeichnen, Auflösung zählen den Zug weiter): eigene Striche vergessen
  if (before?.turnNumber !== view.turnNumber) mine = [];
  update(view, before);
}

// Tippen irgendwo beginnt einen Rateversuch.
export function handleSketchKey(event) {
  if (!ui || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
  ui.input.focus();
}

function buildSkeleton(root) {
  const canvas = h('canvas', { width: 1000, height: 750, class: 'sketch-canvas' });
  const input = h('input', { maxlength: 40, autocomplete: 'off', 'aria-label': 'Tipp oder Nachricht' });
  const parts = {
    header: h('header', { class: 'info' }),
    word: h('div', { class: 'sketch-word' }),
    overlay: h('div', { class: 'sketch-overlay' }),
    tools: h('div', { class: 'sketch-tools' }),
    players: h('ul', { class: 'maex-players' }),
    timer: h('div', { class: 'sketch-timer' }),
    chat: h('ol', { class: 'sketch-chat', 'aria-label': 'Tipps und Nachrichten' }),
  };
  const form = h('form', { class: 'sketch-guess', onSubmit: (event) => {
    event.preventDefault();
    if (input.value.trim()) latest.send({ type: 'guess', text: input.value });
    input.value = '';
  } }, input, h('button', { type: 'submit', class: 'primary' }, 'Senden'));
  const element = h('div', { class: 'sketch-game' },
    parts.header,
    h('div', { class: 'sketch-main' },
      h('section', { class: 'sketch-board' }, parts.word, h('div', { class: 'canvas-wrap' }, canvas, parts.overlay), parts.tools),
      h('aside', { class: 'panel sketch-side' }, parts.players, parts.timer, parts.chat, form)));
  root.replaceChildren(element);
  attachPen(canvas);
  return { element, canvas, input, ...parts };
}

function update(view, before) {
  const drawer = view.players.find((p) => p.id === view.drawerId);
  const amDrawer = isDrawer(view);
  ui.header.replaceChildren(
    latest.abort && h('button', { type: 'button', class: 'leave-game', onClick: latest.abort }, '← Lounge'),
    h('span', { class: 'turn' }, amDrawer ? 'Du zeichnest' : `${drawer?.name ?? '…'} zeichnet`),
    h('span', {}, `Runde ${view.round} von ${view.rounds}`));
  ui.word.replaceChildren(wordLine(view));
  ui.overlay.replaceChildren(...overlay(view, drawer));
  ui.overlay.hidden = view.phase === 'draw';
  ui.tools.replaceChildren(...(amDrawer && view.phase === 'draw' ? tools() : []));
  ui.canvas.classList.toggle('drawing', amDrawer && view.phase === 'draw');
  ui.players.replaceChildren(...[...view.players].sort((a, b) => b.score - a.score).map((p) => h('li', {
    class: p.id === view.drawerId ? 'current' : '',
  }, avatarBadge(p), h('span', { class: 'name' }, p.id === view.you ? `${p.name} (du)` : p.name),
  h('span', { class: 'lives' }, `${p.id === view.drawerId ? '✏️ ' : ''}${p.guessed ? '✓ ' : ''}${p.score}`))));
  ui.timer.replaceChildren(view.turnEndsIn !== null && view.phase !== 'gameOver' ? timerBar(view.phaseSeconds, view.turnEndsIn) : '');
  ui.chat.replaceChildren(...view.chat.map((entry) => h('li', { class: entry.kind },
    entry.player && h('strong', {}, `${entry.player}: `), entry.text)));
  ui.chat.scrollTop = ui.chat.scrollHeight;
  ui.input.placeholder = view.phase === 'draw' && !amDrawer && !view.word ? 'Dein Tipp …' : 'Nachricht …';
  ui.input.disabled = amDrawer && view.phase === 'draw';
  redraw(view);
  announce(view, before);
}

function wordLine(view) {
  if (view.phase === 'choose') return h('span', { class: 'hint' }, 'Gleich geht’s los …');
  if (isDrawer(view) && view.phase === 'draw') return h('span', {}, 'Du zeichnest: ', h('strong', {}, view.word));
  if (view.word) return h('span', {}, view.phase === 'draw' ? '✓ ' : 'Es war: ', h('strong', {}, view.word));
  return h('span', { class: 'pattern' }, `${view.pattern}  (${view.pattern.split(' ').filter((c) => c === '_').length})`);
}

function overlay(view, drawer) {
  if (view.phase === 'choose' && isDrawer(view)) {
    return [h('p', {}, 'Was möchtest du zeichnen?'), h('div', { class: 'actions' }, view.options.map((word, index) => h('button', {
      type: 'button', class: 'primary', onClick: () => latest.send({ type: 'choose', index }),
    }, word)))];
  }
  if (view.phase === 'choose') return [h('p', {}, `${drawer?.name ?? '…'} sucht sich ein Wort aus …`)];
  if (view.phase === 'reveal') {
    const guessed = view.players.filter((p) => p.guessed).length;
    return [h('p', {}, 'Das Wort war'), h('strong', {}, view.word),
      h('p', { class: 'hint' }, `${guessed} von ${view.players.length - 1} haben es erraten`)];
  }
  return [];
}

function tools() {
  const choose = (change) => () => {
    tool = { ...tool, ...change };
    ui.tools.replaceChildren(...tools());
  };
  return [
    ...PALETTE.filter((color) => color !== ERASER).map((color) => h('button', {
      type: 'button',
      class: `swatch-button${tool.color === color ? ' active' : ''}`,
      style: `--c:${color}`,
      'aria-label': `Farbe ${color}`,
      onClick: choose({ color }),
    })),
    ...SIZES.map((size) => h('button', {
      type: 'button',
      class: `size-button${tool.size === size ? ' active' : ''}`,
      'aria-label': `Stiftgröße ${size}`,
      onClick: choose({ size }),
    }, h('span', { style: `--dot:${Math.max(4, size / 1.5)}px` }))),
    h('button', {
      type: 'button',
      class: `size-button${tool.color === ERASER ? ' active' : ''}`,
      title: 'Radierer',
      onClick: choose({ color: ERASER, size: SIZES.at(-1) }),
    }, '🧽'),
    h('button', { type: 'button', title: 'Alles löschen', onClick: () => {
      mine = [];
      latest.send({ type: 'clear' });
    } }, '🗑️'),
  ];
}

// Zeichnen mit Maus, Stift oder Finger; die Punkte gehen alle SEND_EVERY_MS als ein Strich an den Host.
function attachPen(canvas) {
  let timer = null;
  const pointAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    const clamp = (v) => Math.max(0, Math.min(CANVAS, Math.round(v)));
    return [clamp(((event.clientX - rect.left) / rect.width) * CANVAS), clamp(((event.clientY - rect.top) / rect.height) * CANVAS)];
  };
  const flush = () => {
    if (!pending || pending.points.length === 0) return;
    mine.push(pending);
    latest.send({ type: 'stroke', ...pending });
    // Der nächste Teil beginnt am letzten Punkt, damit die Linie zusammenhängt.
    pending = { ...pending, points: [pending.points.at(-1)] };
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (!isDrawer(latest.view) || latest.view.phase !== 'draw') return;
    canvas.setPointerCapture(event.pointerId);
    pending = { color: tool.color, size: tool.size, points: [pointAt(event)] };
    timer = setInterval(flush, SEND_EVERY_MS);
    redraw(latest.view);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pending) return;
    const point = pointAt(event);
    const last = pending.points.at(-1);
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < MIN_STEP) return;
    pending.points.push(point);
    drawStroke(canvas.getContext('2d'), { ...pending, points: [last, point] });
  });
  const stop = () => {
    if (!pending) return;
    clearInterval(timer);
    flush();
    pending = null;
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
}

// Der Zeichner sieht seine eigenen Striche sofort, alle anderen das, was der Host verteilt.
function redraw(view) {
  const context = ui.canvas.getContext('2d');
  context.fillStyle = ERASER;
  context.fillRect(0, 0, ui.canvas.width, ui.canvas.height);
  const strokes = isDrawer(view) && view.phase === 'draw' ? [...mine, ...(pending ? [pending] : [])] : view.strokes;
  for (const stroke of strokes) drawStroke(context, stroke);
}

function drawStroke(context, { color, size, points }) {
  const scaleX = context.canvas.width / CANVAS;
  const scaleY = context.canvas.height / CANVAS;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = size * scaleX;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0][0] * scaleX, points[0][1] * scaleY, (size * scaleX) / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? context.moveTo(x * scaleX, y * scaleY) : context.lineTo(x * scaleX, y * scaleY)));
  context.stroke();
}

function announce(view, before) {
  const newestId = view.chat.at(-1)?.id ?? 0;
  const fresh = lastChatId === null || newestId < lastChatId ? [] : view.chat.filter((entry) => entry.id > lastChatId);
  lastChatId = newestId;
  if (fresh.some((entry) => entry.kind === 'correct')) playEffect('card', CORRECT_SOUND_RATE);
  const me = view.players.find((p) => p.id === view.you);
  if (me?.guessed && before && !before.players.find((p) => p.id === view.you)?.guessed) showBanner(['Richtig!', view.word]);
  if (view.phase === 'reveal' && before?.phase === 'draw') showBanner(['Das Wort war', view.word]);
  if (isDrawer(view) && view.phase === 'choose' && !(before && isDrawer(before) && before.phase === 'choose')) {
    alertTurn(() => latest && isDrawer(latest.view) && latest.view.phase === 'choose');
  }
}

function isDrawer(view) {
  return view.drawerId === view.you;
}
