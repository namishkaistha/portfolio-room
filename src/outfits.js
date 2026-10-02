const OUTFIT_KEY = "namish-room:outfit";
const SHADOW_FACTOR = 0.68;
const HIGHLIGHT_MIX = 0.16;

// Placeholder pieces: the colors are real, the stories are filler until the
// owner supplies what each piece means to them.
export const OUTFIT_PIECES = [
  {
    id: "quarter-zip",
    garment: "top",
    name: "Quarter zip",
    color: 0x4a4f57,
    roughness: 0.85,
    story: "Placeholder story. This is the piece I reach for when I want to look put together without trying too hard. Something about it feels like the start of a good day, and the real story goes here.",
  },
  {
    id: "sweater",
    garment: "top",
    name: "Sweater",
    color: 0xeadfc9,
    roughness: 0.95,
    story: "Placeholder story. A soft, familiar layer that has been with me through more seasons than I can count. It holds a few memories, and I'll write the real ones here soon.",
  },
  {
    id: "button-down",
    garment: "top",
    name: "Button down",
    color: 0xb7cde6,
    roughness: 0.7,
    story: "Placeholder story. The shirt for the days that matter: interviews, dinners, firsts. It always makes me stand a little taller, and the full story goes here.",
  },
  {
    id: "trousers",
    garment: "bottom",
    name: "Trousers",
    color: 0x17263f,
    roughness: 0.9,
    story: "Placeholder story. A dependable pair that goes with almost everything and asks for nothing in return. What they mean to me will be written here.",
  },
  {
    id: "parachute-pants",
    garment: "bottom",
    name: "Parachute pants",
    color: 0x4f5a3a,
    roughness: 0.35,
    story: "Placeholder story. Loud, loose and a little ridiculous, which is exactly why I love them. The real story, and probably a laugh, goes here.",
  },
];

export function defaultOutfit() {
  return { top: "sweater", bottom: "trousers" };
}

export function readSavedOutfit(storage) {
  try {
    const saved = JSON.parse(storage.getItem(OUTFIT_KEY));
    const isValid = findPiece(saved?.top)?.garment === "top" && findPiece(saved?.bottom)?.garment === "bottom";
    return isValid ? { top: saved.top, bottom: saved.bottom } : defaultOutfit();
  } catch {
    return defaultOutfit();
  }
}

export function saveOutfit(storage, outfit) {
  try {
    storage.setItem(OUTFIT_KEY, JSON.stringify(outfit));
  } catch {
    // Storage can be unavailable (private mode); the outfit just won't persist.
  }
}

export function findPiece(id) {
  return OUTFIT_PIECES.find((piece) => piece.id === id);
}

// The avatar's clothing materials are named "Sweater • ..." and "Jeans • ...",
// with separate shades for the main cloth, seams and cuffs, and highlights.
export function materialRole(materialName) {
  const garment = materialName.startsWith("Sweater") ? "top" : materialName.startsWith("Jeans") ? "bottom" : null;
  if (!garment) return null;
  if (/highlight|stitch/i.test(materialName)) return { garment, role: "highlight" };
  if (/seam|fold|cuff|ribbed|hem/i.test(materialName)) return { garment, role: "shadow" };
  return { garment, role: "base" };
}

export function shadeForRole(hex, role) {
  const channels = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const shaded = channels.map((value) => {
    if (role === "shadow") return Math.round(value * SHADOW_FACTOR);
    if (role === "highlight") return Math.round(value + (255 - value) * HIGHLIGHT_MIX);
    return value;
  });
  return (shaded[0] << 16) | (shaded[1] << 8) | shaded[2];
}

// Recolors the avatar's clothes in place. Geometry stays the same, so for now
// a piece differs by color and fabric sheen only.
export function applyOutfit(avatarRoot, outfit) {
  const pieces = { top: findPiece(outfit.top), bottom: findPiece(outfit.bottom) };
  avatarRoot.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of [object.material].flat()) {
      const match = materialRole(material.name ?? "");
      const piece = match && pieces[match.garment];
      if (!piece) continue;
      material.color.setHex(shadeForRole(piece.color, match.role));
      material.roughness = piece.roughness;
    }
  });
}
