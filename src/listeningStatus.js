import { element } from "./dom.js";
import { isSitePlay } from "./sitePlays.js";

// The card that says what Namish is listening to on Spotify right now. It only
// shows the song; visitors play music from the record player instead.
const LISTENING_ENDPOINT = "/api/now-playing";
const REFRESH_MS = 30000;
const LISTENING_EYEBROW = "Namish is listening to";
const SILENT_MESSAGE = "Namish isn't listening to music right now.";

const state = { timer: null };

export function showListeningStatus() {
  refresh();
  clearInterval(state.timer);
  state.timer = setInterval(refresh, REFRESH_MS);
}

export function hideListeningStatus() {
  clearInterval(state.timer);
  state.timer = null;
  element("nowPlaying").classList.add("hidden");
}

async function refresh() {
  const listening = await fetchListening();
  if (state.timer === null) return;
  if (listening === undefined) return element("nowPlaying").classList.add("hidden");
  const live = listening.live && !isSitePlay(listening.live.uri) ? listening.live : null;
  render(live);
}

// Undefined when the status can't be had (offline, Spotify down): the card
// hides rather than claim Namish isn't listening.
async function fetchListening() {
  try {
    const response = await fetch(LISTENING_ENDPOINT);
    const isJson = response.headers.get("content-type")?.includes("application/json");
    return response.ok && isJson ? await response.json() : undefined;
  } catch {
    return undefined;
  }
}

function render(live) {
  const card = element("nowPlaying");
  card.classList.toggle("is-silent", !live);
  element("nowPlayingEyebrow").textContent = live ? LISTENING_EYEBROW : SILENT_MESSAGE;
  element("nowPlayingTitle").textContent = live?.title ?? "";
  element("nowPlayingArtist").textContent = live?.artist ?? "";
  const art = element("nowPlayingArt");
  art.hidden = !live?.albumArt;
  if (live?.albumArt) art.src = live.albumArt;
  card.classList.remove("hidden");
}
