// The music card's decisions, kept pure so they can be tested without Spotify.
//
// intent: what the visitor wants
//   "idle"     hasn't asked for music yet, or left the room
//   "playing"  wants music
//   "paused"   pressed pause
// phase: what the embed is doing
//   "starting"      the embed hasn't loaded its first track yet
//   "loadingTrack"  a new track was requested and hasn't loaded
//   "choosingNext"  a track ended and the next one is being picked
//   "ready"         settled on a track

// The play/pause button flips whatever the embed is actually doing.
export function intentAfterToggle(isEmbedPaused) {
  return isEmbedPaused ? "playing" : "paused";
}

// Undo a pause the visitor didn't ask for (audio focus taken, a station's own
// video, tab throttling), but only once the embed is settled on a track.
export function shouldResume({ intent, phase, isEmbedPaused }) {
  return intent === "playing" && phase === "ready" && isEmbedPaused;
}

// The embed reports "ready" after its first load and after every new track.
// Play then if a track was asked for, or if music was wanted before the very
// first load finished; calling play before a track has loaded gets dropped.
export function shouldPlayWhenReady({ intent, phase }) {
  return phase === "loadingTrack" || (phase === "starting" && intent === "playing");
}
