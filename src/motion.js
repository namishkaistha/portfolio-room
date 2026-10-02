export function approach(value, target, maxStep) {
  if (value < target) return Math.min(target, value + maxStep);
  return Math.max(target, value - maxStep);
}

export function smoothstep(t) {
  return t * t * (3 - 2 * t);
}
