import { test } from "node:test";
import assert from "node:assert/strict";
import { createExitSignal } from "../src/exitSignal.js";

test("waiting settles when the exit fires", async () => {
  const exit = createExitSignal();
  const closed = exit.wait();
  exit.fire();
  assert.equal(await closed, undefined);
});

test("firing with nobody waiting is harmless", () => {
  assert.doesNotThrow(() => createExitSignal().fire());
});

test("a second fire does not reuse the settled wait", async () => {
  const exit = createExitSignal();
  const first = exit.wait();
  exit.fire();
  await first;
  let isSettled = false;
  exit.wait().then(() => { isSettled = true; });
  await Promise.resolve();
  assert.equal(isSettled, false);
});
