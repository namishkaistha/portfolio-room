import * as THREE from "three";
import { approach, slideThenTurn } from "./motion.js";
import { requireNode } from "./meshHelpers.js";

// The top-10 records on the record stand. The middle of its upper shelf row is
// cleared to hold them; the GLB's other sleeves stay on either side as the
// rest of the collection. One record at a time can be pulled out to face the viewer.
const CLEARED_SLEEVE_NAMES = ["Music_Book_1_3", "Music_Book_1_4", "Music_Book_1_5"];
export const RECORD_COUNT = 10;
const SLEEVE = { thickness: 0.021, size: 0.3, depth: 0.27, gap: 0.002 };
const SHELF = { firstX: -1.63, bottomY: 0.37, centerZ: -1.695 };
const PULL = { distance: 0.32, lift: 0.04, coverTurn: -1.35, slideShare: 0.6, speed: 2.6 };
const CARDBOARD_COLOR = 0xd9cdb8;

const state = { records: [], pulledIndex: null };

export function installRecordShelf(roomGroup) {
  for (const name of CLEARED_SLEEVE_NAMES) requireNode(roomGroup, name).removeFromParent();
  const shelf = new THREE.Group();
  shelf.name = "TOP_TEN_SHELF";
  for (let index = 0; index < RECORD_COUNT; index += 1) {
    const record = buildRecord(index);
    state.records.push(record);
    shelf.add(record.pivot);
  }
  roomGroup.add(shelf);
}

export function updateRecordShelf(deltaSeconds) {
  state.records.forEach((record, index) => {
    record.pull = approach(record.pull, index === state.pulledIndex ? 1 : 0, PULL.speed * deltaSeconds);
    poseRecord(record);
  });
}

// Pulls one record out (null puts them all back).
export function pullOutRecord(index) {
  state.pulledIndex = index;
}

export function wrapSleeves(tracks) {
  tracks.forEach((track, index) => wrapSleeve(state.records[index], track));
}

function buildRecord(index) {
  const cardboard = new THREE.MeshStandardMaterial({ color: CARDBOARD_COLOR, roughness: 0.85 });
  const geometry = new THREE.BoxGeometry(SLEEVE.thickness, SLEEVE.size, SLEEVE.depth);
  const mesh = new THREE.Mesh(geometry, Array(6).fill(cardboard));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const pivot = new THREE.Group();
  const base = new THREE.Vector3(
    SHELF.firstX + index * (SLEEVE.thickness + SLEEVE.gap) + SLEEVE.thickness / 2,
    SHELF.bottomY + SLEEVE.size / 2,
    SHELF.centerZ,
  );
  pivot.position.copy(base);
  pivot.add(mesh);
  return { pivot, mesh, base, pull: 0 };
}

function poseRecord(record) {
  const { slide, turn } = slideThenTurn(record.pull, PULL.slideShare);
  record.pivot.position.set(record.base.x, record.base.y + PULL.lift * slide, record.base.z + PULL.distance * slide);
  record.pivot.rotation.y = PULL.coverTurn * turn;
}

function wrapSleeve(record, track) {
  if (!track.albumArt) return;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const cover = loader.load(track.albumArt);
  cover.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.7 });
  const [, , top, bottom, , back] = record.mesh.material;
  record.mesh.material = [art, art, top, bottom, art, back];
}
