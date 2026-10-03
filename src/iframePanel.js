import { createExitSignal } from "./exitSignal.js";

const EMBEDS = {
  tripod: {
    url: "https://creative.namishkaistha.com",
    title: "creative.namishkaistha.com",
  },
};

const exit = createExitSignal();

// Resolves once the panel has closed.
export function openIframePanel(id) {
  const embed = EMBEDS[id];
  const closed = exit.wait();
  document.getElementById("iframeTitle").textContent = embed.title;
  document.getElementById("iframeOpen").href = embed.url;
  document.getElementById("iframeFrame").src = embed.url;
  document.getElementById("iframePanel").classList.remove("hidden");
  return closed;
}

export function closeIframePanel() {
  document.getElementById("iframePanel").classList.add("hidden");
  document.getElementById("iframeFrame").src = "about:blank";
  exit.fire();
}

export function isIframePanelOpen() {
  return !document.getElementById("iframePanel").classList.contains("hidden");
}
