export const PEER_PREFIX = 'dfuno-';
export const PING_INTERVAL_MS = 2000;
export const SILENCE_TIMEOUT_MS = 8000;
export const CONNECT_TIMEOUT_MS = 15000;
export const RECONNECT_GRACE_MS = 60000;
export const HOST_LEFT = 'Der Host hat das Spiel verlassen';

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

const ACTION_FIELDS = {
  setRule: { rule: 'string', value: 'boolean' },
  setTarget: { value: 'number' },
  setTurnTime: { value: 'number' },
  setAvatar: { emoji: 'string', color: 'number' },
  start: {},
  play: { cardId: 'number' },
  chooseColor: { color: 'string' },
  draw: {},
  pass: {},
  challenge: {},
  callUno: {},
  catchUno: { targetId: 'string' },
};

export function readClientMessage(data) {
  if (!isObject(data)) return null;
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

// Übernimmt nur bekannte Aktionen mit korrekt typisierten Feldern; playerId setzt immer der Host.
export function readAction(raw) {
  if (!isObject(raw) || !Object.hasOwn(ACTION_FIELDS, raw.type)) return null;
  const action = { type: raw.type };
  for (const [key, type] of Object.entries(ACTION_FIELDS[raw.type])) {
    if (typeof raw[key] !== type) return null;
    action[key] = raw[key];
  }
  return action;
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}
