import { MSG, readAction, readClientMessage } from '../src/net/protocol.js';
import { test, assertEqual } from './testing.js';

test('Protokoll: gültige Aktionen werden übernommen', () => {
  assertEqual(readAction({ type: 'play', cardId: 7 }), { type: 'play', cardId: 7 }, 'play');
  assertEqual(readAction({ type: 'chooseColor', color: 'red' }), { type: 'chooseColor', color: 'red' }, 'chooseColor');
  assertEqual(readAction({ type: 'setRule', rule: 'stacking', value: true }), { type: 'setRule', rule: 'stacking', value: true }, 'setRule');
  assertEqual(readAction({ type: 'catchUno', targetId: 'x' }), { type: 'catchUno', targetId: 'x' }, 'catchUno');
});

test('Protokoll: eingeschleuste playerId und Zusatzfelder werden verworfen', () => {
  assertEqual(readAction({ type: 'draw', playerId: 'someone-else', extra: 1 }), { type: 'draw' }, 'draw');
});

test('Protokoll: unbekannte Aktionen und falsche Feldtypen werden abgelehnt', () => {
  for (const raw of [
    null, 'play', { type: 'join', name: 'x' }, { type: 'leave' }, { type: 'setConnected' },
    { type: 'toString' }, { type: '__proto__' }, { type: 'play', cardId: '7' },
    { type: 'setRule', rule: 'stacking', value: 'yes' }, { type: 'catchUno' },
  ]) {
    assertEqual(readAction(raw), null, JSON.stringify(raw));
  }
});

test('Protokoll: Join- und Ping-Nachrichten werden geprüft', () => {
  assertEqual(readClientMessage({ type: MSG.JOIN, name: 'Anna', token: null }), { type: MSG.JOIN, name: 'Anna', token: null }, 'join');
  assertEqual(readClientMessage({ type: MSG.JOIN, name: 42, token: null }), null, 'Name keine Zeichenkette');
  assertEqual(readClientMessage({ type: MSG.JOIN, name: 'Anna', token: {} }), null, 'Token kein String');
  assertEqual(readClientMessage({ type: MSG.PING, junk: true }), { type: MSG.PING }, 'ping');
  assertEqual(readClientMessage({ type: MSG.ACTION, action: { type: 'pass' } }), { type: MSG.ACTION, action: { type: 'pass' } }, 'action');
  assertEqual(readClientMessage({ type: MSG.ACTION, action: { type: 'leave' } }), null, 'interne Aktion');
  assertEqual(readClientMessage({ type: MSG.WELCOME }), null, 'Host-Nachricht vom Client');
});
