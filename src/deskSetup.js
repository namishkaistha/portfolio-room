import * as THREE from "three";
import { SPOTS } from "./roomConfig.js";
import { addBox, addCylinder, glowing, solid } from "./meshHelpers.js";
import { createSeededRandom } from "./seededRandom.js";

const REPLACED_NODE_NAMES = [
  "HOTSPOT_TRAVEL_MEMOIRS",
  "Monitor_Screen",
  "Monitor_Display",
  "Project_Card_Market_Signals",
  "Project_Card_DNA",
  "Project_Card_Alchemy",
  "Desk_Lamp_Stem",
  "Desk_Lamp_Bar",
  "Laptop_Base",
  "Laptop_Screen",
];

const DESK_TOP_Y = 0.81;
const DESK_CENTER_Z = 1.89;
const WALL_SURFACE_X = 2.045;

const COLOR = {
  deskTop: 0xa49684,
  pad: 0x3a2418,
  bezel: 0x111214,
  display: 0xdde4ec,
  speakerWood: 0x6e4527,
  speakerFace: 0x151515,
  lampMetal: 0x1a1a1a,
  bulb: 0xffbf6b,
  interface: 0xc8321f,
  paper: 0xf3f1ea,
  stickyGreen: 0xcfe8b0,
  stickyYellow: 0xf4e9a0,
  jar: 0xe2552c,
  lid: 0xf5f5f0,
  tumbler: 0x8c9196,
  wallet: 0x141414,
  leather: 0x4d4f52,
  armWood: 0x8a5530,
  chairMetal: 0x2a2a2a,
  posterBoard: 0xece3cc,
  posterArt: 0x6b7a5a,
};

const PHOTO_TONES = [0xc9a27e, 0x6d5a4a, 0x9fb3c8, 0xd8c3a5, 0x4f4a45, 0xb5654a, 0x7d8f69, 0xe0d6c8, 0x8a7766, 0x3f4b5c];
const PHOTO = { width: 0.1, height: 0.13, border: 0.008 };
// Rows of the collage from top to bottom: [first z, print count], loosely
// matching the uneven cluster above the real desk.
const COLLAGE_ROWS = [
  { y: 2.06, startZ: 0.62, count: 5 },
  { y: 1.9, startZ: 0.5, count: 7 },
  { y: 1.74, startZ: 0.44, count: 8 },
  { y: 1.58, startZ: 0.5, count: 7 },
  { y: 1.42, startZ: 0.62, count: 5 },
];
const ABOUT_HIT_BOXES = [
  { size: [0.12, 0.9, 1.15], position: [WALL_SURFACE_X - 0.05, 1.72, 0.95] },
  { size: [0.72, 0.4, 0.85], position: [1.64, DESK_TOP_Y + 0.2, 0.8] },
];
const COLLAGE_SPACING_Z = 0.12;
const COLLAGE_JITTER = 0.018;
const LAMP_LIGHT = { color: 0xffb066, intensity: 1.4, distance: 3.2, decay: 2 };

export function dressDesk(roomGroup) {
  removeReplacedNodes(roomGroup);
  recolor(roomGroup.getObjectByName("Desk_Top"), solid(COLOR.deskTop, 0.6));
  roomGroup.add(buildDeskProps(), buildPhotoWall(), buildAboutHitAreas(), buildDeskChair());
}

function removeReplacedNodes(roomGroup) {
  for (const name of REPLACED_NODE_NAMES) roomGroup.getObjectByName(name)?.removeFromParent();
}

function recolor(mesh, material) {
  if (mesh) mesh.material = material;
}

function buildDeskProps() {
  const props = new THREE.Group();
  props.name = "DESK_PROPS";
  addDeskPad(props);
  const setup = new THREE.Group();
  setup.name = "DESK_MONITOR";
  addMonitor(setup);
  addSpeakers(setup);
  props.add(setup);
  addEdisonLamp(props);
  addClutter(props);
  return props;
}

function addDeskPad(props) {
  addBox(props, solid(COLOR.pad, 0.8), { size: [0.42, 0.006, 0.82], position: [1.52, DESK_TOP_Y + 0.003, DESK_CENTER_Z] });
}

function addMonitor(props) {
  addBox(props, solid(COLOR.bezel, 0.4), { size: [0.03, 0.36, 0.6], position: [1.9, 1.22, DESK_CENTER_Z] });
  addBox(props, glowing(COLOR.display, 0.4), { size: [0.005, 0.32, 0.56], position: [1.883, 1.22, DESK_CENTER_Z] });
  addBox(props, solid(COLOR.bezel, 0.4), { size: [0.04, 0.26, 0.05], position: [1.93, DESK_TOP_Y + 0.13, DESK_CENTER_Z] });
  addBox(props, solid(COLOR.bezel, 0.4), { size: [0.16, 0.012, 0.22], position: [1.9, DESK_TOP_Y + 0.006, DESK_CENTER_Z] });
}

function addSpeakers(props) {
  for (const side of [-1, 1]) {
    const z = DESK_CENTER_Z + side * 0.4;
    addBox(props, solid(COLOR.speakerWood, 0.55), { size: [0.17, 0.25, 0.15], position: [1.9, DESK_TOP_Y + 0.125, z] });
    addBox(props, solid(COLOR.speakerFace, 0.5), { size: [0.005, 0.23, 0.13], position: [1.813, DESK_TOP_Y + 0.125, z] });
  }
}

