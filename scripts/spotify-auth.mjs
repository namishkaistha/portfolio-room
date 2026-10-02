import http from "node:http";
import { execFile } from "node:child_process";

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ["user-read-currently-playing", "playlist-read-private", "user-top-read"];
const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret } = process.env;

if (!clientId || !clientSecret) {
  throw new Error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET before running this script.");
}

const state = crypto.randomUUID();
const server = http.createServer(handleCallback).listen(PORT, "127.0.0.1", openConsentPage);

function openConsentPage() {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    state,
  });
  process.stdout.write(`Approve access in your browser:\n${url}\n`);
  execFile("open", [url.toString()]);
}

async function handleCallback(request, response) {
  const params = new URL(request.url, REDIRECT_URI).searchParams;
  if (params.get("state") !== state || !params.get("code")) {
    response.writeHead(400).end("Authorization failed.");
    return;
  }
  const refreshToken = await exchangeCodeForRefreshToken(params.get("code"));
  response.end("Done. You can close this tab.");
  process.stdout.write(`\nSPOTIFY_REFRESH_TOKEN=${refreshToken}\n`);
  server.close();
}

async function exchangeCodeForRefreshToken(code) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
  });
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
  }
  const { refresh_token: refreshToken } = await response.json();
  return refreshToken;
}
