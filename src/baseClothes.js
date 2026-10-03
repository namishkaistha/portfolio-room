import { findPiece } from "./outfits.js";

// The avatar's built-in sweater and jeans, tagged by slot in the avatar file.
// They show only for a piece with no rigged garment (or one that failed to
// load); every other piece hides them.
const SHADOW_FACTOR = 0.68;
const CLOTH_MATERIALS = ["heather_cloth", "denim_cloth"];
const TRIM_MATERIAL = "Ribbed_trim";

// Recolors the built-in clothes for the outfit. The fabric texture is dropped
// so a light color like pale denim reads true.
export function recolorBaseClothes(avatarRoot, outfit) {
  const pieces = { top: findPiece(outfit.top), bottom: findPiece(outfit.bottom) };
  avatarRoot.traverse((object) => {
    const piece = object.isMesh && pieces[object.userData.baseSlot];
    const role = piece && fabricRole(object.material.name);
    if (role) recolorFabric(object.material, { piece, role });
  });
}

// The cloth takes the piece's color and the ribbed trim a darker shade of it;
// stitching and buttons keep their own colors.
export function fabricRole(materialName) {
  if (CLOTH_MATERIALS.includes(materialName)) return "base";
  if (materialName === TRIM_MATERIAL) return "shadow";
  return null;
}

export function shadeForRole(hex, role) {
  if (role !== "shadow") return hex;
  const channels = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((value) => Math.round(value * SHADOW_FACTOR));
  return (channels[0] << 16) | (channels[1] << 8) | channels[2];
}

function recolorFabric(material, { piece, role }) {
  if (material.map) {
    material.map = null;
    material.needsUpdate = true;
  }
  material.color.setHex(shadeForRole(piece.color, role));
  material.roughness = piece.roughness;
}
