import * as THREE from "three";

const POOL_SIZE = 48;
const STEP_DISTANCE = 0.26;
const TELEPORT_DISTANCE = 1;
const TEXTURE_SIZE = 64;
const DUST_COLOR = 0xe9dcc4;
const FLOOR_HEIGHT = 0.05;
const PUFF = { life: 0.7, startSize: 0.07, endSize: 0.26, rise: 0.12, opacity: 0.38 };

const state = { puffs: [], cursor: 0, lastX: null, lastZ: null, travelled: 0 };

export function installDust(scene) {
  const texture = createSoftTexture();
  for (let index = 0; index < POOL_SIZE; index += 1) {
    const material = new THREE.SpriteMaterial({ map: texture, color: DUST_COLOR, transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    scene.add(sprite);
    state.puffs.push({ sprite, age: PUFF.life, size: 1 });
  }
}

// Drops a puff each time the avatar covers a step's worth of floor.
export function updateDust(deltaSeconds, position) {
  trackSteps(position);
  for (const puff of state.puffs) agePuff(puff, deltaSeconds);
}

export function emitPuff(x, y, z, size = 1) {
  if (state.puffs.length === 0 || prefersReducedMotion()) return;
  const puff = state.puffs[state.cursor];
  state.cursor = (state.cursor + 1) % state.puffs.length;
  puff.age = 0;
  puff.size = size;
  puff.sprite.position.set(x, y, z);
  puff.sprite.visible = true;
}

function trackSteps(position) {
  if (state.lastX !== null) {
    const distance = Math.hypot(position.x - state.lastX, position.z - state.lastZ);
    if (distance < TELEPORT_DISTANCE) state.travelled += distance;
  }
  state.lastX = position.x;
  state.lastZ = position.z;
  while (state.travelled >= STEP_DISTANCE) {
    state.travelled -= STEP_DISTANCE;
    emitPuff(position.x, FLOOR_HEIGHT, position.z);
  }
}

function agePuff(puff, deltaSeconds) {
  if (puff.age >= PUFF.life) return;
  puff.age += deltaSeconds;
  const progress = Math.min(puff.age / PUFF.life, 1);
  const scale = (PUFF.startSize + (PUFF.endSize - PUFF.startSize) * progress) * puff.size;
  puff.sprite.scale.setScalar(scale);
  puff.sprite.position.y += (PUFF.rise * deltaSeconds) / PUFF.life;
  puff.sprite.material.opacity = PUFF.opacity * (1 - progress) ** 2;
  if (progress >= 1) puff.sprite.visible = false;
}

function createSoftTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, 0, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  return new THREE.CanvasTexture(canvas);
}

function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
