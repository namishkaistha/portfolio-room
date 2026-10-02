import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const stylesheet = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

// Panels are layered over the 3D canvas by CSS alone, so a missing rule leaves
// a station visible but unclickable. Each station's root rule must exist.
const STATION_SELECTORS = [".ide-panel", ".ide-window", ".iframe-panel", ".iframe-window", ".crate-hud", ".book-reader", ".about-card", ".about-sheet", ".notes-panel", ".notes-sheet", ".notes-note", ".travel-globe", ".travel-card"];

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
