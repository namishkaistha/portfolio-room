import { test } from "node:test";
import assert from "node:assert/strict";
import { findPath } from "../src/pathfinding.js";

const ROOM = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
const CELL = 0.1;
// A wall across the middle of the room with a gap at the right-hand end.
const WALL = { minX: 0, maxX: 3, minZ: 1.9, maxZ: 2.1 };
const isFree = ({ x, z }) => !(x > WALL.minX && x < WALL.maxX && z > WALL.minZ && z < WALL.maxZ);
const near = (target, reach) => (point) => Math.hypot(point.x - target.x, point.z - target.z) <= reach;

function crossesWall(path) {
  for (let i = 1; i < path.length; i++) {
    for (let t = 0; t <= 1; t += 0.02) {
      const point = { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, z: path[i - 1].z + (path[i].z - path[i - 1].z) * t };
      if (!isFree(point)) return true;
    }
  }
  return false;
}

test("an open room gives a straight path", () => {
  const path = findPath({ start: { x: 0.5, z: 0.5 }, isGoal: near({ x: 3.5, z: 0.5 }, 0.2), isFree: () => true, bounds: ROOM, cell: CELL });
  assert.equal(path.length, 2);
});

test("the path goes around a wall instead of through it", () => {
  const path = findPath({ start: { x: 1, z: 1 }, isGoal: near({ x: 1, z: 3 }, 0.2), isFree, bounds: ROOM, cell: CELL });
  assert.equal(crossesWall(path), false);
});

test("the path ends inside the goal area", () => {
  const goal = near({ x: 1, z: 3 }, 0.2);
  const path = findPath({ start: { x: 1, z: 1 }, isGoal: goal, isFree, bounds: ROOM, cell: CELL });
  assert.equal(goal(path.at(-1)), true);
});

test("an unreachable goal gives no path", () => {
  const sealed = ({ z }) => z < 1.9 || z > 2.1;
  const path = findPath({ start: { x: 1, z: 1 }, isGoal: near({ x: 1, z: 3 }, 0.2), isFree: sealed, bounds: ROOM, cell: CELL });
  assert.equal(path, null);
});

test("starting inside the goal area needs no walking", () => {
  const path = findPath({ start: { x: 1, z: 1 }, isGoal: near({ x: 1, z: 1 }, 0.5), isFree: () => true, bounds: ROOM, cell: CELL });
  assert.deepEqual(path, [{ x: 1, z: 1 }]);
});
