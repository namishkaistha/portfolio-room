import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Wardrobe } from "../src/wardrobe.js";
import manifest from "../src/wardrobeManifest.json" with { type: "json" };

test("equipping hides only the replaced base garment", async () => {
  const context = fixture();
  await context.wardrobe.equip("shirt");
  assert.deepEqual([context.baseTop.visible, context.baseBottom.visible], [false, true]);
});

test("clearing restores the original visibility, including pre-hidden meshes", async () => {
  const context = fixture({ topVisible: false });
  await context.wardrobe.equip("shirt");
  context.wardrobe.clear("top");
  assert.equal(context.baseTop.visible, false);
});

test("a garment follows the live avatar joint after equipping", async () => {
  const context = fixture();
  await context.wardrobe.equip("shirt");
  context.bone.rotation.z = Math.PI / 2;
  context.avatar.updateMatrixWorld(true);
  const mesh = context.wardrobe.slots.get("top").root.children[0];
  const position = mesh.applyBoneTransform(0, new THREE.Vector3(1, 0, 0));
  assert.ok(position.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6);
});

test("equipping into an already posed avatar keeps the exported bind pose", async () => {
  const context = fixture();
  context.bone.rotation.z = Math.PI / 2;
  context.avatar.updateMatrixWorld(true);
  await context.wardrobe.equip("shirt");
  const mesh = context.wardrobe.slots.get("top").root.children[0];
  assert.ok(mesh.applyBoneTransform(0, new THREE.Vector3(1, 0, 0)).distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6);
});

test("avatar placement and scale apply once to equipped geometry", async () => {
  const context = fixture();
  context.avatar.position.set(4, 2, -3);
  context.avatar.scale.setScalar(2);
  context.avatar.updateMatrixWorld(true);
  await context.wardrobe.equip("shirt");
  const mesh = context.wardrobe.slots.get("top").root.children[0];
  const point = mesh.applyBoneTransform(0, new THREE.Vector3(1, 0, 0)).applyMatrix4(mesh.matrixWorld);
  assert.ok(point.distanceTo(new THREE.Vector3(6, 2, -3)) < 1e-6);
});

test("a failed download preserves the currently equipped garment", async () => {
  const context = fixture();
  await context.wardrobe.equip("shirt");
  context.loader.loadAsync = async () => { throw new Error("offline"); };
  const error = await context.wardrobe.equip("sweater").then(() => null, (failure) => failure.message);
  assert.deepEqual({ error, id: context.wardrobe.slots.get("top").id }, { error: "offline", id: "shirt" });
});

test("the latest selection wins when downloads finish out of order", async () => {
  const pending = [];
  const context = fixture();
  context.loader.loadAsync = () => new Promise((resolve) => pending.push(resolve));
  const earlier = context.wardrobe.equip("shirt");
  const later = context.wardrobe.equip("sweater");
  pending[1]({ scene: wearable() });
  await later;
  pending[0]({ scene: wearable() });
  await earlier;
  assert.equal(context.wardrobe.slots.get("top").id, "sweater");
});

test("clearing during a download prevents the pending garment from reappearing", async () => {
  let resolve;
  const context = fixture();
  context.loader.loadAsync = () => new Promise((complete) => { resolve = complete; });
  const pending = context.wardrobe.equip("shirt");
  context.wardrobe.clear("top");
  resolve({ scene: wearable() });
  await pending;
  assert.equal(context.wardrobe.slots.size, 0);
});

test("an incompatible skeleton fails without hiding the base clothes", async () => {
  const context = fixture();
  context.loader.loadAsync = async () => ({ scene: wearable("WrongBone") });
  const error = await context.wardrobe.equip("shirt").then(() => null, (failure) => failure.message);
  assert.deepEqual({ error, visible: context.baseTop.visible }, { error: "The avatar is missing joint WrongBone", visible: true });
});

