import * as THREE from "three";
import { solid } from "./meshHelpers.js";
import { createSeededRandom } from "./seededRandom.js";

const WALL_FACE_X = -2.056;
const NOTE_COLORS = [0xf7e27a, 0xf4a6b8, 0x9fd8a4, 0x9cc9ee, 0xf6b26b];
const NOTE = { size: 0.1, thickness: 0.003, jitter: 0.012, maxTilt: 0.14 };
const GRID = { rows: 5, columns: 8, firstZ: 1.2, firstY: 1.22, spacingZ: 0.15, spacingY: 0.16 };
const HIT_BOX = { size: [0.14, 0.98, 1.3], position: [-2.0, 1.58, 1.72] };
const RANDOM_SEED = 11;

// A loose grid of post-its on the free stretch of the left wall, plus an
// invisible box so the whole cluster is easy to click.
export function buildPostItWall() {
  const wall = new THREE.Group();
  wall.name = "POSTIT_WALL";
  const nextRandom = createSeededRandom(RANDOM_SEED);
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let column = 0; column < GRID.columns; column += 1) {
      wall.add(buildNote(row, column, nextRandom));
    }
  }
  wall.add(buildHitArea());
  return wall;
}

function buildNote(row, column, nextRandom) {
  const color = NOTE_COLORS[Math.floor(nextRandom() * NOTE_COLORS.length)];
  const note = new THREE.Mesh(new THREE.BoxGeometry(NOTE.thickness, NOTE.size, NOTE.size), solid(color, 0.9));
  note.position.set(
    WALL_FACE_X + NOTE.thickness / 2,
    GRID.firstY + row * GRID.spacingY + (nextRandom() - 0.5) * NOTE.jitter,
    GRID.firstZ + column * GRID.spacingZ + (nextRandom() - 0.5) * NOTE.jitter,
  );
  note.rotation.x = (nextRandom() - 0.5) * 2 * NOTE.maxTilt;
  note.castShadow = true;
  note.receiveShadow = true;
  return note;
}

function buildHitArea() {
  const area = new THREE.Mesh(new THREE.BoxGeometry(...HIT_BOX.size), new THREE.MeshBasicMaterial({ visible: false }));
  area.position.set(...HIT_BOX.position);
  return area;
}
