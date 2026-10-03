import { create } from "./dom.js";
import { createGarmentViewer } from "./garmentViewer.js";
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

const state = { isOpen: false, onExit: null, outfit: null, avatar: null, finishHeading: null, finishName: null, selected: null, viewer: null };

export function wearSavedOutfit(avatarRoot) {
  state.outfit = readSavedOutfit(localStorage);
  installOutfitAccents(avatarRoot);
  applyOutfit(avatarRoot, state.outfit);
}

export function wireCloset(avatarRoot) {
  state.avatar = avatarRoot;
  state.outfit ??= readSavedOutfit(localStorage);
  document.getElementById("closetDone").addEventListener("click", closeCloset);
  state.viewer = createGarmentViewer();
  document.getElementById("closetModelStage").append(state.viewer.canvas);
  document.getElementById("closetEnlarge").addEventListener("click", openLightbox);
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
  state.viewer.start();
  showPiece(findPiece(state.outfit.top));
  syncChips();
  document.getElementById("closetDone").focus({ preventScroll: true });
}

export function closeCloset() {
  if (!state.isOpen) return;
  state.isOpen = false;
  closeLightbox();
  state.viewer.stop();
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
  applyOutfit(state.avatar, state.outfit);
  saveOutfit(localStorage, state.outfit);
  showPiece(piece);
  syncChips();
}

// The piece's name scrambles in, then its 3D model and story fade up beneath it.
function showPiece(piece) {
  state.selected = piece;
  const article = document.getElementById("closetPiece");
  article.classList.remove("is-playing");
  void article.offsetWidth;
  article.classList.add("is-playing");
  showModel(piece);
  state.finishName?.();
  state.finishName = scrambleText(document.getElementById("closetPieceName"), piece.name.toUpperCase(), NAME_SCRAMBLE_MS);
  document.getElementById("closetStory").textContent = piece.story;
}

function showModel(piece) {
  const stage = document.getElementById("closetModelFrame");
  const hasModel = Boolean(piece.model);
  stage.classList.toggle("is-empty", !hasModel);
  stage.classList.toggle("is-loading", hasModel);
  stage.style.setProperty("--swatch", `#${piece.color.toString(16).padStart(6, "0")}`);
  document.getElementById("closetEnlarge").disabled = !hasModel;
  state.viewer.canvas.setAttribute("aria-label", hasModel ? `3D model: ${piece.modelAlt}. Drag to turn it.` : "");
  if (!hasModel) {
    state.viewer.clear();
    return;
  }
  state.viewer.show(piece.model).then((isCurrent) => {
    if (isCurrent) stage.classList.remove("is-loading");
  }).catch(() => {
    if (state.selected !== piece) return;
    stage.classList.remove("is-loading");
    stage.classList.add("is-empty");
  });
}

// The enlarged view borrows the same canvas, so the model keeps its angle.
function openLightbox() {
  if (!state.selected?.model) return;
  document.getElementById("closetLightboxStage").append(state.viewer.canvas);
  document.getElementById("closetLightbox").classList.remove("hidden");
  state.viewer.fit();
  document.getElementById("closetLightboxClose").focus({ preventScroll: true });
}

function closeLightbox() {
  if (!isLightboxOpen()) return;
  document.getElementById("closetLightbox").classList.add("hidden");
  document.getElementById("closetModelStage").append(state.viewer.canvas);
  state.viewer.fit();
}

function isLightboxOpen() {
  return !document.getElementById("closetLightbox").classList.contains("hidden");
}

function syncChips() {
  for (const chip of document.querySelectorAll(".closet-chip")) {
    chip.setAttribute("aria-pressed", String(Object.values(state.outfit).includes(chip.dataset.piece)));
  }
}
