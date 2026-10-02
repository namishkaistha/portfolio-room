const TELEPORT_DISTANCE = 1.5;

// Reports how many footsteps a move covers, carrying leftover distance over.
// A jump larger than a walking step is a teleport (gliding to a spot starts
// somewhere new), so it counts as no steps.
export function createStepCounter(strideLength) {
  let lastX = null;
  let lastZ = null;
  let travelled = 0;
  return function advance(x, z) {
    if (lastX !== null) {
      const distance = Math.hypot(x - lastX, z - lastZ);
      if (distance < TELEPORT_DISTANCE) travelled += distance;
    }
    lastX = x;
    lastZ = z;
    const steps = Math.floor(travelled / strideLength);
    travelled -= steps * strideLength;
    return steps;
  };
}
