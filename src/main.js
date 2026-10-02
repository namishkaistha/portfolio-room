import * as THREE from "three";
import { buildScene, installLights, resolveMovement } from "./world.js";
import { DoorController } from "./door.js";
import { Player } from "./player.js";
import { Joystick } from "./joystick.js";
import { HOTSPOTS, findActiveHotspot } from "./hotspots.js";
import { installHighlights } from "./highlights.js";
import { dismissTravelLayer, isTravelGlobeOpen, openTravelGlobe, wireTravelGlobe } from "./travelGlobe.js";
import { closeIDE, dismissIDELayer, isIDEOpen, openIDE } from "./ide.js";
import { closeIframePanel, isIframePanelOpen, openIframePanel } from "./iframePanel.js";
import { closeAboutCard, isAboutCardOpen, openAboutCard } from "./aboutCard.js";
import { closeNotesPanel, isNotesPanelOpen, openNotesPanel, wireNotesPanel } from "./notesPanel.js";
import { hideNowPlaying, mountNowPlaying, pausePlayback, resumePlayback, revealNowPlaying, startPlayback } from "./nowPlaying.js";
import { closeCrateDigging, isCrateDiggingOpen, openCrateDigging, updateRecordShelf, wireCrateDigging } from "./crateDigging.js";
import { closeBookReader, isBookReaderOpen, openBookReader, wireBookReader } from "./bookReader.js";
import { pullBookOut, pushBookBack, updateBookPull } from "./bookPull.js";
import { typeIntroMessage } from "./introText.js";
import { isMuted, setMuted, unlockAudio, updateFootsteps } from "./sfx.js";
import { CameraDirector, easeInOutCubic } from "./cameraDirector.js";
import {
  CAMERA_INTRO_LOOK,
  CAMERA_LOOK_TARGET,
  CAMERA_ROOM_ENTRY,
  CAMERA_START,
  ENTRY_LOOK_CONTROL,
  DOOR,
  ENTRY_PATH_CONTROLS,
  ROOM,
  ROOM_SPAWN,
  SPOTS,
} from "./roomConfig.js";

const CAMERA_TRAVEL_SECONDS = 3.4;
const CONTROLS_FADE_DELAY_MS = 5400;
const CONTROLS_HIDE_DELAY_MS = 6400;
const SHOULDER_SHOT_SECONDS = 1.3;
const CLOSE_UP_SECONDS = 0.7;
const RETURN_TO_OVERHEAD_SECONDS = 1.2;
const DOORWAY_TRIGGER_DEPTH = 0.35;
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
let wasModalOpen = false;

bootstrap();

async function bootstrap() {
  window.addEventListener("resize", resizeToViewport);
  resizeToViewport();

  const { doorGroup, roomGroup: room, frontWall: wall, avatar, roomMixer: mixer } = await buildScene(scene);
  roomGroup = room;
  frontWall = wall;
  roomMixer = mixer;
  player = new Player(avatar);
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
  wirePanelDismissal();
  wireTravelGlobe();
  wireCrateDigging();
  wireBookReader();
  wireNotesPanel();

  mountNowPlaying();
  finishLoading();
  presentDoorIntro();
  renderer.setAnimationLoop(step);
}

function step() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (stage.current === "door") {
    door.update(delta);
  } else if (stage.current === "entering") {
    door.update(delta);
    advanceCameraTravel(delta);
    player.advance(delta, resolveMovement);
  } else if (stage.current === "room") {
    player.advance(delta, resolveMovement);
    updateFootsteps(player.position);
    syncMobileControls();
    resumeMusicWhenStationCloses();
    refreshHotspotUi();
    highlights.update(elapsed);
    if (isInDoorway(player.position)) leaveRoom();
  } else if (stage.current === "leaving") {
    advanceCameraTravel(delta);
    player.advance(delta, resolveMovement);
  } else if (stage.current === "seated") {
    player.advance(delta, resolveMovement);
    updateFootsteps(player.position);
    syncMobileControls();
    resumeMusicWhenStationCloses();
    director.update(delta);
  }

  roomMixer.update(delta);
  updateRecordShelf(delta);
  updateBookPull(delta);
  // The globe overlay is opaque, so skip drawing the room underneath it.
  if (!isTravelGlobeOpen()) renderer.render(scene, camera);
}

function hideRoomForIntro() {
  roomGroup.visible = false;
}

function revealRoomBehindDoor() {
  roomGroup.visible = true;
}

function presentDoorIntro() {
  stage.current = "door";
  const intro = document.getElementById("doorIntro");
  const textNode = document.getElementById("dialogText");
  if (!intro || !textNode) return;
  intro.classList.remove("hidden");
  typeIntroMessage(textNode);
}

