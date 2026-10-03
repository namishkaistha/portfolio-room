import * as THREE from "three";
import { SPOTS } from "./roomConfig.js";

const SPOT_TRIGGER_RADIUS = 0.62;
const FULL_CIRCLE = { start: 0, length: Math.PI * 2 };
// Half rings for spots against furniture or the room edge. Angles follow the
// floor rings' orientation, where +Z (toward the door) is the [π, 2π] half.
const HALF_TOWARD_DOOR = { start: Math.PI, length: Math.PI };
const HALF_TOWARD_BACK_WALL = { start: 0, length: Math.PI };
const HALF_AWAY_FROM_DESK = { start: Math.PI / 2, length: Math.PI };
const HALF_TOWARD_RIGHT_WALL = { start: -Math.PI / 2, length: Math.PI };

const DEFAULT_TRIGGER_RADIUS = 0.75;

// Trigger positions are in the same coordinate space as the loaded Namish_Room
// GLB. Each hotspot's `trigger` is a floor point the player must stand near;
// `highlight` is where the on-floor pulsing ring is drawn.
const HOTSPOT_LIST = [
  {
    id: "laptop",
    label: "the desk",
    promptLabel: "to sit at my desk",
    objects: ["DESK_MONITOR", "DESK_CHAIR"],
    trigger: SPOTS.laptop.position.toArray(),
    highlight: [1.64, 0.9, 1.89],
    radius: SPOT_TRIGGER_RADIUS,
    arc: HALF_TOWARD_BACK_WALL,
    color: 0xf7c56a,
  },
  {
    id: "bed",
    label: "the bed",
    promptLabel: "to take a nap",
    objects: ["BED"],
    trigger: SPOTS.bed.position.toArray(),
    highlight: [0.23, 0.9, -1.4],
    color: 0x9ec7e0,
    radius: 0.4,
    arc: HALF_TOWARD_DOOR,
  },
  {
    id: "closet",
    label: "the closet",
    promptLabel: "to pick an outfit",
    objects: ["CLOSET_DOOR_1", "CLOSET_DOOR_2"],
    trigger: SPOTS.closet.position.toArray(),
    highlight: [-1.85, 1.2, -0.5],
    color: 0xd8b56a,
    radius: 0.38,
    arc: HALF_TOWARD_RIGHT_WALL,
  },
  {
    id: "door",
    label: "the way out",
    promptLabel: "to head out",
    trigger: [0, 0, 1.95],
    highlight: [0, 1.2, 2.4],
    color: 0xffe2a8,
    radius: 0.5,
    arc: HALF_TOWARD_DOOR,
  },
  {
    id: "about",
    label: "the photo wall",
    promptLabel: "to meet me",
    objects: ["PHOTO_COLLAGE", "ABOUT_HIT_AREAS"],
    trigger: SPOTS.about.position.toArray(),
    highlight: [1.9, 1.7, 0.95],
    color: 0xf0a9b8,
    radius: 0.4,
    arc: HALF_AWAY_FROM_DESK,
  },
  {
    id: "notes",
    label: "the post-it wall",
    promptLabel: "to leave me a note",
    objects: ["POSTIT_WALL"],
    trigger: SPOTS.notes.position.toArray(),
    highlight: [-2.0, 1.6, 1.72],
    color: 0xf7e27a,
    radius: 0.3,
  },
  {
    id: "vinyl",
    label: "the vinyl",
    promptLabel: "to dig through his records",
    objects: ["Record_Stand", "Turntable_Base", "Spinning_Record", "Tonearm"],
    trigger: [-1.55, 0, -1.56],
    highlight: [-1.51, 1.05, -1.92],
    color: 0xe57373,
    radius: 0.46,
    arc: HALF_TOWARD_DOOR,
    ringEmphasis: { thickness: 0.15, opacity: 0.32 },
  },
  {
    id: "library",
    label: "the bookshelf",
    promptLabel: "to pull out a book",
    objects: ["HOTSPOT_LIBRARY"],
    trigger: SPOTS.library.position.toArray(),
    highlight: [-0.52, 1.33, -2.02],
    color: 0x8fbf8f,
    radius: 0.35,
  },
  {
    id: "travel",
    label: "posters & guitar",
    promptLabel: "to see where I've been",
    objects: ["CORNER_GALLERY", "Acoustic_Guitar"],
    trigger: [1.5, 0, -1.25],
    highlight: [1.7, 1.95, -2.3],
    color: 0x9ec7e0,
    radius: 0.5,
  },
  {
    id: "tripod",
    label: "the tripod",
    promptLabel: "to doomscroll with me",
    objects: ["HOTSPOT_TRIPOD", "TRIPOD_STOOL"],
    trigger: SPOTS.tripod.position.toArray(),
    highlight: [-1.3, 1.55, 1.24],
    color: 0xc7a4ff,
    radius: SPOT_TRIGGER_RADIUS,
  },
];

export const HOTSPOTS = HOTSPOT_LIST.map((spot) => ({
  id: spot.id,
  label: spot.label,
  promptLabel: spot.promptLabel ?? `to view ${spot.label}`,
  trigger: new THREE.Vector3(...spot.trigger),
  highlightAnchor: new THREE.Vector3(...spot.highlight),
  radius: spot.radius ?? DEFAULT_TRIGGER_RADIUS,
  arc: spot.arc ?? FULL_CIRCLE,
  objects: spot.objects,
  ringEmphasis: spot.ringEmphasis,
  color: spot.color,
}));

export function findActiveHotspot(playerPosition) {
  let closest = null;
  let closestDistance = Infinity;
  for (const spot of HOTSPOTS) {
    const distance = horizontalDistance(playerPosition, spot.trigger);
    if (distance <= spot.radius && distance < closestDistance) {
      closest = spot;
      closestDistance = distance;
    }
  }
  return closest;
}

function horizontalDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
