import * as THREE from "three";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { TRAVEL_PLACES } from "./travelPlaces.js";
import { closeTravelCard, isTravelCardOpen, openTravelCard } from "./travelCard.js";
import { scrambleText } from "./textScramble.js";
import { createSeededRandom } from "./seededRandom.js";
import { GLOBE_STYLE as STYLE } from "./globeStyle.js";
import { element, pointerToDevice, replayAnimation } from "./dom.js";
import { easeOutCubic } from "./motion.js";

const RADIUS = 1;
const DEG = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);
const INTRO = { delayMs: 350, scrambleMs: 1100, title: "TRAVEL" };
const PORTRAIT_DROP_FRACTION = 0.1;
const MASK_SIZE = { width: 1024, height: 512 };
const MAX_DOT_LATITUDE = 84;
const STAR_COUNT = 900;
const ATMOSPHERE_RADIUS = 1.17;
const PIN = { height: 0.07, headSize: 0.032, hitRadius: 0.1, pulseSpeed: 0.7 };
const SPIN = { autoRadiansPerSecond: 0.07, dragRadiansPerPixel: 0.0055, inertiaDecayPerSecond: 3.5, maxFlingRadiansPerSecond: 2.4, tiltLimit: 1.15 };
const START_VIEW = { lat: 36, lon: 4 };
const OPEN_SECONDS = 1.6;
const OPEN_SPIN_RADIANS = 1.4;
const SCREEN_FRACTION = 0.68;
const TAP_TOLERANCE_PX = 7;
const RELEASE_STILL_MS = 120;
const FACING_THRESHOLD = 0.2;
const CLOSE_FADE_MS = 260;
const LABEL = { gap: 16, height: 24, edgeMargin: 8, collisionPadding: 6, rowTolerance: 0.01 };

const state = {
  isReady: false,
  isOpen: false,
  renderer: null,
  scene: null,
  camera: null,
  world: null,
  globe: null,
  pins: [],
  yaw: 0,
  tilt: 0,
  yawVelocity: 0,
  drag: null,
  openElapsed: 0,
  hudRings: [],
  finishIntro: null,
  introTimer: 0,
  clock: new THREE.Clock(false),
  raycaster: new THREE.Raycaster(),
};

export function openTravelGlobe() {
  if (!state.isReady) setUpGlobe();
  element("travelGlobe").classList.remove("hidden", "is-closing");
  state.isOpen = true;
  state.openElapsed = 0;
  pointAt(START_VIEW);
  resize();
  state.clock.start();
  state.renderer.setAnimationLoop(tick);
  playIntro();
}

function playIntro() {
  const hud = element("travelHud");
  const title = element("travelTitle");
  clearTimeout(state.introTimer);
  state.finishIntro?.();
  title.textContent = "";
  replayAnimation(hud, "is-playing");
  state.introTimer = setTimeout(() => {
    state.finishIntro = scrambleText(title, INTRO.title, INTRO.scrambleMs);
  }, INTRO.delayMs);
}

export function closeTravelGlobe() {
  if (!state.isOpen) return;
  state.isOpen = false;
  closeTravelCard();
  const overlay = element("travelGlobe");
  overlay.classList.add("is-closing");
  setTimeout(() => {
    overlay.classList.add("hidden");
    state.renderer.setAnimationLoop(null);
    state.clock.stop();
  }, CLOSE_FADE_MS);
}

// Escape closes an open place card first, then the globe itself.
export function dismissTravelLayer() {
  if (isTravelCardOpen()) closeTravelCard();
  else closeTravelGlobe();
}

export function isTravelGlobeOpen() {
  return state.isOpen;
}

export function wireTravelGlobe() {
  element("travelClose").addEventListener("click", closeTravelGlobe);
  element("travelCount").textContent = `${String(TRAVEL_PLACES.length).padStart(2, "0")} places pinned`;
}

