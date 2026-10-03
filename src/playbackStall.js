const MIN_ADVANCE_MS = 300;

export function hasProgressed(previous, current) {
  if (!previous || current.isPaused) return false;
  if (previous.playingURI !== current.playingURI) return true;
  return current.position - previous.position >= MIN_ADVANCE_MS;
}

export function hasPlaybackStalled(msSinceProgress, limitMs) {
  return msSinceProgress >= limitMs;
}
