const SPARK_LIFETIME_MS = 650;
const FLECK_COUNT = 9;
const FLECK_LIFETIME_MS = 900;
const FLECK_SPREAD_PX = 110;

// A small glyph that drifts up from the caret each time a key is typed.
export function emitKeySpark(anchor, character) {
  if (prefersReducedMotion() || !anchor || !character.trim()) return;
  const rect = anchor.getBoundingClientRect();
  const spark = document.createElement("span");
  spark.className = "key-spark";
  spark.textContent = character;
  spark.style.left = `${rect.left}px`;
  spark.style.top = `${rect.top}px`;
  spark.style.setProperty("--drift", `${(Math.random() - 0.5) * 16}px`);
  document.body.append(spark);
  setTimeout(() => spark.remove(), SPARK_LIFETIME_MS);
}

// Paper flecks that flutter out of the book's spine when a page turns.
export function burstPaperFlecks(book) {
  if (prefersReducedMotion() || !book) return;
  const rect = book.getBoundingClientRect();
  for (let index = 0; index < FLECK_COUNT; index += 1) {
    const fleck = document.createElement("span");
    fleck.className = "paper-fleck";
    fleck.style.left = `${rect.left + rect.width / 2}px`;
    fleck.style.top = `${rect.top + rect.height * (0.3 + Math.random() * 0.4)}px`;
    fleck.style.setProperty("--dx", `${(Math.random() - 0.5) * 2 * FLECK_SPREAD_PX}px`);
    fleck.style.setProperty("--dy", `${-20 - Math.random() * FLECK_SPREAD_PX}px`);
    fleck.style.setProperty("--spin", `${(Math.random() - 0.5) * 540}deg`);
    document.body.append(fleck);
    setTimeout(() => fleck.remove(), FLECK_LIFETIME_MS);
  }
}

function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