function setUpGlobe() {
  const canvas = element("travelCanvas");
  state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setClearColor(0x000000, 0);
  state.scene = new THREE.Scene();
  state.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  state.world = new THREE.Group();
  state.globe = new THREE.Group();
  state.globe.add(buildOcean(), buildRim(STYLE.rimStrength), buildLandDots(), buildGraticule());
  state.pins = TRAVEL_PLACES.map((place, index) => buildPin(place, index));
  for (const pin of state.pins) state.globe.add(pin.group);
  state.world.add(state.globe, buildAtmosphere());
  state.world.add(buildHudRings());
  state.scene.add(state.world, buildStars());
  buildLabels();
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", resize);
  state.isReady = true;
}

function tick() {
  const delta = Math.min(state.clock.getDelta(), 0.05);
  const elapsed = state.clock.elapsedTime;
  advanceOpening(delta);
  advanceSpin(delta);
  state.globe.rotation.set(state.tilt, state.yaw + openingSpinOffset(), 0);
  for (const pin of state.pins) pulsePin(pin, elapsed);
  for (const ring of state.hudRings) ring.mesh.rotation.z += ring.speed * delta;
  state.renderer.render(state.scene, state.camera);
  positionLabels();
}

function advanceOpening(delta) {
  state.openElapsed = Math.min(OPEN_SECONDS, state.openElapsed + delta);
  const scale = easeOutBack(state.openElapsed / OPEN_SECONDS);
  state.world.scale.setScalar(Math.max(0.001, scale));
}

function openingSpinOffset() {
  return -OPEN_SPIN_RADIANS * (1 - easeOutCubic(state.openElapsed / OPEN_SECONDS));
}

function advanceSpin(delta) {
  if (state.drag || isTravelCardOpen()) return;
  state.yaw += (SPIN.autoRadiansPerSecond + state.yawVelocity) * delta;
  state.yawVelocity *= Math.exp(-SPIN.inertiaDecayPerSecond * delta);
}

function pointAt({ lat, lon }) {
  const target = latLonToVector(0, lon, 1);
  state.yaw = Math.atan2(-target.x, target.z);
  state.tilt = lat * DEG * 0.8;
  state.yawVelocity = 0;
}

function resize() {
  if (!state.isReady) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  state.renderer.setSize(width, height, false);
  state.camera.aspect = width / height;
  const halfFov = (state.camera.fov / 2) * DEG;
  state.camera.position.set(0, 0, RADIUS / (SCREEN_FRACTION * Math.tan(halfFov) * Math.min(1, state.camera.aspect)));
  state.camera.lookAt(0, 0, 0);
  const isPortrait = height > width;
  if (isPortrait) state.camera.setViewOffset(width, height, 0, -height * PORTRAIT_DROP_FRACTION, width, height);
  else state.camera.clearViewOffset();
  state.camera.updateProjectionMatrix();
}

