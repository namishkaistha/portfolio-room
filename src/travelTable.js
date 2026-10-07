import * as THREE from "three";
import { addBox, addCylinder, glowing, solid } from "./meshHelpers.js";

// A small round side table in the poster corner holding three things Namish
// brought home: a toy auto rickshaw from India, a glazed spice pot from
// Morocco and a paper lantern from Chiang Mai. It belongs to the travel
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
  lanternPaper: 0xe2552f,
  lanternTrim: 0x3a2416,
};
const LANTERN_GLOW = 0.55;
const QUARTER_TURN = Math.PI / 2;

export function buildTravelTable() {
  const table = new THREE.Group();
  table.name = "TRAVEL_TABLE";
  addTable(table);
  const top = TABLE.height;
  table.add(placed(buildAutoRickshaw(), [-0.08, top, 0.09], -0.6));
  table.add(placed(buildSpicePot(), [0.11, top, 0.07], 0));
  table.add(placed(buildHangingLantern(), [-0.04, top, -0.11], 0.4));
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

// A round paper lantern hanging from a little wooden stand, lit from inside.
function buildHangingLantern() {
  const stand = new THREE.Group();
  const trim = solid(COLOR.lanternTrim, 0.6);
  addCylinder(stand, trim, { radius: 0.035, height: 0.01, position: [0, 0.005, 0] });
  addCylinder(stand, trim, { radius: 0.005, height: 0.3, position: [0, 0.15, 0] });
  addBox(stand, trim, { size: [0.08, 0.008, 0.008], position: [0.04, 0.3, 0] });
  addCylinder(stand, trim, { radius: 0.0015, height: 0.03, position: [0.075, 0.285, 0] });
  const paper = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), glowing(COLOR.lanternPaper, LANTERN_GLOW));
  paper.scale.y = 1.15;
  paper.position.set(0.075, 0.215, 0);
  stand.add(paper);
  for (const y of [0.268, 0.162]) addCylinder(stand, trim, { radius: 0.018, height: 0.008, position: [0.075, y, 0] });
  addCylinder(stand, trim, { radius: 0.003, height: 0.04, position: [0.075, 0.138, 0] });
  return stand;
}

function placed(object, position, yaw) {
  object.position.set(...position);
  object.rotation.y = yaw;
  object.scale.setScalar(TRINKET_SCALE);
  return object;
}
