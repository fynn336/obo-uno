// Auszeichnungen am Partieende: je Eintrag { icon, title, count(player), describe(n) } gewinnt, wer den höchsten
// Wert hat; bei 0 gibt es die Auszeichnung nicht.
export function awardsFor(players, definitions) {
  return definitions.flatMap(({ icon, title, count, describe }) => {
    const best = Math.max(0, ...players.map(count));
    if (best === 0) return [];
    const names = players.filter((p) => count(p) === best).map((p) => p.name);
    return [{ icon, title, detail: describe(best), names }];
  });
}
