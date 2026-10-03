import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const STYLES_DIR = new URL("../src/styles/", import.meta.url);
const stylesheet = readdirSync(STYLES_DIR).map((file) => readFileSync(new URL(file, STYLES_DIR), "utf8")).join("\n");

// Panels are layered over the 3D canvas by CSS alone, so a missing rule leaves
// a station visible but unclickable. Each station's root rule must exist.
const STATION_SELECTORS = [".ide-panel", ".ide-window", ".iframe-panel", ".iframe-window", ".crate-hud", ".book-reader", ".about-card", ".about-sheet", ".notes-panel", ".notes-sheet", ".notes-note", ".notes-composer", ".notes-paper", ".notes-add", ".closet-panel", ".closet-chip", ".closet-piece", ".closet-photo", ".closet-lightbox", ".view-overlay", ".sleep-overlay", ".travel-globe", ".travel-card"];

for (const selector of STATION_SELECTORS) {
  test(`style.css defines ${selector}`, () => {
    const rule = new RegExp(`(^|[\\s,}])${selector.replace(".", "\\.")}\\s*[{,]`, "m");
    assert.match(stylesheet, rule);
  });
}

test("fixed station panels sit above the 3D canvas", () => {
  for (const selector of [".ide-panel", ".iframe-panel", ".about-card", ".notes-panel"]) {
    const block = stylesheet.match(new RegExp(`^\\${selector}\\s*\\{([^}]*)\\}`, "m"))?.[1] ?? "";
    assert.match(block, /z-index:\s*\d+/, `${selector} needs a z-index`);
  }
});
