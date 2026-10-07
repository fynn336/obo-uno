// mulberry32: liefert [Zufallszahl in [0, 1), Folge-Seed]
export function nextRandom(seed) {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, nextSeed];
}
