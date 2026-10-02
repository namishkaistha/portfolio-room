import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ROOM, DOOR, HALLWAY, OBSTACLES, SPOTS } from "./roomConfig.js";
import { loadAvatar } from "./avatar.js";
import { dressDesk } from "./deskSetup.js";
import { buildPostItWall } from "./postItWall.js";
import { hangCornerGallery } from "./wallArt.js";
import { installRecordShelf } from "./crateDigging.js";
import { replaceShelfTopDecor } from "./shelfDecor.js";
import { installBookPull } from "./bookPull.js";
import { installClosetDoors } from "./closetDoors.js";
import { installWindowView } from "./windowView.js";
import { GOALS } from "./aboutContent.js";
import { addBox, addCylinder } from "./meshHelpers.js";

const ROOM_MODEL_URL = "/room.glb";

const COLOR = {
  wallFill: 0xe8dcc4,
  doorSlab: 0x7a4a26,
  doorPanel: 0x5a331a,
  doorKnob: 0xe7c07b,
  trim: 0x2b1c10,
  hallwayTrim: 0xf1e9d8,
  hallwayFloor: 0x8a6a4e,
  backdrop: 0x9a8669,
};

const FOG_NEAR = 14;
const FOG_FAR = 30;
const BASEBOARD_HEIGHT = 0.09;
const TRIM_DEPTH = 0.05;
const CASING_WIDTH = 0.09;
const CASING_DEPTH = 0.14;
const CASING_OVERLAP = 0.02;

const OBSTACLE_INFLATE = 0.01;
const TRIPOD_INFLATE = 0.02;

// Wall-mounted pieces above this height (shelves, frames) never block walking.
const BODY_HEIGHT_CUTOFF = 1.2;

// Each mesh in these groups gets its own collision box; a single box per group
// is too coarse and seals off walkable gaps between furniture.
const OBSTACLE_NODE_NAMES = new Set([
  "BED",
  "HOTSPOT_LIBRARY",
  "HOTSPOT_MUSIC",
  "HOTSPOT_FASHION",
  "HOTSPOT_DESK",
  "HOTSPOT_TRIPOD",
  "WINDOW",
  "DESK_CHAIR",
  "TRIPOD_STOOL",
]);

// Corrections to the GLB layout: the bed's foot touched the desk's end
// (sealing off the floor in front of the window), the tripod sits back against
// the left wall, the bookshelf clears the record-player lamp, and the window
// slides along its wall so the corner is free for posters, as in the real room.
const LAYOUT_OFFSETS = {
  BED: new THREE.Vector3(0.08, 0, -0.22),
  HOTSPOT_LIBRARY: new THREE.Vector3(0.2, 0, 0),
  WINDOW: new THREE.Vector3(0, 0, 0.4),
  HOTSPOT_DESK: new THREE.Vector3(0, 0, 0.3),
  HOTSPOT_TRIPOD: new THREE.Vector3(-0.25, 0, 0),
};

// The tripod is turned so its phone screen faces into the room, toward the stool.
const LAYOUT_YAWS = {
  HOTSPOT_TRIPOD: Math.PI / 2,
};

// A slimmer bed leaves breathing room by the bookshelf spot.
const LAYOUT_WIDTH_SCALES = {
  BED: 0.88,
};

// A shorter bed, kept flush with the head wall, opens the walkway between its
// foot and the desk so the guitar corner is easy to reach.
const BED_LENGTH_SCALE = 0.86;
const BED_SHIFT_X = -0.1;

const SEAT_COLOR = 0x2a2522;
const STOOL = { radius: 0.18, seatHeight: 0.45, seatThickness: 0.05, postRadius: 0.03 };

export async function buildScene(scene) {
  scene.background = new THREE.Color(COLOR.backdrop);
  scene.fog = new THREE.Fog(COLOR.backdrop, FOG_NEAR, FOG_FAR);

  const [roomModel, avatar] = await Promise.all([loadRoomModel(), loadAvatar()]);
  const roomGroup = roomModel.scene;
  dressDesk(roomGroup);
  roomGroup.add(buildPostItWall());
  hangCornerGallery(roomGroup);
  installRecordShelf(roomGroup);
  replaceShelfTopDecor(roomGroup);
  installBookPull(roomGroup);
  roomGroup.add(buildTripodStool());
  populateObstacles(roomGroup);
  scene.add(roomGroup);
  roomGroup.add(avatar.root);
  const roomMixer = loopRoomAnimations(roomModel);
  const closetDoors = installClosetDoors(roomGroup);
  const windowView = installWindowView(roomGroup, GOALS.map((goal) => goal.title));

  const frontWall = buildHallway();
  scene.add(frontWall);

  const doorGroup = buildDoorGroup();
  scene.add(doorGroup);

  return { doorGroup, roomGroup, frontWall, avatar, roomMixer, closetDoors, windowView };
}

