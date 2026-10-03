import { createExitSignal } from "./exitSignal.js";

// A full-screen overlay for a station with no panel of its own (sleeping,
// looking out the window). A tap anywhere, or the listed keys, closes it.
export function createViewOverlay(elementId, closeKeys = []) {
  const state = { isOpen: false };
  const exit = createExitSignal();

  function onKeyDown(event) {
    if (!closeKeys.includes(event.code)) return;
    event.preventDefault();
    close();
  }

  // Resolves once the overlay has closed.
  function open() {
    const closed = exit.wait();
    state.isOpen = true;
    document.getElementById(elementId).classList.remove("hidden");
    window.addEventListener("keydown", onKeyDown);
    return closed;
  }

  function close() {
    if (!state.isOpen) return;
    state.isOpen = false;
    document.getElementById(elementId).classList.add("hidden");
    window.removeEventListener("keydown", onKeyDown);
    exit.fire();
  }

  document.getElementById(elementId)?.addEventListener("click", close);
  return { open, close, isOpen: () => state.isOpen };
}
