import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, GLOBE_THEMES, isPreviewRequested, themeIdFromSearch } from "../src/globeThemes.js";

test("uses the default theme when none is requested", () => {
  assert.equal(themeIdFromSearch(""), DEFAULT_THEME);
});

test("uses a known requested theme", () => {
  assert.equal(themeIdFromSearch("?globe=arcade"), "arcade");
});

test("falls back to the default for an unknown theme", () => {
  assert.equal(themeIdFromSearch("?globe=nope"), DEFAULT_THEME);
});

test("does not treat inherited object keys as themes", () => {
  assert.equal(themeIdFromSearch("?globe=toString"), DEFAULT_THEME);
});

test("shows the preview switcher only when a globe parameter is present", () => {
  assert.equal(isPreviewRequested("?globe"), true);
  assert.equal(isPreviewRequested("?globe=crt"), true);
  assert.equal(isPreviewRequested(""), false);
});

test("every theme defines the full set of colors", () => {
  for (const theme of Object.values(GLOBE_THEMES)) {
    assert.deepEqual(Object.keys(theme.colors).sort(), ["atmosphere", "grid", "hud", "land", "ocean", "pin", "rim", "stars"]);
  }
});
