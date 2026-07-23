export function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed) {
  const random = mulberry32(seed);
  return {
    raw: random,
    float(min, max) {
      return min + random() * (max - min);
    },
    int(min, max) {
      return min + Math.floor(random() * (max - min + 1));
    },
    chance(probability) {
      return random() < probability;
    },
    pick(values) {
      return values[Math.floor(random() * values.length)];
    },
  };
}

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
