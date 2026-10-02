import * as THREE from "three";

export const ROOM = {
  minX: -2.1,
  maxX: 2.1,
  minZ: -2.4,
  maxZ: 2.4,
  ceiling: 2.6,
  wallThickness: 0.1,
};

export const DOOR = {
  width: 1.2,
  height: 2.2,
  thickness: 0.06,
  wallZ: ROOM.maxZ,
  centerX: 0,
};

export const ROOM_SPAWN = new THREE.Vector3(0, 0, ROOM.maxZ - 1.8);

export const CAMERA_START = new THREE.Vector3(0, 1.0, ROOM.maxZ + 4.5);
export const CAMERA_INTRO_LOOK = new THREE.Vector3(0, 0.65, ROOM.maxZ);
export const CAMERA_ROOM_ENTRY = new THREE.Vector3(0, 6.5, 4.2);
export const CAMERA_LOOK_TARGET = new THREE.Vector3(0, 0.7, -0.2);

// The entry path ducks under the door lintel, then rises and pulls back over
// the (by then cut away) front wall into the overhead view.
export const ENTRY_PATH_CONTROLS = [
  new THREE.Vector3(0, 1.5, ROOM.maxZ - 1.2),
  new THREE.Vector3(0, 2.8, ROOM.maxZ - 1.8),
];
export const ENTRY_LOOK_CONTROL = new THREE.Vector3(0, 1.1, -2.0);

export const HALLWAY = { halfWidth: 7, height: 4, depth: 8 };

export const OVERHEAD_VIEW = { position: CAMERA_ROOM_ENTRY, look: CAMERA_LOOK_TARGET };

const MONITOR_SCREEN = new THREE.Vector3(1.88, 1.22, 1.89);
const PHONE_SCREEN = new THREE.Vector3(-1.29, 1.53, 1.24);
const RECORD_SHELF = new THREE.Vector3(-1.52, 0.55, -1.42);
const PULLED_BOOK = new THREE.Vector3(-0.52, 1.33, -1.9);
const PHOTO_COLLAGE_CENTER = new THREE.Vector3(2.0, 1.72, 0.95);
const POSTIT_WALL_CENTER = new THREE.Vector3(-2.04, 1.58, 1.72);

// Each spot: where the avatar goes, which way it faces and how it poses, an
// over-the-shoulder shot, then a close-up that fills the frame before the
// spot's panel opens.
export const SPOTS = {
  laptop: {
    position: new THREE.Vector3(0.95, 0, 1.89),
    yaw: Math.PI / 2,
    pose: "Sit",
    shoulderView: { position: new THREE.Vector3(0.3, 2.05, 2.3), look: MONITOR_SCREEN },
    closeUpView: { position: new THREE.Vector3(1.4, 1.22, 1.89), look: MONITOR_SCREEN },
  },
  tripod: {
    position: new THREE.Vector3(-0.55, 0, 1.24),
    yaw: -Math.PI / 2,
    pose: "Sit",
    shoulderView: { position: new THREE.Vector3(0.1, 2.05, 1.6), look: PHONE_SCREEN },
    closeUpView: { position: new THREE.Vector3(-1.12, 1.53, 1.24), look: PHONE_SCREEN },
  },
  vinyl: {
    position: new THREE.Vector3(-0.95, 0, -1.25),
    yaw: -2.26,
    pose: "Idle",
    shoulderView: { position: new THREE.Vector3(-0.45, 1.9, -0.55), look: RECORD_SHELF },
    closeUpView: { position: new THREE.Vector3(-1.33, 0.8, -0.82), look: RECORD_SHELF },
  },
  about: {
    position: new THREE.Vector3(0.95, 0, 0.95),
    yaw: Math.PI / 2,
    pose: "Idle",
    shoulderView: { position: new THREE.Vector3(0.3, 2.05, 1.5), look: PHOTO_COLLAGE_CENTER },
    closeUpView: { position: new THREE.Vector3(1.4, 1.72, 0.95), look: PHOTO_COLLAGE_CENTER },
  },
  notes: {
    position: new THREE.Vector3(-1.5, 0, 1.85),
    yaw: -Math.PI / 2,
    pose: "Idle",
    shoulderView: { position: new THREE.Vector3(-0.5, 2.1, 0.9), look: POSTIT_WALL_CENTER },
    closeUpView: { position: new THREE.Vector3(-1.05, 1.75, 1.2), look: POSTIT_WALL_CENTER },
  },
  library: {
    position: new THREE.Vector3(-0.82, 0, -1.66),
    yaw: Math.PI,
    pose: "Idle",
    shoulderView: { position: new THREE.Vector3(-0.15, 2.05, -0.95), look: PULLED_BOOK },
    closeUpView: { position: new THREE.Vector3(-0.3, 1.58, -1.36), look: PULLED_BOOK },
  },
};

// Filled from the GLB's bounding boxes once the model loads (see world.js).
export const OBSTACLES = [];
