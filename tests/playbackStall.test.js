import test from "node:test";
import assert from "node:assert/strict";
import { hasPlaybackStalled, hasProgressed } from "../src/playbackStall.js";

const playing = (position, uri = "a") => ({ isPaused: false, position, playingURI: uri });

test("moving position counts as progress", () => {
  assert.equal(hasProgressed(playing(1000), playing(2000)), true);
});

test("a position stuck while 'playing' is not progress", () => {
  assert.equal(hasProgressed(playing(1000), playing(1000)), false);
});

test("a paused update is not progress", () => {
  assert.equal(hasProgressed(playing(1000), { ...playing(2000), isPaused: true }), false);
});

test("a new track counts as progress", () => {
  assert.equal(hasProgressed(playing(5000, "a"), playing(0, "b")), true);
});

test("no previous update is not progress", () => {
  assert.equal(hasProgressed(null, playing(0)), false);
});

test("stalled once the limit passes", () => {
  assert.equal(hasPlaybackStalled(7000, 7000), true);
  assert.equal(hasPlaybackStalled(6999, 7000), false);
});
