import { test } from "node:test";
import assert from "node:assert/strict";
import { createVariantPicker } from "../src/variantPicker.js";

test("returns a variant from the set", () => {
  const pick = createVariantPicker(["a", "b", "c"], () => 0);
  assert.ok(["a", "b", "c"].includes(pick()));
});

test("never repeats the previous variant", () => {
  const pick = createVariantPicker(["a", "b", "c"], Math.random);
  let previous = pick();
  for (let index = 0; index < 500; index += 1) {
    const next = pick();
    assert.notEqual(next, previous);
    previous = next;
  }
});

test("eventually uses every variant", () => {
  const pick = createVariantPicker(["a", "b", "c", "d"], Math.random);
  const seen = new Set();
  for (let index = 0; index < 200; index += 1) seen.add(pick());
  assert.equal(seen.size, 4);
});

test("a single variant is allowed to repeat", () => {
  const pick = createVariantPicker(["only"], Math.random);
  assert.equal(pick(), "only");
  assert.equal(pick(), "only");
});

test("rejects an empty set", () => {
  assert.throws(() => createVariantPicker([], Math.random), /variant/i);
});
