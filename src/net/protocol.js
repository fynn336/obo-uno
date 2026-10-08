import { readFields } from '../shared/fields.js';

export const PEER_PREFIX = 'dfuno-';
export const PING_INTERVAL_MS = 2000;
export const SILENCE_TIMEOUT_MS = 8000;
export const CONNECT_TIMEOUT_MS = 15000;
export const RECONNECT_GRACE_MS = 60000;
// So lange öffnet ein neu geladener Host seine Lounge wieder und so lange warten die Spieler auf ihn.
export const HOST_RETURN_MS = 30000;
export const RETRY_MS = 3000;
export const HOST_LEFT = 'Der Host hat die Lounge verlassen';

export const MSG = {
  // Client → Host
  JOIN: 'join', // { name, token, version }
  ACTION: 'action', // { action }
  // Host → Client
  WELCOME: 'welcome', // { playerId, token }
  REJECTED: 'rejected', // { reason }
  VIEW: 'view', // { view }
  ERROR: 'error', // { message }
  // beide Richtungen, hält den Heartbeat am Leben
  PING: 'ping',
};

// Aktionen, die Clients schicken dürfen. Spielzüge stecken in move und prüft das jeweilige Spiel.
const ACTION_FIELDS = {
  setAvatar: { emoji: 'string', color: 'number' },
  addBot: {},
  removeBot: { targetId: 'string' },
  setBotLevel: { level: 'string' },
  selectGame: { gameId: 'string' },
  setSetting: { gameId: 'string', key: 'string', value: ['boolean', 'number', 'string'] },
  startGame: {},
  abortGame: {},
  newEvening: {},
  move: { move: 'object' },
};

export function readClientMessage(data) {
  if (typeof data !== 'object' || data === null) return null;
  if (data.type === MSG.PING) return { type: MSG.PING };
  if (data.type === MSG.JOIN && typeof data.name === 'string' && (data.token === null || typeof data.token === 'string')) {
    // Ältere Clients schicken keine Version; sie werden vom Host als veraltet abgelehnt.
    const version = typeof data.version === 'string' ? data.version : null;
    return { type: MSG.JOIN, name: data.name, token: data.token, version };
  }
  if (data.type === MSG.ACTION) {
    const action = readAction(data.action);
    return action && { type: MSG.ACTION, action };
  }
  return null;
}

// playerId setzt immer der Host, nie der Client.
export function readAction(raw) {
  return readFields(raw, ACTION_FIELDS);
}
