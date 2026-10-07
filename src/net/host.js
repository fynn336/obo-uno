import { VERSION } from '../changelog.js';
import { createLounge, isPlaying, nextBotMove, reduce, turnTimer, viewFor } from '../lounge/lounge.js';
import {
  CONNECT_TIMEOUT_MS,
  MSG,
  PEER_PREFIX,
  PING_INTERVAL_MS,
  RECONNECT_GRACE_MS,
  SILENCE_TIMEOUT_MS,
  readAction,
  readClientMessage,
} from './protocol.js';

const SERVER_RETRY_MS = 3000;
const BOT_DELAY_MS = 1100;

export function hostLounge(name, events) {
  const hostId = crypto.randomUUID();
  const created = createLounge({ hostId, hostName: name, seed: crypto.getRandomValues(new Uint32Array(1))[0] });
  if (created.error) {
    events.onEnd(created.error);
    return null;
  }
  let state = created.state;
  const seats = new Map(); // playerId → { playerId, token, link, kickTimer }
  const links = new Set(); // { conn, playerId, lastSeen }
  let timerHandle = null;
  let turnKey = null;
  let turnDeadline = null;
  let botTimer = null;

  openLounge();
  setInterval(checkLinks, PING_INTERVAL_MS);

  function openLounge() {
    const code = String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0');
    const peer = new Peer(PEER_PREFIX + code);
    let opened = false;
    peer.on('open', () => {
      if (opened) return;
      opened = true;
      peer.on('disconnected', () => setTimeout(() => {
        if (!peer.destroyed) peer.reconnect();
      }, SERVER_RETRY_MS));
      peer.on('connection', accept);
      events.onReady({ code });
      publish();
    });
    peer.on('error', (error) => {
      if (opened) return;
      if (error.type === 'unavailable-id') openLounge();
      else events.onEnd('Die Lounge konnte nicht erstellt werden. Bitte später noch einmal versuchen.');
    });
  }

  function accept(conn) {
    const link = { conn, playerId: null, lastSeen: Date.now() };
    links.add(link);
    conn.on('data', (data) => receive(link, data));
    conn.on('close', () => drop(link));
  }

  function receive(link, data) {
    link.lastSeen = Date.now();
    const message = readClientMessage(data);
    if (message?.type === MSG.JOIN && link.playerId === null) join(link, message);
    if (message?.type === MSG.ACTION && seats.get(link.playerId)?.link === link) {
      dispatch(link.playerId, message.action);
    }
  }

  function join(link, { name, token, version }) {
    if (version !== VERSION) {
      reject(link, `Deine Version (${version ?? 'alt'}) passt nicht zum Host (${VERSION}). Bitte die Seite mit Strg+F5 neu laden.`);
      return;
    }
    const known = [...seats.values()].find((seat) => seat.token === token);
    if (known) {
      attach(link, known);
      apply({ type: 'setConnected', playerId: known.playerId, connected: true });
      return;
    }
    const playerId = crypto.randomUUID();
    const result = reduce(state, { type: 'join', playerId, name });
    if (result.error) {
      reject(link, result.error);
      return;
    }
    state = result.state;
    const seat = { playerId, token: crypto.randomUUID(), link: null, kickTimer: null };
    seats.set(playerId, seat);
    attach(link, seat);
    publish();
  }

  function attach(link, seat) {
    const previous = seat.link;
    seat.link = link;
    link.playerId = seat.playerId;
    if (previous) reject(previous, 'Du spielst jetzt in einem anderen Tab weiter');
    clearTimeout(seat.kickTimer);
    send(link, { type: MSG.WELCOME, playerId: seat.playerId, token: seat.token });
  }

  function reject(link, reason) {
    send(link, { type: MSG.REJECTED, reason });
    link.conn.close({ flush: true });
  }

  function drop(link) {
    if (!links.delete(link)) return;
    link.conn.close();
    const seat = seats.get(link.playerId);
    if (seat?.link !== link) return;
    seat.link = null;
    if (!isPlaying(state, seat.playerId)) {
      removeSeat(seat);
      return;
    }
    apply({ type: 'setConnected', playerId: seat.playerId, connected: false });
    seat.kickTimer = setTimeout(() => removeSeat(seat), RECONNECT_GRACE_MS);
  }

  function removeSeat(seat) {
    seats.delete(seat.playerId);
    clearTimeout(seat.kickTimer);
    apply({ type: 'leave', playerId: seat.playerId });
  }

  function checkLinks() {
    const now = Date.now();
    for (const link of links) {
      const limit = link.playerId === null ? CONNECT_TIMEOUT_MS : SILENCE_TIMEOUT_MS;
      if (now - link.lastSeen > limit) drop(link);
      else send(link, { type: MSG.PING });
    }
  }

  function dispatch(playerId, action) {
    const error = apply({ ...action, playerId });
    if (!error) return;
    if (playerId === hostId) events.onError(error);
    else send(seats.get(playerId).link, { type: MSG.ERROR, message: error });
  }

  function apply(action) {
    const result = reduce(state, action);
    if (result.error) return result.error;
    state = result.state;
    scheduleTurnTimer();
    scheduleBot();
    publish();
  }

  function scheduleBot() {
    clearTimeout(botTimer);
    if (!nextBotMove(state)) return;
    botTimer = setTimeout(() => {
      const next = nextBotMove(state);
      if (next) apply({ type: 'move', playerId: next.playerId, move: next.move });
    }, BOT_DELAY_MS);
  }

  // Jede neue Entscheidung im Spiel startet die Uhr neu; bei getrennten Spielern läuft sie nicht.
  function scheduleTurnTimer() {
    const timer = turnTimer(state);
    const waitsForConnected = timer && state.players.find((p) => p.id === timer.playerId)?.connected;
    const key = waitsForConnected ? timer.key : null;
    if (key === turnKey) return;
    turnKey = key;
    clearTimeout(timerHandle);
    turnDeadline = key ? Date.now() + timer.seconds * 1000 : null;
    if (key) timerHandle = setTimeout(() => apply({ type: 'timeout', playerId: timer.playerId }), timer.seconds * 1000);
  }

  function publish() {
    const turnEndsIn = turnDeadline ? turnDeadline - Date.now() : null;
    for (const seat of seats.values()) {
      if (seat.link) send(seat.link, { type: MSG.VIEW, view: { ...viewFor(state, seat.playerId), turnEndsIn } });
    }
    events.onView({ ...viewFor(state, hostId), turnEndsIn });
  }

  function send(link, message) {
    if (link.conn.open) link.conn.send(message);
  }

  return {
    send(raw) {
      const action = readAction(raw);
      if (action) dispatch(hostId, action);
    },
  };
}
