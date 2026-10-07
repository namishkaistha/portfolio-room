import * as THREE from "three";
import { addBox, solid } from "./meshHelpers.js";

// Warm light for a room that went dim once the record-player lamp was
// removed, placed from a brightness survey of the overhead view. One brass
// picture light over the guitar replaces the lamp's glow on the turntable
// wall, and a single warm fill near the ceiling, a little toward the front,
// lifts the closet, post-it wall, desk and floor. The overhead view cuts the
// ceiling away, so the fill has no visible fixture. Both share the old lamp's
// colour and cast no shadows, so they stay cheap on phones; the Chiang Mai
// lamp on the travel table adds its own small bulb.
const LIGHT_COLOR = 0xff9f49;
const LIGHT_DECAY = 2;
const FIXTURE = { brass: 0xb08a4a, glow: 0xffd7a0, glowIntensity: 1.2 };
const BAR = { thickness: 0.035, depth: 0.05, armLength: 0.09 };

//   at         bar centre, on the wall it faces away from
//   length     bar length; axis "x" or "z" says which way it runs
//   light      [x, y, z, intensity, distance] of the point light it casts
const PICTURE_LIGHTS = [
  { name: "guitar", at: [-1.6, 2.38, -2.32], length: 0.42, axis: "x", facing: [0, 0, 1], light: [-1.6, 2.3, -1.9, 9, 3] },
];
const CEILING_FILL = [0, 2.45, 0.7, 16, 5.5];

export function installRoomLamps(roomGroup) {
  const lamps = new THREE.Group();
  lamps.name = "ROOM_LAMPS";
  for (const lamp of PICTURE_LIGHTS) lamps.add(buildPictureLight(lamp), buildLight(lamp.light));
  lamps.add(buildLight(CEILING_FILL));
  roomGroup.add(lamps);
}

// The warm point light every fixture here (and the Chiang Mai lamp) casts.
export function buildLight([x, y, z, intensity, distance]) {
  const light = new THREE.PointLight(LIGHT_COLOR, intensity, distance, LIGHT_DECAY);
  light.position.set(x, y, z);
  return light;
}

function buildPictureLight(lamp) {
  const fixture = new THREE.Group();
  const brass = solid(FIXTURE.brass, 0.35);
  const glow = new THREE.MeshStandardMaterial({ color: FIXTURE.glow, emissive: FIXTURE.glow, emissiveIntensity: FIXTURE.glowIntensity });
  const along = (size) => (lamp.axis === "x" ? [lamp.length, size, BAR.depth] : [BAR.depth, size, lamp.length]);
  addBox(fixture, brass, { size: along(BAR.thickness), position: [0, 0, 0] });
  addBox(fixture, glow, { size: along(0.004), position: [0, -BAR.thickness / 2 - 0.002, 0] });
  addWallArm(fixture, brass, lamp);
  fixture.position.set(...lamp.at);
  return fixture;
}

// Picture lights stand off the wall on a short arm, so the bar sits in front
// of the art it lights.
function addWallArm(fixture, brass, lamp) {
  const [fx, , fz] = lamp.facing;
  const offset = BAR.armLength;
  fixture.children.forEach((part) => part.position.add(new THREE.Vector3(fx * offset, 0, fz * offset)));
  const armSize = fx !== 0 ? [offset, 0.012, 0.012] : [0.012, 0.012, offset];
  addBox(fixture, brass, { size: armSize, position: [(fx * offset) / 2, 0, (fz * offset) / 2] });
}
