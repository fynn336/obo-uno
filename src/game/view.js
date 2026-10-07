import { handPoints, isRunning, playableCardIds } from './game.js';

const VISIBLE_EVENTS = 8;

export function viewFor(state, playerId) {
  const me = state.players.find((p) => p.id === playerId);
  const currentId = isRunning(state) ? state.players[state.current].id : null;
  return {
    you: playerId,
    phase: state.phase,
    hostId: state.hostId,
    rules: state.rules,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      cardCount: p.hand.length,
      saidUno: p.saidUno,
      catchable: state.unoWindow === p.id,
      score: p.score,
      // Nach Rundenende liegen die Karten offen: ihr Punktwert ist öffentlich
      handPoints: state.phase === 'roundOver' ? handPoints(p.hand) : null,
    })),
    target: state.target,
    championId: state.championId,
    hand: me ? me.hand : [],
    playableIds: playableCardIds(state, playerId),
    drawnCardId: currentId === playerId ? state.drawnCardId : null,
    currentId,
    direction: state.direction,
    activeColor: state.activeColor,
    topCard: state.discardPile.at(-1) ?? null,
    drawPileCount: state.drawPile.length,
    pendingDraw: state.pendingDraw,
    winnerId: state.winnerId,
    events: state.events.slice(-VISIBLE_EVENTS),
  };
}
