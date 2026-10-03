import { readStoredJson, writeStoredJson } from "./storage.js";

// When Namish visits his own site while logged into Spotify, a record played
// here streams on his account and Spotify then reports it as his live
// listening. Songs this browser recently played itself are that echo.
const SITE_PLAYS_KEY = "namish-room:recent-site-plays";
const SITE_PLAYS_LIMIT = 30;

export function rememberSitePlay(uri) {
  writeStoredJson(SITE_PLAYS_KEY, [uri, ...readSitePlays().filter((played) => played !== uri)].slice(0, SITE_PLAYS_LIMIT));
}

export function isSitePlay(uri) {
  return readSitePlays().includes(uri);
}

function readSitePlays() {
  return readStoredJson(SITE_PLAYS_KEY, []);
}
