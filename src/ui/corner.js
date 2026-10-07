import { CHANGELOG, VERSION } from '../changelog.js';
import { audioSettings, toggleEffects, toggleMusic } from './audio.js';
import { h } from './dom.js';
import { openSettings } from './settings.js';

export function renderCorner(root) {
  const { music, effects } = audioSettings();
  const refresh = () => renderCorner(root);
  const toggle = (action) => () => {
    action();
    refresh();
  };
  root.replaceChildren(
    h('button', {
      type: 'button',
      class: music ? '' : 'off',
      title: music ? 'Musik ausschalten' : 'Musik einschalten',
      'aria-pressed': String(music),
      onClick: toggle(toggleMusic),
    }, '🎵'),
    h('button', {
      type: 'button',
      class: effects ? '' : 'off',
      title: effects ? 'Soundeffekte ausschalten' : 'Soundeffekte einschalten',
      'aria-pressed': String(effects),
      onClick: toggle(toggleEffects),
    }, '🔊'),
    h('button', { type: 'button', title: 'Einstellungen', onClick: () => openSettings(refresh) }, '⚙️'),
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