function onDoorOpenStart() {
  startPlayback();
  revealRoomBehindDoor();
  dismissDoorIntro();
  stage.current = "entering";
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

function isInDoorway(position) {
  return position.z > ROOM.maxZ - DOORWAY_TRIGGER_DEPTH && Math.abs(position.x - DOOR.centerX) < DOOR.width / 2;
}

function leaveRoom() {
  stage.current = "leaving";
  setPrompt(null);
  highlights.clearGlow();
  hideRoomHud();
  pausePlayback();
  hideNowPlaying();
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
  stage.current = "door";
  await door.close();
  hideRoomForIntro();
  door.attach();
  presentDoorIntro();
}

function hideRoomHud() {
  for (const id of ["hud", "mobileControls", "controlsToast"]) document.getElementById(id)?.classList.add("hidden");
}

function enterRoom() {
  stage.current = "room";
  player.attach();
  player.setControlsEnabled(true);
  door.detach();
  canvas.style.cursor = "";

  document.getElementById("hud")?.classList.remove("hidden");
  revealNowPlaying();
  showControlsToast();

  if (isTouchDevice()) {
    document.getElementById("mobileControls")?.classList.remove("hidden");
  }
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

function resumeMusicWhenStationCloses() {
  const isOpen = isModalOpen();
  if (wasModalOpen && !isOpen) resumePlayback();
  wasModalOpen = isOpen;
}

function refreshHotspotUi() {
  if (isModalOpen()) {
    setPrompt(null);
    highlights.setActive(null);
    activeHotspot = null;
    return;
  }
  const next = findActiveHotspot(player.position);
  activeHotspot = next;
  setPrompt(next);
  highlights.setActive(next?.id ?? null);
}

function closeOpenModal() {
  if (isTravelGlobeOpen()) dismissTravelLayer();
  else if (isIDEOpen()) dismissIDELayer();
  else if (isIframePanelOpen()) closeIframePanel();
  else if (isCrateDiggingOpen()) closeCrateDigging();
  else if (isBookReaderOpen()) closeBookReader();
  else if (isAboutCardOpen()) closeAboutCard();
  else if (isNotesPanelOpen()) closeNotesPanel();
}

function isModalOpen() {
  return isTravelGlobeOpen() || isIDEOpen() || isIframePanelOpen() || isCrateDiggingOpen() || isBookReaderOpen() || isAboutCardOpen() || isNotesPanelOpen();
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
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return highlights.pick(raycaster);
  };
  canvas.addEventListener("pointermove", (event) => {
    if (stage.current !== "room" || isModalOpen()) return;
    const id = pickObject(event);
    highlights.setHovered(id);
    canvas.style.cursor = id ? "pointer" : "";
  });
  canvas.addEventListener("pointerleave", () => highlights.setHovered(null));
  canvas.addEventListener("click", (event) => {
    if (stage.current !== "room" || isModalOpen()) return;
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
      closeOpenModal();
      return;
    }
    if (stage.current !== "room") return;
    if ((event.code === "Space" || event.code === "KeyE") && activeHotspot && !isModalOpen()) {
      event.preventDefault();
      openHotspotView(activeHotspot.id);
    }
  });
  document.getElementById("prompt")?.addEventListener("click", () => {
    if (activeHotspot && !isModalOpen()) openHotspotView(activeHotspot.id);
  });
}

function openHotspotView(id) {
  if (id === "laptop") {
    visitSpotAndOpen(SPOTS.laptop, (onExit) => openIDE({ onExit }));
    return;
  }
  if (id === "about") {
    visitSpotAndOpen(SPOTS.about, (onExit) => openAboutCard({ onExit }));
    return;
  }
  if (id === "notes") {
    visitSpotAndOpen(SPOTS.notes, (onExit) => openNotesPanel({ onExit }));
    return;
  }
  if (id === "tripod") {
    visitSpotAndOpen(SPOTS.tripod, (onExit) => openIframePanel("tripod", { onExit }));
    return;
  }
  if (id === "vinyl") {
    visitSpotAndOpen(SPOTS.vinyl, (onExit) => openCrateDigging({ onExit }));
    return;
  }
  if (id === "library") {
    visitSpotAndOpen(SPOTS.library, openReadingList);
    return;
  }
  if (id === "travel") openTravelGlobe();
}

async function visitSpotAndOpen(spot, openPanelView) {
  if (stage.current !== "room") return;
  stage.current = "seated";
  setPrompt(null);
  highlights.clearGlow();
  await Promise.all([player.moveToSpot(spot), director.flyTo(spot.shoulderView, SHOULDER_SHOT_SECONDS)]);
  await director.flyTo(spot.closeUpView, CLOSE_UP_SECONDS);
  openPanelView(leaveSpot);
}

async function openReadingList(onExit) {
  await pullBookOut();
  openBookReader({
    onExit: () => {
      pushBookBack();
      onExit();
    },
  });
}

async function leaveSpot() {
  await Promise.all([player.returnFromSpot(), director.flyTo(overheadView(), RETURN_TO_OVERHEAD_SECONDS)]);
  stage.current = "room";
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
      openHotspotView(target);
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
  if (!isTouchDevice()) return;
  const base = document.getElementById("joystick");
  const knob = document.getElementById("joyKnob");
  if (base && knob) {
    joystick = new Joystick(base, knob, (x, y) => player.setJoystick(x, y));
    joystick.attach();
  }
  document.getElementById("actionBtn")?.addEventListener("touchend", (event) => {
    event.preventDefault();
    if (stage.current !== "room") return;
    if (activeHotspot && !isModalOpen()) openHotspotView(activeHotspot.id);
  });
}

function wirePanelDismissal() {
  document.getElementById("ideClose")?.addEventListener("click", closeIDE);
  document.getElementById("iframeClose")?.addEventListener("click", closeIframePanel);
  closeOnBackdropClick("idePanel", dismissIDELayer);
  closeOnBackdropClick("iframePanel", closeIframePanel);
  closeOnBackdropClick("bookReader", closeBookReader);
  closeOnBackdropClick("notesPanel", closeNotesPanel);
}

// Tapping the dimmed area around a station's window steps back out of it.
function closeOnBackdropClick(id, close) {
  const backdrop = document.getElementById(id);
  backdrop?.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
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

function syncMobileControls() {
  if (!hasTouch) return;
  document.getElementById("mobileControls")?.classList.toggle("hidden", stage.current === "seated" || isModalOpen());
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
  instance.shadowMap.enabled = true;
  instance.shadowMap.type = THREE.PCFSoftShadowMap;
  return instance;
}

function isTouchDevice() {
  return matchMedia("(hover: none)").matches || "ontouchstart" in window;
}
