import { MSG, readAction, readClientMessage } from '../src/net/protocol.js';
import { test, assertEqual } from './testing.js';

test('Protokoll: gültige Lounge-Aktionen werden übernommen', () => {
  assertEqual(readAction({ type: 'selectGame', gameId: 'uno' }), { type: 'selectGame', gameId: 'uno' }, 'selectGame');
  assertEqual(readAction({ type: 'setSetting', gameId: 'uno', key: 'stacking', value: true }),
    { type: 'setSetting', gameId: 'uno', key: 'stacking', value: true }, 'Schalter');
  assertEqual(readAction({ type: 'setSetting', gameId: 'uno', key: 'target', value: 300 }),
    { type: 'setSetting', gameId: 'uno', key: 'target', value: 300 }, 'Auswahl');
  assertEqual(readAction({ type: 'move', move: { type: 'play', cardId: 7 } }), { type: 'move', move: { type: 'play', cardId: 7 } }, 'Spielzug');
});

test('Protokoll: eingeschleuste playerId und Zusatzfelder werden verworfen', () => {
  assertEqual(readAction({ type: 'startGame', playerId: 'someone-else', extra: 1 }), { type: 'startGame' }, 'startGame');
});

test('Protokoll: unbekannte Aktionen und falsche Feldtypen werden abgelehnt', () => {
  for (const raw of [
    null, 'startGame', { type: 'join', name: 'x' }, { type: 'leave' }, { type: 'setConnected' }, { type: 'timeout' },
    { type: 'toString' }, { type: '__proto__' }, { type: 'play', cardId: 7 }, { type: 'move', move: null },
    { type: 'move', move: 'play' }, { type: 'setSetting', gameId: 'uno', key: 'stacking', value: 'yes' },
    { type: 'removeBot' },
  ]) {
    assertEqual(readAction(raw), null, JSON.stringify(raw));
  }
});

test('Protokoll: Join- und Ping-Nachrichten werden geprüft', () => {
  assertEqual(readClientMessage({ type: MSG.JOIN, name: 'Anna', token: null, version: '1.3.0' }),
    { type: MSG.JOIN, name: 'Anna', token: null, version: '1.3.0' }, 'join');
  assertEqual(readClientMessage({ type: MSG.JOIN, name: 'Anna', token: null }).version, null, 'alte Version ohne Angabe');
  assertEqual(readClientMessage({ type: MSG.JOIN, name: 42, token: null }), null, 'Name keine Zeichenkette');
  assertEqual(readClientMessage({ type: MSG.JOIN, name: 'Anna', token: {} }), null, 'Token kein String');
  assertEqual(readClientMessage({ type: MSG.PING, junk: true }), { type: MSG.PING }, 'ping');
  assertEqual(readClientMessage({ type: MSG.ACTION, action: { type: 'newEvening' } }), { type: MSG.ACTION, action: { type: 'newEvening' } }, 'action');
  assertEqual(readClientMessage({ type: MSG.ACTION, action: { type: 'leave' } }), null, 'interne Aktion');
  assertEqual(readClientMessage({ type: MSG.WELCOME }), null, 'Host-Nachricht vom Client');
});
