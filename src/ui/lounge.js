import { GAMES } from '../games/index.js';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../lounge/avatars.js';
import { BOT_LEVELS, MAX_PLAYERS, playersFor } from '../lounge/lounge.js';
import { avatarBadge } from './avatar.js';
import { throwConfetti } from './confetti.js';
import { h } from './dom.js';
import { openRules } from './rules.js';

const BOT_LEVEL_NAMES = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' };

let celebratedResultId = null;

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
      h('h1', { class: 'logo' }, h('span', {}, 'OBO'), ' Lounge'),
      h('p', { class: 'hint' }, 'Spieleabend mit Freunden – direkt im Browser'),
      message && h('p', { class: 'message' }, message),
      h('div', { class: 'panels' },
        h('form', { class: 'panel', onSubmit: submit(() => onCreate(createName.value)) },
          h('h2', {}, 'Lounge eröffnen'),
          h('label', {}, 'Dein Name', createName),
          h('button', { class: 'primary', type: 'submit' }, 'Lounge eröffnen')),
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

export function renderLounge(root, view, code, send) {
  const isHost = view.you === view.hostId;
  const result = view.lastResult;
  const { recap } = view;
  const celebration = result ?? recap;
  const isNewResult = celebration && celebration.id !== celebratedResultId;
  const game = GAMES[view.selectedGameId];
  const fits = fitsGame(view, game);
  // Nochmal: dasselbe Spiel mit denselben Einstellungen, solange der Host nichts anderes gewählt hat
  const replay = isHost && view.phase === 'lounge' && result?.gameId === game.id && fits
    ? () => send({ type: 'startGame' })
    : null;
  root.replaceChildren(
    h('div', { class: 'page lounge' },
      h('h1', {}, 'OBO Lounge ', h('span', { class: 'code' }, code)),
      h('p', { class: 'hint' }, 'Teile den Code oder schick deinen Freunden direkt den Link: ', inviteButton(code)),
      recap && recapPanel(recap, isNewResult),
      result && resultPanel(result, isNewResult, replay),
      view.phase === 'game' && h('p', { class: 'message' },
        `Gerade läuft ${GAMES[view.gameId].name} – du spielst ab der nächsten Partie mit.`),
      h('div', { class: 'panels' },
        playersPanel(view, isHost, send),
        gamesPanel(view, isHost, send),
        avatarPicker(view, send)),
    ),
  );
  if (isNewResult) {
    celebratedResultId = celebration.id;
    if (!celebration.aborted) throwConfetti();
  }
}

function playersPanel(view, isHost, send) {
  const best = Math.max(...view.players.map((p) => p.points));
  return h('section', { class: 'panel' },
    h('h2', {}, `Am Tisch (${view.players.length}) · Abendwertung`),
    h('ol', { class: 'lobby-players' }, view.players.map((p) => h('li', {},
      avatarBadge(p),
      h('span', { class: 'name' }, p.name),
      p.id === view.hostId && h('span', { class: 'badge' }, 'Host'),
      p.id === view.you && h('span', { class: 'badge' }, 'du'),
      p.bot && h('span', { class: 'badge' }, 'Computer'),
      !p.connected && h('span', { class: 'badge offline' }, 'getrennt'),
      h('span', { class: 'score' }, best > 0 && p.points === best ? `🏆 ${p.points} ⭐` : `${p.points} ⭐`),
      isHost && p.bot && view.phase === 'lounge' && h('button', {
        type: 'button',
        class: 'remove',
        title: `${p.name} entfernen`,
        onClick: () => send({ type: 'removeBot', targetId: p.id }),
      }, '✕'),
    ))),
    isHost && view.phase === 'lounge' && h('div', { class: 'buttons' },
      h('button', {
        type: 'button',
        class: 'add-bot',
        disabled: view.players.length >= MAX_PLAYERS,
        onClick: () => send({ type: 'addBot' }),
      }, '🤖 Computer-Gegner hinzufügen'),
      best > 0 && h('button', { type: 'button', class: 'add-bot', onClick: () => send({ type: 'newEvening' }) }, 'Neuer Abend')),
    botLevel(view, isHost, send),
    h('p', { class: 'hint' }, 'Pro Partie: Platz 1 = 3 ⭐, Platz 2 = 2 ⭐, Platz 3 = 1 ⭐'));
}

// Stärke aller Computer-Gegner: der Host wählt, die anderen sehen sie, sobald Bots mitspielen.
function botLevel(view, isHost, send) {
  if (isHost) {
    return h('label', { class: 'toggle' }, 'Computer-Stärke', h('select', {
      onChange: (event) => send({ type: 'setBotLevel', level: BOT_LEVELS[event.target.selectedIndex] }),
    }, BOT_LEVELS.map((level) => h('option', { selected: level === view.botLevel }, BOT_LEVEL_NAMES[level]))));
  }
  if (!view.players.some((p) => p.bot)) return null;
  return h('p', { class: 'hint' }, `Computer-Gegner spielen: ${BOT_LEVEL_NAMES[view.botLevel]}`);
}

function gamesPanel(view, isHost, send) {
  const game = GAMES[view.selectedGameId];
  const fits = fitsGame(view, game);
  const botsWait = game.bots === false && view.players.some((p) => p.bot);
  const canChoose = isHost && view.phase === 'lounge';
  return h('section', { class: 'panel' },
    h('h2', {}, 'Spiele'),
    h('div', { class: 'game-boxes' }, Object.values(GAMES).map((g) => h('button', {
      type: 'button',
      class: `game-box${g.id === game.id ? ' selected' : ''}`,
      disabled: !canChoose,
      onClick: () => send({ type: 'selectGame', gameId: g.id }),
    },
    h('span', { class: 'game-icon' }, g.icon),
    h('strong', {}, g.name),
    h('span', { class: 'hint' }, `${g.minPlayers}–${g.maxPlayers} Spieler`)))),
    h('p', { class: 'hint' }, game.description, ' ',
      h('button', { type: 'button', class: 'rules-link', onClick: () => openRules(game.id) }, '❓ Regeln')),
    game.settings.map((setting) => settingControl(game, setting, view.settings[game.id][setting.key], canChoose, send)),
    botsWait && h('p', { class: 'hint' }, `🤖 Computer-Gegner setzen bei ${game.name} aus und warten in der Lounge.`),
    view.phase === 'lounge' && (isHost
      ? h('button', { class: 'primary big', type: 'button', disabled: !fits, onClick: () => send({ type: 'startGame' }) },
        fits ? `${game.name} starten` : `${game.name}: ${game.minPlayers}–${game.maxPlayers} Spieler`)
      : h('p', { class: 'hint' }, 'Der Host wählt das Spiel und startet die Partie …')));
}

// Passt die Zahl der Mitspieler? Bei Spielen ohne Computer-Gegner zählen nur die Menschen.
function fitsGame(view, game) {
  const count = playersFor(view, game).length;
  return count >= game.minPlayers && count <= game.maxPlayers;
}

function settingControl(game, setting, value, editable, send) {
  const change = (newValue) => send({ type: 'setSetting', gameId: game.id, key: setting.key, value: newValue });
  if (setting.type === 'toggle') {
    return h('label', { class: 'toggle' },
      h('input', { type: 'checkbox', checked: value, disabled: !editable, onChange: (event) => change(event.target.checked) }),
      setting.label);
  }
  return h('label', { class: 'toggle' }, setting.label,
    h('select', { disabled: !editable, onChange: (event) => change(setting.values[event.target.selectedIndex]) },
      setting.values.map((option) => h('option', { selected: option === value }, setting.describe(option)))));
}

function resultPanel(result, isNew, replay) {
  const game = GAMES[result.gameId];
  const replayButton = replay && h('div', { class: 'buttons' },
    h('button', { type: 'button', class: 'primary big', onClick: replay }, `🔁 Nochmal ${game.name}!`));
  if (result.aborted) {
    return h('div', { class: 'winner' },
      h('strong', {}, `${game.name} wurde beendet`),
      h('span', {}, 'Ohne Wertung – zu wenige Spieler oder vom Host beendet'),
      replayButton);
  }
  const winners = result.standings.filter((s) => s.place === 1).map((s) => s.name).join(' & ');
  return h('section', { class: 'result' },
    h('div', { class: isNew ? 'winner fresh' : 'winner' },
      h('strong', {}, `🏆 ${winners} gewinnt ${game.name}!`)),
    h('ol', { class: 'standings' }, result.standings.map((s) => h('li', {},
      h('span', { class: 'place' }, `${s.place}.`),
      h('span', { class: 'name' }, s.name),
      h('span', { class: 'hint' }, s.detail),
      s.points > 0 && h('span', { class: 'score' }, `+${s.points} ⭐`)))),
    awardList(result.awards),
    replayButton);
}

// Rückblick nach „Neuer Abend“: Podest (2., 1., 3. Platz), Sieger je Spiel, häufigste Auszeichnungen
function recapPanel(recap, isNew) {
  const step = (place) => {
    const entries = recap.podium.filter((p) => p.place === place);
    if (entries.length === 0) return null;
    return h('div', { class: `step place-${place}` },
      h('div', { class: 'step-people' }, entries.map((p) => h('div', { class: 'step-person' },
        avatarBadge(p), h('strong', {}, p.name), h('span', { class: 'hint' }, `${p.points} ⭐`)))),
      h('div', { class: 'step-block' }, String(place)));
  };
  const plural = (n) => (n === 1 ? '1 Partie' : `${n} Partien`);
  return h('section', { class: 'result recap' },
    h('div', { class: isNew ? 'winner fresh' : 'winner' },
      h('strong', {}, '🌙 Rückblick auf den Abend'),
      h('span', {}, `${plural(recap.games)} gespielt – das waren die Besten`)),
    h('div', { class: 'podium' }, [2, 1, 3].map(step)),
    h('ul', { class: 'recap-games' }, recap.perGame.map((g) => h('li', {},
      h('span', { class: 'game-icon' }, GAMES[g.gameId].icon),
      h('strong', {}, GAMES[g.gameId].name),
      h('span', { class: 'hint' }, `${g.played}× gespielt · meiste Siege: ${g.winners.join(' & ')} (${g.wins})`)))),
    awardList(recap.awards.map((award) => ({ ...award, detail: award.count > 1 ? `${award.count}× ausgezeichnet` : '' }))));
}

function awardList(awards) {
  if (awards.length === 0) return null;
  return h('ul', { class: 'awards' }, awards.map((award) => h('li', {},
    h('span', { class: 'award-icon' }, award.icon),
    h('strong', {}, award.title),
    h('span', {}, award.names.join(' & ')),
    h('span', { class: 'hint' }, award.detail))));
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

function nameInput() {
  return h('input', { name: 'name', required: true, maxlength: 16, autocomplete: 'nickname', placeholder: 'z. B. Anna' });
}
