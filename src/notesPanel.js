import { create } from "./dom.js";

const NOTES_ENDPOINT = "/api/notes";
const MAX_MESSAGE_LENGTH = 140;
const TILT_STEPS = 7;
const EMPTY_MESSAGE = "The wall is empty. Be the first to stick one up.";
const LOAD_ERROR = "Couldn't load the wall. Try again in a bit.";
const SEND_ERROR = "Couldn't post that. Try again in a bit.";
const THANKS_MESSAGE = "Stuck it up. Thanks!";
const THANKS_VISIBLE_MS = 3000;
const LOAD_WAIT_MS = 1500;
const LOADING_MESSAGE = "Loading the wall…";
const STAGGER_LIMIT = 14;

const state = { isOpen: false, isComposing: false, onExit: null, isSending: false, noteCount: 0, thanksTimer: null, pending: null };

// Starts fetching the wall while the camera is still on its way, so the notes
// are already in hand when the panel appears.
export function preloadNotes() {
  state.pending = fetchNotes();
  state.pending.catch(() => {});
}

export async function openNotesPanel({ onExit } = {}) {
  state.onExit = onExit ?? null;
  state.isOpen = true;
  if (!state.pending) preloadNotes();
  const pending = state.pending;
  state.pending = null;
  const notes = await settleWithin(pending, LOAD_WAIT_MS);
  if (!state.isOpen) return;
  renderLoaded(notes, pending);
  hideComposer();
  element("notesPanel").classList.remove("hidden");
  element("notesClose").focus({ preventScroll: true });
}

export function closeNotesPanel() {
  state.isOpen = false;
  hideComposer();
  element("notesPanel").classList.add("hidden");
  const callback = state.onExit;
  state.onExit = null;
  callback?.();
}

// Escape and outside taps close the composer first, then the wall.
export function dismissNotesLayer() {
  if (state.isComposing) hideComposer();
  else closeNotesPanel();
}

export function isNotesPanelOpen() {
  return state.isOpen;
}

export function wireNotesPanel() {
  element("notesClose").addEventListener("click", closeNotesPanel);
  element("notesAdd").addEventListener("click", showComposer);
  element("notesCancel").addEventListener("click", hideComposer);
  element("notesForm").addEventListener("submit", onSubmit);
  element("notesForm").addEventListener("click", closeComposerOnBackdrop);
  element("notesMessage").addEventListener("input", updateCharacterCount);
}

async function fetchNotes() {
  const response = await fetch(NOTES_ENDPOINT);
  if (!response.ok) throw new Error(`status ${response.status}`);
  const { notes } = await response.json();
  return notes;
}

// Resolves with the notes if they arrive in time, otherwise with null so the
// panel can open on a loading line and fill in when they land.
function settleWithin(promise, milliseconds) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), milliseconds));
  return Promise.race([promise.catch(() => undefined), timeout]);
}

async function renderLoaded(notes, pending) {
  const board = element("notesBoard");
  if (notes === undefined) return showLoadError(board);
  if (notes !== null) return renderBoard(board, notes);
  board.replaceChildren(create("p", "notes-empty", LOADING_MESSAGE));
  showCount("");
  try {
    renderBoard(board, await pending);
  } catch {
    showLoadError(board);
  }
}

function showLoadError(board) {
  board.replaceChildren(create("p", "notes-empty", LOAD_ERROR));
  showCount("");
}

function renderBoard(board, notes) {
  state.noteCount = notes.length;
  showCount(describeCount(notes.length));
  if (notes.length === 0) {
    board.replaceChildren(create("p", "notes-empty", EMPTY_MESSAGE));
    return;
  }
  board.replaceChildren(...notes.map((note, index) => buildNote(note, index)));
}

function buildNote({ id, message, author, tint }, index = 0) {
  const note = create("figure", `notes-note tint-${tint} is-entering`);
  note.style.setProperty("--n", Math.min(index, STAGGER_LIMIT));
  note.style.setProperty("--tilt", `${tiltFor(id)}deg`);
  note.append(create("blockquote", "notes-note-text", message));
  if (author) note.append(create("figcaption", "notes-note-author", `· ${author}`));
  return note;
}

// A steady pseudo-random tilt of -3 to 3 degrees, so a note never shifts between visits.
function tiltFor(id) {
  return ((id * 37) % TILT_STEPS) - Math.floor(TILT_STEPS / 2);
}

async function onSubmit(event) {
  event.preventDefault();
  if (state.isSending) return;
  setSending(true);
  const payload = { message: element("notesMessage").value, author: element("notesAuthor").value };
  try {
    const response = await fetch(NOTES_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? SEND_ERROR);
    stickUpNewNote(result.note);
  } catch (error) {
    element("notesStatus").textContent = error.message || SEND_ERROR;
  } finally {
    setSending(false);
  }
}

function stickUpNewNote(note) {
  const board = element("notesBoard");
  board.querySelector(".notes-empty")?.remove();
  const fresh = buildNote(note);
  fresh.classList.remove("is-entering");
  fresh.classList.add("is-new");
  board.prepend(fresh);
  board.scrollIntoView({ block: "start" });
  state.noteCount += 1;
  hideComposer();
  showCount(THANKS_MESSAGE);
  clearTimeout(state.thanksTimer);
  state.thanksTimer = setTimeout(() => showCount(describeCount(state.noteCount)), THANKS_VISIBLE_MS);
}

function showComposer() {
  state.isComposing = true;
  element("notesStatus").textContent = "";
  element("notesForm").classList.remove("hidden");
  updateCharacterCount();
  element("notesMessage").focus();
}

function hideComposer() {
  state.isComposing = false;
  element("notesForm").classList.add("hidden");
  element("notesMessage").value = "";
}

function closeComposerOnBackdrop(event) {
  if (event.target === event.currentTarget) hideComposer();
}

function setSending(isSending) {
  state.isSending = isSending;
  element("notesSubmit").disabled = isSending;
}

function updateCharacterCount() {
  element("notesChars").textContent = String(MAX_MESSAGE_LENGTH - element("notesMessage").value.length);
}

function describeCount(count) {
  if (count === 0) return "";
  return count === 1 ? "1 note on the wall" : `${count} notes on the wall`;
}

function showCount(text) {
  element("notesCount").textContent = text;
}

function element(id) {
  return document.getElementById(id);
}
