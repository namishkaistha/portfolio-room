import { test } from "node:test";
import assert from "node:assert/strict";
import { readStoredJson, writeStoredJson } from "../src/storage.js";

const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
const blockedStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };

test("reads back what was written", () => {
  const storage = memoryStorage();
  writeStoredJson("key", { a: 1 }, storage);
  assert.deepEqual(readStoredJson("key", null, storage), { a: 1 });
});

test("falls back when nothing is stored", () => {
  assert.equal(readStoredJson("missing", "fallback", memoryStorage()), "fallback");
});

test("falls back on corrupt data", () => {
  assert.equal(readStoredJson("key", "fallback", { getItem: () => "{nope" }), "fallback");
});

test("falls back when storage throws", () => {
  assert.equal(readStoredJson("key", "fallback", blockedStorage), "fallback");
});

test("a blocked write is dropped quietly", () => {
  assert.doesNotThrow(() => writeStoredJson("key", 1, blockedStorage));
});
