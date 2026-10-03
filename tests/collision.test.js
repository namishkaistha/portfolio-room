import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCollider, isBlocked } from "../src/collision.js";

const BOX = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
const RADIUS = 0.1;

test("a circle overlapping a box is blocked", () => {
  assert.equal(isBlocked([BOX], { x: 1.05, z: 0.5 }, RADIUS), true);
});

test("a circle clear of every box is free", () => {
  assert.equal(isBlocked([BOX], { x: 1.2, z: 0.5 }, RADIUS), false);
});

test("an open step goes where it was aimed", () => {
  const resolve = createCollider([]);
  assert.deepEqual(resolve(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0, 0.5), RADIUS).toArray(), [0.5, 0, 0.5]);
});

test("a diagonal step into a box slides along it", () => {
  const resolve = createCollider([BOX]);
  const resolved = resolve(new THREE.Vector3(1.5, 0, 0.5), new THREE.Vector3(1.05, 0, 0.7), RADIUS);
  assert.deepEqual(resolved.toArray(), [1.5, 0, 0.7]);
});

test("steps stop at the room's walls", () => {
  const resolve = createCollider([]);
  assert.equal(resolve(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0), RADIUS).x, 2.1 - RADIUS);
});
