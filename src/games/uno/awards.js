const AWARDS = [
  { stat: 'wild4', icon: '😈', title: 'Fiesling', describe: (n) => `${n}× Wild +4 gelegt` },
  { stat: 'drawn', icon: '🍀', title: 'Pechvogel', describe: (n) => `${n} Karten gezogen` },
  { stat: 'caught', icon: '🙊', title: 'UNO-Vergesser', describe: (n) => `${n}× erwischt worden` },
  { stat: 'catches', icon: '🦅', title: 'Adlerauge', describe: (n) => `${n}× jemanden erwischt` },
];

// Pro Kategorie gewinnt der Höchstwert; bei Gleichstand alle, ohne einen einzigen Treffer niemand.
export function gameAwards(players) {
  return AWARDS.flatMap(({ stat, icon, title, describe }) => {
    const best = Math.max(0, ...players.map((p) => p.stats[stat]));
    if (best === 0) return [];
    const names = players.filter((p) => p.stats[stat] === best).map((p) => p.name);
    return [{ icon, title, detail: describe(best), names }];
  });
}
