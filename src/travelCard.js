import { create } from "./dom.js";

const REVEAL_MS = 620;
const HIDE_MS = 380;
const EASING = "cubic-bezier(0.65, 0, 0.35, 1)";
const GRID_COLUMNS = 12;
const LEDE_ROWS = 2;
const PHOTO_ROWS = 3;
const ROW_STEP = 2;

// Desktop collage: photos cascade from top-left toward bottom-right while the
// text blocks sit in the gaps between them. Mobile ignores these placements.
const LAYOUTS = {
  pair: { span: 5, columns: [1, 8] },
  cascade: { span: 4, columns: [1, 5, 9, 3, 7] },
};

const state = { card: null, origin: null };

export function openTravelCard(place, origin, { index, total }) {
  removeCard();
  const card = buildCard(place, index, total);
  document.getElementById("travelGlobe").append(card);
  state.card = card;
  state.origin = origin;
  card.querySelector(".travel-card-close").addEventListener("click", closeTravelCard);
  card.animate([{ clipPath: circleAt(origin, 0) }, { clipPath: circleAt(origin, coveringRadius(origin)) }], { duration: REVEAL_MS, easing: EASING });
  requestAnimationFrame(() => card.classList.add("is-open"));
  card.querySelector(".travel-card-close").focus({ preventScroll: true });
}

export async function closeTravelCard() {
  const { card, origin } = state;
  if (!card) return;
  state.card = null;
  card.classList.remove("is-open");
  await card.animate([{ clipPath: circleAt(origin, coveringRadius(origin)) }, { clipPath: circleAt(origin, 0) }], {
    duration: HIDE_MS,
    easing: EASING,
    fill: "forwards",
  }).finished;
  card.remove();
}

export function isTravelCardOpen() {
  return state.card !== null;
}

function removeCard() {
  state.card?.remove();
  state.card = null;
}

function buildCard(place, index, total) {
  const card = create("article", "travel-card");
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", place.name);
  const close = create("button", "travel-card-close", "← Back to globe");
  close.type = "button";
  const scroller = create("div", "travel-card-scroll");
  scroller.append(buildHeader(place, index, total), buildCollage(place));
  card.append(close, scroller);
  return card;
}

function buildHeader(place, index, total) {
  const header = create("header", "travel-card-head");
  const meta = create("div", "travel-card-meta");
  meta.append(
    create("span", "", `${pad(index + 1)} / ${pad(total)}`),
    create("span", "", place.country),
    create("span", "", formatCoordinates(place)),
  );
  header.append(meta, create("h2", "travel-card-name", place.name), create("p", "travel-card-tagline", place.tagline));
  return header;
}

function buildCollage(place) {
  const collage = create("div", "travel-collage");
  const layout = place.photos.length <= 2 ? LAYOUTS.pair : LAYOUTS.cascade;
  const placements = place.photos.map((_, index) => photoPlacement(layout, index));
  const [lede, ...rest] = place.paragraphs;
  collage.append(placeAt(textBlock([lede], "travel-text is-lede"), ledePlacement(layout)));
  place.photos.forEach((photo, index) => collage.append(placeAt(buildPhoto(photo, index, place), placements[index])));
  if (rest.length > 0) collage.append(placeAt(textBlock(rest, "travel-text"), trailingTextPlacement(placements)));
  return collage;
}

// `order` interleaves the single-column mobile flow: photo, text, photo, text…
function photoPlacement(layout, index) {
  const start = layout.columns[index % layout.columns.length];
  return { column: start, span: layout.span, row: 1 + index * ROW_STEP, rows: PHOTO_ROWS, order: index === 0 ? 1 : index * 2 + 1 };
}

function ledePlacement(layout) {
  const column = layout.span + 2;
  return { column, span: GRID_COLUMNS + 1 - column, row: 1, rows: LEDE_ROWS, order: 2 };
}

// Tucks the remaining text into open space: beside the middle photo when the
// photos cascade, otherwise opposite the last photo.
function trailingTextPlacement(placements) {
  if (placements.length >= 3) {
    const middle = placements[1];
    const column = middle.column + middle.span;
    return { column, span: GRID_COLUMNS + 1 - column, row: middle.row, rows: LEDE_ROWS, order: 4 };
  }
  const last = placements.at(-1);
  const row = last.row + 1;
  if (last.column > GRID_COLUMNS / 2) return { column: 1, span: last.column - 2, row, rows: LEDE_ROWS, order: 4 };
  const column = last.column + last.span + 1;
  return { column, span: GRID_COLUMNS + 1 - column, row, rows: LEDE_ROWS, order: 4 };
}

function placeAt(node, { column, span, row, rows, order }) {
  node.style.setProperty("--col", `${column} / span ${span}`);
  node.style.setProperty("--row", `${row} / span ${rows}`);
  node.style.setProperty("--order", order);
  return node;
}

function textBlock(paragraphs, className) {
  const block = create("div", className);
  for (const paragraph of paragraphs) block.append(create("p", "", paragraph));
  return block;
}

function buildPhoto(photo, index, place) {
  const figure = create("figure", photo.isWide ? "travel-photo is-wide" : "travel-photo");
  figure.style.setProperty("--delay", `${120 + index * 110}ms`);
  const image = create("img", "");
  image.src = photo.src;
  image.alt = photo.alt;
  image.decoding = "async";
  figure.append(image, create("figcaption", "", `${pad(index + 1)} — ${place.name}`));
  return figure;
}

function formatCoordinates({ lat, lon }) {
  const latitude = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}`;
  const longitude = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
  return `${latitude}, ${longitude}`;
}

function circleAt(origin, radius) {
  return `circle(${radius}px at ${origin.x}px ${origin.y}px)`;
}

function coveringRadius(origin) {
  const dx = Math.max(origin.x, window.innerWidth - origin.x);
  const dy = Math.max(origin.y, window.innerHeight - origin.y);
  return Math.hypot(dx, dy);
}

function pad(number) {
  return String(number).padStart(2, "0");
}
