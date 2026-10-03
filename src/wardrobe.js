import { Group, Matrix4, Skeleton } from "three";

// Puts rigged garments (from the Namish-Wearables package) on the avatar. Each
// garment GLB carries its own reference skeleton; equipping rebinds its meshes
// to the avatar's live joints so they follow every animation, and hides the
// avatar's built-in sweater or jeans for that slot.
export class Wardrobe {
  constructor({ avatar, loader, manifest, baseUrl }) {
    this.avatar = avatar.getObjectByName(manifest.avatar.rootNode) ?? avatar;
    if (manifest.avatar.bodyFit && this.avatar.userData.bodyFit !== manifest.avatar.bodyFit) {
      throw new Error("Use the matching updated Namish_Avatar.glb for this clothing fit");
    }
    this.loader = loader;
    this.manifest = manifest;
    this.baseUrl = baseUrl;
    this.slots = new Map();
    this.requests = new Map();
    this.originalVisibility = new Map();
    this.isDisposed = false;
    for (const [slot, names] of Object.entries(manifest.hideBaseMeshes)) {
      // Base clothes can sit beside the rig rather than inside it, so search the whole avatar.
      this.originalVisibility.set(slot, names.map((name) => {
        const mesh = avatar.getObjectByName(name);
        if (!mesh) throw new Error(`The avatar is missing ${name}`);
        return { mesh, visible: mesh.visible };
      }));
    }
  }

  // Resolves to false when a newer request for the same slot replaced this one.
  async equip(id) {
    if (this.isDisposed) throw new Error("This wardrobe has been disposed");
    const garment = this.manifest.garments.find((entry) => entry.id === id);
    if (!garment) throw new Error(`Unknown garment: ${id}`);
    const request = Symbol(id);
    this.requests.set(garment.slot, request);
    if (this.slots.get(garment.slot)?.id === id) return true;
    const loaded = await this.loader.loadAsync(new URL(garment.file, this.baseUrl).href);
    if (this.isDisposed || this.requests.get(garment.slot) !== request) {
      disposeWearable(loaded.scene);
      return false;
    }
    const mounted = mountOrDispose(this.avatar, loaded.scene);
    this.removeMounted(garment.slot);
    this.avatar.add(mounted);
    this.slots.set(garment.slot, { id, root: mounted });
    for (const entry of this.originalVisibility.get(garment.slot) ?? []) entry.mesh.visible = false;
    this.avatar.updateMatrixWorld(true);
    return true;
  }

  clear(slot) {
    this.requests.set(slot, Symbol("cleared"));
    this.removeMounted(slot);
    for (const entry of this.originalVisibility.get(slot) ?? []) entry.mesh.visible = entry.visible;
  }

  dispose() {
    this.isDisposed = true;
    for (const slot of this.originalVisibility.keys()) this.clear(slot);
  }

  removeMounted(slot) {
    const previous = this.slots.get(slot);
    if (!previous) return;
    previous.root.removeFromParent();
    disposeWearable(previous.root);
    this.slots.delete(slot);
  }
}

function mountOrDispose(avatar, scene) {
  try {
    return bindWearable(avatar, scene);
  } catch (error) {
    disposeWearable(scene);
    throw error;
  }
}

// The exported inverse bind matrices are kept, so a garment fits even when it
// is equipped mid-animation or on a moved and scaled avatar.
function bindWearable(avatar, scene) {
  const meshes = [];
  scene.traverse((node) => {
    if (node.isSkinnedMesh) meshes.push(node);
  });
  if (meshes.length === 0) throw new Error("The wearable contains no skinned meshes");
  const skeletons = meshes.map((mesh) => new Skeleton(
    mesh.skeleton.bones.map((bone) => avatarJoint(avatar, bone.name)),
    mesh.skeleton.boneInverses.map((matrix) => matrix.clone()),
  ));
  const root = new Group();
  root.name = `Equipped_${scene.name}`;
  meshes.forEach((mesh, index) => {
    root.add(mesh);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.bind(skeletons[index], new Matrix4());
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  return root;
}

function avatarJoint(avatar, name) {
  const joint = avatar.getObjectByName(name);
  if (!joint) throw new Error(`The avatar is missing joint ${name}`);
  return joint;
}

function disposeWearable(root) {
  const resources = new Set();
  root.traverse((node) => {
    if (!node.isMesh) return;
    resources.add(node.geometry);
    if (node.skeleton) resources.add(node.skeleton);
    for (const material of [node.material].flat()) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose();
}
