import { READING_INTRO, RECOMMENDED_BOOKS } from "./readingList.js";
import { typewrite } from "./typewriter.js";
import { burstPaperFlecks } from "./flourish.js";

const TYPE_INTERVAL_MS = 22;
const PAGE_TURN_MS = 750;
const PAGE_TURN_EASING = "cubic-bezier(0.45, 0.05, 0.25, 1)";
const NARROW_LAYOUT_QUERY = "(max-width: 700px)";
const TOP_FIVE_PHOTO = "/books/namish-top5.jpg";

const SPREADS = [
  { left: renderIntroLeft, right: renderIntroRight, folio: "Intro" },
  ...RECOMMENDED_BOOKS.map((book, index) => ({
    left: () => renderBookCover(book, index + 1),
    right: () => renderBookNote(book, index + 1),
    folio: `${index + 1} of ${RECOMMENDED_BOOKS.length}`,
  })),
];

const state = { spreadIndex: 0, isTurning: false, finishTyping: null, onExit: null, isOpen: false };

export async function openBookReader({ onExit } = {}) {
  state.onExit = onExit ?? null;
  state.isOpen = true;
  state.spreadIndex = 0;
  element("bookReader").classList.remove("hidden");
  window.addEventListener("keydown", onReaderKeyDown);
  preloadCovers();
  await openCover();
}

export function closeBookReader() {
  state.finishTyping?.();
  state.isOpen = false;
  element("bookReader").classList.add("hidden");
  window.removeEventListener("keydown", onReaderKeyDown);
  const callback = state.onExit;
  state.onExit = null;
  callback?.();
}

export function isBookReaderOpen() {
  return state.isOpen;
}

export function wireBookReader() {
  element("bookClose").addEventListener("click", closeBookReader);
  element("bookPrev").addEventListener("click", () => turnPage(-1));
  element("bookNext").addEventListener("click", () => turnPage(1));
}

async function openCover() {
  const spread = SPREADS[0];
  element("book").classList.add("is-closed");
  element("bookLeft").replaceChildren();
  element("bookRight").replaceChildren(spread.right());
  renderControls();
  await flipTurner({ direction: 1, front: renderCoverFace(), back: spread.left() });
  element("book").classList.remove("is-closed");
  element("bookLeft").replaceChildren(spread.left());
  typeRightPage();
}

async function turnPage(step) {
  const nextIndex = state.spreadIndex + step;
  if (state.isTurning || nextIndex < 0 || nextIndex >= SPREADS.length) return;
  state.finishTyping?.();
  const next = SPREADS[nextIndex];
  state.spreadIndex = nextIndex;
  renderControls();
  if (step > 0) {
    const leavingRight = element("bookRight").cloneNode(true).childNodes;
    element("bookRight").replaceChildren(next.right());
    await flipTurner({ direction: 1, front: [...leavingRight], back: next.left() });
    element("bookLeft").replaceChildren(next.left());
    typeRightPage();
    return;
  }
  const leavingLeft = element("bookLeft").cloneNode(true).childNodes;
  element("bookLeft").replaceChildren(next.left());
  await flipTurner({ direction: -1, front: [...leavingLeft], back: next.right() });
  element("bookRight").replaceChildren(next.right());
  showRightPageInFull();
}

// Forward turns lift the right page over the spine; backward turns the left.
async function flipTurner({ direction, front, back }) {
  burstPaperFlecks(element("book"));
  if (matchMedia(NARROW_LAYOUT_QUERY).matches) return;
  state.isTurning = true;
  const turner = element("bookTurner");
  turner.className = `book-turner ${direction > 0 ? "turn-forward" : "turn-backward"}`;
  turner.querySelector(".book-turner-front").replaceChildren(...[front].flat());
  turner.querySelector(".book-turner-back").replaceChildren(...[back].flat());
  const endAngle = direction > 0 ? -180 : 180;
  await turner.animate(
    [{ transform: "rotateY(0deg)" }, { transform: `rotateY(${endAngle}deg)` }],
    { duration: PAGE_TURN_MS, easing: PAGE_TURN_EASING },
  ).finished;
  turner.className = "book-turner hidden";
  state.isTurning = false;
}

function typeRightPage() {
  const target = element("bookRight").querySelector("[data-typed]");
  if (!target) return;
  state.finishTyping = typewrite(target, target.dataset.typed, TYPE_INTERVAL_MS);
}

function showRightPageInFull() {
  const target = element("bookRight").querySelector("[data-typed]");
  if (target) target.textContent = target.dataset.typed;
}

function renderControls() {
  element("bookFolio").textContent = SPREADS[state.spreadIndex].folio;
  element("bookPrev").disabled = state.spreadIndex === 0;
  element("bookNext").disabled = state.spreadIndex === SPREADS.length - 1;
}

function renderCoverFace() {
  const cover = create("div", "book-cover-face");
  cover.append(
    create("div", "book-cover-eyebrow", "From the shelf of"),
    create("div", "book-cover-title", "Namish Kaistha"),
    create("div", "book-cover-rule"),
    create("div", "book-cover-subtitle", "Top 5 books of all time"),
  );
  return cover;
}

function renderIntroLeft() {
  const page = create("figure", "book-photo");
  const photo = create("img", "book-photo-image");
  photo.src = TOP_FIVE_PHOTO;
  photo.alt = "Namish's top 5 books stacked on his shelf";
  page.append(create("h2", "book-intro-title", "My top 5 books of all time"), photo);
  return page;
}

function renderIntroRight() {
  return typedParagraph(READING_INTRO);
}

function renderBookCover(book, rank) {
  const figure = create("figure", "book-photo");
  const image = create("img", "book-photo-image");
  image.src = book.cover;
  image.alt = `${book.title} cover`;
  figure.append(image, create("figcaption", "book-photo-caption", `No. ${rank}`));
  return figure;
}

function renderBookNote(book, rank) {
  const note = create("div", "book-note");
  note.append(
    create("div", "book-note-rank", `No. ${rank}`),
    create("h3", "book-note-title", book.title),
    create("div", "book-note-author", book.author),
    create("div", "book-cover-rule"),
    typedParagraph(book.note),
  );
  if (book.quote) note.append(create("blockquote", "book-note-quote", `“${book.quote}”`));
  return note;
}

function typedParagraph(text) {
  const paragraph = create("p", "book-typed");
  paragraph.dataset.typed = text;
  return paragraph;
}

function preloadCovers() {
  for (const source of [TOP_FIVE_PHOTO, ...RECOMMENDED_BOOKS.map((book) => book.cover)]) new Image().src = source;
}

function onReaderKeyDown(event) {
  if (event.key === "ArrowRight") turnPage(1);
  else if (event.key === "ArrowLeft") turnPage(-1);
  else return;
  event.preventDefault();
}

function create(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function element(id) {
  return document.getElementById(id);
}
