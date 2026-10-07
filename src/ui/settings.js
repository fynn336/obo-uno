import { audioSettings, setVolume, toggleEffects, toggleMusic } from './audio.js';
import { h } from './dom.js';
import { currentRoom, ROOMS, roomImage, setRoom } from './rooms.js';

// onChange hält die Schnellknöpfe in der Ecke aktuell.
export function openSettings(onChange) {
  const { music, effects, volume } = audioSettings();
  const toggle = (label, checked, action) => h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked, onChange: () => { action(); onChange(); } }), label);
  const chooseRoom = (room, button) => {
    setRoom(room);
    for (const other of button.parentElement.children) other.setAttribute('aria-pressed', String(other === button));
  };
  const dialog = h('dialog', { class: 'dialog settings' },
    h('h2', {}, 'Einstellungen'),
    h('section', {},
      h('h3', {}, 'Ton'),
      toggle('Musik', music, toggleMusic),
      toggle('Soundeffekte', effects, toggleEffects),
      h('label', { class: 'toggle' }, 'Lautstärke', h('input', {
        type: 'range',
        min: 0,
        max: 100,
        value: Math.round(volume * 100),
        onInput: (event) => setVolume(event.target.value / 100),
      }))),
    h('section', {},
      h('h3', {}, 'Raum'),
      h('div', { class: 'room-choices' }, ROOMS.map((room) => h('button', {
        type: 'button',
        class: 'room-choice',
        'aria-pressed': String(room === currentRoom()),
        onClick: (event) => chooseRoom(room, event.currentTarget),
      }, h('img', { src: roomImage(room), alt: '' }), h('span', {}, room.name))))),
    h('form', { method: 'dialog' }, h('button', { class: 'primary' }, 'Schließen')));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
