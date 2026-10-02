// Deterministic random numbers so procedural decor looks identical on every visit.
export function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}
