import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
const { rememberSitePlay, isSitePlay } = await import("../src/sitePlays.js");

const MINUTE = 60 * 1000;
const START = 1_000_000;

beforeEach(() => store.clear());

test("a record played on the site is an echo for the next few minutes", () => {
  rememberSitePlay("track-a", START);
  assert.equal(isSitePlay("track-a", START + MINUTE), true);
  assert.equal(isSitePlay("track-b", START + MINUTE), false);
});

test("the echo expires, so later listening to the same song shows again", () => {
  rememberSitePlay("track-a", START);
  assert.equal(isSitePlay("track-a", START + 11 * MINUTE), false);
});

test("plays saved in the old format (bare URIs) are ignored", () => {
  store.set("namish-room:recent-site-plays", JSON.stringify(["track-a"]));
  assert.equal(isSitePlay("track-a", START), false);
});
