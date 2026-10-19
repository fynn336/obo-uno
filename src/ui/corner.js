import { CHANGELOG, VERSION } from '../changelog.js';
import { audioSettings, toggleEffects, toggleMusic } from './audio.js';
import { h } from './dom.js';
import { icon } from './icons.js';
import { openRules } from './rules.js';
import { openSettings } from './settings.js';

// currentGameId liefert das laufende oder gewählte Spiel, damit die Regeln gleich dieses Spiel zeigen.
export function renderCorner(root, currentGameId) {
  const { music, effects } = audioSettings();
  const refresh = () => renderCorner(root, currentGameId);
  const button = (label, iconName, onClick, pressed) => h('button', {
    type: 'button',
    class: 'icon-button',
    title: label,
    'aria-label': label,
    'aria-pressed': pressed === undefined ? null : String(pressed),
    onClick,
  }, icon(iconName));
  const toggle = (action) => () => {
    action();
    refresh();
  };
  root.replaceChildren(
    button(music ? 'Musik ausschalten' : 'Musik einschalten', music ? 'music' : 'musicOff', toggle(toggleMusic), music),
    button(effects ? 'Soundeffekte ausschalten' : 'Soundeffekte einschalten', effects ? 'volume' : 'volumeOff',
      toggle(toggleEffects), effects),
    button('Spielregeln', 'help', () => openRules(currentGameId())),
    button('Einstellungen', 'settings', () => openSettings(refresh)),
    h('button', { type: 'button', class: 'version', title: 'Was ist neu?', onClick: openChangelog }, `v${VERSION}`),
  );
}

function openChangelog() {
  const dialog = h('dialog', { class: 'dialog' },
    h('h2', {}, 'Was ist neu?'),
    CHANGELOG.map((entry) => h('section', {},
      h('h3', {}, `v${entry.version}`, h('span', { class: 'hint' }, ` · ${new Date(entry.date).toLocaleDateString('de-DE')}`)),
      h('ul', {}, entry.changes.map((change) => h('li', {}, change))))),
    h('form', { method: 'dialog' }, h('button', { class: 'primary' }, 'Schließen')));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  dialog.scrollTop = 0;
}
