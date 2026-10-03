import { cachedJson, describeTrack, fetchAccessToken, readJson, spotifyGet, spotifyUnavailable } from "./_spotify.js";

const NO_CONTENT = 204;

// What Namish is playing on Spotify right now, or null. Shown, never played,
// on the site.
export async function GET() {
  try {
    const accessToken = await fetchAccessToken();
    return cachedJson({ live: await fetchCurrentTrack(accessToken) });
  } catch (error) {
    return spotifyUnavailable(error, "now-playing");
  }
}

async function fetchCurrentTrack(accessToken) {
  const response = await spotifyGet(accessToken, "/me/player/currently-playing");
  if (response.status === NO_CONTENT) return null;
  const playback = await readJson(response);
  if (!playback.is_playing || playback.item?.type !== "track") return null;
  return describeTrack(playback.item);
}
