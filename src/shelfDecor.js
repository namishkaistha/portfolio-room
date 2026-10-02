import * as THREE from "three";
import { addBox, addCylinder, solid } from "./meshHelpers.js";

// The GLB modelled the cap as a plain block (rebuilt below) and the trophy is
// left off the shelf entirely.
const REPLACED_DECOR_NAMES = ["Chicago_Cubs_Cap", "Small_Trophy"];
const SHELF_TOP_Y = 2.24;
const CAP_POSITION = new THREE.Vector3(-0.62, SHELF_TOP_Y, -2.2);
const CAP_YAW = 0.5;
const N_LOGO = { height: 0.04, width: 0.032, stroke: 0.008, depth: 0.004 };

const COLOR = {
  northwesternPurple: 0x4e2a84,
  logoWhite: 0xf4f2f7,
};

export function replaceShelfTopDecor(roomGroup) {
  for (const name of REPLACED_DECOR_NAMES) roomGroup.getObjectByName(name)?.removeFromParent();
  roomGroup.add(buildNorthwesternCap());
}

function buildNorthwesternCap() {
  const cap = new THREE.Group();
  cap.name = "NORTHWESTERN_CAP";
  const purple = solid(COLOR.northwesternPurple, 0.75);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.09, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), purple);
  crown.scale.set(1, 0.8, 1.1);
  crown.castShadow = true;
  cap.add(crown);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.008, 28, 1, false, -Math.PI / 2, Math.PI), purple);
  brim.position.set(0, 0.006, 0.085);
  brim.scale.set(1.15, 1, 0.9);
  brim.castShadow = true;
  cap.add(brim);
  addCylinder(cap, purple, { radius: 0.01, height: 0.008, position: [0, 0.074, 0] });
  cap.add(buildBlockN());
  cap.position.copy(CAP_POSITION);
  cap.rotation.y = CAP_YAW;
  return cap;
}

// White block "N" on the crown's front, built from two uprights and a diagonal.
function buildBlockN() {
  const logo = new THREE.Group();
  const white = solid(COLOR.logoWhite, 0.6);
  const { height, width, stroke, depth } = N_LOGO;
  for (const side of [-1, 1]) {
    addBox(logo, white, { size: [stroke, height, depth], position: [side * (width - stroke) / 2, 0, 0] });
  }
  const diagonal = addBox(logo, white, { size: [stroke, Math.hypot(height, width - stroke), depth], position: [0, 0, 0] });
  diagonal.rotation.z = Math.atan2(width - stroke, height);
  logo.position.set(0, 0.038, 0.096);
  logo.rotation.x = -0.4;
  return logo;
}
