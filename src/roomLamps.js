import * as THREE from "three";
import { addBox, solid } from "./meshHelpers.js";

// Warm fill lights for the corners that went dim once the record-player lamp
// was removed, placed from a brightness survey of the overhead view (dark:
// the turntable wall, the closet, the post-it wall, the desk and photo
// collage, the travel corner). Each light has a visible fixture: brass
// picture-light bars over wall pieces and a strip along the top of the
// bookshelf (the overhead view cuts the ceiling away, so nothing hangs from
// it). The lights sit 0.35-0.4m out from the walls so the plaster around a
// bar doesn't glare. They share the old lamp's colour and cast no shadows,
// so they stay cheap on phones.
const LIGHT_COLOR = 0xff9f49;
const LIGHT_DECAY = 2;
const FIXTURE = { brass: 0xb08a4a, glow: 0xffd7a0, glowIntensity: 1.2 };
const BAR = { thickness: 0.035, depth: 0.05, armLength: 0.09 };

//   kind       "wall" picture-light bar or "ceiling" strip
//   at         fixture centre; wall bars hang on the wall they face away from
//   length     bar length; axis "x" or "z" says which way it runs
//   light      [x, y, z, intensity, distance] of the point light it casts
const LAMPS = [
  { name: "guitar", kind: "wall", at: [-1.6, 2.38, -2.32], length: 0.42, axis: "x", facing: [0, 0, 1], light: [-1.6, 2.3, -1.9, 9, 3] },
  { name: "closet", kind: "wall", at: [-2.03, 2.45, -0.55], length: 0.8, axis: "z", facing: [1, 0, 0], light: [-1.6, 2.3, -0.8, 6, 3] },
  { name: "post-it wall", kind: "wall", at: [-2.03, 2.38, 1.7], length: 0.9, axis: "z", facing: [1, 0, 0], light: [-1.65, 2.3, 1.7, 6, 3] },
  { name: "photo collage", kind: "wall", at: [2.02, 2.38, 0.8], length: 1.0, axis: "z", facing: [-1, 0, 0], light: [1.65, 2.3, 0.8, 6, 3] },
  { name: "bookshelf", kind: "ceiling", at: [0.2, 2.585, -1.78], length: 1.3, axis: "x", light: [0.2, 2.4, -1.75, 5, 3] },
];

export function installRoomLamps(roomGroup) {
  const lamps = new THREE.Group();
  lamps.name = "ROOM_LAMPS";
  for (const lamp of LAMPS) {
    lamps.add(buildFixture(lamp));
    lamps.add(buildLight(lamp.light));
  }
  roomGroup.add(lamps);
}

// The warm point light every fixture here (and the Chiang Mai lamp) casts.
export function buildLight([x, y, z, intensity, distance]) {
  const light = new THREE.PointLight(LIGHT_COLOR, intensity, distance, LIGHT_DECAY);
  light.position.set(x, y, z);
  return light;
}

function buildFixture(lamp) {
  const fixture = new THREE.Group();
  const brass = solid(FIXTURE.brass, 0.35);
  const glow = new THREE.MeshStandardMaterial({ color: FIXTURE.glow, emissive: FIXTURE.glow, emissiveIntensity: FIXTURE.glowIntensity });
  const along = (size) => (lamp.axis === "x" ? [lamp.length, size, BAR.depth] : [BAR.depth, size, lamp.length]);
  addBox(fixture, brass, { size: along(BAR.thickness), position: [0, 0, 0] });
  addBox(fixture, glow, { size: along(0.004), position: [0, -BAR.thickness / 2 - 0.002, 0] });
  if (lamp.kind === "wall") addWallArm(fixture, brass, lamp);
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
