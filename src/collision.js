import * as THREE from "three";
import { ROOM } from "./roomConfig.js";
import { requireNode } from "./meshHelpers.js";

// Each mesh in these groups gets its own collision box; a single box per group
// is too coarse and seals off walkable gaps between furniture.
const OBSTACLE_INFLATE = {
  BED: 0.01,
  HOTSPOT_LIBRARY: 0.01,
  HOTSPOT_MUSIC: 0.01,
  HOTSPOT_FASHION: 0.01,
  HOTSPOT_DESK: 0.01,
  HOTSPOT_TRIPOD: 0.02,
  WINDOW: 0.01,
  DESK_CHAIR: 0.01,
  TRIPOD_STOOL: 0.01,
};

// Wall-mounted pieces above this height (shelves, frames) never block walking.
const BODY_HEIGHT_CUTOFF = 1.2;

// Floor-plan boxes of everything that blocks walking, from the laid-out room.
export function collectObstacles(roomGroup) {
  roomGroup.updateMatrixWorld(true);
  const obstacles = [];
  for (const [name, inflate] of Object.entries(OBSTACLE_INFLATE)) {
    requireNode(roomGroup, name).traverse((child) => {
      const box = child.isMesh && new THREE.Box3().setFromObject(child);
      if (box && box.min.y <= BODY_HEIGHT_CUTOFF) obstacles.push(inflateFootprint(box, inflate));
    });
  }
  return obstacles;
}

// Moves toward `desired`, sliding along walls and furniture: each axis is tried
// on its own so a blocked step in one direction still moves in the other.
export function createCollider(obstacles) {
  return function resolveMovement(current, desired, radius) {
    const x = clampToRoom(desired.x, ROOM.minX, ROOM.maxX, radius);
    const z = clampToRoom(desired.z, ROOM.minZ, ROOM.maxZ, radius);
    const nextX = isBlocked(obstacles, { x, z: current.z }, radius) ? current.x : x;
    const nextZ = isBlocked(obstacles, { x: nextX, z }, radius) ? current.z : z;
    return new THREE.Vector3(nextX, desired.y, nextZ);
  };
}

export function isBlocked(obstacles, { x, z }, radius) {
  return obstacles.some((box) => x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ);
}

function clampToRoom(value, min, max, radius) {
  return THREE.MathUtils.clamp(value, min + radius, max - radius);
}

function inflateFootprint(box, inflate) {
  return { minX: box.min.x - inflate, maxX: box.max.x + inflate, minZ: box.min.z - inflate, maxZ: box.max.z + inflate };
}
