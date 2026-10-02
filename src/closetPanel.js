import { create } from "./dom.js";
import { scrambleText } from "./textScramble.js";
import { OUTFIT_PIECES, applyOutfit, findPiece, readSavedOutfit, saveOutfit } from "./outfits.js";

const TITLE_SCRAMBLE_MS = 700;
const GARMENTS = [
  { id: "closetTops", garment: "top" },
  { id: "closetBottoms", garment: "bottom" },
];

const state = { isOpen: false, onExit: null, outfit: null, avatar: null, finishTitle: null };

export function wearSavedOutfit(avatarRoot) {
  state.outfit = readSavedOutfit(localStorage);
  applyOutfit(avatarRoot, state.outfit);
}

export function wireCloset(avatarRoot) {
  state.avatar = avatarRoot;
  state.outfit ??= readSavedOutfit(localStorage);
  document.getElementById("closetDone").addEventListener("click", closeCloset);
  for (const { id, garment } of GARMENTS) {
    const row = document.getElementById(id);
    for (const piece of OUTFIT_PIECES.filter((candidate) => candidate.garment === garment)) row.append(buildChip(piece));
  }
}

export function openCloset({ onExit } = {}) {
  state.onExit = onExit ?? null;
  state.isOpen = true;
  document.getElementById("closetPanel").classList.remove("hidden");
  showPiece(findPiece(state.outfit.top));
  syncChips();
  document.getElementById("closetDone").focus({ preventScroll: true });
}

export function closeCloset() {
  if (!state.isOpen) return;
  state.isOpen = false;
  state.finishTitle?.();
  document.getElementById("closetPanel").classList.add("hidden");
  const callback = state.onExit;
  state.onExit = null;
  callback?.();
}

export function isClosetOpen() {
  return state.isOpen;
}

function buildChip(piece) {
  const chip = create("button", "closet-chip", piece.name);
  chip.type = "button";
  chip.dataset.piece = piece.id;
  chip.addEventListener("click", () => wear(piece));
  return chip;
}

function wear(piece) {
  state.outfit = { ...state.outfit, [piece.garment]: piece.id };
  applyOutfit(state.avatar, state.outfit);
  saveOutfit(localStorage, state.outfit);
  showPiece(piece);
  syncChips();
}

// The selected piece's name scrambles in as the big pixel header, then its
// story fades up beneath it, the same entrance as the TRAVEL globe's title.
function showPiece(piece) {
  const title = document.getElementById("closetTitle");
  const story = document.getElementById("closetStory");
  state.finishTitle?.();
  story.classList.remove("is-playing");
  void story.offsetWidth;
  story.textContent = piece.story;
  story.classList.add("is-playing");
  state.finishTitle = scrambleText(title, piece.name.toUpperCase(), TITLE_SCRAMBLE_MS);
}

function syncChips() {
  for (const chip of document.querySelectorAll(".closet-chip")) {
    chip.setAttribute("aria-pressed", String(Object.values(state.outfit).includes(chip.dataset.piece)));
  }
}
