import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { OUTFIT_PIECES, defaultOutfit, materialRole, readSavedOutfit, shadeForRole } from "../src/outfits.js";

const channels = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

test("recognises the avatar's sweater and jeans materials", () => {
  assert.deepEqual(materialRole("Sweater • cream cotton knit"), { garment: "top", role: "base" });
  assert.deepEqual(materialRole("Sweater • ribbed cuffs and hem"), { garment: "top", role: "shadow" });
  assert.deepEqual(materialRole("Sweater • knit highlights"), { garment: "top", role: "highlight" });
  assert.deepEqual(materialRole("Jeans • deep navy denim"), { garment: "bottom", role: "base" });
  assert.deepEqual(materialRole("Jeans • seams and folds"), { garment: "bottom", role: "shadow" });
  assert.deepEqual(materialRole("Jeans • pale stitching"), { garment: "bottom", role: "highlight" });
});

test("leaves skin, hair and shoes alone", () => {
  assert.equal(materialRole("Skin • warm medium brown"), null);
  assert.equal(materialRole("Loafers • polished black leather"), null);
});

test("the base shade is the piece color itself", () => {
  assert.equal(shadeForRole(0x4a4f57, "base"), 0x4a4f57);
});

test("shadows are darker and highlights lighter in every channel", () => {
  const base = channels(0x808080);
  channels(shadeForRole(0x808080, "shadow")).forEach((value, index) => assert.ok(value < base[index]));
  channels(shadeForRole(0x808080, "highlight")).forEach((value, index) => assert.ok(value > base[index]));
});

test("shades stay inside the valid color range", () => {
  for (const role of ["base", "shadow", "highlight"]) {
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

test("every piece that lists a 3D model has that file on disk", () => {
  for (const piece of OUTFIT_PIECES.filter((candidate) => candidate.model)) {
    assert.ok(existsSync(new URL(`../public${piece.model}`, import.meta.url)), `${piece.model} is missing`);
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
