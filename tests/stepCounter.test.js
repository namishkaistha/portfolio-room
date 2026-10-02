import { test } from "node:test";
import assert from "node:assert/strict";
import { createStepCounter } from "../src/stepCounter.js";

test("makes no step on the first position", () => {
  assert.equal(createStepCounter(1)(0, 0), 0);
});

test("counts one step per stride travelled", () => {
  const advance = createStepCounter(1);
  advance(0, 0);
  assert.equal(advance(1, 0), 1);
});

test("carries leftover distance into the next step", () => {
  const advance = createStepCounter(1);
  advance(0, 0);
  assert.equal(advance(0.6, 0), 0);
  assert.equal(advance(1.2, 0), 1);
});

test("counts several steps for a long move", () => {
  const advance = createStepCounter(0.5);
  advance(0, 0);
  assert.equal(advance(0, 1.4), 2);
});

test("ignores a teleport so it is not heard as a run of steps", () => {
  const advance = createStepCounter(0.5);
  advance(0, 0);
  assert.equal(advance(5, 5), 0);
});

test("stays silent while standing still", () => {
  const advance = createStepCounter(1);
  advance(2, 2);
  assert.equal(advance(2, 2), 0);
});