export function installLights(scene) {
  scene.add(new THREE.AmbientLight(0xffe9c9, 0.6));

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 5, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9ec7e0, 0.32);
  fill.position.set(-3, 3, -2);
  scene.add(fill);

  const windowLight = new THREE.PointLight(0xfff2d0, 0.7, 6, 2);
  windowLight.position.set(1.7, 1.9, -0.7);
  scene.add(windowLight);

  const vestibule = new THREE.PointLight(0xf7c56a, 0.55, 6, 2);
  vestibule.position.set(0, 2.2, ROOM.maxZ + 1.2);
  scene.add(vestibule);

  const centerLamp = new THREE.PointLight(0xfff2d4, 0.3, 5, 2);
  centerLamp.position.set(0, ROOM.ceiling - 0.15, 0);
  scene.add(centerLamp);
}

export function resolveMovement(current, desired, radius) {
  const target = new THREE.Vector3(
    THREE.MathUtils.clamp(desired.x, ROOM.minX + radius, ROOM.maxX - radius),
    desired.y,
    THREE.MathUtils.clamp(desired.z, ROOM.minZ + radius, ROOM.maxZ - radius),
  );
  const nextX = tryAxis("x", current, target, radius);
  const stepped = new THREE.Vector3(nextX, target.y, current.z);
  const nextZ = tryAxis("z", stepped, target, radius);
  return new THREE.Vector3(nextX, target.y, nextZ);
}

function tryAxis(axis, from, to, radius) {
  const candidate = axis === "x" ? to.x : to.z;
  const probe = new THREE.Vector3(
    axis === "x" ? candidate : from.x,
    to.y,
    axis === "z" ? candidate : from.z,
  );
  if (!collidesWithObstacle(probe, radius)) return candidate;
  return axis === "x" ? from.x : from.z;
}

function collidesWithObstacle(position, radius) {
  for (const box of OBSTACLES) {
    if (
      position.x + radius > box.minX &&
      position.x - radius < box.maxX &&
      position.z + radius > box.minZ &&
      position.z - radius < box.maxZ
    ) {
      return true;
    }
  }
  return false;
}

async function loadRoomModel() {
  const gltf = await new GLTFLoader().loadAsync(ROOM_MODEL_URL);
  enableShadows(gltf.scene);
  applyLayoutOffsets(gltf.scene);
  return gltf;
}

function loopRoomAnimations(roomModel) {
  const mixer = new THREE.AnimationMixer(roomModel.scene);
  for (const clip of roomModel.animations) mixer.clipAction(clip).play();
  return mixer;
}

function enableShadows(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function applyLayoutOffsets(root) {
  for (const [name, scale] of Object.entries(LAYOUT_WIDTH_SCALES)) {
    root.getObjectByName(name)?.scale.setX(scale);
  }
  for (const [name, offset] of Object.entries(LAYOUT_OFFSETS)) {
    root.getObjectByName(name)?.position.add(offset);
  }
  for (const [name, yaw] of Object.entries(LAYOUT_YAWS)) {
    root.getObjectByName(name)?.rotation.set(0, yaw, 0);
  }
  shortenBed(root);
}

function shortenBed(root) {
  const bed = root.getObjectByName("BED");
  if (!bed) return;
  root.updateMatrixWorld(true);
  const before = new THREE.Box3().setFromObject(bed);
  bed.scale.z *= BED_LENGTH_SCALE;
  root.updateMatrixWorld(true);
  const after = new THREE.Box3().setFromObject(bed);
  bed.position.z += before.min.z - after.min.z;
  bed.position.x += BED_SHIFT_X;
}

function buildTripodStool() {
  const stool = new THREE.Group();
  stool.name = "TRIPOD_STOOL";
  const material = new THREE.MeshStandardMaterial({ color: SEAT_COLOR, roughness: 0.7 });
  const { radius, seatHeight, seatThickness, postRadius } = STOOL;
  addCylinder(stool, material, { radius, height: seatThickness, position: [0, seatHeight, 0] });
  addCylinder(stool, material, { radius: postRadius, height: seatHeight, position: [0, seatHeight / 2, 0] });
  addCylinder(stool, material, { radius: radius * 0.8, height: seatThickness / 2, position: [0, seatThickness / 4, 0] });
  placeAtSpot(stool, SPOTS.tripod);
  return stool;
}

function placeAtSpot(prop, spot) {
  prop.position.copy(spot.position);
  prop.rotation.y = spot.yaw;
}

function populateObstacles(roomGroup) {
  OBSTACLES.length = 0;
  roomGroup.updateMatrixWorld(true);
  for (const name of OBSTACLE_NODE_NAMES) {
    const inflate = name === "HOTSPOT_TRIPOD" ? TRIPOD_INFLATE : OBSTACLE_INFLATE;
    roomGroup.getObjectByName(name)?.traverse((child) => {
      if (child.isMesh) addMeshObstacle(child, inflate);
    });
  }
}

function addMeshObstacle(mesh, inflate) {
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.min.y > BODY_HEIGHT_CUTOFF) return;
  OBSTACLES.push({
    minX: box.min.x - inflate,
    maxX: box.max.x + inflate,
    minZ: box.min.z - inflate,
    maxZ: box.max.z + inflate,
  });
}

