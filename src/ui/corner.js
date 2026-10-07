import { CHANGELOG, VERSION } from '../changelog.js';
import { audioSettings, toggleEffects, toggleMusic } from './audio.js';
import { h } from './dom.js';

export function renderCorner(root) {
  const { music, effects } = audioSettings();
  const toggle = (action) => () => {
    action();
    renderCorner(root);
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
    h('button', { type: 'button', class: 'version', title: 'Was ist neu?', onClick: openChangelog }, `v${VERSION}`),
  );
}

function openChangelog() {
  const dialog = h('dialog', { class: 'changelog' },
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
