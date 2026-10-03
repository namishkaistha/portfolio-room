import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Wardrobe } from "./wardrobe.js";
import manifest from "./wardrobeManifest.json";
import { wearablesFor } from "./outfits.js";

const WARDROBE_PATH = "/wardrobe/";

// Returns dress(outfit), which swaps the avatar's rigged garments to match.
export function createAvatarDresser(avatarRoot) {
  const wardrobe = new Wardrobe({
    avatar: avatarRoot,
    loader: new GLTFLoader(),
    manifest,
    baseUrl: new URL(WARDROBE_PATH, window.location.origin),
  });
  return function dress(outfit) {
    for (const [slot, garmentId] of Object.entries(wearablesFor(outfit))) {
      if (garmentId) wardrobe.equip(garmentId).catch((error) => reportMissingGarment(garmentId, error));
      else wardrobe.clear(slot);
    }
  };
}

// A garment that fails to load leaves the slot as it was; the recolored
// built-in clothes still show, so the room keeps working.
function reportMissingGarment(garmentId, error) {
  console.warn(`wearable ${garmentId} unavailable:`, error.message);
}
