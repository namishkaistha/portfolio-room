import { create } from "./dom.js";
import { scrambleText } from "./textScramble.js";
import { installOutfitAccents } from "./outfitAccents.js";
import { OUTFIT_PIECES, applyOutfit, findPiece, readSavedOutfit, saveOutfit } from "./outfits.js";

const HEADING = "FASHION";
const HEADING_SCRAMBLE_MS = 800;
const NAME_SCRAMBLE_MS = 600;
const GARMENTS = [
  { id: "closetTops", garment: "top" },
  { id: "closetBottoms", garment: "bottom" },
];

const state = { isOpen: false, onExit: null, outfit: null, avatar: null, finishHeading: null, finishName: null, selected: null };

export function wearSavedOutfit(avatarRoot) {
  state.outfit = readSavedOutfit(localStorage);
  installOutfitAccents(avatarRoot);
  applyOutfit(avatarRoot, state.outfit);
}

export function wireCloset(avatarRoot) {
  state.avatar = avatarRoot;
  state.outfit ??= readSavedOutfit(localStorage);
  document.getElementById("closetDone").addEventListener("click", closeCloset);
  document.getElementById("closetPhoto").addEventListener("click", openLightbox);
  document.getElementById("closetLightbox").addEventListener("click", closeLightbox);
  for (const { id, garment } of GARMENTS) {
    const row = document.getElementById(id);
    for (const piece of OUTFIT_PIECES.filter((candidate) => candidate.garment === garment)) row.append(buildChip(piece));
  }
}

export function openCloset({ onExit } = {}) {
  state.onExit = onExit ?? null;
  state.isOpen = true;
  document.getElementById("closetPanel").classList.remove("hidden");
  state.finishHeading?.();
  state.finishHeading = scrambleText(document.getElementById("closetTitle"), HEADING, HEADING_SCRAMBLE_MS);
  showPiece(findPiece(state.outfit.top));
  syncChips();
  document.getElementById("closetDone").focus({ preventScroll: true });
}

export function closeCloset() {
  if (!state.isOpen) return;
  state.isOpen = false;
  closeLightbox();
  state.finishHeading?.();
  state.finishName?.();
  document.getElementById("closetPanel").classList.add("hidden");
  const callback = state.onExit;
  state.onExit = null;
  callback?.();
}

// Escape closes an enlarged photo first, then the closet itself.
export function dismissClosetLayer() {
  if (isLightboxOpen()) closeLightbox();
  else closeCloset();
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

// The piece's name scrambles in, then its photo and story fade up beneath it.
function showPiece(piece) {
  state.selected = piece;
  const article = document.getElementById("closetPiece");
  article.classList.remove("is-playing");
  void article.offsetWidth;
  article.classList.add("is-playing");
  showPhoto(piece);
  state.finishName?.();
  state.finishName = scrambleText(document.getElementById("closetPieceName"), piece.name.toUpperCase(), NAME_SCRAMBLE_MS);
  document.getElementById("closetStory").textContent = piece.story;
}

function showPhoto(piece) {
  const button = document.getElementById("closetPhoto");
  const image = document.getElementById("closetPhotoImage");
  const hasPhoto = Boolean(piece.photo);
  button.classList.toggle("is-empty", !hasPhoto);
  button.disabled = !hasPhoto;
  button.style.setProperty("--swatch", `#${piece.color.toString(16).padStart(6, "0")}`);
  image.hidden = !hasPhoto;
  image.src = piece.photo ?? "";
  image.alt = piece.photoAlt;
}

function openLightbox() {
  if (!state.selected?.photo) return;
  const lightbox = document.getElementById("closetLightbox");
  const image = document.getElementById("closetLightboxImage");
  image.src = state.selected.photo;
  image.alt = state.selected.photoAlt;
  lightbox.classList.remove("hidden");
}

function closeLightbox() {
  document.getElementById("closetLightbox").classList.add("hidden");
}

function isLightboxOpen() {
  return !document.getElementById("closetLightbox").classList.contains("hidden");
}

function syncChips() {
  for (const chip of document.querySelectorAll(".closet-chip")) {
    chip.setAttribute("aria-pressed", String(Object.values(state.outfit).includes(chip.dataset.piece)));
  }
}
