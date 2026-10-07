import { VERSION } from '../changelog.js';
import {
  CONNECT_TIMEOUT_MS,
  HOST_LEFT,
  MSG,
  PEER_PREFIX,
  PING_INTERVAL_MS,
  RECONNECT_GRACE_MS,
  SILENCE_TIMEOUT_MS,
} from './protocol.js';

const STORAGE_KEY = 'dfuno-session';

export function savedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function joinGame(code, name, events) {
  let token = savedSession()?.code === code ? savedSession().token : null;
  let peer = null;
  let conn = null;
  let connected = false;
  let lostSince = null;
  let lastSeen = 0;
  const heartbeat = setInterval(checkHost, PING_INTERVAL_MS);
  connect();

  function connect() {
    conn = null;
    peer?.destroy();
    const attempt = new Peer();
    peer = attempt;
    lastSeen = Date.now();
    attempt.on('open', () => {
      const current = attempt.connect(PEER_PREFIX + code, { serialization: 'json', reliable: true });
      conn = current;
      current.on('open', () => current.send({ type: MSG.JOIN, name, token, version: VERSION }));
      current.on('data', (message) => {
        if (current === conn) receive(message);
      });
      current.on('close', () => {
        if (current === conn) lose();
      });
    });
    attempt.on('error', (error) => {
      if (attempt === peer && error.type === 'peer-unavailable') {
        end(token ? HOST_LEFT : 'Keine Lobby mit diesem Code gefunden');
      }
    });
  }

  function receive(message) {
    lastSeen = Date.now();
    if (message.type === MSG.WELCOME) {
      connected = true;
      lostSince = null;
      token = message.token;
      store({ code, name, token });
    } else if (message.type === MSG.VIEW) {
      events.onView(message.view);
    } else if (message.type === MSG.ERROR) {
      events.onError(message.message);
    } else if (message.type === MSG.REJECTED) {
      end(message.reason);
    }
  }

  function checkHost() {
    if (connected) {
      conn.send({ type: MSG.PING });
      if (Date.now() - lastSeen > SILENCE_TIMEOUT_MS) lose();
    } else if (lostSince !== null && Date.now() - lostSince > RECONNECT_GRACE_MS) {
      end('Die Verbindung zum Host ist abgebrochen');
    } else if (Date.now() - lastSeen > CONNECT_TIMEOUT_MS) {
      if (lostSince === null) end('Keine Verbindung zum Host möglich');
      else connect();
    }
  }

  function lose() {
    if (!connected) return;
    connected = false;
    lostSince = Date.now();
    events.onError('Verbindung unterbrochen – verbinde neu …');
    connect();
  }

  function end(message) {
    clearInterval(heartbeat);
    connected = false;
    conn = null;
    peer.destroy();
    peer = null;
    store(null);
    events.onEnd(message);
  }

  return {
    send(action) {
      if (connected) conn.send({ type: MSG.ACTION, action });
      else events.onError('Gerade keine Verbindung zum Host');
    },
  };
}

function store(session) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ohne sessionStorage klappt nur der Reconnect per Reload nicht
  }
}
