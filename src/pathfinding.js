// Finds a walkable route across the floor plan: a breadth-first search over a
// grid of `cell`-sized squares, then pulled taut so the walk runs in straight
// lines between corners instead of zig-zagging cell by cell.
//   start   { x, z } where the walker stands
//   isGoal  whether a point is close enough to where it is heading
//   isFree  whether a walker can stand at a point
//   bounds  { minX, maxX, minZ, maxZ } of the floor
// Returns the points to walk through, starting at `start`, or null when no
// route exists.
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function findPath({ start, isGoal, isFree, bounds, cell }) {
  if (isGoal(start)) return [start];
  const grid = gridFor(bounds, cell);
  const startIndex = grid.indexOf(start);
  const cameFrom = new Map([[startIndex, null]]);
  const queue = [startIndex];
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    for (const next of walkableNeighbors(grid, index, isFree)) {
      if (cameFrom.has(next)) continue;
      cameFrom.set(next, index);
      if (isGoal(grid.pointAt(next))) return pullTaut([start, ...routeTo(grid, cameFrom, next)], isFree, cell);
      queue.push(next);
    }
  }
  return null;
}

function gridFor({ minX, maxX, minZ, maxZ }, cell) {
  const columns = Math.floor((maxX - minX) / cell) + 1;
  const rows = Math.floor((maxZ - minZ) / cell) + 1;
  const clamp = (value, max) => Math.min(max - 1, Math.max(0, value));
  return {
    columns,
    rows,
    indexOf: ({ x, z }) => clamp(Math.round((z - minZ) / cell), rows) * columns + clamp(Math.round((x - minX) / cell), columns),
    pointAt: (index) => ({ x: minX + (index % columns) * cell, z: minZ + Math.floor(index / columns) * cell }),
  };
}

// Diagonal steps need both of the squares beside them free, so a route never
// squeezes through the corner where two obstacles meet.
function walkableNeighbors(grid, index, isFree) {
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  const freeAt = (dc, dr) => {
    const c = column + dc;
    const r = row + dr;
    return c >= 0 && c < grid.columns && r >= 0 && r < grid.rows && isFree(grid.pointAt(r * grid.columns + c));
  };
  return NEIGHBORS
    .filter(([dc, dr]) => freeAt(dc, dr) && (dc === 0 || dr === 0 || (freeAt(dc, 0) && freeAt(0, dr))))
    .map(([dc, dr]) => (row + dr) * grid.columns + column + dc);
}

function routeTo(grid, cameFrom, end) {
  const route = [];
  for (let index = end; cameFrom.get(index) !== null; index = cameFrom.get(index)) route.unshift(grid.pointAt(index));
  return route;
}

// Drops every waypoint that can be skipped in a straight, unobstructed line.
function pullTaut(points, isFree, cell) {
  const taut = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let reach = points.length - 1;
    while (reach > anchor + 1 && !isClearLine(points[anchor], points[reach], isFree, cell)) reach--;
    taut.push(points[reach]);
    anchor = reach;
  }
  return taut;
}

function isClearLine(from, to, isFree, cell) {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / (cell / 2));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    if (!isFree({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t })) return false;
  }
  return true;
}