function addEdisonLamp(props) {
  const metal = solid(COLOR.lampMetal, 0.4);
  const lampZ = 0.45;
  addCylinder(props, metal, { radius: 0.07, height: 0.02, position: [1.88, DESK_TOP_Y + 0.01, lampZ] });
  addCylinder(props, metal, { radius: 0.008, height: 0.55, position: [1.92, DESK_TOP_Y + 0.275, lampZ] });
  addBox(props, metal, { size: [0.14, 0.012, 0.012], position: [1.86, DESK_TOP_Y + 0.55, lampZ] });
  const bulbPosition = new THREE.Vector3(1.79, DESK_TOP_Y + 0.49, lampZ);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 16), glowing(COLOR.bulb, 2.2));
  bulb.position.copy(bulbPosition);
  props.add(bulb);
  const light = new THREE.PointLight(LAMP_LIGHT.color, LAMP_LIGHT.intensity, LAMP_LIGHT.distance, LAMP_LIGHT.decay);
  light.position.copy(bulbPosition);
  props.add(light);
}

function addClutter(props) {
  addBox(props, solid(COLOR.interface, 0.5), { size: [0.1, 0.045, 0.17], position: [1.62, DESK_TOP_Y + 0.0225, 1.2] });
  addBox(props, solid(COLOR.paper, 0.9), { size: [0.22, 0.002, 0.3], position: [1.5, DESK_TOP_Y + 0.004, 1.15], yaw: 0.25 });
  addBox(props, solid(COLOR.paper, 0.9), { size: [0.22, 0.002, 0.3], position: [1.52, DESK_TOP_Y + 0.004, 0.82], yaw: -0.15 });
  for (const [x, z, color] of [[1.42, 0.55, COLOR.stickyGreen], [1.5, 0.6, COLOR.stickyYellow], [1.44, 0.68, COLOR.stickyGreen], [1.58, 0.52, COLOR.stickyGreen]]) {
    addBox(props, solid(color, 0.9), { size: [0.07, 0.003, 0.07], position: [x, DESK_TOP_Y + 0.007, z], yaw: (x - z) * 2 });
  }
  addCylinder(props, solid(COLOR.jar, 0.5), { radius: 0.05, height: 0.13, position: [1.82, DESK_TOP_Y + 0.065, 1.05] });
  addCylinder(props, solid(COLOR.lid, 0.5), { radius: 0.052, height: 0.02, position: [1.82, DESK_TOP_Y + 0.14, 1.05] });
  addCylinder(props, solid(COLOR.tumbler, 0.3), { radius: 0.036, height: 0.21, position: [1.72, DESK_TOP_Y + 0.105, 0.9] });
  addBox(props, solid(COLOR.wallet, 0.6), { size: [0.1, 0.02, 0.12], position: [1.45, DESK_TOP_Y + 0.01, 0.4] });
}

function buildPhotoWall() {
  const wall = new THREE.Group();
  wall.name = "PHOTO_COLLAGE";
  const border = solid(0xf7f4ee, 0.8);
  const nextRandom = createSeededRandom(7);
  let toneIndex = 0;
  for (const row of COLLAGE_ROWS) {
    for (let index = 0; index < row.count; index += 1) {
      const z = row.startZ + index * COLLAGE_SPACING_Z + (nextRandom() - 0.5) * COLLAGE_JITTER;
      const y = row.y + (nextRandom() - 0.5) * COLLAGE_JITTER;
      addPrint(wall, border, solid(PHOTO_TONES[toneIndex % PHOTO_TONES.length], 0.8), { y, z });
      toneIndex += 3;
    }
  }
  addBox(wall, solid(COLOR.posterBoard, 0.8), { size: [0.004, 0.32, 0.24], position: [WALL_SURFACE_X, 1.62, 0.12] });
  addBox(wall, solid(COLOR.posterArt, 0.8), { size: [0.004, 0.16, 0.19], position: [WALL_SURFACE_X - 0.002, 1.66, 0.12] });
  return wall;
}

// Invisible click targets so the whole photo wall and the far half of the desk
// answer to a click, not just the thin prints and props.
function buildAboutHitAreas() {
  const areas = new THREE.Group();
  areas.name = "ABOUT_HIT_AREAS";
  const invisible = new THREE.MeshBasicMaterial({ visible: false });
  for (const { size, position } of ABOUT_HIT_BOXES) {
    const area = new THREE.Mesh(new THREE.BoxGeometry(...size), invisible);
    area.position.set(...position);
    areas.add(area);
  }
  return areas;
}

function addPrint(wall, borderMaterial, photoMaterial, { y, z }) {
  const { width, height, border } = PHOTO;
  addBox(wall, borderMaterial, { size: [0.003, height, width], position: [WALL_SURFACE_X, y, z] });
  addBox(wall, photoMaterial, { size: [0.003, height - border * 2, width - border * 2], position: [WALL_SURFACE_X - 0.002, y, z] });
}

function buildDeskChair() {
  const chair = new THREE.Group();
  chair.name = "DESK_CHAIR";
  const leather = solid(COLOR.leather, 0.55);
  const wood = solid(COLOR.armWood, 0.5);
  const metal = solid(COLOR.chairMetal, 0.4);
  addBox(chair, leather, { size: [0.5, 0.08, 0.48], position: [0, 0.47, 0] });
  addBox(chair, leather, { size: [0.48, 0.62, 0.07], position: [0, 0.82, -0.22] });
  for (const side of [-1, 1]) {
    addBox(chair, metal, { size: [0.04, 0.18, 0.04], position: [side * 0.27, 0.6, 0] });
    addBox(chair, wood, { size: [0.05, 0.04, 0.4], position: [side * 0.27, 0.7, 0.02] });
  }
  addCylinder(chair, metal, { radius: 0.03, height: 0.4, position: [0, 0.22, 0] });
  addCylinder(chair, metal, { radius: 0.26, height: 0.03, position: [0, 0.03, 0] });
  chair.position.copy(SPOTS.laptop.position);
  chair.rotation.y = SPOTS.laptop.yaw;
  return chair;
}
