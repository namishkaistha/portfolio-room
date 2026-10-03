import { hasTrackEnded } from "./trackEnd.js";
import { readStoredJson, writeStoredJson } from "./storage.js";

const LISTENING_ENDPOINT = "/api/now-playing";
const EMBED_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";
const EMBED_HEIGHT = 80;
const PLAY_ICON = "▶";
const PAUSE_ICON = "❚❚";
const TRACK_END_TOLERANCE_MS = 1800;
const SITE_PLAYS_KEY = "namish-room:recent-site-plays";
const SITE_PLAYS_LIMIT = 30;
const IDLE_EYEBROW = "Press play for music";
const RESUME_DELAY_MS = 600;
const MAX_RESUME_ATTEMPTS = 3;

const state = {
  controller: null,
  isReady: false,
  wantsPlayback: false,
  wantsVisible: false,
  current: null,
  shufflePool: [],
  shuffleQueue: [],
  isAdvancing: false,
  shouldPlayWhenLoaded: false,
  isPaused: true,
  lastUpdate: null,
  hasPlayed: false,
  userPaused: false,
  resumeAttempts: 0,
  resumeTimer: null,
};

export async function mountNowPlaying() {
  const listening = await fetchListening();
  if (!listening) return;
  state.shufflePool = listening.shuffle;
  const live = genuineLive(listening.live);
  const firstTrack = live ? asLive(live) : nextShuffledTrack();
  if (!firstTrack) return;
  showTrack(firstTrack);
  document.getElementById("nowPlayingToggle").addEventListener("click", togglePlayback);
  const iframeApi = await loadEmbedApi();
  iframeApi.createController(
    document.getElementById("nowPlayingEmbed"),
    { uri: firstTrack.uri, width: "100%", height: EMBED_HEIGHT },
    onControllerReady,
  );
}

export function revealNowPlaying() {
  state.wantsVisible = true;
  if (state.controller) showCard();
}

export function pausePlayback() {
  state.wantsPlayback = false;
  state.controller?.pause();
}

export function hideNowPlaying() {
  state.wantsVisible = false;
  document.getElementById("nowPlaying").classList.add("hidden");
}

export function playTrackNow(track) {
  state.wantsPlayback = true;
  state.userPaused = false;
  if (state.isReady) loadAndPlay(track);
  else showTrack(track);
}

// Called when a station closes: the browser or Spotify may have paused the
// embed while another panel (or a video inside it) held the audio.
export function resumePlayback() {
  if (!state.wantsPlayback || state.userPaused || !state.isReady || !state.isPaused) return;
  state.controller.play();
}

function togglePlayback() {
  state.userPaused = !state.isPaused;
  if (!state.userPaused) state.wantsPlayback = true;
  state.controller?.togglePlay();
}

// Null when the listening data can't be had (offline, Spotify down); callers
// then skip the card or keep shuffling.
async function fetchListening() {
  try {
    const response = await fetch(LISTENING_ENDPOINT);
    const isJson = response.headers.get("content-type")?.includes("application/json");
    return response.ok && isJson ? await response.json() : null;
  } catch {
    return null;
  }
}

function asLive(track) {
  return { ...track, isLive: true };
}

function nextShuffledTrack() {
  if (state.shuffleQueue.length === 0) state.shuffleQueue = buildShuffleQueue();
  return state.shuffleQueue.shift() ?? state.current;
}

function buildShuffleQueue() {
  const others = state.shufflePool.filter((track) => track.uri !== state.current?.uri);
  return interleaveByPlaylist(others.length > 0 ? others : state.shufflePool);
}

// Takes turns between playlists so one long playlist can't dominate the shuffle.
function interleaveByPlaylist(tracks) {
  const lanesByPlaylist = new Map();
  for (const track of tracks) {
    if (!lanesByPlaylist.has(track.playlistName)) lanesByPlaylist.set(track.playlistName, []);
    lanesByPlaylist.get(track.playlistName).push(track);
  }
  const lanes = shuffled([...lanesByPlaylist.values()].map(shuffled));
  const queue = [];
  while (lanes.some((lane) => lane.length > 0)) {
    for (const lane of lanes) if (lane.length > 0) queue.push(lane.shift());
  }
  return queue;
}

