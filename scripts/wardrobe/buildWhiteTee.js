import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

// Builds public/wardrobe/wearables/white-tee.glb, the plain white tee worn
// under the Prince vest. It reuses the Northwestern sweatshirt's rigged body,
// trims the sleeves to tee length and adds bare forearms, because the avatar
// has no arms under its built-in sleeves.
const SOURCE = "/wardrobe/wearables/northwestern-rose-bowl-sweatshirt.glb";
const AVATAR = "/avatar.glb";
const DROPPED_PARTS = ["Cuff_L", "Cuff_R", "Waist_hem"];
const SLEEVE_LENGTH_FRACTION = 0.42;
const TEE = { color: 0xf3f1ec, roughness: 0.92 };
const RIB = { color: 0xe6e3dc, roughness: 0.95 };
const SKIN_MATERIAL = "Skin • warm medium brown";
const ARM = { shoulderRadius: 0.041, elbowRadius: 0.036, wristRadius: 0.03, radialSegments: 18, rowsPerSegment: 10, startBelowShoulder: 0.07, wristOverlap: 0.012, elbowBlend: 0.03 };

export async function buildWhiteTee() {
  const loader = new GLTFLoader();
  const [{ scene: tee }, { scene: avatar }] = await Promise.all([loader.loadAsync(SOURCE), loader.loadAsync(AVATAR)]);
  tee.updateMatrixWorld(true);
  avatar.updateMatrixWorld(true);
  tee.name = "White_tee";
  removeParts(tee);
  const skeleton = skeletonOf(tee);
  const joints = jointPositions(avatar);
  for (const side of ["L", "R"]) trimSleeve(tee.getObjectByName(`Sleeve_${side}`), joints[side]);
  dressInWhite(tee);
  const skin = findMaterial(avatar, SKIN_MATERIAL).clone();
  skin.side = THREE.DoubleSide;
  for (const side of ["L", "R"]) tee.add(buildArm({ side, joints: joints[side], skeleton, material: skin }));
  return new GLTFExporter().parseAsync(tee, { binary: true });
}

function removeParts(tee) {
  for (const name of DROPPED_PARTS) tee.getObjectByName(name)?.removeFromParent();
}

function skeletonOf(tee) {
  let skeleton = null;
  tee.traverse((node) => {
    if (node.isSkinnedMesh) skeleton ??= node.skeleton;
  });
  return skeleton;
}

function jointPositions(avatar) {
  const at = (name) => avatar.getObjectByName(name).getWorldPosition(new THREE.Vector3());
  return Object.fromEntries(["L", "R"].map((side) => [side, {
    shoulder: at(`UpperArm_${side}`),
    elbow: at(`Forearm_${side}`),
    wrist: at(`Hand_${side}`),
  }]));
}

// Keeps only sleeve triangles near the shoulder, measured along the arm.
function trimSleeve(sleeve, { shoulder, wrist }) {
  const armLength = shoulder.distanceTo(wrist);
  const cutHeight = shoulder.y - armLength * SLEEVE_LENGTH_FRACTION;
  const geometry = sleeve.geometry;
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex().array;
  const kept = [];
  for (let corner = 0; corner < index.length; corner += 3) {
    const triangle = [index[corner], index[corner + 1], index[corner + 2]];
    if (triangle.every((vertex) => position.getY(vertex) >= cutHeight)) kept.push(...triangle);
  }
  geometry.setIndex(kept);
}

function dressInWhite(tee) {
  const cloth = new THREE.MeshStandardMaterial({ name: "White_cotton", ...TEE });
  const rib = new THREE.MeshStandardMaterial({ name: "White_rib", ...RIB });
  tee.traverse((node) => {
    if (node.isSkinnedMesh) node.material = node.name === "Crew_neck" ? rib : cloth;
  });
}

function findMaterial(root, name) {
  let found = null;
  root.traverse((node) => {
    if (node.isMesh && node.material.name === name) found ??= node.material;
  });
  return found;
}

// A tapered tube from just inside the sleeve to the wrist, skinned to the
// upper arm above the elbow and to the forearm below it.
function buildArm({ side, joints, skeleton, material }) {
  const upperBone = skeleton.bones.findIndex((bone) => bone.name === `UpperArm_${side}`);
  const lowerBone = skeleton.bones.findIndex((bone) => bone.name === `Forearm_${side}`);
  const start = joints.shoulder.clone().lerp(joints.elbow, ARM.startBelowShoulder / joints.shoulder.distanceTo(joints.elbow));
  const end = joints.wrist.clone().add(new THREE.Vector3(0, -ARM.wristOverlap, 0));
  const path = [
    { point: start, radius: ARM.shoulderRadius },
    { point: joints.elbow, radius: ARM.elbowRadius },
    { point: end, radius: ARM.wristRadius },
  ];
  const geometry = tubeAlong(path);
  skinToElbow(geometry, { elbowY: joints.elbow.y, upperBone, lowerBone });
  const arm = new THREE.SkinnedMesh(geometry, material);
  arm.name = `Bare_arm_${side}`;
  arm.bind(skeleton, new THREE.Matrix4());
  return arm;
}

function tubeAlong(path) {
  const positions = [];
  const rows = [];
  for (let segment = 0; segment < path.length - 1; segment++) {
    const from = path[segment];
    const to = path[segment + 1];
    const isLast = segment === path.length - 2;
    for (let row = 0; row < ARM.rowsPerSegment + (isLast ? 1 : 0); row++) {
      const t = row / ARM.rowsPerSegment;
      rows.push({ center: from.point.clone().lerp(to.point, t), radius: THREE.MathUtils.lerp(from.radius, to.radius, t) });
    }
  }
  for (const { center, radius } of rows) {
    for (let step = 0; step <= ARM.radialSegments; step++) {
      const angle = (step / ARM.radialSegments) * Math.PI * 2;
      positions.push(center.x + Math.cos(angle) * radius, center.y, center.z + Math.sin(angle) * radius);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(tubeIndices(rows.length));
  geometry.computeVertexNormals();
  return geometry;
}

function tubeIndices(rowCount) {
  const ring = ARM.radialSegments + 1;
  const indices = [];
  for (let row = 0; row < rowCount - 1; row++) {
    for (let step = 0; step < ARM.radialSegments; step++) {
      const a = row * ring + step;
      const b = a + ring;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return indices;
}

function skinToElbow(geometry, { elbowY, upperBone, lowerBone }) {
  const position = geometry.getAttribute("position");
  const skinIndex = [];
  const skinWeight = [];
  for (let vertex = 0; vertex < position.count; vertex++) {
    const lowerShare = THREE.MathUtils.clamp(0.5 + (elbowY - position.getY(vertex)) / (2 * ARM.elbowBlend), 0, 1);
    skinIndex.push(upperBone, lowerBone, 0, 0);
    skinWeight.push(1 - lowerShare, lowerShare, 0, 0);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));
}
