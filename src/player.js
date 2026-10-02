import * as THREE from "three";
import { ROOM_SPAWN } from "./roomConfig.js";

const PLAYER_RADIUS = 0.18;
const WALK_SPEED = 1.75;
const FACING_TURN_RATE = 12;
const MIN_WALK_STEP_SQUARED = 1e-8;
const GLIDE_SECONDS = 0.7;

// Movement is world-relative so it stays independent of the camera and mouse.
export class Player {
  constructor(avatar) {
    this.avatar = avatar;
    this.position = ROOM_SPAWN.clone();
    this.facingYaw = 0;
    this.targetYaw = 0;
    this.keys = new Set();
    this.joystick = new THREE.Vector2();
    this.attached = false;
    this.isAtSpot = false;
    this.areControlsEnabled = true;
    this.glide = null;
    this.standingSpot = null;
    this.lying = null;
    this.syncAvatar();
  }

  async moveToSpot(spot) {
    this.isAtSpot = true;
    this.standingSpot = this.position.clone();
    await this.glideTo(spot.position, spot.yaw);
    this.avatar.play(spot.pose);
  }

  async returnFromSpot() {
    await this.glideTo(this.standingSpot, this.facingYaw);
    this.isAtSpot = false;
  }

  // Lies on its back at `position`, head toward the back wall (-Z).
  lieDown(position) {
    this.lying = position.clone();
    this.syncAvatar();
  }

  standUp() {
    this.lying = null;
    this.syncAvatar();
  }

  setVisible(isVisible) {
    this.avatar.root.visible = isVisible;
  }

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  setControlsEnabled(isEnabled) {
    this.areControlsEnabled = isEnabled;
  }

  setJoystick(x, y) {
    this.joystick.set(x, y);
  }

  advance(deltaSeconds, resolveMovement) {
    if (this.glide) this.advanceGlide(deltaSeconds);
    else if (!this.isAtSpot && this.areControlsEnabled) this.advanceWalking(deltaSeconds, resolveMovement);
    this.avatar.update(deltaSeconds);
  }

  glideTo(target, yaw, seconds = GLIDE_SECONDS) {
    return new Promise((resolve) => {
      this.glide = { from: this.position.clone(), to: target.clone(), fromYaw: this.facingYaw, turn: wrapAngle(yaw - this.facingYaw), seconds, elapsed: 0, resolve };
      this.avatar.play("Walk");
    });
  }

  advanceGlide(deltaSeconds) {
    const glide = this.glide;
    glide.elapsed += deltaSeconds;
    const progress = Math.min(1, glide.elapsed / glide.seconds);
    this.position.lerpVectors(glide.from, glide.to, progress);
    this.facingYaw = wrapAngle(glide.fromYaw + glide.turn * progress);
    this.targetYaw = this.facingYaw;
    this.syncAvatar();
    if (progress < 1) return;
    this.glide = null;
    this.avatar.play("Idle");
    glide.resolve();
  }

  advanceWalking(deltaSeconds, resolveMovement) {
    const intent = this.readMovementIntent();
    const desired = this.position.clone().addScaledVector(intent, WALK_SPEED * deltaSeconds);
    const resolved = resolveMovement(this.position, desired, PLAYER_RADIUS);
    const isWalking = resolved.distanceToSquared(this.position) > MIN_WALK_STEP_SQUARED;
    this.position.set(resolved.x, 0, resolved.z);
    if (intent.lengthSq() > 0) this.targetYaw = Math.atan2(intent.x, intent.z);
    this.easeFacing(deltaSeconds);
    this.syncAvatar();
    this.avatar.play(isWalking ? "Walk" : "Idle");
  }

  readMovementIntent() {
    const strafe = this.keyAxis("KeyD", "KeyA", "ArrowRight", "ArrowLeft") + this.joystick.x;
    const south = this.keyAxis("KeyS", "KeyW", "ArrowDown", "ArrowUp") - this.joystick.y;
    const intent = new THREE.Vector3(strafe, 0, south);
    if (intent.lengthSq() > 1) intent.normalize();
    return intent;
  }

  keyAxis(positiveA, negativeA, positiveB, negativeB) {
    let value = 0;
    if (this.keys.has(positiveA) || this.keys.has(positiveB)) value += 1;
    if (this.keys.has(negativeA) || this.keys.has(negativeB)) value -= 1;
    return value;
  }

  easeFacing(deltaSeconds) {
    const delta = wrapAngle(this.targetYaw - this.facingYaw);
    const step = Math.sign(delta) * Math.min(Math.abs(delta), FACING_TURN_RATE * deltaSeconds);
    this.facingYaw = wrapAngle(this.facingYaw + step);
  }

  syncAvatar() {
    if (this.lying) {
      this.avatar.root.position.copy(this.lying);
      this.avatar.root.rotation.set(-Math.PI / 2, 0, 0);
      return;
    }
    this.avatar.root.position.set(this.position.x, 0, this.position.z);
    this.avatar.root.rotation.set(0, this.facingYaw, 0);
  }

  onKeyDown = (event) => { this.keys.add(event.code); };
  onKeyUp = (event) => { this.keys.delete(event.code); };
}

function wrapAngle(angle) {
  const TAU = Math.PI * 2;
  return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
}
