import * as THREE from "three";
import { buildScene, installLights } from "./world.js";
import { DoorController } from "./door.js";
import { Player } from "./player.js";
import { Joystick } from "./joystick.js";
import { HOTSPOTS, findActiveHotspot } from "./hotspots.js";
import { installHighlights } from "./highlights.js";
import { createStations, wireStations } from "./stations.js";
import { installCloset } from "./closetPanel.js";
import { hideListeningStatus, showListeningStatus } from "./listeningStatus.js";
import { hideRecordPlayer, resumeRecordPlayer, showRecordPlayer } from "./recordPlayer.js";
import { updateRecordShelf } from "./recordShelf.js";
import { updateBookPull } from "./bookPull.js";
import { typeIntroMessage } from "./introText.js";
import { isMuted, setMuted, unlockAudio, updateFootsteps } from "./sfx.js";
import { CameraDirector } from "./cameraDirector.js";
import { easeInOutCubic } from "./motion.js";
import { isTouchDevice, pointerToDevice } from "./dom.js";
import {
  CAMERA_INTRO_LOOK,
  CAMERA_LOOK_TARGET,
  CAMERA_ROOM_ENTRY,
  CAMERA_START,
  ENTRY_LOOK_CONTROL,
  ENTRY_PATH_CONTROLS,
  ROOM,
  ROOM_SPAWN,
} from "./roomConfig.js";

const CAMERA_TRAVEL_SECONDS = 3.4;
const CONTROLS_FADE_DELAY_MS = 5400;
const CONTROLS_HIDE_DELAY_MS = 6400;
const SHOULDER_SHOT_SECONDS = 1.3;
const CLOSE_UP_SECONDS = 0.7;
const RETURN_TO_OVERHEAD_SECONDS = 1.2;
const WALL_RESTORE_CLEARANCE = 0.3;
const FACING_DOOR = 0;
const FACING_INTO_ROOM = Math.PI;
const SEE_OFF_WALK_SECONDS = 1.3;
const SEE_OFF_TURN_SECONDS = 0.5;
// Widest aspect ratio at which the whole room still fits the overhead shot.
const OVERHEAD_FIT_ASPECT = 0.68;

const stage = { current: "loading" };
const cameraTravel = { elapsed: 0, path: null, lookPath: null, onFrame: null, onArrive: null };

const canvas = document.getElementById("scene");
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
const clock = new THREE.Clock();
const director = new CameraDirector(camera, CAMERA_LOOK_TARGET);
const hasTouch = isTouchDevice();

let player = null;
let door = null;
let joystick = null;
let highlights = null;
let roomGroup = null;
let frontWall = null;
let roomMixer = null;
let activeHotspot = null;
let closetDoors = null;
let stations = null;
// The station being visited: { station, isCancelled, finished }.
let visit = null;

bootstrap();

async function bootstrap() {
  window.addEventListener("resize", resizeToViewport);
  resizeToViewport();

  const { doorGroup, closetDoors: doors, roomGroup: room, frontWall: wall, avatar, roomMixer: mixer, collider } = await buildScene(scene);
  roomGroup = room;
  frontWall = wall;
  closetDoors = doors;
  roomMixer = mixer;
  player = new Player(avatar, collider);
  stations = createStations({ player, closetDoors });
  installCloset(avatar.root);
  installLights(scene);
  highlights = installHighlights(roomGroup, HOTSPOTS);

  door = new DoorController(doorGroup, camera, canvas);
  door.attach();
  door.onStart = onDoorOpenStart;
  applyIntroCameraPullback();

  hideRoomForIntro();
  wireInteraction();
  wireMenu();
  wireSoundEffects();
  wireMobile();
  wireStations();

  finishLoading();
  presentDoorIntro();
  renderer.setAnimationLoop(step);
}

// What each stage moves forward every frame, on top of the room's own
// animations below.
const STAGE_UPDATES = {
  loading: () => {},
  door: (delta) => door.update(delta),
  entering: (delta) => {
    door.update(delta);
    advanceCameraTravel(delta);
    player.advance(delta);
  },
  room: (delta, elapsed) => {
    player.advance(delta);
    updateFootsteps(player.position);
    refreshHotspotUi();
    highlights.update(elapsed);
  },
  leaving: (delta) => {
    advanceCameraTravel(delta);
    player.advance(delta);
  },
  seated: (delta) => {
    player.advance(delta);
    updateFootsteps(player.position);
    director.update(delta);
  },
};

