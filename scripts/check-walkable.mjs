// Loads the real room model, applies the same layout corrections as the game,
// and searches for a path a player-sized circle can walk between two spots.
// Usage: node scripts/check-walkable.mjs
import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const PLAYER_RADIUS = 0.18;
const INFLATE = 0.01;
const CELL = 0.04;
const ROOM = { minX: -2.1, maxX: 2.1, minZ: -2.4, maxZ: 2.4 };
const BODY_HEIGHT_CUTOFF = 1.2;
const NODES = ["BED", "HOTSPOT_LIBRARY", "HOTSPOT_MUSIC", "HOTSPOT_FASHION", "HOTSPOT_DESK", "HOTSPOT_TRIPOD", "WINDOW", "DESK_CHAIR"];
const EXTRA_BOXES = [{ minX: -0.75, maxX: -0.35, minZ: 1.04, maxZ: 1.44 }];
const TRIPS = [
  ["spawn to guitar", [0, 0.6], [1.5, -1.25]],
  ["spawn to vinyl", [0, 0.6], [-0.95, -1.25]],
  ["spawn to closet", [0, 0.6], [-1.35, -0.45]],
  ["spawn to bed foot", [0, 0.6], [0.2, -0.1]],
  ["spawn to window", [0, 0.6], [1.45, -0.95]],
  ["spawn to door ring", [0, 0.6], [0, 1.95]],
];

const buffer = fs.readFileSync("public/room.glb");
const gltf = await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "");
const root = gltf.scene;
const world = fs.readFileSync("src/world.js", "utf8");
const number = (name) => Number(world.match(new RegExp(`const ${name} = (-?[0-9.]+)`))[1]);
root.getObjectByName("BED").scale.setX(0.88);
root.getObjectByName("BED").position.add(new THREE.Vector3(0.08, 0, -0.22));
root.getObjectByName("HOTSPOT_LIBRARY")?.position.add(new THREE.Vector3(0.2, 0, 0));
root.getObjectByName("WINDOW")?.position.add(new THREE.Vector3(0, 0, 0.4));
root.getObjectByName("HOTSPOT_DESK")?.position.add(new THREE.Vector3(0, 0, 0.3));
root.getObjectByName("HOTSPOT_TRIPOD")?.position.add(new THREE.Vector3(-0.25, 0, 0));
root.getObjectByName("HOTSPOT_TRIPOD")?.rotation.set(0, Math.PI / 2, 0);
if (world.includes("shortenBed")) {
  root.updateMatrixWorld(true);
  const bed = root.getObjectByName("BED");
  const before = new THREE.Box3().setFromObject(bed);
  bed.scale.z *= number("BED_LENGTH_SCALE");
  root.updateMatrixWorld(true);
  bed.position.z += before.min.z - new THREE.Box3().setFromObject(bed).min.z;
  bed.position.x += number("BED_SHIFT_X");
}
root.updateMatrixWorld(true);

const boxes = [...EXTRA_BOXES];
for (const name of NODES) {
  root.getObjectByName(name)?.traverse((child) => {
    if (!child.isMesh) return;
    const box = new THREE.Box3().setFromObject(child);
    if (box.min.y > BODY_HEIGHT_CUTOFF) return;
    boxes.push({ minX: box.min.x - INFLATE, maxX: box.max.x + INFLATE, minZ: box.min.z - INFLATE, maxZ: box.max.z + INFLATE });
  });
}

const blocked = (x, z) => x < ROOM.minX + PLAYER_RADIUS || x > ROOM.maxX - PLAYER_RADIUS || z < ROOM.minZ + PLAYER_RADIUS || z > ROOM.maxZ - PLAYER_RADIUS
  || boxes.some((b) => x + PLAYER_RADIUS > b.minX && x - PLAYER_RADIUS < b.maxX && z + PLAYER_RADIUS > b.minZ && z - PLAYER_RADIUS < b.maxZ);
const key = (x, z) => `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
function canReach([sx, sz], [tx, tz]) {
  if (blocked(sx, sz) || blocked(tx, tz)) return blocked(sx, sz) ? "start blocked" : "target blocked";
  const seen = new Set([key(sx, sz)]);
  const queue = [[sx, sz]];
  while (queue.length) {
    const [x, z] = queue.shift();
    if (Math.hypot(x - tx, z - tz) < CELL * 1.5) return "reachable";
    for (const [dx, dz] of [[CELL, 0], [-CELL, 0], [0, CELL], [0, -CELL]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (seen.has(k) || blocked(nx, nz)) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  return "NO PATH";
}
const bedBox = new THREE.Box3().setFromObject(root.getObjectByName("BED"));
console.log(`bed x ${bedBox.min.x.toFixed(2)}..${bedBox.max.x.toFixed(2)}  z ${bedBox.min.z.toFixed(2)}..${bedBox.max.z.toFixed(2)}`);
let failed = false;
for (const [label, from, to] of TRIPS) {
  const result = canReach(from, to);
  if (result !== "reachable") failed = true;
  console.log(`${label.padEnd(22)} ${result}`);
}
process.exit(failed ? 1 : 0);
