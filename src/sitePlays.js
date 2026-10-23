import { readStoredJson, writeStoredJson } from "./storage.js";

// When Namish visits his own site while logged into Spotify, a record played
// here streams on his account and Spotify then reports it as his live
// listening. Songs this browser played itself in the last few minutes are
// that echo; older plays are ordinary listening again.
const SITE_PLAYS_KEY = "namish-room:recent-site-plays";
const SITE_PLAYS_LIMIT = 30;
const SITE_PLAY_WINDOW_MS = 10 * 60 * 1000;

export function rememberSitePlay(uri, now = Date.now()) {
  const others = readSitePlays(now).filter((play) => play.uri !== uri);
  writeStoredJson(SITE_PLAYS_KEY, [{ uri, at: now }, ...others].slice(0, SITE_PLAYS_LIMIT));
}

export function isSitePlay(uri, now = Date.now()) {
  return readSitePlays(now).some((play) => play.uri === uri);
}

// Entries from the old format (bare URIs with no time) are ignored.
function readSitePlays(now) {
  return readStoredJson(SITE_PLAYS_KEY, []).filter((play) => typeof play?.at === "number" && now - play.at < SITE_PLAY_WINDOW_MS);
}
