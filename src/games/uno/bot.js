import { COLORS } from './deck.js';
import { isRunning, playableCardIds } from './game.js';

// Reihenfolge beim Ausspielen: Aktionskarten zuerst, Wild-Karten so spät wie möglich
const CARD_PREFERENCE = ['draw2', 'skip', 'reverse', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0', 'wild', 'wild4'];

// Nächste Aktion des Computer-Gegners am Zug, oder null, wenn er nichts zu tun hat.
export function botAction(state, botId) {
  if (!isRunning(state) || state.players[state.current].id !== botId) return null;
  const bot = state.players[state.current];
  if (state.phase === 'chooseColor') return { type: 'chooseColor', playerId: botId, color: favoriteColor(bot.hand) };
  if (state.phase === 'chooseSwap') return { type: 'swapHands', playerId: botId, targetId: fewestCards(state, bot).id };
  const playable = bot.hand.filter((card) => playableCardIds(state, botId).includes(card.id));
  if (playable.length === 0) return { type: state.drawnCardId === null ? 'draw' : 'pass', playerId: botId };
  if (bot.hand.length === 2 && !bot.saidUno) return { type: 'callUno', playerId: botId };
  const [best] = playable.sort((a, b) => CARD_PREFERENCE.indexOf(a.value) - CARD_PREFERENCE.indexOf(b.value));
  return { type: 'play', playerId: botId, cardId: best.id };
}

// Tauschpartner bei der 7: wer die wenigsten Karten hat
function fewestCards(state, bot) {
  return state.players.filter((p) => p !== bot).reduce((best, p) => (p.hand.length < best.hand.length ? p : best));
}

function favoriteColor(hand) {
  const count = (color) => hand.filter((card) => card.color === color).length;
  return COLORS.reduce((best, color) => (count(color) > count(best) ? color : best));
}
