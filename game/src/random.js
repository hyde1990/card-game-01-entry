// Ember Court — a tiny seeded RNG (mulberry32) so a fixed seed always deals the
// same hands and the same Duchess. Every deterministic shot and logic test runs
// through this, never through Math.random.
export function createRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates shuffle driven by the seeded RNG; returns a new array. The
// input array is never mutated, so the catalogue order stays intact.
export function shuffle(array, random) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
