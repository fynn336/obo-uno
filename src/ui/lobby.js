import { AVATAR_COLORS, AVATAR_EMOJIS } from '../game/avatars.js';
import { TARGET_SCORES, TURN_TIMES } from '../game/game.js';
import { avatarBadge } from './avatar.js';
import { h } from './dom.js';

const CONFETTI_PIECES = 80;
const CONFETTI_MS = 4500;
let celebratedEventId = null;

const RULE_LABELS = {
  stacking: 'Stapeln von +2/+4',
  challenge: 'Wild-+4-Anfechtung',
  drawUntilPlayable: 'Ziehen bis spielbar',
};

export function renderStart(root, { message, inviteCode, onCreate, onJoin }) {
  const createName = nameInput();
  const joinCode = h('input', {
    name: 'code', required: true, inputmode: 'numeric', pattern: '\\d{4}', maxlength: 4,
    placeholder: '1234', autocomplete: 'off', title: '4-stelliger Code', value: inviteCode,
  });
  const joinName = nameInput();
  const submit = (handler) => (event) => {
    event.preventDefault();
    handler();
  };
  root.replaceChildren(
    h('div', { class: 'page' },
      h('h1', { class: 'logo' }, h('span', {}, 'UNO')),
      message && h('p', { class: 'message' }, message),
      h('div', { class: 'panels' },
        h('form', { class: 'panel', onSubmit: submit(() => onCreate(createName.value)) },
          h('h2', {}, 'Lobby erstellen'),
          h('label', {}, 'Dein Name', createName),
          h('button', { class: 'primary', type: 'submit' }, 'Lobby erstellen')),
        h('form', { class: 'panel', onSubmit: submit(() => onJoin(joinCode.value.trim(), joinName.value)) },
          h('h2', {}, 'Beitreten'),
          h('label', {}, 'Code', joinCode),
          h('label', {}, 'Dein Name', joinName),
          h('button', { class: 'primary', type: 'submit' }, 'Beitreten')),
      ),
    ),
  );
  (inviteCode ? joinName : createName).focus();
}

export function renderWaiting(root, text) {
  root.replaceChildren(h('div', { class: 'page' }, h('p', { class: 'message' }, text)));
}

export function renderLobby(root, view, code, send) {
  const isHost = view.you === view.hostId;
  const isOver = view.phase === 'roundOver';
  const win = view.events.findLast((event) => event.type === 'win');
  const players = isOver ? [...view.players].sort((a, b) => a.cardCount - b.cardCount) : view.players;
  const isNewWin = isOver && win && win.id !== celebratedEventId;
  root.replaceChildren(
    h('div', { class: 'page' },
      isOver && win && resultBanner(win, view, isNewWin),
      h('h1', {}, 'Lobby ', h('span', { class: 'code' }, code)),
      h('p', { class: 'hint' }, 'Teile den Code oder schick deinen Freunden direkt den Link: ', inviteButton(code)),
      h('div', { class: 'panels' },
        h('section', { class: 'panel' },
          h('h2', {}, isOver ? 'Ergebnis der Runde' : `Spieler (${view.players.length})`),
          h('ol', { class: 'lobby-players' }, players.map((p) => h('li', {},
            avatarBadge(p),
            p.name,
            p.id === view.hostId && h('span', { class: 'badge' }, 'Host'),
            p.id === view.you && h('span', { class: 'badge' }, 'du'),
            !p.connected && h('span', { class: 'badge offline' }, 'getrennt'),
            isOver && h('span', { class: 'hint' }, p.cardCount === 0 ? 'fertig' : `${p.cardCount} Karten · ${p.handPoints} P.`),
            h('span', { class: 'score' }, `${p.score} P.`),
          )))),
        h('section', { class: 'panel' },
          h('h2', {}, 'Hausregeln'),
          Object.entries(RULE_LABELS).map(([rule, label]) => h('label', { class: 'toggle' },
            h('input', {
              type: 'checkbox',
              checked: view.rules[rule],
              disabled: !isHost,
              onChange: (event) => send({ type: 'setRule', rule, value: event.target.checked }),
            }),
            label,
          )),
          hostSelect({
            label: 'Abend gewonnen bei', action: 'setTarget', values: TARGET_SCORES, current: view.target,
            describe: (score) => `${score} Punkten`,
          }, isHost, send),
          hostSelect({
            label: 'Zeit pro Zug', action: 'setTurnTime', values: TURN_TIMES, current: view.turnTime,
            describe: (seconds) => (seconds ? `${seconds} Sekunden` : 'unbegrenzt'),
          }, isHost, send),
          h('p', { class: 'hint' }, isHost ? 'Alle aus = offizielle Regeln.' : 'Nur der Host kann die Regeln ändern.')),
        avatarPicker(view, send),
      ),
      isHost
        ? h('button', { class: 'primary big', disabled: view.players.length < 2, onClick: () => send({ type: 'start' }) },
          isOver ? 'Neue Runde starten' : 'Runde starten')
        : h('p', { class: 'hint' }, 'Warte, bis der Host die Runde startet …'),
    ),
  );
  if (isNewWin) {
    celebratedEventId = win.id;
    throwConfetti();
  }
}

