import { CHANGELOG, VERSION } from '../changelog.js';
import { h } from './dom.js';

export function renderCorner(root) {
  root.replaceChildren(
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
