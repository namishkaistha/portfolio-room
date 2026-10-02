const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1";
const COVER_WIDTH = 300;
const CACHE_SECONDS = 30;

export async function fetchAccessToken() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: SPOTIFY_REFRESH_TOKEN }),
  });
  const { access_token: accessToken } = await readJson(response);
  return accessToken;
}

export function spotifyGet(accessToken, path) {
  return fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
}

export async function readJson(response) {
  if (!response.ok) throw new Error(`Spotify ${response.status}: ${await response.text()}`);
  return response.json();
}

export function describeTrack(track) {
  return {
    uri: track.uri,
    url: track.external_urls.spotify,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    albumArt: pickCoverUrl(track.album.images),
  };
}

export function cachedJson(body) {
  return Response.json(body, {
    headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}` },
  });
}

export function spotifyUnavailable(error, label) {
  console.error(`${label} failed`, error);
  return Response.json({ error: "Spotify is unavailable" }, { status: 502 });
}

function pickCoverUrl(images = []) {
  const retinaThumbnail = images.find((image) => image.width === COVER_WIDTH);
  return (retinaThumbnail ?? images[0])?.url ?? null;
}
