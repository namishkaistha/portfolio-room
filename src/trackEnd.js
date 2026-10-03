const MIN_PLAYED_BEFORE_REWIND_MS = 1000;
const REWIND_DROP_MS = 2000;

// Spotify reports playback about once a second, so the final tick of a track
// can land well before its end. A track also counts as finished when it was
// playing and then snaps back to the start (the embed rewinds when a clip ends).
export function hasTrackEnded(previous, current, expectedUri, toleranceMs) {
  if (!current || current.playingURI !== expectedUri || current.duration <= 0) return false;
  if (current.position >= current.duration - toleranceMs) return true;
  if (!previous || previous.playingURI !== expectedUri) return false;
  const rewound = previous.position - current.position >= REWIND_DROP_MS;
  const restartedAndPaused = current.isPaused && current.position === 0 && previous.position >= MIN_PLAYED_BEFORE_REWIND_MS;
  return rewound || restartedAndPaused;
}
