export function approach(value, target, maxStep) {
  if (value < target) return Math.min(target, value + maxStep);
  return Math.max(target, value - maxStep);
}

export function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// Pull runs 0 (stowed) to 1 (out and facing the viewer). The first
// `slideShare` of it slides the piece straight out, the rest turns it, so it
// never cuts through its neighbours on the shelf.
export function slideThenTurn(pull, slideShare) {
  return {
    slide: smoothstep(Math.min(pull / slideShare, 1)),
    turn: smoothstep(Math.max((pull - slideShare) / (1 - slideShare), 0)),
  };
}