function onPointerDown(event) {
  if (isTravelCardOpen()) return;
  element("travelCanvas").setPointerCapture(event.pointerId);
  state.drag = { startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
  state.yawVelocity = 0;
}

function onPointerMove(event) {
  if (!state.drag) {
    element("travelCanvas").style.cursor = pickPin(event) ? "pointer" : "grab";
    return;
  }
  const now = performance.now();
  const dx = event.clientX - state.drag.x;
  const dy = event.clientY - state.drag.y;
  state.yaw += dx * SPIN.dragRadiansPerPixel;
  state.tilt = THREE.MathUtils.clamp(state.tilt + dy * SPIN.dragRadiansPerPixel, -SPIN.tiltLimit, SPIN.tiltLimit);
  const velocity = (dx * SPIN.dragRadiansPerPixel) / Math.max((now - state.drag.time) / 1000, 0.008);
  state.yawVelocity = THREE.MathUtils.clamp(velocity, -SPIN.maxFlingRadiansPerSecond, SPIN.maxFlingRadiansPerSecond);
  state.drag.x = event.clientX;
  state.drag.y = event.clientY;
  state.drag.time = now;
  const travelled = Math.hypot(event.clientX - state.drag.startX, event.clientY - state.drag.startY);
  if (travelled > TAP_TOLERANCE_PX) state.drag.moved = true;
}

function onPointerUp(event) {
  if (!state.drag) return;
  const wasTap = !state.drag.moved;
  const heldStillMs = performance.now() - state.drag.time;
  state.drag = null;
  if (heldStillMs > RELEASE_STILL_MS) state.yawVelocity = 0;
  if (!wasTap) return;
  state.yawVelocity = 0;
  const pin = pickPin(event);
  if (pin) openPlace(pin);
}

function pickPin(event) {
  const { x, y } = pointerToDevice(event, element("travelCanvas"));
  state.raycaster.setFromCamera(new THREE.Vector2(x, y), state.camera);
  const hits = state.raycaster.intersectObjects(state.pins.map((pin) => pin.hit), false);
  const hit = hits.find((candidate) => isFacingCamera(candidate.object.userData.pin));
  return hit?.object.userData.pin ?? null;
}

function openPlace(pin) {
  state.yawVelocity = 0;
  openTravelCard(pin.place, screenPositionOf(pin), { index: pin.index, total: state.pins.length });
}

// Camera-facing HUD rings that sit around the globe and turn independently,
// broken into arcs and ticks so the frame reads as instrumentation.
function buildHudRings() {
  const group = new THREE.Group();
  const specs = [
    { radius: 1.27, width: 0.006, color: STYLE.colors.rim, opacity: 0.7, arcs: [[0.1, 1.1], [1.6, 0.5], [2.7, 1.4], [4.6, 0.9]], speed: 0.12 },
    { radius: 1.34, width: 0.003, color: STYLE.colors.hud, opacity: 0.35, arcs: [[0, Math.PI * 2]], speed: 0 },
    { radius: 1.4, width: 0.012, color: STYLE.colors.hud, opacity: 0.55, arcs: [[0.4, 0.35], [2.5, 0.2], [3.9, 0.55]], speed: -0.2 },
  ];
  for (const spec of specs) {
    const ring = new THREE.Group();
    for (const [start, length] of spec.arcs) {
      ring.add(new THREE.Mesh(new THREE.RingGeometry(spec.radius, spec.radius + spec.width, 96, 1, start, length), hudMaterial(spec.color, spec.opacity)));
    }
    group.add(ring);
    if (spec.speed !== 0) state.hudRings.push({ mesh: ring, speed: spec.speed });
  }
  const ticks = buildTicks();
  group.add(ticks);
  state.hudRings.push({ mesh: ticks, speed: 0.04 });
  return group;
}

function buildTicks() {
  const points = [];
  const count = 120;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const length = index % 10 === 0 ? 0.05 : 0.02;
    const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    points.push(direction.clone().multiplyScalar(1.46), direction.clone().multiplyScalar(1.46 + length));
  }
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: STYLE.colors.hud, transparent: true, opacity: 0.4 }));
}

function hudMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: STYLE.blending });
}

function buildOcean() {
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 0.995, 64, 48), new THREE.MeshBasicMaterial({ color: STYLE.colors.ocean }));
  ocean.renderOrder = 0;
  return ocean;
}

function buildRim(strength) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 1.002, 64, 48),
    fresnelMaterial({ color: STYLE.colors.rim, power: 2.8, strength, side: THREE.FrontSide }),
  );
}

function buildAtmosphere() {
  const edge = Math.sqrt(1 - (RADIUS / ATMOSPHERE_RADIUS) ** 2);
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(STYLE.colors.atmosphere) }, edge: { value: edge }, strength: { value: STYLE.atmosphereStrength } },
    vertexShader: FRESNEL_VERTEX,
    fragmentShader: `
      uniform vec3 color;
      uniform float edge;
      uniform float strength;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float depth = clamp(-dot(vNormal, vView) / edge, 0.0, 1.0);
        gl_FragColor = vec4(color, pow(depth, 2.4) * strength);
      }`,
    side: THREE.BackSide,
    transparent: true,
    blending: STYLE.blending,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 48), material);
}

