import { ROOM } from "./roomConfig.js";
import { isBlocked } from "./collision.js";
import { findPath } from "./pathfinding.js";
import { PLAYER_RADIUS } from "./player.js";

const GRID_CELL = 0.05;
// Aims a little inside an object's floor ring so its prompt is showing on
// arrival; where furniture fills the middle of the ring (the desk chair), the
// edge of the ring will do.
const ARRIVAL_SHARES = [0.75, 0.97];

// Routes the avatar to a hotspot: around the furniture, ending inside the
// hotspot's floor ring. Returns the points to walk, or null if there is no way.
export function createWayfinder(obstacles) {
  const bounds = { minX: ROOM.minX + PLAYER_RADIUS, maxX: ROOM.maxX - PLAYER_RADIUS, minZ: ROOM.minZ + PLAYER_RADIUS, maxZ: ROOM.maxZ - PLAYER_RADIUS };
  const isFree = (point) => !isBlocked(obstacles, point, PLAYER_RADIUS);
  return function routeTo(from, hotspot) {
    for (const share of ARRIVAL_SHARES) {
      const reach = hotspot.radius * share;
      const isGoal = ({ x, z }) => Math.hypot(x - hotspot.trigger.x, z - hotspot.trigger.z) <= reach;
      const route = findPath({ start: { x: from.x, z: from.z }, isGoal, isFree, bounds, cell: GRID_CELL });
      if (route) return route;
    }
    return null;
  };
}
