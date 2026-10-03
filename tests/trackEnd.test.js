import test from "node:test";
import assert from "node:assert/strict";
import { hasTrackEnded } from "../src/trackEnd.js";

const URI = "spotify:track:a";
const TOLERANCE_MS = 1800;
const tick = (position, extra = {}) => ({ playingURI: URI, duration: 29000, position, isPaused: false, ...extra });

test("ends when the position reaches the tolerance window", () => {
  assert.equal(hasTrackEnded(tick(26000), tick(27500), URI, TOLERANCE_MS), true);
});

test("keeps playing mid-track", () => {
  assert.equal(hasTrackEnded(tick(10000), tick(11060), URI, TOLERANCE_MS), false);
});

test("ends when the last tick was missed and the track rewinds to the start", () => {
  assert.equal(hasTrackEnded(tick(25900), tick(0), URI, TOLERANCE_MS), true);
});

test("ends when the embed pauses at zero after playing", () => {
  assert.equal(hasTrackEnded(tick(25900), tick(0, { isPaused: true }), URI, TOLERANCE_MS), true);
});

test("a fresh load paused at zero is not an ending", () => {
  assert.equal(hasTrackEnded(null, tick(0, { isPaused: true }), URI, TOLERANCE_MS), false);
});

test("ignores updates for a different track", () => {
  assert.equal(hasTrackEnded(tick(26000), { ...tick(28000), playingURI: "spotify:track:b" }, URI, TOLERANCE_MS), false);
});

test("a user pause mid-track is not an ending", () => {
  assert.equal(hasTrackEnded(tick(12000), tick(12900, { isPaused: true }), URI, TOLERANCE_MS), false);
});
