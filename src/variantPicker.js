// Picks from a set at random but never the same one twice in a row, so
// repeated sounds (footsteps, key taps) don't machine-gun the same recording.
export function createVariantPicker(variants, random) {
  if (variants.length === 0) throw new Error("A picker needs at least one variant");
  let lastIndex = -1;
  return function pick() {
    if (variants.length === 1) return variants[0];
    let index = Math.floor(random() * variants.length);
    if (index === lastIndex) index = (index + 1) % variants.length;
    lastIndex = index;
    return variants[index];
  };
}
