import { cachedJson, describeTrack, fetchAccessToken, readJson, spotifyGet, spotifyUnavailable } from "./_spotify.js";

const TOP_TRACK_COUNT = 10;
const LAST_MONTH = "short_term";

export async function GET() {
  try {
    const accessToken = await fetchAccessToken();
    const { items } = await readJson(await spotifyGet(accessToken, `/me/top/tracks?time_range=${LAST_MONTH}&limit=${TOP_TRACK_COUNT}`));
    return cachedJson({ tracks: items.map(describeTrack) });
  } catch (error) {
    return spotifyUnavailable(error, "top-tracks");
  }
}
