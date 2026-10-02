import * as THREE from "three";

const RADIAL_SEGMENTS = 24;

export function addBox(group, material, { size, position, yaw = 0 }) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  box.position.set(...position);
  box.rotation.y = yaw;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);
  return box;
}

export function addCylinder(group, material, { radius, height, position }) {
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, RADIAL_SEGMENTS), material);
  cylinder.position.set(...position);
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  group.add(cylinder);
  return cylinder;
}

export function solid(color, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function glowing(color, intensity) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}
