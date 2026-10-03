import { test } from "node:test";
import assert from "node:assert/strict";
import { slideThenTurn } from "../src/motion.js";

test("a stowed piece has neither slid nor turned", () => {
  assert.deepEqual(slideThenTurn(0, 0.6), { slide: 0, turn: 0 });
});

test("the piece finishes sliding before it starts turning", () => {
  assert.deepEqual(slideThenTurn(0.6, 0.6), { slide: 1, turn: 0 });
});

test("a fully pulled piece has slid and turned", () => {
  assert.deepEqual(slideThenTurn(1, 0.6), { slide: 1, turn: 1 });
});
