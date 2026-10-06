import { h } from './dom.js';

const RULE_LABELS = {
  stacking: 'Stapeln von +2/+4',
  challenge: 'Wild-+4-Anfechtung',
  drawUntilPlayable: 'Ziehen bis spielbar',
};

export function renderStart(root, { message, onCreate, onJoin }) {
  const createName = nameInput();
  const joinCode = h('input', {
    name: 'code', required: true, inputmode: 'numeric', pattern: '\\d{4}', maxlength: 4,
    placeholder: '1234', autocomplete: 'off', title: '4-stelliger Code',
  });
  const joinName = nameInput();
  const submit = (handler) => (event) => {
    event.preventDefault();
    handler();
  };
  root.replaceChildren(
    h('div', { class: 'page' },
      h('h1', { class: 'logo' }, 'UNO'),
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
  createName.focus();
}

export function renderWaiting(root, text) {
  root.replaceChildren(h('div', { class: 'page' }, h('p', { class: 'message' }, text)));
}

export function renderLobby(root, view, code, send) {
  const isHost = view.you === view.hostId;
  const winner = view.players.find((p) => p.id === view.winnerId);
  root.replaceChildren(
    h('div', { class: 'page' },
      view.phase === 'roundOver' && h('p', { class: 'winner' }, winner ? `🏆 ${winner.name} hat gewonnen!` : 'Die Runde ist vorbei.'),
      view.notice && h('p', { class: 'message' }, view.notice),
      h('h1', {}, 'Lobby ', h('span', { class: 'code' }, code)),
      h('p', { class: 'hint' }, 'Teile den Code mit deinen Freunden.'),
      h('div', { class: 'panels' },
        h('section', { class: 'panel' },
          h('h2', {}, `Spieler (${view.players.length})`),
          h('ul', { class: 'lobby-players' }, view.players.map((p) => h('li', {},
            p.name,
            p.id === view.hostId && h('span', { class: 'badge' }, 'Host'),
            p.id === view.you && h('span', { class: 'badge' }, 'du'),
            !p.connected && h('span', { class: 'badge offline' }, 'getrennt'),
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
          h('p', { class: 'hint' }, isHost ? 'Alle aus = offizielle Regeln.' : 'Nur der Host kann die Regeln ändern.')),
      ),
      isHost
        ? h('button', { class: 'primary big', disabled: view.players.length < 2, onClick: () => send({ type: 'start' }) },
          view.phase === 'roundOver' ? 'Neue Runde starten' : 'Runde starten')
        : h('p', { class: 'hint' }, 'Warte, bis der Host die Runde startet …'),
    ),
  );
}

function nameInput() {
  return h('input', { name: 'name', required: true, maxlength: 16, autocomplete: 'nickname', placeholder: 'z. B. Anna' });
}
