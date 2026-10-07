import * as THREE from "three";
import { addBox, addCylinder, solid } from "./meshHelpers.js";

// A small round side table in the poster corner holding three things Namish
// brought home: a toy auto rickshaw from India, a glazed spice pot from
// Morocco and a painted paper lamp from Chiang Mai. It belongs to the travel
// station, so the table and everything on it glow and open the globe.
const TABLE = { center: [1.76, -2.06], radius: 0.23, height: 0.58, topThickness: 0.03 };
// The trinkets are drawn larger than life so they read from the overhead camera.
const TRINKET_SCALE = 1.5;
const COLOR = {
  wood: 0x8a5a36,
  rickshawGreen: 0x2f7d3a,
  rickshawYellow: 0xf2c230,
  tyre: 0x1c1c1c,
  terracotta: 0xb5653a,
  glaze: 0x1f4fa8,
  brass: 0xc9a24a,
  lanternFrame: 0x24160d,
  lanternPaper: 0xf3d9a4,
};
// The Chiang Mai lamp: a tapered square box, wider at the base, with a dark
// wooden frame and four painted paper panels lit from inside.
const LANTERN = { baseWidth: 0.13, topWidth: 0.085, height: 0.19, frame: 0.008 };
const LANTERN_GLOW = 0.4;
const LANTERN_PANEL_PIXELS = [128, 192];
const QUARTER_TURN = Math.PI / 2;

export function buildTravelTable() {
  const table = new THREE.Group();
  table.name = "TRAVEL_TABLE";
  addTable(table);
  const top = TABLE.height;
  table.add(placed(buildAutoRickshaw(), [-0.1, top, 0.1], -0.6));
  table.add(placed(buildSpicePot(), [0.12, top, 0.09], 0));
  table.add(placed(buildLantern(), [0.03, top, -0.12], Math.PI / 4 + 0.35));
  const [x, z] = TABLE.center;
  table.position.set(x, 0, z);
  return table;
}

function addTable(group) {
  const wood = solid(COLOR.wood, 0.6);
  const { radius, height, topThickness } = TABLE;
  addCylinder(group, wood, { radius, height: topThickness, position: [0, height - topThickness / 2, 0] });
  addCylinder(group, wood, { radius: 0.025, height: height - topThickness, position: [0, (height - topThickness) / 2, 0] });
  addCylinder(group, wood, { radius: radius * 0.6, height: 0.02, position: [0, 0.01, 0] });
}

// A green three-wheeler with a yellow canopy, nose pointing along +x.
function buildAutoRickshaw() {
  const rickshaw = new THREE.Group();
  const green = solid(COLOR.rickshawGreen, 0.5);
  const yellow = solid(COLOR.rickshawYellow, 0.5);
  const tyre = solid(COLOR.tyre, 0.8);
  addBox(rickshaw, green, { size: [0.12, 0.045, 0.085], position: [-0.01, 0.045, 0] });
  addBox(rickshaw, green, { size: [0.045, 0.06, 0.05], position: [0.065, 0.05, 0] });
  addBox(rickshaw, yellow, { size: [0.13, 0.01, 0.095], position: [0, 0.125, 0] });
  for (const [x, z] of [[-0.06, 0.04], [-0.06, -0.04], [0.06, 0.04], [0.06, -0.04]]) {
    addBox(rickshaw, tyre, { size: [0.006, 0.055, 0.006], position: [x, 0.095, z] });
  }
  for (const [x, z] of [[0.075, 0], [-0.045, 0.045], [-0.045, -0.045]]) addWheel(rickshaw, tyre, [x, 0.02, z]);
  return rickshaw;
}

function addWheel(group, material, position) {
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.014, 16), material);
  wheel.rotation.x = QUARTER_TURN;
  wheel.position.set(...position);
  group.add(wheel);
}

// A small tagine-style pot: terracotta base, cobalt glazed cone lid, brass knob.
function buildSpicePot() {
  const pot = new THREE.Group();
  const terracotta = solid(COLOR.terracotta, 0.7);
  const glaze = solid(COLOR.glaze, 0.3);
  addCylinder(pot, terracotta, { radius: 0.055, height: 0.012, position: [0, 0.006, 0] });
  addCylinder(pot, glaze, { radius: 0.042, height: 0.03, position: [0, 0.027, 0] });
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 24), glaze);
  lid.position.y = 0.082;
  pot.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), solid(COLOR.brass, 0.3));
  knob.position.y = 0.126;
  pot.add(knob);
  return pot;
}

