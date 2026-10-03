import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { OUTFIT_PIECES, defaultOutfit, fabricRole, readSavedOutfit, shadeForRole, garmentPhotoUrl, showcaseGarment, wearablesFor } from "../src/outfits.js";
import manifest from "../src/wardrobeManifest.json" with { type: "json" };

const channels = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

test("the built-in clothes' cloth takes the piece color", () => {
  assert.equal(fabricRole("heather_cloth"), "base");
  assert.equal(fabricRole("denim_cloth"), "base");
});

test("ribbed trim takes a darker shade", () => {
  assert.equal(fabricRole("Ribbed_trim"), "shadow");
});

test("leaves skin, stitching and buttons alone", () => {
  for (const name of ["Skin • warm medium brown", "Stitching", "Buttons"]) assert.equal(fabricRole(name), null);
});

test("the base shade is the piece color itself", () => {
  assert.equal(shadeForRole(0x4a4f57, "base"), 0x4a4f57);
});

test("shadows are darker in every channel", () => {
  const base = channels(0x808080);
  channels(shadeForRole(0x808080, "shadow")).forEach((value, index) => assert.ok(value < base[index]));
});

test("shades stay inside the valid color range", () => {
  for (const role of ["base", "shadow"]) {
    for (const color of [0x000000, 0xffffff]) assert.ok(shadeForRole(color, role) >= 0 && shadeForRole(color, role) <= 0xffffff);
  }
});

test("pieces have a unique id, a garment, a name and a story", () => {
  const ids = OUTFIT_PIECES.map((piece) => piece.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const piece of OUTFIT_PIECES) {
    assert.ok(["top", "bottom"].includes(piece.garment));
    assert.ok(piece.name.length > 0 && piece.story.length > 0);
  }
});

test("offers at least two tops and two bottoms", () => {
  assert.ok(OUTFIT_PIECES.filter((piece) => piece.garment === "top").length >= 2);
  assert.ok(OUTFIT_PIECES.filter((piece) => piece.garment === "bottom").length >= 2);
});

test("every wearable a piece lists exists in the wardrobe in the right slot", () => {
  for (const piece of OUTFIT_PIECES) {
    for (const [slot, id] of Object.entries(piece.wearables)) {
      assert.equal(manifest.garments.find((garment) => garment.id === id)?.slot, slot, `${piece.id} → ${id}`);
    }
  }
});

test("every wearable file is on disk", () => {
  for (const garment of manifest.garments) {
    assert.ok(existsSync(new URL(`../public/wardrobe/${garment.file}`, import.meta.url)), `${garment.file} is missing`);
  }
});

test("an outfit dresses each slot from its top and bottom", () => {
  assert.deepEqual(wearablesFor({ top: "nu-rose-bowl", bottom: "uncle-jeans" }), { top: "northwestern-rose-bowl-sweatshirt", bottom: "indigo-straight-jeans" });
});

test("the vest is one top with its tee built in", () => {
  assert.deepEqual(wearablesFor({ top: "prince-vest", bottom: "brown-trousers" }), { top: "prince-cable-knit-vest", bottom: "charcoal-pleated-trousers" });
});

test("a piece without a garment leaves its slot empty", () => {
  assert.deepEqual(wearablesFor({ top: "skims-tee", bottom: "blue-jeans" }), { top: "black-skims-tshirt", bottom: null });
});

test("the panel shows a piece's garment", () => {
  assert.equal(showcaseGarment(OUTFIT_PIECES.find((piece) => piece.id === "skims-tee")), "black-skims-tshirt");
});

test("a piece without a garment has nothing to show", () => {
  assert.equal(showcaseGarment(OUTFIT_PIECES.find((piece) => piece.id === "blue-jeans")), null);
});

test("every piece's showcase garment has a rendered photo on disk", () => {
  for (const garmentId of OUTFIT_PIECES.map(showcaseGarment).filter(Boolean)) {
    assert.ok(existsSync(new URL(`../public${garmentPhotoUrl(garmentId)}`, import.meta.url)), `${garmentId} photo is missing`);
  }
});

test("no story uses an em dash", () => {
  for (const piece of OUTFIT_PIECES) assert.equal(piece.story.includes("—"), false);
});

test("the default outfit wears one top and one bottom that exist", () => {
  const outfit = defaultOutfit();
  assert.equal(OUTFIT_PIECES.find((piece) => piece.id === outfit.top)?.garment, "top");
  assert.equal(OUTFIT_PIECES.find((piece) => piece.id === outfit.bottom)?.garment, "bottom");
});

test("restores a saved outfit", () => {
  const storage = { getItem: () => JSON.stringify({ top: "prince-vest", bottom: "brown-trousers" }) };
  assert.deepEqual(readSavedOutfit(storage), { top: "prince-vest", bottom: "brown-trousers" });
});

test("falls back to the default for missing, corrupt, unknown or outdated saved outfits", () => {
  assert.deepEqual(readSavedOutfit({ getItem: () => null }), defaultOutfit());
  assert.deepEqual(readSavedOutfit({ getItem: () => "{nope" }), defaultOutfit());
  assert.deepEqual(readSavedOutfit({ getItem: () => JSON.stringify({ top: "tuxedo", bottom: "uncle-jeans" }) }), defaultOutfit());
  assert.deepEqual(readSavedOutfit({ getItem: () => JSON.stringify({ top: "uncle-jeans", bottom: "prince-vest" }) }), defaultOutfit());
  assert.deepEqual(readSavedOutfit({ getItem: () => JSON.stringify({ top: "sweater", bottom: "trousers" }) }), defaultOutfit());
});

test("falls back to the default when storage throws", () => {
  assert.deepEqual(readSavedOutfit({ getItem: () => { throw new Error("blocked"); } }), defaultOutfit());
});
