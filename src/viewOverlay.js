// A full-screen overlay for a station with no panel of its own (sleeping,
// looking out the window). A tap anywhere, or the listed keys, closes it.
export function createViewOverlay(elementId, closeKeys = []) {
  const state = { isOpen: false, onExit: null };

  function onKeyDown(event) {
    if (!closeKeys.includes(event.code)) return;
    event.preventDefault();
    close();
  }

  function open({ onExit } = {}) {
    state.onExit = onExit ?? null;
    state.isOpen = true;
    document.getElementById(elementId).classList.remove("hidden");
    window.addEventListener("keydown", onKeyDown);
  }

  function close() {
    if (!state.isOpen) return;
    state.isOpen = false;
    document.getElementById(elementId).classList.add("hidden");
    window.removeEventListener("keydown", onKeyDown);
    const callback = state.onExit;
    state.onExit = null;
    callback?.();
  }

  document.getElementById(elementId)?.addEventListener("click", close);
  return { open, close, isOpen: () => state.isOpen };
}
