import { create, replayAnimation } from "./dom.js";
import { createGarmentViewer } from "./garmentViewer.js";
import { scrambleText } from "./textScramble.js";
import { installOutfitAccents } from "./outfitAccents.js";
import { createAvatarDresser } from "./avatarWardrobe.js";
import { OUTFIT_PIECES, applyOutfit, findPiece, garmentModelUrl, garmentPhotoUrl, readSavedOutfit, saveOutfit, showcaseGarment } from "./outfits.js";

const HEADING = "FASHION";
const HEADING_SCRAMBLE_MS = 800;
const NAME_SCRAMBLE_MS = 600;
const GARMENTS = [
  { id: "closetTops", garment: "top" },
  { id: "closetBottoms", garment: "bottom" },
];

const state = { isOpen: false, onExit: null, outfit: null, avatar: null, finishHeading: null, finishName: null, selected: null, viewer: null, dress: null };

export function wearSavedOutfit(avatarRoot) {
  state.outfit = readSavedOutfit();
  installOutfitAccents(avatarRoot);
  state.dress = createAvatarDresser(avatarRoot);
  dressAvatar(avatarRoot);
}

export function wireCloset(avatarRoot) {
  state.avatar = avatarRoot;
  state.outfit ??= readSavedOutfit();
  document.getElementById("closetDone").addEventListener("click", closeCloset);
  state.viewer = createGarmentViewer();
  document.getElementById("closetLightboxStage").append(state.viewer.canvas);
  document.getElementById("closetPhoto").addEventListener("click", openLightbox);
  document.getElementById("closetLightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("closetLightbox").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeLightbox();
  });
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

// Escape closes the enlarged 3D view first, then the closet itself.
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
  dressAvatar(state.avatar);
  saveOutfit(state.outfit);
  showPiece(piece);
  syncChips();
}

function dressAvatar(avatarRoot) {
  applyOutfit(avatarRoot, state.outfit);
  state.dress(state.outfit);
}

// The piece's name scrambles in, then its photo and story fade up beneath it.
function showPiece(piece) {
  state.selected = piece;
  const article = document.getElementById("closetPiece");
  replayAnimation(article, "is-playing");
  showPhoto(piece);
  state.finishName?.();
  state.finishName = scrambleText(document.getElementById("closetPieceName"), piece.name.toUpperCase(), NAME_SCRAMBLE_MS);
  document.getElementById("closetStory").textContent = piece.story;
}

// The photo is a still of the piece's 3D model; tapping it opens the model itself.
function showPhoto(piece) {
  const button = document.getElementById("closetPhoto");
  const image = document.getElementById("closetPhotoImage");
  const garmentId = showcaseGarment(piece);
  button.classList.toggle("is-empty", !garmentId);
  button.disabled = !garmentId;
  button.style.setProperty("--swatch", `#${piece.color.toString(16).padStart(6, "0")}`);
  image.src = garmentId ? garmentPhotoUrl(garmentId) : "";
  image.alt = garmentId ? `${piece.modelAlt}, as a 3D model` : "";
}

function openLightbox() {
  const garmentId = showcaseGarment(state.selected);
  if (!garmentId) return;
  const lightbox = document.getElementById("closetLightbox");
  lightbox.classList.remove("hidden");
  lightbox.classList.add("is-loading");
  state.viewer.canvas.setAttribute("aria-label", `${state.selected.modelAlt}, as a 3D model. Drag to turn it.`);
  state.viewer.start();
  state.viewer.show(garmentModelUrl(garmentId))
    .catch((error) => console.warn(`3D model ${garmentId} unavailable:`, error.message))
    .finally(() => lightbox.classList.remove("is-loading"));
  document.getElementById("closetLightboxClose").focus({ preventScroll: true });
}

function closeLightbox() {
  if (!isLightboxOpen()) return;
  document.getElementById("closetLightbox").classList.add("hidden");
  state.viewer.stop();
  state.viewer.clear();
}

function isLightboxOpen() {
  return !document.getElementById("closetLightbox").classList.contains("hidden");
}

function syncChips() {
  for (const chip of document.querySelectorAll(".closet-chip")) {
    chip.setAttribute("aria-pressed", String(Object.values(state.outfit).includes(chip.dataset.piece)));
  }
}