function step() {
  const delta = clock.getDelta();
  STAGE_UPDATES[stage.current](delta, clock.getElapsedTime());
  roomMixer.update(delta);
  closetDoors.update(delta);
  updateRecordShelf(delta);
  updateBookPull(delta);
  // The globe overlay is opaque, so skip drawing the room underneath it.
  if (!stations.travel.isOpen()) renderer.render(scene, camera);
}

function hideRoomForIntro() {
  roomGroup.visible = false;
}

function revealRoomBehindDoor() {
  roomGroup.visible = true;
}

function presentDoorIntro() {
  setStage("door");
  const intro = document.getElementById("doorIntro");
  const textNode = document.getElementById("dialogText");
  if (!intro || !textNode) return;
  intro.classList.remove("hidden");
  typeIntroMessage(textNode);
}

function onDoorOpenStart() {
  revealRoomBehindDoor();
  dismissDoorIntro();
  setStage("entering");
  startCameraTravel({
    path: new THREE.CubicBezierCurve3(camera.position.clone(), ...ENTRY_PATH_CONTROLS, overheadView().position),
    lookPath: new THREE.QuadraticBezierCurve3(CAMERA_INTRO_LOOK, ENTRY_LOOK_CONTROL, CAMERA_LOOK_TARGET),
    onFrame: cutAwayWallOnceInside,
    onArrive: enterRoom,
  });
}

function dismissDoorIntro() {
  document.getElementById("doorIntro")?.classList.add("hidden");
}

function startCameraTravel({ path, lookPath, onFrame, onArrive }) {
  Object.assign(cameraTravel, { elapsed: 0, path, lookPath, onFrame, onArrive });
}

function advanceCameraTravel(delta) {
  cameraTravel.elapsed += delta;
  const t = Math.min(1, cameraTravel.elapsed / CAMERA_TRAVEL_SECONDS);
  const eased = easeInOutCubic(t);
  camera.position.copy(cameraTravel.path.getPoint(eased));
  camera.lookAt(cameraTravel.lookPath.getPoint(eased));
  cameraTravel.onFrame(t);
  if (t >= 1) cameraTravel.onArrive();
}

function cutAwayWallOnceInside() {
  if (camera.position.z < ROOM.maxZ) cutAwayFrontWall();
}

// The exit path starts high above the wall too, so only restore the wall once
// the camera has come back out through the doorway in the second half.
function restoreWallOncePastDoorway(t) {
  if (t > 0.5 && camera.position.z > ROOM.maxZ + WALL_RESTORE_CLEARANCE) restoreFrontWall();
}

function leaveRoom() {
  setStage("leaving");
  clearHotspotUi();
  hideRoomHud();
  hideRecordPlayer();
  hideListeningStatus();
  player.setControlsEnabled(false);
  seeVisitorOut();
  startCameraTravel({
    path: new THREE.CubicBezierCurve3(camera.position.clone(), ENTRY_PATH_CONTROLS[1], ENTRY_PATH_CONTROLS[0], introCameraPosition()),
    lookPath: new THREE.QuadraticBezierCurve3(CAMERA_LOOK_TARGET, ENTRY_LOOK_CONTROL, CAMERA_INTRO_LOOK),
    onFrame: restoreWallOncePastDoorway,
    onArrive: finishLeaving,
  });
}

// Namish walks back to where he greeted the visitor and turns to see them off.
async function seeVisitorOut() {
  await player.glideTo(ROOM_SPAWN, FACING_INTO_ROOM, SEE_OFF_WALK_SECONDS);
  await player.glideTo(ROOM_SPAWN, FACING_DOOR, SEE_OFF_TURN_SECONDS);
}

async function finishLeaving() {
  setStage("door");
  await door.close();
  hideRoomForIntro();
  door.attach();
  presentDoorIntro();
}

