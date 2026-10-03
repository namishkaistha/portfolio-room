import * as THREE from "three";
import { OUTFIT_PIECES } from "./outfits.js";
import { approach, smoothstep } from "./motion.js";

const DOOR_PIECES = [
  /^Closed_Closet_Door_1$|^Closet_Inset_Panel_1_|^Closet_Panel_(Stile|Rail)_0_|^Closet_Flush_Pull_1$/,
  /^Closed_Closet_Door_2$|^Closet_Inset_Panel_2_|^Closet_Panel_(Stile|Rail)_1_|^Closet_Flush_Pull_2$/,
];
// The first door slides in front of the second; the extra X clears its panels.
const SLIDE = { x: 0.09, z: 0.76 };
const SLIDE_SPEED = 1.7;
const ROD = { x: -2.0, y: 1.9, fromZ: -1.2, toZ: -0.56 };
const GARMENT_DEPTH = 0.05;

export function installClosetDoors(roomGroup) {
  const doors = DOOR_PIECES.map((pattern, index) => groupDoor(roomGroup, pattern, index + 1));
  roomGroup.add(buildHangingClothes());
  const state = { progress: 0, target: 0 };
  return {
    open() { state.target = 1; },
    close() { state.target = 0; },
    update(deltaSeconds) {
      if (state.progress === state.target) return;
      state.progress = approach(state.progress, state.target, SLIDE_SPEED * deltaSeconds);
      const eased = smoothstep(state.progress);
      doors[0].position.set(SLIDE.x * eased, 0, SLIDE.z * eased);
    },
  };
}

// The model's door pieces are loose meshes, so each door is gathered into one
// group that can slide as a unit and glow as one object.
function groupDoor(roomGroup, pattern, number) {
  const group = new THREE.Group();
  group.name = `CLOSET_DOOR_${number}`;
  roomGroup.add(group);
  const matches = [];
  roomGroup.traverse((object) => {
    if (object.isMesh && pattern.test(object.name)) matches.push(object);
  });
  for (const mesh of matches) group.attach(mesh);
  return group;
}

// One garment per outfit piece, hung where the sliding door reveals them.
function buildHangingClothes() {
  const clothes = new THREE.Group();
  clothes.name = "CLOSET_CLOTHES";
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, ROD.toZ - ROD.fromZ, 10), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.7, roughness: 0.4 }));
  rod.rotation.x = Math.PI / 2;
  rod.position.set(ROD.x, ROD.y, (ROD.fromZ + ROD.toZ) / 2);
  clothes.add(rod);
  const spacing = (ROD.toZ - ROD.fromZ) / OUTFIT_PIECES.length;
  OUTFIT_PIECES.forEach((piece, index) => {
    const height = piece.garment === "top" ? 0.62 : 0.8;
    const garment = new THREE.Mesh(new THREE.BoxGeometry(GARMENT_DEPTH, height, spacing * 0.78), new THREE.MeshStandardMaterial({ color: piece.color, roughness: piece.roughness }));
    garment.position.set(ROD.x, ROD.y - 0.05 - height / 2, ROD.fromZ + spacing * (index + 0.5));
    clothes.add(garment);
  });
  return clothes;
}
