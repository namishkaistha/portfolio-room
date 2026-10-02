const EMBEDS = {
  tripod: {
    url: "https://creative.namishkaistha.com",
    title: "creative.namishkaistha.com",
  },
};

let onClose = null;

export function openIframePanel(id, { onExit } = {}) {
  const embed = EMBEDS[id];
  if (!embed) return;
  onClose = onExit ?? null;
  document.getElementById("iframeTitle").textContent = embed.title;
  document.getElementById("iframeOpen").href = embed.url;
  document.getElementById("iframeFrame").src = embed.url;
  document.getElementById("iframePanel").classList.remove("hidden");
}

export function closeIframePanel() {
  document.getElementById("iframePanel").classList.add("hidden");
  document.getElementById("iframeFrame").src = "about:blank";
  const callback = onClose;
  onClose = null;
  callback?.();
}

export function isIframePanelOpen() {
  return !document.getElementById("iframePanel").classList.contains("hidden");
}