function hideRoomHud() {
  for (const id of ["hud", "mobileControls", "controlsToast"]) document.getElementById(id)?.classList.add("hidden");
}

function enterRoom() {
  setStage("room");
  player.attach();
  player.setControlsEnabled(true);
  door.detach();
  canvas.style.cursor = "";

  document.getElementById("hud")?.classList.remove("hidden");
  showListeningStatus();
  showRecordPlayer();
  showControlsToast();
}

function cutAwayFrontWall() {
  frontWall.visible = false;
  door.pivot.visible = false;
}

function restoreFrontWall() {
  frontWall.visible = true;
  door.pivot.visible = true;
}

function showControlsToast() {
  const controls = document.getElementById("controlsToast");
  if (!controls) return;
  controls.classList.remove("hidden");
  controls.classList.remove("fading");
  window.setTimeout(() => controls.classList.add("fading"), CONTROLS_FADE_DELAY_MS);
  window.setTimeout(() => controls.classList.add("hidden"), CONTROLS_HIDE_DELAY_MS);
}

function refreshHotspotUi() {
  const next = findActiveHotspot(player.position);
  if (next === activeHotspot) return;
  activeHotspot = next;
  setPrompt(next);
  highlights.setActive(next?.id ?? null);
}

function dismissOpenStation() {
  if (visit?.station.isOpen()) visit.station.dismiss();
}

function clearHotspotUi() {
  activeHotspot = null;
  setPrompt(null);
  highlights.clearGlow();
}

function setPrompt(hotspot) {
  const prompt = document.getElementById("prompt");
  const action = document.getElementById("actionBtn");
  if (!prompt || !action) return;
  if (!hotspot) {
    prompt.classList.add("hidden");
    action.classList.remove("armed");
    action.dataset.target = "";
    return;
  }
  prompt.classList.remove("hidden");
  prompt.querySelector(".prompt-label").textContent = hotspot.promptLabel;
  action.classList.add("armed");
  action.dataset.target = hotspot.id;
}

// Interactive furniture is clickable: hovering warms it, clicking opens that spot.
function wireObjectClicks() {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickObject = (event) => {
    const { x, y } = pointerToDevice(event, canvas);
    raycaster.setFromCamera(pointer.set(x, y), camera);
    return highlights.pick(raycaster);
  };
  canvas.addEventListener("pointermove", (event) => {
    if (stage.current !== "room") return;
    const id = pickObject(event);
    highlights.setHovered(id);
    canvas.style.cursor = id ? "pointer" : "";
  });
  canvas.addEventListener("pointerleave", () => highlights.setHovered(null));
  canvas.addEventListener("click", (event) => {
    if (stage.current !== "room") return;
    const id = pickObject(event);
    if (!id) return;
    canvas.style.cursor = "";
    highlights.setHovered(null);
    openHotspotView(id);
  });
}

function wireInteraction() {
  wireObjectClicks();
  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      dismissOpenStation();
      return;
    }
    if (stage.current !== "room") return;
    if ((event.code === "Space" || event.code === "KeyE") && activeHotspot) {
      event.preventDefault();
      openHotspotView(activeHotspot.id);
    }
  });
  document.getElementById("prompt")?.addEventListener("click", () => {
    if (stage.current === "room" && activeHotspot) openHotspotView(activeHotspot.id);
  });
}

function openHotspotView(id) {
  if (stage.current !== "room") return;
  if (id === "door") {
    leaveRoom();
    return;
  }
  const current = { station: stations[id], isCancelled: false };
  current.finished = visitStation(current);
  visit = current;
}

// Walks up to the station, opens it, and once the visitor closes it, steps
// back out to the overhead view. Music the station paused picks back up.
async function visitStation(current) {
  const { station } = current;
  setStage("seated");
  clearHotspotUi();
  station.approach?.();
  if (station.spot) await approachSpot(station.spot);
  if (!current.isCancelled) await station.open();
  resumeRecordPlayer();
  if (station.spot) await leaveSpot();
  setStage("room");
  visit = null;
}

async function approachSpot(spot) {
  await Promise.all([player.moveToSpot(spot), director.flyTo(spot.shoulderView, SHOULDER_SHOT_SECONDS)]);
  await director.flyTo(spot.closeUpView, CLOSE_UP_SECONDS);
}

