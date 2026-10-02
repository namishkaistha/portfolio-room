import * as THREE from "three";

const SKY_SIZE = { width: 8, height: 256 };
const CLOUD = { width: 0.62, height: 0.31, canvasWidth: 640, canvasHeight: 320 };
const CLOUD_SPEEDS = [0.022, 0.015, 0.027];
const CLOUD_LEVELS = [0.7, 0.45, 0.2];
const BLIND_SPEED = 1.3;
const FRONT_GAP = 0.004;

// Puts a sky into the window's dark recess and drifts one cloud per goal across
// it. Clouds are clipped to the opening so they never spill onto the wall.
export function installWindowView(roomGroup, goals) {
  const windowNode = roomGroup.getObjectByName("WINDOW");
  const recess = windowNode?.getObjectByName("Window_Recess");
  if (!recess) return null;
  roomGroup.updateMatrixWorld(true);
  const opening = new THREE.Box3().setFromObject(recess);
  const frontX = opening.min.x - FRONT_GAP;
  const scene = new THREE.Group();
  scene.name = "WINDOW_VIEW";
  scene.add(buildSky(opening, frontX));
  const clips = clipPlanesFor(opening);
  const clouds = goals.map((goal, index) => buildCloud(goal, index, opening, frontX, clips));
  clouds.forEach((cloud) => scene.add(cloud.mesh));
  roomGroup.add(scene);
  redrawCloudsWhenFontsLoad(clouds);
  const blinds = collectBlinds(windowNode);
  const state = { progress: 0, target: 0 };
  return {
    setBlindsOpen(isOpen) { state.target = isOpen ? 1 : 0; },
    update(deltaSeconds) {
      for (const cloud of clouds) driftCloud(cloud, opening, deltaSeconds);
      if (state.progress === state.target) return;
      const step = BLIND_SPEED * deltaSeconds;
      state.progress = state.target > state.progress ? Math.min(state.target, state.progress + step) : Math.max(state.target, state.progress - step);
      raiseBlinds(blinds, state.progress * state.progress * (3 - 2 * state.progress));
    },
  };
}

function buildSky(opening, frontX) {
  const canvas = document.createElement("canvas");
  canvas.width = SKY_SIZE.width;
  canvas.height = SKY_SIZE.height;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, SKY_SIZE.height);
  gradient.addColorStop(0, "#5fa8f2");
  gradient.addColorStop(0.65, "#a9d6fb");
  gradient.addColorStop(1, "#f6ead2");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SKY_SIZE.width, SKY_SIZE.height);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(opening.max.z - opening.min.z, opening.max.y - opening.min.y),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), toneMapped: false }),
  );
  sky.rotation.y = -Math.PI / 2;
  sky.position.set(frontX, (opening.min.y + opening.max.y) / 2, (opening.min.z + opening.max.z) / 2);
  return sky;
}

function clipPlanesFor(opening) {
  return [
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -opening.min.z),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), opening.max.z),
  ];
}

function buildCloud(goal, index, opening, frontX, clippingPlanes) {
  const canvas = document.createElement("canvas");
  canvas.width = CLOUD.canvasWidth;
  canvas.height = CLOUD.canvasHeight;
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CLOUD.width, CLOUD.height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, clippingPlanes }),
  );
  mesh.rotation.y = -Math.PI / 2;
  const openingHeight = opening.max.y - opening.min.y;
  const openingDepth = opening.max.z - opening.min.z;
  mesh.position.set(frontX - FRONT_GAP * (index + 1), opening.min.y + openingHeight * CLOUD_LEVELS[index % CLOUD_LEVELS.length], opening.min.z + (openingDepth * (index + 0.5)) / 3);
  const cloud = { mesh, canvas, texture, goal, speed: CLOUD_SPEEDS[index % CLOUD_SPEEDS.length] };
  paintCloud(cloud);
  return cloud;
}

function paintCloud({ canvas, texture, goal }) {
  const context = canvas.getContext("2d");
  const { canvasWidth: width, canvasHeight: height } = CLOUD;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(255,255,255,0.97)";
  context.shadowColor = "rgba(120,160,210,0.45)";
  context.shadowBlur = 22;
  for (const [x, y, radius] of [[0.2, 0.6, 0.2], [0.36, 0.42, 0.26], [0.56, 0.38, 0.3], [0.76, 0.5, 0.22], [0.84, 0.64, 0.16], [0.5, 0.68, 0.24], [0.3, 0.7, 0.18]]) {
    context.beginPath();
    context.arc(width * x, height * y, height * radius, 0, Math.PI * 2);
    context.fill();
  }
  context.shadowBlur = 0;
  context.fillStyle = "#2e4f7a";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lines = splitIntoLines(goal);
  context.font = `italic 600 ${lines.length > 1 ? 46 : 54}px Fraunces, Georgia, serif`;
  lines.forEach((line, index) => context.fillText(line, width * 0.52, height * 0.54 + (index - (lines.length - 1) / 2) * 52));
  texture.needsUpdate = true;
}

function splitIntoLines(text) {
  const words = text.split(" ");
  if (words.length < 3) return [text];
  const middle = Math.ceil(words.length / 2);
  return [words.slice(0, middle).join(" "), words.slice(middle).join(" ")];
}

function redrawCloudsWhenFontsLoad(clouds) {
  document.fonts?.load("italic 600 48px Fraunces").then(() => clouds.forEach(paintCloud));
}

function driftCloud(cloud, opening, deltaSeconds) {
  cloud.mesh.position.z += cloud.speed * deltaSeconds;
  if (cloud.mesh.position.z - CLOUD.width / 2 > opening.max.z) cloud.mesh.position.z = opening.min.z - CLOUD.width / 2;
}

function collectBlinds(windowNode) {
  const slats = windowNode.children.filter((child) => child.name.startsWith("Blind_Slat"));
  const top = Math.max(...slats.map((slat) => slat.position.y));
  return slats.map((slat) => ({ slat, baseY: slat.position.y, topY: top }));
}

function raiseBlinds(blinds, progress) {
  blinds.forEach(({ slat, baseY, topY }, index) => {
    slat.position.y = baseY + (topY - baseY) * progress + index * 0.0005 * progress;
  });
}
