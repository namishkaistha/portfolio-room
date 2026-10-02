import { test } from "node:test";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

// Every station's standing spot must be reachable from where the visitor
// spawns, using the real room model and the game's collision sizes.
test("every station can be walked to from the spawn point", () => {
  const output = execFileSync("node", ["scripts/check-walkable.mjs"], { encoding: "utf8" });
  assert.doesNotMatch(output, /NO PATH|blocked/);
});