async function leaveSpot() {
  await Promise.all([player.returnFromSpot(), director.flyTo(overheadView(), RETURN_TO_OVERHEAD_SECONDS)]);
}

// Picking a station while visiting another closes that one, waits for the
// camera to come back, then opens the new one.
async function openStationFromMenu(target) {
  if (visit) {
    visit.isCancelled = true;
    visit.station.close();
    await visit.finished;
  }
  openHotspotView(target);
}

function wireMenu() {
  const menu = document.getElementById("menu");
  document.getElementById("menuBtn")?.addEventListener("click", () => {
    menu?.classList.remove("hidden");
  });
  document.getElementById("menuClose")?.addEventListener("click", () => {
    menu?.classList.add("hidden");
  });
  menu?.querySelectorAll(".menu-item").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-target");
      if (!target) return;
      menu.classList.add("hidden");
      openStationFromMenu(target);
    });
  });
}

function wireSoundEffects() {
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  const toggle = document.getElementById("sfxToggle");
  const showState = () => { toggle.textContent = `Sound effects · ${isMuted() ? "off" : "on"}`; };
  toggle?.addEventListener("click", () => {
    setMuted(!isMuted());
    showState();
  });
  if (toggle) showState();
}

function wireMobile() {
  if (!hasTouch) return;
  const base = document.getElementById("joystick");
  const knob = document.getElementById("joyKnob");
  if (base && knob) {
    joystick = new Joystick(base, knob, (x, y) => player.setJoystick(x, y));
    joystick.attach();
  }
  document.getElementById("actionBtn")?.addEventListener("touchend", (event) => {
    event.preventDefault();
    if (activeHotspot) openHotspotView(activeHotspot.id);
  });
}

function finishLoading() {
  document.getElementById("loading")?.classList.add("hidden");
}

function resizeToViewport() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  applyIntroCameraPullback();
  refitOverheadCamera();
}

function refitOverheadCamera() {
  if (stage.current !== "room") return;
  camera.position.copy(overheadView().position);
  camera.lookAt(CAMERA_LOOK_TARGET);
}

// Tall, narrow screens see less of the room sideways, so the overhead shot
// climbs until the walls fit. Its depth stays put so it still clears the
// front wall that is cut away on entry.
function overheadView() {
  const stretch = Math.max(1, OVERHEAD_FIT_ASPECT / camera.aspect);
  const offset = CAMERA_ROOM_ENTRY.clone().sub(CAMERA_LOOK_TARGET);
  const distance = offset.length() * stretch;
  const height = Math.sqrt(Math.max(distance ** 2 - offset.z ** 2, 0));
  const position = new THREE.Vector3(CAMERA_ROOM_ENTRY.x, CAMERA_LOOK_TARGET.y + height, CAMERA_ROOM_ENTRY.z);
  return { position, look: CAMERA_LOOK_TARGET };
}

// Touch controls show only while walking around the room.
function setStage(next) {
  stage.current = next;
  if (hasTouch) document.getElementById("mobileControls")?.classList.toggle("hidden", next !== "room");
}

function applyIntroCameraPullback() {
  if (stage.current !== "door" && stage.current !== "loading") return;
  camera.position.copy(introCameraPosition());
  camera.lookAt(CAMERA_INTRO_LOOK);
}

// Narrow portrait screens pull the hallway shot back so the whole door fits.
function introCameraPosition() {
  const extraDistance = camera.aspect < 0.9 ? (0.9 - camera.aspect) * 8 : 0;
  return CAMERA_START.clone().add(new THREE.Vector3(0, 0, extraDistance));
}

function createRenderer(target) {
  const instance = new THREE.WebGLRenderer({
    canvas: target,
    antialias: true,
    powerPreference: "high-performance",
  });
  instance.outputColorSpace = THREE.SRGBColorSpace;
  instance.toneMapping = THREE.ACESFilmicToneMapping;
  instance.toneMappingExposure = 1.05;
  instance.localClippingEnabled = true;
  instance.shadowMap.enabled = true;
  instance.shadowMap.type = THREE.PCFSoftShadowMap;
  return instance;
}
