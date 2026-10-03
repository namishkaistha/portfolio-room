const OUTFIT_KEY = "namish-room:outfit";
const SHADOW_FACTOR = 0.68;
const HIGHLIGHT_MIX = 0.16;

// The wardrobe. Colors are sampled from the photos; the avatar's geometry stays
// the same, so a piece changes the avatar by color, fabric sheen and, for the
// striped shirt, pinstripes and a chain with a tank top showing.
export const OUTFIT_PIECES = [
  {
    id: "striped-button-down",
    garment: "top",
    name: "Striped button down",
    color: 0xe3e8f1,
    roughness: 0.7,
    pinstripe: 0x8fa6c9,
    showsAccents: true,
    model: "/closet/striped-button-down.glb",
    modelAlt: "A pale blue pinstriped Polo button-down",
    story: "A Polo-branded button down I thrifted in Madrid for $13, and my best find to date. I usually wear it with a chain showing and a white tank top underneath.",
  },
  {
    id: "nu-rose-bowl",
    garment: "top",
    name: "Northwestern Rose Bowl hoodie",
    color: 0xc9c9c9,
    roughness: 0.95,
    model: "/closet/nu-rose-bowl.glb",
    modelAlt: "A heather gray Northwestern Rose Bowl sweatshirt with a purple helmet and a rose",
    story: "The quintessential Northwestern alumni hoodie. We'll never forget the Rose Bowl.",
  },
  {
    id: "prince-vest",
    garment: "top",
    name: "Prince sweater vest",
    color: 0x1f3b63,
    roughness: 0.95,
    model: "/closet/prince-vest.glb",
    modelAlt: "A navy cable-knit Prince sweater vest with a white and tan V-neck and a P patch",
    story: "Sweater vests unlock my indie side.",
  },
  {
    id: "urban-indian",
    garment: "top",
    name: "The Urban Indian hoodie",
    color: 0x5b302b,
    roughness: 0.95,
    model: "/closet/urban-indian.glb",
    modelAlt: "A faded maroon hoodie printed with The Urban Indian and the word love in several Indian scripts down one side",
    story: "Bought in an exclusive drop, in the middle of dance practice, with one of my best friends from college. It's engraved with The Urban Indian and the word love in several languages, and it's representative of my Indian roots.",
  },
  {
    id: "skims-tee",
    garment: "top",
    name: "Skims black tee",
    color: 0x151515,
    roughness: 0.8,
    model: null,
    modelAlt: "",
    story: "A gift from my friends, and my go-to black tee for when I'm out and about.",
  },
  {
    id: "brown-corduroy",
    garment: "bottom",
    name: "Brown corduroy pants",
    color: 0xa27c55,
    roughness: 0.95,
    model: "/closet/brown-corduroy.glb",
    modelAlt: "Tan-brown corduroy pants",
    story: "Brown corduroy pants I thrifted in New York City when I was 19.",
  },
  {
    id: "uncle-jeans",
    garment: "bottom",
    name: "Levi's straight-leg jeans",
    color: 0x1a2236,
    roughness: 0.85,
    model: "/closet/uncle-jeans.glb",
    modelAlt: "Dark indigo straight-leg baggy Levi's jeans",
    story: "Straight-leg, baggy-ish denim, a gift from my uncle in India. It's my first pair of Levi's ever.",
  },
  {
    id: "blue-jeans",
    garment: "bottom",
    name: "Light blue jeans",
    color: 0x86a9d1,
    roughness: 0.85,
    model: null,
    modelAlt: "",
    story: "You can never go wrong with a nice pair of blue jeans.",
  },
  {
    id: "brown-trousers",
    garment: "bottom",
    name: "Brown trousers",
    color: 0x35261f,
    roughness: 0.9,
    model: "/closet/brown-trousers.glb",
    modelAlt: "Dark brown dress trousers",
    story: "It's important to have elevated style sometimes.",
  },
];

export function defaultOutfit() {
  return { top: "nu-rose-bowl", bottom: "uncle-jeans" };
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
      if (match.garment === "top") setPinstripe(material, piece.pinstripe);
    }
  });
  const accents = avatarRoot.getObjectByName(ACCENTS_NAME);
  if (accents) accents.visible = Boolean(pieces.top?.showsAccents);
}

export const ACCENTS_NAME = "OUTFIT_ACCENTS";
const STRIPE_SPACING = 85;
const STRIPE_WIDTH = 0.36;

// The avatar has no texture coordinates, so pinstripes are drawn in the fabric
// shader from the surface's position instead. The uniform is switched per piece.
function setPinstripe(material, stripeHex) {
  const stripe = material.userData.pinstripe ?? patchForPinstripes(material);
  stripe.amount.value = stripeHex ? 1 : 0;
  if (stripeHex) stripe.color.value = [(stripeHex >> 16) / 255, ((stripeHex >> 8) & 255) / 255, (stripeHex & 255) / 255];
}

function patchForPinstripes(material) {
  const stripe = { amount: { value: 0 }, color: { value: [0, 0, 0] } };
  material.userData.pinstripe = stripe;
  material.customProgramCacheKey = () => "pinstripe";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPinstripe = stripe.amount;
    shader.uniforms.uStripeColor = stripe.color;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vOutfitPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvOutfitPosition = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uPinstripe;\nuniform vec3 uStripeColor;\nvarying vec3 vOutfitPosition;`)
      .replace("#include <color_fragment>", `#include <color_fragment>\nfloat stripe = step(${(1 - STRIPE_WIDTH).toFixed(2)}, fract(vOutfitPosition.x * ${STRIPE_SPACING.toFixed(1)}));\ndiffuseColor.rgb = mix(diffuseColor.rgb, uStripeColor, stripe * uPinstripe);`);
  };
  material.needsUpdate = true;
  return stripe;
}
