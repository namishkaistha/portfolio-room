import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const AVATAR_MODEL_URL = "/avatar.glb";
const CROSSFADE_SECONDS = 0.18;
const MAX_ANIMATION_STEP_SECONDS = 0.1;

export async function loadAvatar() {
  const gltf = await new GLTFLoader().loadAsync(AVATAR_MODEL_URL);
  const root = new THREE.Group();
  root.name = "avatar";
  root.add(gltf.scene);
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const mixer = new THREE.AnimationMixer(gltf.scene);
  const actions = new Map(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
  let currentAction = null;

  function play(clipName) {
    const nextAction = actions.get(clipName);
    if (nextAction === currentAction) return;
    nextAction.reset().play();
    if (currentAction) {
      nextAction.fadeIn(CROSSFADE_SECONDS);
      currentAction.fadeOut(CROSSFADE_SECONDS);
    }
    currentAction = nextAction;
  }

  function update(deltaSeconds) {
    mixer.update(Math.min(deltaSeconds, MAX_ANIMATION_STEP_SECONDS));
  }

  play("Idle");
  return { root, play, update };
}
