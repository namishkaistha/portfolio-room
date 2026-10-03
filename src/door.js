import * as THREE from "three";
import { easeOutCubic } from "./motion.js";
import { pointerToDevice } from "./dom.js";

const OPEN_ANGLE = -Math.PI / 2 + 0.05;
const OPEN_DURATION = 1.15;

export class DoorController {
  constructor(pivot, camera, canvas) {
    this.pivot = pivot;
    this.camera = camera;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.state = "idle";
    this.progress = 0;
    this.onStart = null;
    this.onClosed = null;
    this.hitTargets = [];
    pivot.traverse((child) => {
      if (child.isMesh) this.hitTargets.push(child);
    });
  }

  attach() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
  }

  detach() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
  }

  tryOpen() {
    if (this.state !== "idle") return false;
    this.state = "opening";
    this.progress = 0;
    this.onStart?.();
    return true;
  }

  close() {
    this.state = "closing";
    return new Promise((resolve) => {
      this.onClosed = resolve;
    });
  }

  update(delta) {
    if (this.state === "opening") this.advanceOpening(delta);
    else if (this.state === "closing") this.advanceClosing(delta);
  }

  advanceOpening(delta) {
    this.progress = Math.min(1, this.progress + delta / OPEN_DURATION);
    this.pivot.rotation.y = OPEN_ANGLE * easeOutCubic(this.progress);
    if (this.progress >= 1) this.state = "opened";
  }

  advanceClosing(delta) {
    this.progress = Math.max(0, this.progress - delta / OPEN_DURATION);
    this.pivot.rotation.y = OPEN_ANGLE * easeOutCubic(this.progress);
    if (this.progress > 0) return;
    this.state = "idle";
    const onClosed = this.onClosed;
    this.onClosed = null;
    onClosed?.();
  }

  onPointerMove = (event) => {
    if (this.state !== "idle") return;
    if (!this.updatePointer(event)) return;
    const hit = this.raycastDoor();
    this.canvas.style.cursor = hit ? "pointer" : "";
  };

  onPointerDown = (event) => {
    if (this.state !== "idle") return;
    if (!this.updatePointer(event)) return;
    if (!this.raycastDoor()) return;
    event.preventDefault();
    this.tryOpen();
  };

  updatePointer(event) {
    if (this.canvas.clientWidth === 0 || this.canvas.clientHeight === 0) return false;
    const { x, y } = pointerToDevice(event, this.canvas);
    this.pointer.set(x, y);
    return true;
  }

  raycastDoor() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitTargets, false);
    return hits.length > 0;
  }
}
