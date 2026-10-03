import { currentRecordUri, playRecord, prepareRecordPlayer } from "./recordPlayer.js";
import { playRecordPull } from "./sfx.js";
import { element } from "./dom.js";
import { RECORD_COUNT, pullOutRecord, wrapSleeves } from "./recordShelf.js";
import { createExitSignal } from "./exitSignal.js";

const TOP_TRACKS_ENDPOINT = "/api/top-tracks";
const LOADING_MESSAGE = "Pulling records…";
const ERROR_MESSAGE = "Couldn't reach Spotify. Try again in a bit.";

const state = {
  tracks: null,
  focusedIndex: 0,
  isOpen: false,
};
const exit = createExitSignal();

// Resolves once the crate has closed.
export function openCrateDigging() {
  const closed = exit.wait();
  state.isOpen = true;
  pullOutRecord(state.focusedIndex);
  element("crateHud").classList.remove("hidden");
  window.addEventListener("keydown", onDiggingKeyDown);
  window.addEventListener("click", onOutsideClick);
  renderHud();
  return closed;
}

export function closeCrateDigging() {
  state.isOpen = false;
  pullOutRecord(null);
  element("crateHud").classList.add("hidden");
  window.removeEventListener("keydown", onDiggingKeyDown);
  window.removeEventListener("click", onOutsideClick);
  exit.fire();
}

export function isCrateDiggingOpen() {
  return state.isOpen;
}

export function wireCrateDigging() {
  loadTopTracks();
  element("crateClose").addEventListener("click", closeCrateDigging);
  element("cratePrev").addEventListener("click", () => focusRecord(state.focusedIndex - 1));
  element("crateNext").addEventListener("click", () => focusRecord(state.focusedIndex + 1));
  element("cratePlay").addEventListener("click", playFocusedRecord);
}

// Any failure (offline, Spotify down) leaves an empty crate with an error
// line rather than a crate stuck on "Pulling records…".
async function loadTopTracks() {
  const tracks = await fetchTopTracks().catch(() => []);
  state.tracks = tracks.slice(0, RECORD_COUNT).map((track, index) => ({ ...track, rank: index + 1 }));
  wrapSleeves(state.tracks);
  if (state.tracks.length > 0) prepareRecordPlayer(state.tracks[0]);
  renderHud();
}

async function fetchTopTracks() {
  const response = await fetch(TOP_TRACKS_ENDPOINT);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (!response.ok || !isJson) throw new Error(`top tracks unavailable: ${response.status}`);
  const { tracks } = await response.json();
  return tracks;
}

function focusRecord(index) {
  if (!state.tracks?.length) return;
  const previousIndex = state.focusedIndex;
  state.focusedIndex = Math.max(0, Math.min(state.tracks.length - 1, index));
  if (state.focusedIndex !== previousIndex) playRecordPull();
  pullOutRecord(state.focusedIndex);
  renderHud();
}

function playFocusedRecord() {
  if (!state.tracks?.length) return;
  playRecord(state.tracks, state.focusedIndex);
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
  const isPlaying = track.uri === currentRecordUri();
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
