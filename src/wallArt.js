import * as THREE from "three";
import { addBox, solid } from "./meshHelpers.js";
import { createSeededRandom } from "./seededRandom.js";

// The GLB's flat-color prints sat behind the bookshelf; the corner gallery
// below replaces them with the posters from the real room.
const REPLACED_PRINT_NAMES = [
  "Air_India_Print_Frame",
  "Air_India_Print",
  "Pop_Art_Print_Frame",
  "Pop_Art_Print",
  "Microphone_Patent_Frame",
  "Microphone_Patent",
];

const BACK_WALL_Z = -2.345;
const RIGHT_WALL_X = 2.045;
const FRAME = { border: 0.022, depth: 0.025, color: 0x101010 };
const ART_SURFACE_OFFSET = 0.002;
const TEXTURE_PIXELS_PER_METER = 1100;

// Back-wall pieces are centred at [x, y]; right-wall pieces at [z, y].
const ARTWORKS = [
  { wall: "back", center: [1.7, 1.95], size: [0.38, 0.56], isFramed: true, draw: drawAirIndia },
  { wall: "back", center: [1.7, 1.38], size: [0.32, 0.44], isFramed: false, draw: drawBlonde },
  { wall: "right", center: [-2.05, 1.9], size: [0.42, 0.48], isFramed: true, draw: drawHaNoiCans },
  { wall: "right", center: [-2.19, 1.36], size: [0.2, 0.24], isFramed: true, draw: drawAbstract },
  { wall: "right", center: [-1.9, 1.36], size: [0.28, 0.24], isFramed: true, draw: drawBeachPhoto },
];

export function hangCornerGallery(roomGroup) {
  for (const name of REPLACED_PRINT_NAMES) roomGroup.getObjectByName(name)?.removeFromParent();
  const gallery = new THREE.Group();
  gallery.name = "CORNER_GALLERY";
  for (const artwork of ARTWORKS) gallery.add(buildArtwork(artwork));
  roomGroup.add(gallery);
}

function buildArtwork(artwork) {
  const piece = new THREE.Group();
  const [width, height] = artwork.size;
  if (artwork.isFramed) {
    addBox(piece, solid(FRAME.color, 0.5), { size: [width + FRAME.border * 2, height + FRAME.border * 2, FRAME.depth], position: [0, 0, 0] });
  }
  const surfaceZ = artwork.isFramed ? FRAME.depth / 2 + ART_SURFACE_OFFSET : ART_SURFACE_OFFSET;
  const canvasMaterial = new THREE.MeshStandardMaterial({ map: paintArtwork(artwork), roughness: 0.8 });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(width, height), canvasMaterial);
  surface.position.z = surfaceZ;
  piece.add(surface);
  placeOnWall(piece, artwork);
  return piece;
}

function placeOnWall(piece, artwork) {
  const [along, y] = artwork.center;
  if (artwork.wall === "back") {
    piece.position.set(along, y, BACK_WALL_Z);
    return;
  }
  piece.position.set(RIGHT_WALL_X, y, along);
  piece.rotation.y = -Math.PI / 2;
}

