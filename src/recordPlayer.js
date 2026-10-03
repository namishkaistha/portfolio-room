import { element } from "./dom.js";
import { hasTrackEnded } from "./trackEnd.js";
import { rememberSitePlay } from "./sitePlays.js";
import { intentAfterToggle, shouldPlayWhenReady, shouldResume } from "./playbackPolicy.js";

// The pop-up that plays a record a visitor picked from Namish's top 10. A
// hidden Spotify embed does the playing; when a record ends, the next one in
// the top 10 starts.
const EMBED_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";
const EMBED_HEIGHT = 80;
const PLAY_ICON = "▶";
const PAUSE_ICON = "❚❚";
const TRACK_END_TOLERANCE_MS = 1800;
const RESUME_DELAY_MS = 600;
const MAX_RESUME_ATTEMPTS = 3;

// `intent` and `phase` are described in playbackPolicy.js. `current` is the
// record on the pop-up; `loadedUri` is the one the embed actually has.
const state = {
  controller: null,
  intent: "idle",
  phase: "starting",
  isEmbedPaused: true,
  records: [],
  current: null,
  loadedUri: null,
  lastUpdate: null,
  isInRoom: false,
  resumeAttempts: 0,
  resumeTimer: null,
};

// Loads the embed with the first record, silently, ahead of any tap: phones
// only allow audio to start inside the tap that asked for it.
export async function prepareRecordPlayer(firstRecord) {
  state.loadedUri = firstRecord.uri;
  element("recordPlayerToggle").addEventListener("click", togglePlayback);
  element("recordPlayerClose").addEventListener("click", stopRecord);
  const iframeApi = await loadEmbedApi();
  iframeApi.createController(element("recordPlayerEmbed"), { uri: firstRecord.uri, width: "100%", height: EMBED_HEIGHT }, onControllerReady);
}

export function playRecord(records, index) {
  state.records = records;
  state.intent = "playing";
  if (state.phase === "starting") showRecord(records[index]);
  else loadAndPlay(records[index]);
}

export function currentRecordUri() {
  return state.current?.uri ?? null;
}

export function showRecordPlayer() {
  state.isInRoom = true;
  renderVisibility();
}

// Leaving the room stops the music along with hiding the pop-up.
export function hideRecordPlayer() {
  state.isInRoom = false;
  state.intent = "idle";
  state.controller?.pause();
  renderVisibility();
}

// Called when a station closes: the browser or Spotify may have paused the
// embed while another panel (or a video inside it) held the audio.
export function resumeRecordPlayer() {
  if (shouldResume(state)) state.controller.play();
}

function togglePlayback() {
  state.intent = intentAfterToggle(state.isEmbedPaused);
  state.controller?.togglePlay();
}

function stopRecord() {
  state.intent = "idle";
  state.controller?.pause();
  state.current = null;
  renderVisibility();
}

function loadEmbedApi() {
  return new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement("script");
    script.src = EMBED_API_SRC;
    script.async = true;
    document.body.appendChild(script);
  });
}

// Spotify lazy-loads the embed; it must load now so a tap can play at once.
function onControllerReady(controller) {
  state.controller = controller;
  // The embed replaces its placeholder element with an iframe.
  document.querySelector(".spotify-player iframe")?.setAttribute("loading", "eager");
  controller.addListener("ready", onEmbedReady);
  controller.addListener("playback_update", ({ data }) => onPlaybackUpdate(data));
}

function onEmbedReady() {
  const shouldPlay = shouldPlayWhenReady(state);
  state.phase = "ready";
  if (state.current && state.current.uri !== state.loadedUri) loadAndPlay(state.current);
  else if (shouldPlay) state.controller.play();
}

// Play is requested right away (inside the tap) as well as again once the new
// track has loaded, since a play before it loads gets dropped.
function loadAndPlay(record) {
  showRecord(record);
  state.phase = "loadingTrack";
  state.loadedUri = record.uri;
  state.controller.loadUri(record.uri);
  state.controller.play();
}

function onPlaybackUpdate(playback) {
  const previous = state.lastUpdate;
  state.lastUpdate = playback;
  state.isEmbedPaused = playback.isPaused;
  renderToggle(playback.isPaused);
  if (hasTrackEnded(previous, playback, state.current?.uri, TRACK_END_TOLERANCE_MS)) playNextRecord();
  else if (playback.isPaused) resumeIfPausedUnintentionally();
  else state.resumeAttempts = 0;
}

// The embed's own controls are hidden, so a pause the visitor didn't ask for
// (audio focus stolen, tab throttling) is undone a moment later.
function resumeIfPausedUnintentionally() {
  if (!shouldResume(state) || state.resumeTimer || state.resumeAttempts >= MAX_RESUME_ATTEMPTS) return;
  state.resumeTimer = setTimeout(() => {
    state.resumeTimer = null;
    state.resumeAttempts += 1;
    resumeRecordPlayer();
  }, RESUME_DELAY_MS);
}

// After #10 the record player stops, like the end of a side.
function playNextRecord() {
  const next = state.records[state.records.findIndex((record) => record.uri === state.current?.uri) + 1];
  if (next) loadAndPlay(next);
  else state.intent = "idle";
}

function showRecord(record) {
  state.current = record;
  rememberSitePlay(record.uri);
  element("recordPlayerRank").textContent = `#${record.rank} of Namish's top 10`;
  element("recordPlayerTitle").textContent = record.title;
  element("recordPlayerArtist").textContent = record.artist;
  const art = element("recordPlayerArt");
  art.hidden = !record.albumArt;
  if (record.albumArt) art.src = record.albumArt;
  renderVisibility();
}

function renderVisibility() {
  element("recordPlayer").classList.toggle("hidden", !(state.isInRoom && state.current));
}

function renderToggle(isPaused) {
  const toggle = element("recordPlayerToggle");
  toggle.textContent = isPaused ? PLAY_ICON : PAUSE_ICON;
  toggle.setAttribute("aria-label", isPaused ? "Play" : "Pause");
}