function buildHallway() {
  const hallway = new THREE.Group();
  const wallMaterial = new THREE.MeshStandardMaterial({ color: COLOR.wallFill, roughness: 0.9, side: THREE.DoubleSide });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: COLOR.hallwayTrim, roughness: 0.6 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: COLOR.hallwayFloor, roughness: 0.85 });
  const wallZ = ROOM.maxZ + ROOM.wallThickness / 2;
  const openingHalf = DOOR.width / 2;
  const sideWidth = HALLWAY.halfWidth - openingHalf;
  const sideCenterX = openingHalf + sideWidth / 2;

  for (const side of [-1, 1]) {
    addWallPanel(hallway, wallMaterial, { width: sideWidth, height: HALLWAY.height, x: side * sideCenterX, y: HALLWAY.height / 2, z: wallZ });
    addBox(hallway, trimMaterial, { size: [sideWidth, BASEBOARD_HEIGHT, TRIM_DEPTH], position: [side * sideCenterX, BASEBOARD_HEIGHT / 2, wallZ + TRIM_DEPTH / 2] });
  }
  const lintelHeight = HALLWAY.height - DOOR.height;
  addWallPanel(hallway, wallMaterial, { width: DOOR.width, height: lintelHeight, x: 0, y: DOOR.height + lintelHeight / 2, z: wallZ });
  addDoorCasing(hallway, trimMaterial, wallZ);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALLWAY.halfWidth * 2, HALLWAY.depth), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, wallZ + HALLWAY.depth / 2);
  floor.receiveShadow = true;
  hallway.add(floor);
  return hallway;
}

function addWallPanel(group, material, { width, height, x, y, z }) {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  panel.position.set(x, y, z);
  panel.rotation.y = Math.PI;
  panel.receiveShadow = true;
  group.add(panel);
}

// The casing overlaps the door's edges so no gap shows around the slab.
function addDoorCasing(group, material, wallZ) {
  const jambX = DOOR.width / 2 - CASING_OVERLAP + CASING_WIDTH / 2;
  const jambHeight = DOOR.height + CASING_WIDTH;
  for (const side of [-1, 1]) {
    addBox(group, material, { size: [CASING_WIDTH, jambHeight, CASING_DEPTH], position: [side * jambX, jambHeight / 2, wallZ] });
  }
  const headWidth = (jambX + CASING_WIDTH / 2) * 2;
  addBox(group, material, { size: [headWidth, CASING_WIDTH, CASING_DEPTH], position: [0, DOOR.height + CASING_WIDTH / 2, wallZ] });
}

function buildDoorGroup() {
  const pivot = new THREE.Group();
  pivot.name = "doorPivot";
  const hingeX = -DOOR.width / 2;
  pivot.position.set(DOOR.centerX + hingeX, 0, ROOM.maxZ + DOOR.thickness / 2);

  const doorMaterial = new THREE.MeshStandardMaterial({
    color: COLOR.doorSlab,
    roughness: 0.55,
    metalness: 0.05,
  });
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: COLOR.doorPanel,
    roughness: 0.6,
  });

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR.width, DOOR.height, DOOR.thickness),
    doorMaterial,
  );
  slab.position.set(DOOR.width / 2, DOOR.height / 2, 0);
  slab.castShadow = true;
  slab.receiveShadow = true;
  slab.name = "doorSlab";
  pivot.add(slab);

  const panelPositions = [
    [0.25, 0.55], [0.25, 1.05], [0.25, 1.55],
    [DOOR.width - 0.25, 0.55], [DOOR.width - 0.25, 1.05], [DOOR.width - 0.25, 1.55],
  ];
  for (const [dx, dy] of panelPositions) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.36),
      panelMaterial,
    );
    panel.position.set(dx, dy, DOOR.thickness / 2 + 0.004);
    pivot.add(panel);
  }

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 20, 16),
    new THREE.MeshStandardMaterial({ color: COLOR.doorKnob, roughness: 0.3, metalness: 0.85 }),
  );
  knob.position.set(DOOR.width - 0.14, 1.05, DOOR.thickness / 2 + 0.035);
  knob.name = "doorKnob";
  pivot.add(knob);

  return pivot;
}
