import * as THREE from "three";
import { playTrackNow } from "./nowPlaying.js";
import { approach, smoothstep } from "./motion.js";
import { playRecordPull } from "./sfx.js";

const TOP_TRACKS_ENDPOINT = "/api/top-tracks";
const LOADING_MESSAGE = "Pulling records…";
const ERROR_MESSAGE = "Couldn't reach Spotify. Try again in a bit.";

// The middle of the stand's upper shelf row is cleared to hold the top 10;
// the GLB's other sleeves stay on either side as the rest of the collection.
const CLEARED_SLEEVE_NAMES = ["Music_Book_1_3", "Music_Book_1_4", "Music_Book_1_5"];
const RECORD_COUNT = 10;
const SLEEVE = { thickness: 0.021, size: 0.3, depth: 0.27, gap: 0.002 };
const SHELF = { firstX: -1.63, bottomY: 0.37, centerZ: -1.695 };
const PULL = { distance: 0.32, lift: 0.04, coverTurn: -1.35, slideShare: 0.6, speed: 2.6 };
const CARDBOARD_COLOR = 0xd9cdb8;

const state = {
  records: [],
  tracks: null,
  focusedIndex: 0,
  playingUri: null,
  isOpen: false,
  onExit: null,
};

export function installRecordShelf(roomGroup) {
  for (const name of CLEARED_SLEEVE_NAMES) roomGroup.getObjectByName(name)?.removeFromParent();
  const shelf = new THREE.Group();
  shelf.name = "TOP_TEN_SHELF";
  for (let index = 0; index < RECORD_COUNT; index += 1) {
    const record = buildRecord(index);
    state.records.push(record);
    shelf.add(record.pivot);
  }
  roomGroup.add(shelf);
  loadTopTracks();
}

export function updateRecordShelf(deltaSeconds) {
  state.records.forEach((record, index) => {
    const target = state.isOpen && index === state.focusedIndex ? 1 : 0;
    record.pull = approach(record.pull, target, PULL.speed * deltaSeconds);
    poseRecord(record);
  });
}

export function openCrateDigging({ onExit } = {}) {
  state.onExit = onExit ?? null;
  state.isOpen = true;
  element("crateHud").classList.remove("hidden");
  window.addEventListener("keydown", onDiggingKeyDown);
  setTimeout(() => window.addEventListener("click", onOutsideClick), 0);
  renderHud();
}

export function closeCrateDigging() {
  state.isOpen = false;
  element("crateHud").classList.add("hidden");
  window.removeEventListener("keydown", onDiggingKeyDown);
  window.removeEventListener("click", onOutsideClick);
  const callback = state.onExit;
  state.onExit = null;
  callback?.();
}

export function isCrateDiggingOpen() {
  return state.isOpen;
}

export function wireCrateDigging() {
  element("crateClose").addEventListener("click", closeCrateDigging);
  element("cratePrev").addEventListener("click", () => focusRecord(state.focusedIndex - 1));
  element("crateNext").addEventListener("click", () => focusRecord(state.focusedIndex + 1));
  element("cratePlay").addEventListener("click", playFocusedRecord);
}

function buildRecord(index) {
  const cardboard = new THREE.MeshStandardMaterial({ color: CARDBOARD_COLOR, roughness: 0.85 });
  const geometry = new THREE.BoxGeometry(SLEEVE.thickness, SLEEVE.size, SLEEVE.depth);
  const mesh = new THREE.Mesh(geometry, Array(6).fill(cardboard));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const pivot = new THREE.Group();
  const base = new THREE.Vector3(
    SHELF.firstX + index * (SLEEVE.thickness + SLEEVE.gap) + SLEEVE.thickness / 2,
    SHELF.bottomY + SLEEVE.size / 2,
    SHELF.centerZ,
  );
  pivot.position.copy(base);
  pivot.add(mesh);
  return { pivot, mesh, base, pull: 0 };
}

// Pull is 0 (shelved) to 1 (out and turned toward the viewer): the record
// slides straight out first, then turns, so it never cuts through its neighbours.
function poseRecord(record) {
  const slide = smoothstep(Math.min(record.pull / PULL.slideShare, 1));
  const turn = smoothstep(Math.max((record.pull - PULL.slideShare) / (1 - PULL.slideShare), 0));
  record.pivot.position.set(record.base.x, record.base.y + PULL.lift * slide, record.base.z + PULL.distance * slide);
  record.pivot.rotation.y = PULL.coverTurn * turn;
}

async function loadTopTracks() {
  const response = await fetch(TOP_TRACKS_ENDPOINT);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (!response.ok || !isJson) {
    state.tracks = [];
    renderHud();
    return;
  }
  const { tracks } = await response.json();
  state.tracks = tracks.slice(0, RECORD_COUNT).map((track, index) => ({ ...track, rank: index + 1 }));
  state.tracks.forEach((track, index) => wrapSleeve(state.records[index], track));
  renderHud();
}

function wrapSleeve(record, track) {
  if (!track.albumArt) return;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const cover = loader.load(track.albumArt);
  cover.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.7 });
  const [, , top, bottom, , back] = record.mesh.material;
  record.mesh.material = [art, art, top, bottom, art, back];
}

function focusRecord(index) {
  if (!state.tracks?.length) return;
  const previousIndex = state.focusedIndex;
  state.focusedIndex = Math.max(0, Math.min(state.tracks.length - 1, index));
  if (state.focusedIndex !== previousIndex) playRecordPull();
  renderHud();
}

function playFocusedRecord() {
  const track = state.tracks?.[state.focusedIndex];
  if (!track) return;
  state.playingUri = track.uri;
  playTrackNow({ ...track, source: "top" });
  renderHud();
}

function renderHud() {
  if (state.tracks === null) {
    setStatus(LOADING_MESSAGE);
    return;
  }
  if (state.tracks.length === 0) {
    setStatus(ERROR_MESSAGE);
    return;
  }
  setStatus("");
  const track = state.tracks[state.focusedIndex];
  element("crateRank").textContent = `#${track.rank} of ${state.tracks.length}`;
  element("crateTrack").textContent = track.title;
  element("crateArtist").textContent = track.artist;
  const isPlaying = track.uri === state.playingUri;
  element("cratePlay").textContent = isPlaying ? "Now spinning" : "▶ Play this one";
  element("cratePlay").disabled = isPlaying;
  element("cratePrev").disabled = state.focusedIndex === 0;
  element("crateNext").disabled = state.focusedIndex === state.tracks.length - 1;
}

function onDiggingKeyDown(event) {
  if (event.key === "ArrowLeft") focusRecord(state.focusedIndex - 1);
  else if (event.key === "ArrowRight") focusRecord(state.focusedIndex + 1);
  else if (event.key === "Enter") playFocusedRecord();
  else return;
  event.preventDefault();
}

// Clicking the room around the record player steps back, like leaving the crate.
function onOutsideClick(event) {
  if (!event.target.closest("#crateHud, #hud, #menu")) closeCrateDigging();
}

function setStatus(message) {
  element("crateStatus").textContent = message;
}

function element(id) {
  return document.getElementById(id);
}