function paintArtwork(artwork) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(artwork.size[0] * TEXTURE_PIXELS_PER_METER);
  canvas.height = Math.round(artwork.size[1] * TEXTURE_PIXELS_PER_METER);
  artwork.draw(canvas.getContext("2d"), canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawAirIndia(ctx, w, h) {
  ctx.fillStyle = "#e6b53a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#a8261d";
  ctx.font = `italic ${h * 0.08}px Georgia, serif`;
  ctx.fillText("Paris", w * 0.1, h * 0.17);
  fillCircle(ctx, w * 0.62, h * 0.6, w * 0.13, "#f2ede2");
  fillCircle(ctx, w * 0.42, h * 0.55, w * 0.17, "#a8261d");
  fillCircle(ctx, w * 0.4, h * 0.33, w * 0.1, "#f2ede2");
  ctx.fillStyle = "#a8261d";
  for (let stripe = 0; stripe < 3; stripe += 1) ctx.fillRect(w * 0.31, h * (0.29 + stripe * 0.025), w * 0.18, h * 0.01);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(w * 0.26, h * 0.6, w * 0.26, h * 0.16);
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = w * 0.012;
  ctx.strokeRect(w * 0.26, h * 0.6, w * 0.26, h * 0.16);
  ctx.fillStyle = "#a8261d";
  ctx.font = `bold ${h * 0.075}px Arial, sans-serif`;
  ctx.fillText("AIR-INDIA", w * 0.08, h * 0.92);
}

function drawBlonde(ctx, w, h) {
  ctx.fillStyle = "#f4f3ef";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.font = `bold ${h * 0.055}px Arial, sans-serif`;
  ctx.fillText("blond", w * 0.5, h * 0.1);
  ctx.fillStyle = "#4a3c32";
  ctx.fillRect(w * 0.28, h * 0.14, w * 0.44, h * 0.33);
  fillCircle(ctx, w * 0.48, h * 0.28, w * 0.09, "#2a211b");
  ctx.fillStyle = "#9a9a96";
  for (let line = 0; line < 9; line += 1) {
    ctx.fillRect(w * 0.08, h * (0.55 + line * 0.026), w * 0.32, h * 0.006);
    ctx.fillRect(w * 0.44, h * (0.55 + line * 0.026), w * 0.2, h * 0.006);
  }
  ["#3b3b3b", "#7a3d2e", "#6f6f6f", "#2d2d2d", "#b9b9b9"].forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(w * (0.68 + index * 0.05), h * 0.56, w * 0.04, w * 0.04);
  });
  ctx.fillStyle = "#111";
  ctx.textAlign = "right";
  ctx.font = `bold ${h * 0.065}px Arial, sans-serif`;
  ctx.fillText("blonde", w * 0.92, h * 0.94);
}

const CAN_PANELS = [
  ["#4aa36c", "#e8c547"], ["#8b3b6e", "#f0e6d6"], ["#e05a2b", "#3b6fb6"], ["#f2c94c", "#c0392b"],
  ["#2d6cb5", "#e8c547"], ["#f2d23c", "#2f8f5b"], ["#3f8f8a", "#e8e1cf"], ["#c0392b", "#1f3d73"],
];
const CAN_COLUMNS = 4;

function drawHaNoiCans(ctx, w, h) {
  ctx.fillStyle = "#f6f4ef";
  ctx.fillRect(0, 0, w, h);
  const margin = w * 0.1;
  const panelWidth = (w - margin * 2) / CAN_COLUMNS;
  const panelHeight = (h - margin * 2) / 2;
  CAN_PANELS.forEach(([background, can], index) => {
    const x = margin + (index % CAN_COLUMNS) * panelWidth;
    const y = margin + Math.floor(index / CAN_COLUMNS) * panelHeight;
    ctx.fillStyle = background;
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.fillStyle = can;
    ctx.fillRect(x + panelWidth * 0.22, y + panelHeight * 0.12, panelWidth * 0.56, panelHeight * 0.76);
    ctx.fillStyle = background;
    ctx.fillRect(x + panelWidth * 0.22, y + panelHeight * 0.42, panelWidth * 0.56, panelHeight * 0.12);
  });
}

function drawAbstract(ctx, w, h) {
  ctx.fillStyle = "#1c2433";
  ctx.fillRect(0, 0, w, h);
  const nextRandom = createSeededRandom(11);
  const palette = ["#d6452f", "#f0c419", "#2f6db5", "#f4efe6", "#3a9a5b", "#e07a2f"];
  for (let shape = 0; shape < 14; shape += 1) {
    ctx.fillStyle = palette[shape % palette.length];
    ctx.beginPath();
    ctx.moveTo(nextRandom() * w, nextRandom() * h);
    ctx.lineTo(nextRandom() * w, nextRandom() * h);
    ctx.lineTo(nextRandom() * w, nextRandom() * h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBeachPhoto(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, "#d6d6d6");
  sky.addColorStop(1, "#9a9a9a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.6);
  ctx.fillStyle = "#6a6a6a";
  ctx.fillRect(0, h * 0.6, w, h * 0.1);
  ctx.fillStyle = "#b8b8b8";
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
  ctx.fillStyle = "#2b2b2b";
  for (const x of [0.6, 0.66, 0.73, 0.8, 0.86]) ctx.fillRect(w * x, h * 0.18, w * 0.008, h * 0.5);
  for (const x of [0.32, 0.38, 0.44, 0.5]) ctx.fillRect(w * x, h * 0.55, w * 0.035, h * 0.2);
}

function fillCircle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
