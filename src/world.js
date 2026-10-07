import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ROOM } from "./roomConfig.js";
import { loadAvatar } from "./avatar.js";
import { dressDesk } from "./deskSetup.js";
import { buildPostItWall } from "./postItWall.js";
import { hangCornerGallery } from "./wallArt.js";
import { installRecordShelf } from "./recordShelf.js";
import { replaceShelfTopDecor } from "./shelfDecor.js";
import { installBookPull } from "./bookPull.js";
import { installClosetDoors } from "./closetDoors.js";
import { applyLayoutCorrections, buildTripodStool } from "./roomLayout.js";
import { buildTravelTable, paintLanternPanels } from "./travelTable.js";
import { collectObstacles, createCollider } from "./collision.js";
import { buildDoorGroup, buildHallway } from "./entrance.js";

const ROOM_MODEL_URL = "/room.glb";
const BACKDROP_COLOR = 0x9a8669;
const FOG_NEAR = 14;
const FOG_FAR = 30;

export async function buildScene(scene) {
  scene.background = new THREE.Color(BACKDROP_COLOR);
  scene.fog = new THREE.Fog(BACKDROP_COLOR, FOG_NEAR, FOG_FAR);

  const [roomModel, avatar] = await Promise.all([loadRoomModel(), loadAvatar()]);
  const roomGroup = roomModel.scene;
  dressDesk(roomGroup);
  roomGroup.add(buildPostItWall());
  hangCornerGallery(roomGroup);
  installRecordShelf(roomGroup);
  replaceShelfTopDecor(roomGroup);
  installBookPull(roomGroup);
  roomGroup.add(buildTripodStool(), buildTravelTable());
  paintLanternPanels(roomGroup);
  const obstacles = collectObstacles(roomGroup);
  const collider = createCollider(obstacles);
  scene.add(roomGroup);
  roomGroup.add(avatar.root);
  const roomMixer = loopRoomAnimations(roomModel);
  const closetDoors = installClosetDoors(roomGroup);

  const frontWall = buildHallway();
  scene.add(frontWall);

  const doorGroup = buildDoorGroup();
  scene.add(doorGroup);

  return { doorGroup, roomGroup, frontWall, avatar, roomMixer, closetDoors, collider, obstacles };
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

async function loadRoomModel() {
  const gltf = await new GLTFLoader().loadAsync(ROOM_MODEL_URL);
  enableShadows(gltf.scene);
  applyLayoutCorrections(gltf.scene);
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
