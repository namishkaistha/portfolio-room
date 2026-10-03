import { readStoredJson, writeStoredJson } from "./storage.js";

const OUTFIT_KEY = "namish-room:outfit";

// The wardrobe. A piece lists the rigged garment it puts on the avatar, by
// slot (the Prince vest comes with its white tee built in). A piece without
// one recolors the avatar's built-in sweater or jeans instead.
export const OUTFIT_PIECES = [
  {
    id: "striped-button-down",
    garment: "top",
    name: "Striped button down",
    color: 0xe3e8f1,
    roughness: 0.7,
    showsAccents: true,
    wearables: { top: "blue-striped-shirt" },
    modelAlt: "A pale blue pinstriped Polo button-down",
    story: "A Polo-branded button down I thrifted in Madrid for $13, and my best find to date. I usually wear it with a chain showing and a white tank top underneath.",
  },
  {
    id: "nu-rose-bowl",
    garment: "top",
    name: "Northwestern Rose Bowl hoodie",
    color: 0xc9c9c9,
    roughness: 0.95,
    wearables: { top: "northwestern-rose-bowl-sweatshirt" },
    modelAlt: "A heather gray Northwestern Rose Bowl sweatshirt with a purple helmet and a rose",
    story: "The quintessential Northwestern alumni hoodie. We'll never forget the Rose Bowl.",
  },
  {
    id: "prince-vest",
    garment: "top",
    name: "Prince sweater vest",
    color: 0x1f3b63,
    roughness: 0.95,
    wearables: { top: "prince-cable-knit-vest" },
    modelAlt: "A navy cable-knit Prince sweater vest with a white and tan V-neck and a P patch",
    story: "Sweater vests unlock my indie side.",
  },
  {
    id: "urban-indian",
    garment: "top",
    name: "The Urban Indian hoodie",
    color: 0x5b302b,
    roughness: 0.95,
    wearables: { top: "urban-indian-sweatshirt" },
    modelAlt: "A faded maroon hoodie printed with The Urban Indian and the word love in several Indian scripts down one side",
    story: "Bought in an exclusive drop, in the middle of dance practice, with one of my best friends from college. It's engraved with The Urban Indian and the word love in several languages, and it's representative of my Indian roots.",
  },
  {
    id: "skims-tee",
    garment: "top",
    name: "Skims black tee",
    color: 0x151515,
    roughness: 0.8,
    wearables: { top: "black-skims-tshirt" },
    modelAlt: "A black SKIMS crew-neck tee",
    story: "A gift from my friends, and my go-to black tee for when I'm out and about.",
  },
  {
    id: "brown-corduroy",
    garment: "bottom",
    name: "Brown corduroy pants",
    color: 0xa27c55,
    roughness: 0.95,
    wearables: { bottom: "tan-corduroy-trousers" },
    modelAlt: "Tan-brown corduroy pants",
    story: "Brown corduroy pants I thrifted in New York City when I was 19.",
  },
  {
    id: "uncle-jeans",
    garment: "bottom",
    name: "Levi's straight-leg jeans",
    color: 0x1a2236,
    roughness: 0.85,
    wearables: { bottom: "indigo-straight-jeans" },
    modelAlt: "Dark indigo straight-leg baggy Levi's jeans",
    story: "Straight-leg, baggy-ish denim, a gift from my uncle in India. It's my first pair of Levi's ever.",
  },
  {
    id: "blue-jeans",
    garment: "bottom",
    name: "Light blue jeans",
    color: 0x86a9d1,
    roughness: 0.85,
    wearables: {},
    modelAlt: "",
    story: "You can never go wrong with a nice pair of blue jeans.",
  },
  {
    id: "brown-trousers",
    garment: "bottom",
    name: "Brown trousers",
    color: 0x35261f,
    roughness: 0.9,
    wearables: { bottom: "charcoal-pleated-trousers" },
    modelAlt: "Dark brown dress trousers",
    story: "It's important to have elevated style sometimes.",
  },
];

export function defaultOutfit() {
  return { top: "nu-rose-bowl", bottom: "uncle-jeans" };
}

export function readSavedOutfit(storage) {
  const saved = readStoredJson(OUTFIT_KEY, null, storage);
  const isValid = findPiece(saved?.top)?.garment === "top" && findPiece(saved?.bottom)?.garment === "bottom";
  return isValid ? { top: saved.top, bottom: saved.bottom } : defaultOutfit();
}

export function saveOutfit(outfit, storage) {
  writeStoredJson(OUTFIT_KEY, outfit, storage);
}

const SLOTS = ["top", "bottom"];
const WARDROBE_URL = "/wardrobe";

export function wearablesFor(outfit) {
  const chosen = { ...findPiece(outfit.bottom)?.wearables, ...findPiece(outfit.top)?.wearables };
  return Object.fromEntries(SLOTS.map((slot) => [slot, chosen[slot] ?? null]));
}

export function showcaseGarment(piece) {
  return piece.wearables.top ?? piece.wearables.bottom ?? null;
}

export function garmentModelUrl(garmentId) {
  return `${WARDROBE_URL}/wearables/${garmentId}.glb`;
}

// Stills rendered from the 3D models by scripts/wardrobe/.
export function garmentPhotoUrl(garmentId) {
  return `${WARDROBE_URL}/photos/${garmentId}.webp`;
}

export function findPiece(id) {
  return OUTFIT_PIECES.find((piece) => piece.id === id);
}