const FRESNEL_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }`;

function fresnelMaterial({ color, power, strength, side }) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, power: { value: power }, strength: { value: strength } },
    vertexShader: FRESNEL_VERTEX,
    fragmentShader: `
      uniform vec3 color;
      uniform float power;
      uniform float strength;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), power);
        gl_FragColor = vec4(color, rim * strength);
      }`,
    side,
    transparent: true,
    blending: STYLE.blending,
    depthWrite: false,
  });
}

// Land is a dot matrix: the Natural Earth outline is rasterised once into an
// equirectangular mask, then evenly spaced points on the sphere keep only the
// ones that land inside it.
function buildLandDots() {
  const mask = rasteriseLand();
  const nextRandom = createSeededRandom(23);
  const positions = [];
  let rowIndex = 0;
  const { spacingDegrees, size, keepFraction } = STYLE.dots;
  for (let lat = -MAX_DOT_LATITUDE; lat <= MAX_DOT_LATITUDE; lat += spacingDegrees) {
    const count = Math.max(1, Math.round((360 * Math.cos(lat * DEG)) / spacingDegrees));
    const stagger = (rowIndex % 2) * 0.5;
    for (let index = 0; index < count; index += 1) {
      const lon = -180 + ((index + stagger) * 360) / count;
      if (isLand(mask, lat, lon) && nextRandom() < keepFraction) positions.push(...latLonToVector(lat, lon, RADIUS * 1.002).toArray());
    }
    rowIndex += 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: STYLE.colors.land,
    size,
    transparent: true,
    alphaTest: 0.25,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

function rasteriseLand() {
  const { width, height } = MASK_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const land = feature(landTopology, landTopology.objects.land);
  const geometries = land.type === "FeatureCollection" ? land.features.map((item) => item.geometry) : [land.geometry];
  context.fillStyle = "#fff";
  context.beginPath();
  for (const geometry of geometries) {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    for (const ring of polygons.flat()) traceRing(context, ring, width, height);
  }
  context.fill("evenodd");
  return { data: context.getImageData(0, 0, width, height).data, width, height };
}

function traceRing(context, ring, width, height) {
  ring.forEach(([lon, lat], index) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function isLand(mask, lat, lon) {
  const x = Math.min(mask.width - 1, Math.floor(((lon + 180) / 360) * mask.width));
  const y = Math.min(mask.height - 1, Math.floor(((90 - lat) / 180) * mask.height));
  return mask.data[(y * mask.width + x) * 4] > 128;
}

function buildGraticule() {
  const points = [];
  const radius = RADIUS * 1.001;
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -80; lat < 80; lat += 4) points.push(latLonToVector(lat, lon, radius), latLonToVector(lat + 4, lon, radius));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 4) points.push(latLonToVector(lat, lon, radius), latLonToVector(lat, lon + 4, radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({ color: STYLE.colors.grid, dashSize: 0.025, gapSize: 0.035, transparent: true, opacity: STYLE.graticuleOpacity, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.computeLineDistances();
  return lines;
}

function buildStars() {
  const positions = [];
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const direction = new THREE.Vector3().randomDirection();
    positions.push(...direction.multiplyScalar(18 + Math.random() * 14).toArray());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: STYLE.colors.stars, size: 0.05, transparent: true, opacity: STYLE.starOpacity }));
}

function buildPin(place, index) {
  const normal = latLonToVector(place.lat, place.lon, 1).normalize();
  const group = new THREE.Group();
  group.position.copy(normal).multiplyScalar(RADIUS);
  group.quaternion.setFromUnitVectors(UP, normal);
  const glow = new THREE.MeshBasicMaterial({ color: STYLE.colors.pin });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, PIN.height, 8), glow);
  stem.position.y = PIN.height / 2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(PIN.headSize, PIN.headSize, PIN.headSize), glow);
  head.position.y = PIN.height;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.018, 0.026, 40),
    new THREE.MeshBasicMaterial({ color: STYLE.colors.pin, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(PIN.hitRadius, 12, 10), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = PIN.height * 0.7;
  group.add(stem, head, ring, hit);
  const pin = { place, index, group, head, ring, hit, label: null, phase: index * 0.37 };
  hit.userData.pin = pin;
  return pin;
}

function pulsePin(pin, elapsed) {
  const phase = (elapsed * PIN.pulseSpeed + pin.phase) % 1;
  pin.ring.scale.setScalar(1 + phase * 2.4);
  pin.ring.material.opacity = 0.9 * (1 - phase);
}

function buildLabels() {
  const container = element("travelLabels");
  for (const pin of state.pins) {
    const label = document.createElement("button");
    label.type = "button";
    label.className = "travel-label";
    label.innerHTML = `<span class="travel-label-index">${String(pin.index + 1).padStart(2, "0")}</span><span class="travel-label-name"></span>`;
    label.querySelector(".travel-label-name").textContent = pin.place.name;
    label.addEventListener("click", () => openPlace(pin));
    container.append(label);
    pin.label = label;
  }
}

function positionLabels() {
  const showLabels = state.openElapsed >= OPEN_SECONDS && !isTravelCardOpen();
  const visible = state.pins
    .filter((pin) => showLabels && isFacingCamera(pin))
    .map((pin) => ({ pin, ...screenPositionOf(pin), width: pin.label.offsetWidth, onLeft: false }));
  chooseLabelSides(visible);
  stackOverlappingLabels(visible);
  for (const pin of state.pins) pin.label.classList.remove("is-visible");
  for (const { pin, left, top, onLeft } of visible) {
    pin.label.style.transform = `translate(${left}px, ${top}px)`;
    pin.label.classList.toggle("is-left", onLeft);
    pin.label.classList.add("is-visible");
  }
}

// Labels sit right of their pin unless that would run off-screen or collide
// with a neighbour, in which case the westernmost of the pair flips left.
function chooseLabelSides(labels) {
  for (const label of labels) {
    label.onLeft = label.x + LABEL.gap + label.width > window.innerWidth - LABEL.edgeMargin;
  }
  const byX = [...labels].sort((a, b) => a.x - b.x);
  for (let index = 0; index < byX.length - 1; index += 1) {
    const [west, east] = [byX[index], byX[index + 1]];
    const rowsOverlap = Math.abs(west.y - east.y) < LABEL.height + LABEL.collisionPadding;
    const fitsLeft = west.x - LABEL.gap - west.width > LABEL.edgeMargin;
    if (rowsOverlap && !west.onLeft && !east.onLeft && fitsLeft) west.onLeft = true;
  }
}

// Pins that crowd together (Europe, on a phone) still collide after picking
// sides, so any label overlapping an earlier one is pushed below it.
function stackOverlappingLabels(labels) {
  const placed = [];
  for (const label of [...labels].sort((a, b) => a.y - b.y)) {
    label.left = label.x + (label.onLeft ? -(label.width + LABEL.gap) : LABEL.gap);
    label.top = label.y - LABEL.height / 2;
    let blocker = placed.find((other) => labelsOverlap(label, other));
    while (blocker) {
      label.top = Math.max(label.top, blocker.top + LABEL.height + LABEL.collisionPadding);
      blocker = placed.find((other) => labelsOverlap(label, other));
    }
    placed.push(label);
  }
}

function labelsOverlap(a, b) {
  const sharesColumns = a.left < b.left + b.width && b.left < a.left + a.width;
  const sharesRows = Math.abs(a.top - b.top) < LABEL.height + LABEL.collisionPadding - LABEL.rowTolerance;
  return sharesColumns && sharesRows;
}

function screenPositionOf(pin) {
  const position = pin.head.getWorldPosition(new THREE.Vector3()).project(state.camera);
  return { x: ((position.x + 1) / 2) * window.innerWidth, y: ((1 - position.y) / 2) * window.innerHeight };
}

function isFacingCamera(pin) {
  const position = pin.head.getWorldPosition(new THREE.Vector3());
  const toCamera = state.camera.position.clone().sub(position).normalize();
  return position.normalize().dot(toCamera) > FACING_THRESHOLD;
}

function latLonToVector(lat, lon, radius) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function easeOutBack(t) {
  const overshoot = 1.4;
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
}