function hostSelect({ label, action, values, current, describe }, isHost, send) {
  return h('label', { class: 'toggle' }, label,
    h('select', {
      disabled: !isHost,
      onChange: (event) => send({ type: action, value: Number(event.target.value) }),
    }, values.map((value) => h('option', { value, selected: value === current }, describe(value)))));
}

function inviteButton(code) {
  const link = `${location.origin}${location.pathname}?code=${code}`;
  const button = h('button', {
    type: 'button',
    class: 'invite',
    onClick: () => navigator.clipboard.writeText(link).then(
      () => { button.textContent = '✓ Link kopiert'; },
      () => { button.textContent = link; },
    ),
  }, '🔗 Einladungslink kopieren');
  return button;
}

function avatarPicker(view, send) {
  const me = view.players.find((p) => p.id === view.you);
  const choose = (change) => send({ type: 'setAvatar', ...me.avatar, ...change });
  const selected = (isSelected) => (isSelected ? ' selected' : '');
  return h('section', { class: 'panel wide' },
    h('h2', {}, 'Dein Avatar'),
    h('div', { class: 'choices' }, AVATAR_EMOJIS.map((emoji) => h('button', {
      type: 'button',
      class: `choice${selected(emoji === me.avatar.emoji)}`,
      title: emoji ? '' : 'Anfangsbuchstabe',
      onClick: () => choose({ emoji }),
    }, emoji || me.name.charAt(0).toUpperCase()))),
    h('div', { class: 'choices' }, AVATAR_COLORS.map((color, index) => h('button', {
      type: 'button',
      class: `choice color${selected(index === me.avatar.color)}`,
      style: `--seat-color:${color}`,
      'aria-label': `Farbe ${index + 1}`,
      onClick: () => choose({ color: index }),
    }))));
}

function resultBanner(win, view, isNew) {
  const classes = isNew ? 'winner fresh' : 'winner';
  if (win.champion) {
    const champion = view.players.find((p) => p.id === view.championId);
    return h('div', { class: classes },
      h('strong', {}, `🎉 ${win.player} gewinnt den Abend!`),
      h('span', {}, `${champion?.score ?? view.target} Punkte – die nächste Runde startet einen neuen Abend`));
  }
  return h('div', { class: classes },
    h('strong', {}, `🏆 ${win.player} gewinnt die Runde`),
    h('span', {}, win.points > 0 ? `+${win.points} Punkte` : 'Keine Punkte – die Runde endete durch einen Rauswurf'));
}

function throwConfetti() {
  const colors = ['var(--red)', 'var(--yellow)', 'var(--green)', 'var(--blue)', '#fff'];
  const pieces = Array.from({ length: CONFETTI_PIECES }, (_, i) => h('span', {
    style: `left:${Math.random() * 100}%;background:${colors[i % colors.length]};`
      + `animation-delay:${Math.random() * 0.6}s;animation-duration:${2 + Math.random() * 1.5}s;--spin:${Math.random() * 720 - 360}deg`,
  }));
  const confetti = h('div', { class: 'confetti', 'aria-hidden': 'true' }, pieces);
  document.body.append(confetti);
  setTimeout(() => confetti.remove(), CONFETTI_MS);
}

function nameInput() {
  return h('input', { name: 'name', required: true, maxlength: 16, autocomplete: 'nickname', placeholder: 'z. B. Anna' });
}
