import * as THREE from "three";
import { ROOM, DOOR, HALLWAY } from "./roomConfig.js";
import { addBox } from "./meshHelpers.js";

// The hallway the visitor starts in: its wall around the doorway (cut away
// once inside the room) and the door itself.
const COLOR = {
  wallFill: 0xe8dcc4,
  doorSlab: 0x7a4a26,
  doorPanel: 0x5a331a,
  doorKnob: 0xe7c07b,
  hallwayTrim: 0xf1e9d8,
  hallwayFloor: 0x8a6a4e,
};

const BASEBOARD_HEIGHT = 0.09;
const TRIM_DEPTH = 0.05;
const CASING_WIDTH = 0.09;
const CASING_DEPTH = 0.14;
const CASING_OVERLAP = 0.02;

export function buildHallway() {
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

export function buildDoorGroup() {
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
