import * as THREE from "three";
import { SPOTS } from "./roomConfig.js";
import { addCylinder, requireNode } from "./meshHelpers.js";

// Corrections to the GLB layout: the bed's foot touched the desk's end
// (sealing off the floor in front of the window), the tripod sits back against
// the left wall, the bookshelf sits clear of the turntable corner, and the window
// slides along its wall so the corner is free for posters, as in the real room.
// The guitar leaves the poster corner, which visitors kept reading as music,
// for the wall above the turntable (see mountGuitar).
const LAYOUT_OFFSETS = {
  BED: new THREE.Vector3(0.08, 0, -0.22),
  HOTSPOT_LIBRARY: new THREE.Vector3(0.2, 0, 0),
  WINDOW: new THREE.Vector3(0, 0, 0.4),
  HOTSPOT_DESK: new THREE.Vector3(0, 0, 0.3),
  HOTSPOT_TRIPOD: new THREE.Vector3(-0.25, 0, 0),
};

// The tripod is turned so its phone screen faces into the room, toward the
// stool.
const LAYOUT_YAWS = {
  HOTSPOT_TRIPOD: Math.PI / 2,
};

// A slimmer bed leaves breathing room by the bookshelf spot.
const LAYOUT_WIDTH_SCALES = {
  BED: 0.88,
};

// A shorter bed, kept flush with the head wall, opens the walkway between its
// foot and the desk so the poster corner is easy to reach.
const BED_LENGTH_SCALE = 0.86;
const BED_SHIFT_X = -0.1;

// Moves the guitar from its stand in the back-right corner to hang centred at
// x -1.6 against the back wall (z -2.345), its bottom at y 1.22, just above
// the record on the turntable.
const GUITAR_MOUNT_OFFSET = new THREE.Vector3(-3.185, 1.1, -0.22);
const GUITAR_HOOK_POSITION = [-1.6, 2.2, -2.3];
const GUITAR_HOOK_COLOR = 0x2b2b2b;

const RECORD_LAMP_PARTS = ["Lamp_Stem", "Lamp_Shade", "Record_Lamp_Glow"];

const SEAT_COLOR = 0x2a2522;
const STOOL = { radius: 0.18, seatHeight: 0.45, seatThickness: 0.05, postRadius: 0.03 };

export function applyLayoutCorrections(root) {
  for (const [name, scale] of Object.entries(LAYOUT_WIDTH_SCALES)) requireNode(root, name).scale.setX(scale);
  for (const [name, offset] of Object.entries(LAYOUT_OFFSETS)) requireNode(root, name).position.add(offset);
  for (const [name, yaw] of Object.entries(LAYOUT_YAWS)) requireNode(root, name).rotation.set(0, yaw, 0);
  shortenBed(root);
  mountGuitar(root);
  removeRecordLamp(root);
}

export function buildTripodStool() {
  const stool = new THREE.Group();
  stool.name = "TRIPOD_STOOL";
  const material = new THREE.MeshStandardMaterial({ color: SEAT_COLOR, roughness: 0.7 });
  const { radius, seatHeight, seatThickness, postRadius } = STOOL;
  addCylinder(stool, material, { radius, height: seatThickness, position: [0, seatHeight, 0] });
  addCylinder(stool, material, { radius: postRadius, height: seatHeight, position: [0, seatHeight / 2, 0] });
  addCylinder(stool, material, { radius: radius * 0.8, height: seatThickness / 2, position: [0, seatThickness / 4, 0] });
  stool.position.copy(SPOTS.tripod.position);
  stool.rotation.y = SPOTS.tripod.yaw;
  return stool;
}

// Takes the guitar off its floor stand and hangs it face-out on the back
// wall above the turntable, on a small hook. It
// hangs above body height, so it never blocks walking.
function mountGuitar(root) {
  requireNode(root, "Acoustic_Guitar__Stand_graphite").removeFromParent();
  const guitar = requireNode(root, "Acoustic_Guitar");
  guitar.rotation.set(0, 0, 0);
  guitar.position.add(GUITAR_MOUNT_OFFSET);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), new THREE.MeshStandardMaterial({ color: GUITAR_HOOK_COLOR, roughness: 0.4 }));
  hook.position.set(...GUITAR_HOOK_POSITION);
  root.add(hook);
}

// The reading lamp beside the turntable, and the warm light it casts, are gone
// at Namish's request.
function removeRecordLamp(root) {
  for (const name of RECORD_LAMP_PARTS) requireNode(root, name).removeFromParent();
}

function shortenBed(root) {
  const bed = requireNode(root, "BED");
  root.updateMatrixWorld(true);
  const before = new THREE.Box3().setFromObject(bed);
  bed.scale.z *= BED_LENGTH_SCALE;
  root.updateMatrixWorld(true);
  const after = new THREE.Box3().setFromObject(bed);
  bed.position.z += before.min.z - after.min.z;
  bed.position.x += BED_SHIFT_X;
}
