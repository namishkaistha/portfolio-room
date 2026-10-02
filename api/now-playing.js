import { cachedJson, describeTrack, fetchAccessToken, readJson, spotifyGet, spotifyUnavailable } from "./_spotify.js";

const NO_CONTENT = 204;
const PLAYLIST_PAGE_SIZE = 100;
const PLAYLIST_LOOKBACK = 6;

export async function GET() {
  try {
    const accessToken = await fetchAccessToken();
    const [live, shuffle] = await Promise.all([fetchCurrentTrack(accessToken), fetchShuffleTracks(accessToken)]);
    return cachedJson({ live, shuffle });
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

// Pulls the few most recent playlists so the shuffle has variety even when
// the latest one is short; the client balances turns between them.
async function fetchShuffleTracks(accessToken) {
  const { items: playlists } = await readJson(await spotifyGet(accessToken, `/me/playlists?limit=${PLAYLIST_LOOKBACK}`));
  const trackLists = await Promise.all(playlists.map((playlist) => fetchPlaylistTracks(accessToken, playlist)));
  const tracksByUri = new Map();
  for (const track of trackLists.flat()) {
    if (!tracksByUri.has(track.uri)) tracksByUri.set(track.uri, track);
  }
  return [...tracksByUri.values()];
}

async function fetchPlaylistTracks(accessToken, playlist) {
  const page = await readJson(await spotifyGet(accessToken, `/playlists/${playlist.id}/items?limit=${PLAYLIST_PAGE_SIZE}`));
  return page.items
    .map((entry) => entry.item)
    .filter((track) => track?.type === "track")
    .map((track) => ({ ...describeTrack(track), playlistName: playlist.name }));
}