function shuffled(tracks) {
  const copy = [...tracks];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function showTrack(track) {
  state.current = track;
  if (!track.isLive) rememberSitePlay(track.uri);
  renderCard(track);
}

// When Namish visits his own site while logged into Spotify, the embed streams
// on his account and Spotify then reports that song as his live listening.
// Songs this browser recently played itself are treated as that echo, not live.
function genuineLive(live) {
  if (!live || readSitePlays().includes(live.uri)) return null;
  return live;
}

function rememberSitePlay(uri) {
  writeStoredJson(SITE_PLAYS_KEY, [uri, ...readSitePlays().filter((played) => played !== uri)].slice(0, SITE_PLAYS_LIMIT));
}

function readSitePlays() {
  return readStoredJson(SITE_PLAYS_KEY, []);
}

function renderCard(track) {
  const art = document.getElementById("nowPlayingArt");
  if (track.albumArt) art.src = track.albumArt;
  const title = document.getElementById("nowPlayingTitle");
  title.textContent = track.title;
  title.href = track.url;
  document.getElementById("nowPlayingArtist").textContent = track.artist;
  renderStatus(track);
}

function renderStatus(track) {
  const status = document.getElementById("nowPlayingStatus");
  status.classList.toggle("is-live", Boolean(track.isLive));
  if (track.isLive) {
    status.textContent = "Live";
    return;
  }
  if (track.source === "top") {
    status.textContent = "From his top 10 this month";
    return;
  }
  const playlistName = document.createElement("span");
  playlistName.className = "now-playing-playlist";
  playlistName.textContent = `“${track.playlistName}”`;
  status.replaceChildren("From his playlist titled ", playlistName);
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

function onControllerReady(controller) {
  state.controller = controller;
  loadEmbedImmediately();
  controller.addListener("ready", onEmbedReady);
  controller.addListener("playback_update", ({ data }) => onPlaybackUpdate(data));
  if (state.wantsVisible) showCard();
}

function loadEmbedImmediately() {
  document.querySelector(".spotify-player iframe")?.setAttribute("loading", "eager");
}

// "ready" fires on the first load and again after every loadUri. Play only
// once per load; calling play before a new track has loaded gets dropped.
function onEmbedReady() {
  const isFirstLoad = !state.isReady;
  state.isReady = true;
  if (!state.shouldPlayWhenLoaded && !(isFirstLoad && state.wantsPlayback)) return;
  state.shouldPlayWhenLoaded = false;
  state.controller.play();
}

// Phones only allow audio to start inside the tap that asked for it, so play
// is requested right away as well as again once the new track has loaded.
function loadAndPlay(track) {
  showTrack(track);
  state.shouldPlayWhenLoaded = true;
  state.controller.loadUri(track.uri);
  state.controller.play();
}

function onPlaybackUpdate(playback) {
  const previous = state.lastUpdate;
  state.lastUpdate = playback;
  state.isPaused = playback.isPaused;
  if (!playback.isPaused) markFirstPlay();
  renderToggle(playback.isPaused);
  if (!state.isAdvancing && hasTrackEnded(previous, playback, state.current?.uri, TRACK_END_TOLERANCE_MS)) playNextTrack();
  else if (playback.isPaused) resumeIfPausedUnintentionally();
  else state.resumeAttempts = 0;
}

// The embed's own controls are hidden, so a pause the visitor didn't ask for
// (audio focus stolen, tab throttling) is undone a moment later.
function resumeIfPausedUnintentionally() {
  const isIntentional = !state.wantsPlayback || state.userPaused;
  const isBusy = state.isAdvancing || state.shouldPlayWhenLoaded;
  if (isIntentional || isBusy || state.resumeTimer || state.resumeAttempts >= MAX_RESUME_ATTEMPTS) return;
  state.resumeTimer = setTimeout(() => {
    state.resumeTimer = null;
    state.resumeAttempts += 1;
    resumePlayback();
  }, RESUME_DELAY_MS);
}

async function playNextTrack() {
  state.isAdvancing = true;
  loadAndPlay(await chooseNextTrack());
  state.isAdvancing = false;
}

// A new live song takes priority; otherwise (including when Namish stops
// listening mid-visit) the shuffle continues so music never stops.
async function chooseNextTrack() {
  const listening = await fetchListening();
  const live = genuineLive(listening?.live);
  if (live && live.uri !== state.current.uri) return asLive(live);
  return nextShuffledTrack();
}

// Music never starts by itself. Until the first play, the card invites the
// visitor to press play instead of claiming something is playing.
function markFirstPlay() {
  if (state.hasPlayed) return;
  state.hasPlayed = true;
  renderIdleState();
}

function renderIdleState() {
  const card = document.getElementById("nowPlaying");
  card.classList.toggle("is-idle", !state.hasPlayed);
  const eyebrow = card.querySelector(".now-playing-eyebrow");
  if (!eyebrow) return;
  eyebrow.dataset.liveText ??= eyebrow.textContent;
  eyebrow.textContent = state.hasPlayed ? eyebrow.dataset.liveText : IDLE_EYEBROW;
}

function renderToggle(isPaused) {
  const toggle = document.getElementById("nowPlayingToggle");
  toggle.textContent = isPaused ? PLAY_ICON : PAUSE_ICON;
  toggle.setAttribute("aria-label", isPaused ? "Play" : "Pause");
}

function showCard() {
  document.getElementById("nowPlaying").classList.remove("hidden");
  renderIdleState();
}
