import * as THREE from "three";
import { ACCENTS_NAME } from "./outfits.js";

const CHAIN_RADIUS = 0.004;
const GOLD = 0xd8a740;
const TANK_COLOR = 0xf4f4f0;
// Positions are in the avatar's rest pose, measured on the model: the chest
// front sits at about z 0.13 and the collar at about y 1.40.
const CHAIN_PATH = [
  [-0.06, 1.42, 0.07],
  [-0.055, 1.35, 0.128],
  [-0.03, 1.29, 0.142],
  [0, 1.265, 0.145],
  [0.03, 1.29, 0.142],
  [0.055, 1.35, 0.128],
  [0.06, 1.42, 0.07],
];
const TANK = { halfWidth: 0.075, top: 1.405, tip: 1.21, z: 0.133 };

// A white tank top V and a gold chain that show where the striped shirt is
// worn open. Built once and shown only for pieces that ask for it.
export function installOutfitAccents(avatarRoot) {
  if (avatarRoot.getObjectByName(ACCENTS_NAME)) return;
  const spine = avatarRoot.getObjectByName("Spine");
  if (!spine) return;
  const accents = new THREE.Group();
  accents.name = ACCENTS_NAME;
  accents.add(buildTank(), buildChain(), buildPendant());
  accents.visible = false;
  avatarRoot.add(accents);
  avatarRoot.updateMatrixWorld(true);
  spine.attach(accents);
}

function buildTank() {
  const shape = new THREE.Shape();
  shape.moveTo(-TANK.halfWidth, TANK.top);
  shape.lineTo(TANK.halfWidth, TANK.top);
  shape.lineTo(0, TANK.tip);
  shape.closePath();
  const tank = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: TANK_COLOR, roughness: 0.9, side: THREE.DoubleSide }));
  tank.position.z = TANK.z;
  return tank;
}

function buildChain() {
  const curve = new THREE.CatmullRomCurve3(CHAIN_PATH.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 40, CHAIN_RADIUS, 8), new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85, roughness: 0.3 }));
}

function buildPendant() {
  const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.011, 14, 12), new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85, roughness: 0.3 }));
  const [x, y, z] = CHAIN_PATH[3];
  pendant.position.set(x, y - 0.012, z + 0.004);
  return pendant;
}
