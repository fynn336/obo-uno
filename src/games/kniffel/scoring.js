const UPPER_BONUS_FROM = 63;
const UPPER_BONUS = 35;

const faceSum = (face) => ({ counts }) => counts[face] * face;
const hasRun = (counts, from, length) => Array.from({ length }, (_, i) => from + i).every((face) => counts[face] > 0);

export const CATEGORIES = [
  { key: 'ones', label: 'Einser', upper: true, score: faceSum(1) },
  { key: 'twos', label: 'Zweier', upper: true, score: faceSum(2) },
  { key: 'threes', label: 'Dreier', upper: true, score: faceSum(3) },
  { key: 'fours', label: 'Vierer', upper: true, score: faceSum(4) },
  { key: 'fives', label: 'Fünfer', upper: true, score: faceSum(5) },
  { key: 'sixes', label: 'Sechser', upper: true, score: faceSum(6) },
  { key: 'threeKind', label: 'Dreierpasch', score: ({ most, sum }) => (most >= 3 ? sum : 0) },
  { key: 'fourKind', label: 'Viererpasch', score: ({ most, sum }) => (most >= 4 ? sum : 0) },
  { key: 'fullHouse', label: 'Full House', score: ({ counts }) => (counts.includes(3) && counts.includes(2) ? 25 : 0) },
  {
    key: 'smallStraight', label: 'Kleine Straße',
    score: ({ counts }) => ([1, 2, 3].some((from) => hasRun(counts, from, 4)) ? 30 : 0),
  },
  {
    key: 'largeStraight', label: 'Große Straße',
    score: ({ counts }) => ([1, 2].some((from) => hasRun(counts, from, 5)) ? 40 : 0),
  },
  { key: 'kniffel', label: 'Kniffel', score: ({ most }) => (most === 5 ? 50 : 0) },
  { key: 'chance', label: 'Chance', score: ({ sum }) => sum },
];

export function scoreFor(key, dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) counts[face]++;
  const facts = { counts, most: Math.max(...counts), sum: dice.reduce((a, b) => a + b, 0) };
  return CATEGORIES.find((category) => category.key === key).score(facts);
}

export function emptySheet() {
  return Object.fromEntries(CATEGORIES.map((category) => [category.key, null]));
}

export function totals(sheet) {
  const sumOf = (upper) => CATEGORIES
    .filter((category) => Boolean(category.upper) === upper)
    .reduce((sum, category) => sum + (sheet[category.key] ?? 0), 0);
  const upper = sumOf(true);
  const bonus = upper >= UPPER_BONUS_FROM ? UPPER_BONUS : 0;
  return { upper, bonus, total: upper + bonus + sumOf(false) };
}

export function isSheetFull(sheet) {
  return Object.values(sheet).every((points) => points !== null);
}
