import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_AUTHOR_LENGTH, MAX_MESSAGE_LENGTH, hashVisitor, readVisitorAddress, validateNote } from "../api/_noteRules.js";

test("accepts a plain message and trims it", () => {
  assert.deepEqual(validateNote({ message: "  keep going  " }), { ok: true, note: { message: "keep going", author: null } });
});

test("keeps a trimmed author name", () => {
  const result = validateNote({ message: "hi", author: "  Sam " });
  assert.equal(result.note.author, "Sam");
});

test("treats a blank author as anonymous", () => {
  assert.equal(validateNote({ message: "hi", author: "   " }).note.author, null);
});

test("collapses runs of whitespace inside a message", () => {
  assert.equal(validateNote({ message: "a  \n\n  b\tc" }).note.message, "a b c");
});

test("rejects an empty message", () => {
  assert.equal(validateNote({ message: "   " }).ok, false);
});

test("rejects a missing or non-string message", () => {
  assert.equal(validateNote({}).ok, false);
  assert.equal(validateNote({ message: 42 }).ok, false);
});

test("rejects a message over the length limit", () => {
  assert.equal(validateNote({ message: "x".repeat(MAX_MESSAGE_LENGTH + 1) }).ok, false);
});

test("accepts a message exactly at the length limit", () => {
  assert.equal(validateNote({ message: "x".repeat(MAX_MESSAGE_LENGTH) }).ok, true);
});

test("rejects an author over the length limit", () => {
  assert.equal(validateNote({ message: "hi", author: "x".repeat(MAX_AUTHOR_LENGTH + 1) }).ok, false);
});

test("rejects messages containing links", () => {
  assert.equal(validateNote({ message: "visit https://spam.example" }).ok, false);
  assert.equal(validateNote({ message: "see www.spam.example" }).ok, false);
});

test("strips control characters", () => {
  assert.equal(validateNote({ message: "a\u0000b\u0007c" }).note.message, "abc");
});

test("rejects a non-object body", () => {
  assert.equal(validateNote(null).ok, false);
  assert.equal(validateNote("note").ok, false);
});

test("reads the first forwarded address", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
  assert.equal(readVisitorAddress(headers), "203.0.113.9");
});

test("falls back to a placeholder when no address is sent", () => {
  assert.equal(readVisitorAddress(new Headers()), "unknown");
});

test("hashes the same visitor identically and different visitors differently", () => {
  assert.equal(hashVisitor("203.0.113.9", "salt"), hashVisitor("203.0.113.9", "salt"));
  assert.notEqual(hashVisitor("203.0.113.9", "salt"), hashVisitor("203.0.113.10", "salt"));
});

test("never returns the raw address in the hash", () => {
  assert.equal(hashVisitor("203.0.113.9", "salt").includes("203.0.113.9"), false);
});

test("refuses to hash without a salt", () => {
  assert.throws(() => hashVisitor("203.0.113.9", ""), /salt/i);
});
