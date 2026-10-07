// Loads the real room model with the game's own layout corrections, desk
// chair, stool and collision boxes, then searches for a path a player-sized
// circle can walk between spots. Usage: node scripts/check-walkable.mjs
import fs from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ROOM } from "../src/roomConfig.js";
import { applyLayoutCorrections, buildTripodStool } from "../src/roomLayout.js";
import { buildDeskChair } from "../src/deskSetup.js";
import { collectObstacles, isBlocked } from "../src/collision.js";
import { PLAYER_RADIUS } from "../src/player.js";
import { HOTSPOTS } from "../src/hotspots.js";
import { createWayfinder } from "../src/wayfinder.js";

const CELL = 0.04;
const SPAWN = [0, 0.6];
const TRIPS = [
  ["travel posters", [1.5, -1.25]],
  ["vinyl", [-0.95, -1.25]],
  ["closet", [-1.35, -0.45]],
  ["bed foot", [0.2, -0.1]],
  ["door ring", [0, 1.95]],
];

const buffer = fs.readFileSync("public/room.glb");
const gltf = await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "");
const room = gltf.scene;
applyLayoutCorrections(room);
room.add(buildDeskChair(), buildTripodStool());
const obstacles = collectObstacles(room);

let hasFailed = false;
for (const [label, target] of TRIPS) {
  const result = canReach(SPAWN, target);
  if (result !== "reachable") hasFailed = true;
  console.log(`spawn to ${label.padEnd(16)} ${result}`);
}
// Clicking an object walks there, so every hotspot needs a route from spawn.
const routeTo = createWayfinder(obstacles);
for (const hotspot of HOTSPOTS) {
  const route = routeTo({ x: SPAWN[0], z: SPAWN[1] }, hotspot);
  if (!route) hasFailed = true;
  console.log(`click-walk to ${hotspot.id.padEnd(9)} ${route ? `${route.length - 1} legs` : "NO ROUTE"}`);
}
process.exit(hasFailed ? 1 : 0);

function canReach([startX, startZ], [targetX, targetZ]) {
  if (isBlockedAt(startX, startZ)) return "start blocked";
  if (isBlockedAt(targetX, targetZ)) return "target blocked";
  const seen = new Set([cellKey(startX, startZ)]);
  const queue = [[startX, startZ]];
  while (queue.length > 0) {
    const [x, z] = queue.shift();
    if (Math.hypot(x - targetX, z - targetZ) < CELL * 1.5) return "reachable";
    for (const [dx, dz] of [[CELL, 0], [-CELL, 0], [0, CELL], [0, -CELL]]) {
      const [nextX, nextZ] = [x + dx, z + dz];
      const key = cellKey(nextX, nextZ);
      if (seen.has(key) || isBlockedAt(nextX, nextZ)) continue;
      seen.add(key);
      queue.push([nextX, nextZ]);
    }
  }
  return "NO PATH";
}

function isBlockedAt(x, z) {
  const isOutside = x < ROOM.minX + PLAYER_RADIUS || x > ROOM.maxX - PLAYER_RADIUS || z < ROOM.minZ + PLAYER_RADIUS || z > ROOM.maxZ - PLAYER_RADIUS;
  return isOutside || isBlocked(obstacles, { x, z }, PLAYER_RADIUS);
}

function cellKey(x, z) {
  return `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
}
