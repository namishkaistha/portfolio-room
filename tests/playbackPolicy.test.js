import { test } from "node:test";
import assert from "node:assert/strict";
import { intentAfterToggle, shouldPlayWhenReady, shouldResume } from "../src/playbackPolicy.js";

test("toggling a paused embed means the visitor wants music", () => {
  assert.equal(intentAfterToggle(true), "playing");
});

test("toggling a playing embed is a deliberate pause", () => {
  assert.equal(intentAfterToggle(false), "paused");
});

test("an unasked-for pause is undone once settled", () => {
  assert.equal(shouldResume({ intent: "playing", phase: "ready", isEmbedPaused: true }), true);
});

test("a pause the visitor chose is left alone", () => {
  assert.equal(shouldResume({ intent: "paused", phase: "ready", isEmbedPaused: true }), false);
});

test("nothing resumes after the visitor leaves the room", () => {
  assert.equal(shouldResume({ intent: "idle", phase: "ready", isEmbedPaused: true }), false);
});

test("nothing resumes while the next track is loading", () => {
  assert.equal(shouldResume({ intent: "playing", phase: "loadingTrack", isEmbedPaused: true }), false);
});

test("a requested track plays as soon as it loads", () => {
  assert.equal(shouldPlayWhenReady({ intent: "playing", phase: "loadingTrack" }), true);
});

test("the first load plays only if music was already wanted", () => {
  assert.equal(shouldPlayWhenReady({ intent: "idle", phase: "starting" }), false);
});

test("music asked for before the first load starts once it loads", () => {
  assert.equal(shouldPlayWhenReady({ intent: "playing", phase: "starting" }), true);
});

test("a settled embed reloading doesn't start music by itself", () => {
  assert.equal(shouldPlayWhenReady({ intent: "playing", phase: "ready" }), false);
});
