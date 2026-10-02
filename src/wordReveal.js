import { create } from "./dom.js";

// Splits text into words that each rise out of their own clipping box, staggered
// by position. The `--i` property drives the animation delay in CSS.
export function buildRevealWords(text, firstIndex = 0) {
  const nodes = [];
  text.split(" ").forEach((word, offset) => {
    const frame = create("span", "reveal-word");
    const inner = create("span", "reveal-word-inner", word);
    inner.style.setProperty("--i", firstIndex + offset);
    frame.append(inner);
    nodes.push(frame, " ");
  });
  return nodes;
}

export function countWords(text) {
  return text.split(" ").length;
}