// The panels are one paper shade (a four-sided frustum) painted later by
// paintLanternPanels, since painting needs a browser canvas.
function buildLantern() {
  const lantern = new THREE.Group();
  const wood = solid(COLOR.lanternFrame, 0.6);
  const { baseWidth, topWidth, height, frame } = LANTERN;
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(topWidth / Math.SQRT2, baseWidth / Math.SQRT2, height, 4, 1, true),
    new THREE.MeshStandardMaterial({ color: COLOR.lanternPaper, emissive: 0xffffff, emissiveIntensity: LANTERN_GLOW, side: THREE.DoubleSide, roughness: 0.9 }),
  );
  shade.name = "CHIANG_MAI_LANTERN_SHADE";
  shade.position.y = frame + height / 2;
  lantern.add(shade);
  addBox(lantern, wood, { size: [baseWidth * 1.08, frame, baseWidth * 1.08], position: [0, frame / 2, 0], yaw: Math.PI / 4 });
  addBox(lantern, wood, { size: [topWidth * 1.1, frame, topWidth * 1.1], position: [0, frame + height + frame / 2, 0], yaw: Math.PI / 4 });
  return lantern;
}

// Paints the lamp's four panels like the souvenir lamps in Chiang Mai's night
// market: a seated Buddha on red, a plum blossom branch, a red sun over
// bamboo and a spray of flowers, each in a dark wooden frame.
export function paintLanternPanels(roomGroup) {
  const shade = roomGroup.getObjectByName("CHIANG_MAI_LANTERN_SHADE");
  const [panelWidth, panelHeight] = LANTERN_PANEL_PIXELS;
  const canvas = document.createElement("canvas");
  canvas.width = panelWidth * LANTERN_PANELS.length;
  canvas.height = panelHeight;
  const ctx = canvas.getContext("2d");
  LANTERN_PANELS.forEach((paint, index) => {
    ctx.save();
    ctx.translate(index * panelWidth, 0);
    paint(ctx, panelWidth, panelHeight);
    drawPanelFrame(ctx, panelWidth, panelHeight);
    ctx.restore();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  shade.material.color.set(0xffffff);
  shade.material.map = texture;
  shade.material.emissiveMap = texture;
  shade.material.needsUpdate = true;
}

const LANTERN_PANELS = [drawBuddhaPanel, drawBlossomPanel, drawSunPanel, drawFlowerPanel];

function drawBuddhaPanel(ctx, w, h) {
  ctx.fillStyle = "#e0471f";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#7a1d0c";
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.36, w * 0.11, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.24);
  ctx.lineTo(w * 0.47, h * 0.29);
  ctx.lineTo(w * 0.53, h * 0.29);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.38, h * 0.45);
  ctx.quadraticCurveTo(w / 2, h * 0.42, w * 0.62, h * 0.45);
  ctx.lineTo(w * 0.72, h * 0.72);
  ctx.quadraticCurveTo(w / 2, h * 0.78, w * 0.28, h * 0.72);
  ctx.closePath();
  ctx.fill();
}

function drawBlossomPanel(ctx, w, h) {
  ctx.fillStyle = "#f6e6c0";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#3b2416";
  ctx.lineWidth = w * 0.04;
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.9);
  ctx.quadraticCurveTo(w * 0.35, h * 0.5, w * 0.7, h * 0.15);
  ctx.moveTo(w * 0.36, h * 0.55);
  ctx.lineTo(w * 0.7, h * 0.5);
  ctx.stroke();
  ctx.fillStyle = "#cf2a2a";
  for (const [x, y] of [[0.68, 0.17], [0.55, 0.28], [0.45, 0.4], [0.62, 0.5], [0.72, 0.46], [0.3, 0.66], [0.5, 0.2]]) {
    ctx.beginPath();
    ctx.arc(w * x, h * y, w * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSunPanel(ctx, w, h) {
  ctx.fillStyle = "#f3d27a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#d8322a";
  ctx.beginPath();
  ctx.arc(w * 0.55, h * 0.3, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2f3a1e";
  ctx.lineWidth = w * 0.035;
  for (const x of [0.25, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(w * x, h);
    ctx.lineTo(w * (x + 0.03), h * 0.45);
    ctx.stroke();
  }
}

function drawFlowerPanel(ctx, w, h) {
  ctx.fillStyle = "#f08a2b";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#4b6b2a";
  ctx.lineWidth = w * 0.03;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.92);
  ctx.lineTo(w / 2, h * 0.35);
  ctx.stroke();
  ctx.fillStyle = "#b8202a";
  for (const [x, y] of [[0.5, 0.3], [0.35, 0.45], [0.65, 0.5], [0.42, 0.62]]) {
    ctx.beginPath();
    ctx.arc(w * x, h * y, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPanelFrame(ctx, w, h) {
  ctx.strokeStyle = "#24160d";
  ctx.lineWidth = w * 0.12;
  ctx.strokeRect(0, 0, w, h);
  ctx.fillStyle = "#24160d";
  ctx.fillRect(0, h * 0.84, w, h * 0.05);
}

function placed(object, position, yaw) {
  object.position.set(...position);
  object.rotation.y = yaw;
  object.scale.setScalar(TRINKET_SCALE);
  return object;
}
