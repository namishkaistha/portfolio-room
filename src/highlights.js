import * as THREE from "three";
import { requireNode } from "./meshHelpers.js";

const RING_INNER_MARGIN = 0.05;
const RING_THICKNESS = 0.1;
const RING_SEGMENTS = 48;
const RING_OPACITY = { idle: 0.1, active: 0.35 };
const RING_PULSE_SPEED = 1.4;
// The floor circles are drawn bolder than the room's other details so they
// read as "walk here", with a faint ring that keeps spreading out from them.
const RING_STYLE = { boost: 0.2, pulse: 0.06, widen: 1.4, fill: [0.04, 0.03] };
const RIPPLE = { seconds: 3.2, thickness: 0.03, growth: 0.28, opacity: 0.22 };
const GLOW_COLOR = new THREE.Color(0xffd9a3);
// Interactive furniture breathes very faintly at rest and warms up when the
// visitor hovers it or walks up to it; nothing extra is drawn in the room.
const GLOW = { idle: 0.035, focused: 0.16, breathSpeed: 0.9, easing: 0.12 };

export function installHighlights(roomGroup, hotspots) {
  const highlights = hotspots.map((spot, index) => createHighlight(roomGroup, spot, index));
  const pickable = highlights.flatMap((highlight) => [...highlight.meshes, highlight.ringMesh]);
  let hoveredId = null;
  let activeId = null;
  return {
    setActive(id) { activeId = id; },
    setHovered(id) { hoveredId = id; },
    clearGlow() {
      hoveredId = null;
      activeId = null;
      for (const highlight of highlights) highlight.clearGlow();
    },
    update(elapsedSeconds) {
      for (const highlight of highlights) highlight.tick(elapsedSeconds, highlight.id === activeId || highlight.id === hoveredId, highlight.id === activeId);
    },
    pick(raycaster) {
      const hit = raycaster.intersectObjects(pickable, false)[0];
      return hit ? hit.object.userData.hotspotId : null;
    },
  };
}

function createHighlight(roomGroup, spot, index) {
  const ring = createRing(roomGroup, spot);
  const meshes = collectMeshes(roomGroup, spot);
  const breathOffset = index * 1.3;
  let level = 0;
  return {
    id: spot.id,
    meshes,
    ringMesh: ring.mesh,
    clearGlow() {
      level = 0;
      for (const mesh of meshes) applyGlow(mesh, 0);
    },
    tick(elapsed, isFocused, isInRange) {
      ring.tick(elapsed, isInRange);
      const breath = GLOW.idle * (0.5 + 0.5 * Math.sin(elapsed * GLOW.breathSpeed + breathOffset));
      level += ((isFocused ? GLOW.focused : breath) - level) * GLOW.easing;
      for (const mesh of meshes) applyGlow(mesh, level);
    },
  };
}

function collectMeshes(roomGroup, spot) {
  const meshes = [];
  for (const name of spot.objects ?? []) {
    requireNode(roomGroup, name).traverse((child) => {
      if (!child.isMesh) return;
      if (!Array.isArray(child.material)) child.material = child.material.clone();
      child.userData.hotspotId = spot.id;
      meshes.push(child);
    });
  }
  return meshes;
}

// Materials can be swapped later (record sleeves get album art), so the glow
// is applied to whatever the mesh currently uses. Already-emissive surfaces
// such as screens keep their own glow.
function applyGlow(mesh, level) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!material.emissive) continue;
    if (material.userData.baseEmissive === undefined) material.userData.baseEmissive = material.emissive.getHex();
    if (material.userData.baseEmissive !== 0) continue;
    material.emissive.copy(GLOW_COLOR).multiplyScalar(level);
  }
}

// The floor circle in front of an object, the disc it encloses and a ring
// spreading out from it. Clicking the circle counts as
// clicking the object.
function createRing(scene, spot) {
  const outerRadius = spot.radius;
  const innerRadius = outerRadius - (spot.ringEmphasis?.thickness ?? RING_THICKNESS) * RING_STYLE.widen;
  const idleOpacity = (spot.ringEmphasis?.opacity ?? RING_OPACITY.idle) + RING_STYLE.boost;
  const { start, length } = spot.arc;
  const material = transparentMaterial(spot.color, idleOpacity);
  const ring = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, RING_SEGMENTS, 1, start, length), material);
  ring.userData.hotspotId = spot.id;
  const glowMaterial = transparentMaterial(spot.color, RING_STYLE.fill[0]);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(innerRadius - RING_INNER_MARGIN, RING_SEGMENTS, start, length), glowMaterial);
  const rippleMaterial = transparentMaterial(spot.color, 0);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(outerRadius - RIPPLE.thickness, outerRadius, RING_SEGMENTS, 1, start, length), rippleMaterial);
  for (const [mesh, height] of [[glow, 0.014], [ring, 0.015], [ripple, 0.016]]) {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(spot.trigger.x, height, spot.trigger.z);
    scene.add(mesh);
  }
  const [fillRest, fillSwing] = RING_STYLE.fill;
  return {
    mesh: ring,
    tick(elapsed, isActive) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * RING_PULSE_SPEED);
      material.opacity = isActive ? Math.max(RING_OPACITY.active, idleOpacity + 0.2) : idleOpacity + pulse * RING_STYLE.pulse;
      glowMaterial.opacity = isActive ? Math.max(0.14, fillRest + fillSwing) : fillRest + pulse * fillSwing;
      const spread = (elapsed / RIPPLE.seconds) % 1;
      ripple.scale.setScalar(1 + spread * RIPPLE.growth);
      rippleMaterial.opacity = isActive ? 0 : RIPPLE.opacity * (1 - spread);
    },
  };
}

function transparentMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
}