test("disposing restores the base outfit and rejects future equips", async () => {
  const context = fixture();
  await context.wardrobe.equip("shirt");
  context.wardrobe.dispose();
  const error = await context.wardrobe.equip("shirt").then(() => null, (failure) => failure.message);
  assert.deepEqual({ error, visible: context.baseTop.visible }, { error: "This wardrobe has been disposed", visible: true });
});

test("base clothing beside the rig is hidden and restored", async () => {
  const context = fixture();
  const scene = new THREE.Scene();
  scene.add(context.avatar, context.baseTop, context.baseBottom);
  const wardrobe = new Wardrobe({ avatar: scene, loader: context.loader, manifest: context.wardrobe.manifest, baseUrl: "http://localhost/assets/" });
  await wardrobe.equip("shirt");
  const hidden = !context.baseTop.visible;
  wardrobe.clear("top");
  assert.deepEqual({ hidden, restored: context.baseTop.visible }, { hidden: true, restored: true });
});

test("a different avatar body fit is rejected before changing visibility", () => {
  const context = fixture();
  context.wardrobe.manifest.avatar.bodyFit = "athletic-v1";
  assert.throws(() => new Wardrobe({ avatar: context.avatar, loader: context.loader, manifest: context.wardrobe.manifest, baseUrl: "http://localhost/assets/" }), /matching updated Namish_Avatar/);
});

// The wardrobe refuses a mismatched avatar at startup, which would stop the
// room loading, so the shipped files are checked against each other here.
const AVATAR_BYTES = readFileSync(new URL("../public/avatar.glb", import.meta.url));
const GLB_JSON_LENGTH_OFFSET = 12;
const GLB_JSON_START = 20;

test("the shipped avatar is the one the manifest describes", () => {
  assert.equal(createHash("sha256").update(AVATAR_BYTES).digest("hex"), manifest.avatar.sha256);
});

test("the shipped avatar carries the body fit the garments were made for", () => {
  const jsonLength = AVATAR_BYTES.readUInt32LE(GLB_JSON_LENGTH_OFFSET);
  const gltf = JSON.parse(AVATAR_BYTES.subarray(GLB_JSON_START, GLB_JSON_START + jsonLength).toString("utf8"));
  const root = gltf.nodes.find((node) => node.name === manifest.avatar.rootNode);
  assert.equal(root.extras.bodyFit, manifest.avatar.bodyFit);
});

function fixture({ topVisible = true } = {}) {
  const avatar = new THREE.Group();
  avatar.name = "Namish_Avatar";
  const bone = new THREE.Bone();
  bone.name = "Spine";
  const baseTop = new THREE.Mesh();
  baseTop.name = "OriginalTop";
  baseTop.visible = topVisible;
  const baseBottom = new THREE.Mesh();
  baseBottom.name = "OriginalBottom";
  avatar.add(bone, baseTop, baseBottom);
  const loader = { loadAsync: async () => ({ scene: wearable() }) };
  const manifest = { avatar: { rootNode: "Namish_Avatar" }, hideBaseMeshes: { top: ["OriginalTop"], bottom: ["OriginalBottom"], layer: [] }, garments: [{ id: "shirt", slot: "top", file: "shirt.glb" }, { id: "sweater", slot: "top", file: "sweater.glb" }] };
  return { avatar, bone, baseTop, baseBottom, loader, wardrobe: new Wardrobe({ avatar, loader, manifest, baseUrl: "http://localhost/assets/" }) };
}

function wearable(boneName = "Spine") {
  const scene = new THREE.Group();
  const bone = new THREE.Bone();
  bone.name = boneName;
  scene.add(bone);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([1, 0, 0], 3));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute([0, 0, 0, 0], 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([1, 0, 0, 0], 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.bind(new THREE.Skeleton([bone], [new THREE.Matrix4()]), new THREE.Matrix4());
  scene.add(mesh);
  return scene;
}
