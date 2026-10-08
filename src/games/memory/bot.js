// Wie viele der zuletzt aufgedeckten Karten sich der Bot merkt
const MEMORY = { easy: 4, medium: 12, hard: Infinity };

// Der Bot kennt nur, was alle gesehen haben: die zuletzt aufgedeckten Karten, je nach Stärke mehr oder weniger.
export function botMove(state, botId, level = 'medium') {
  if (state.phase !== 'flip' || state.players[state.current].id !== botId) return null;
  const free = (index) => state.cards[index].owner === null && !state.open.includes(index);
  const remembered = new Map();
  for (const index of state.history.slice(-MEMORY[level])) if (free(index)) remembered.set(index, state.cards[index].motif);
  const flip = (index) => ({ type: 'flip', index });
  const partnerOf = (index, motif) => [...remembered].find(([other, m]) => other !== index && m === motif)?.[0];
  if (state.open.length === 1) {
    const partner = partnerOf(state.open[0], state.cards[state.open[0]].motif);
    if (partner !== undefined) return flip(partner);
  } else {
    const pair = [...remembered].find(([index, motif]) => partnerOf(index, motif) !== undefined);
    if (pair) return flip(pair[0]);
  }
  // Sonst eine Karte, die er sich nicht gemerkt hat
  const unknown = state.cards.map((_, i) => i).filter((i) => free(i) && !remembered.has(i));
  const choices = unknown.length > 0 ? unknown : state.cards.map((_, i) => i).filter(free);
  return flip(choices[(state.turnNumber * 7 + state.history.length * 13) % choices.length]);
}
