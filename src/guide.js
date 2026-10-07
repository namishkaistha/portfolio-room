import { create, element } from "./dom.js";

// How-to-explore instructions, shown one of two ways while Namish picks:
//   whiteboard  a whiteboard that greets the visitor on entry; "?" reopens it
//   sidebar     a panel docked on the side the whole time you're in the room
// Choose with ?guide=whiteboard or ?guide=sidebar (whiteboard by default).
const STEPS = [
  { key: "Walk", desktop: "W A S D or the arrow keys", touch: "Drag the stick, bottom left" },
  { key: "Go to", desktop: "Click anything that glows and you'll walk right over", touch: "Tap anything that glows and you'll walk right over" },
  { key: "Open", desktop: "Space or E when a prompt pops up", touch: "Tap the button, bottom right, when a prompt pops up" },
  { key: "Jump", desktop: "☰ Menu, top right, goes straight anywhere", touch: "☰ Menu, top right, goes straight anywhere" },
  { key: "Back", desktop: "Esc, or click outside a window", touch: "Tap outside a window" },
  { key: "Music", desktop: "Top right shows what I'm listening to. Play my top 10 at the record player.", touch: "Top right shows what I'm listening to. Play my top 10 at the record player." },
];
const CLOSE_KEYS = ["Escape", "Enter", "Space"];

const variant = new URLSearchParams(location.search).get("guide") === "sidebar" ? "sidebar" : "whiteboard";
const state = { isBoardOpen: false };

export function installGuide(isTouch) {
  const lines = STEPS.map((step) => ({ key: step.key, text: isTouch ? step.touch : step.desktop }));
  element("guideBoardSteps").replaceChildren(...lines.map((line) => buildStep(line, "guide-board")));
  element("guideSideSteps").replaceChildren(...lines.map((line) => buildStep(line, "guide-side")));
  element("guideBtn").addEventListener("click", openBoard);
  element("guideBoardClose").addEventListener("click", closeBoard);
  element("guideBoard").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeBoard();
  });
  element("guideSideToggle").addEventListener("click", toggleSide);
  if (isTouch) setSideExpanded(false);
}

// The whiteboard greets every entry into the room; the sidebar just appears.
export function greetVisitor() {
  if (variant === "whiteboard") openBoard();
}

// The "?" button and the sidebar belong to walking around the room, not to
// the stations, the intro or the walk out.
export function showGuideInRoom(isInRoom) {
  element("guideBtn").classList.toggle("hidden", !isInRoom || variant !== "whiteboard");
  element("guideSide").classList.toggle("hidden", !isInRoom || variant !== "sidebar");
  if (!isInRoom) closeBoard();
}

function buildStep({ key, text }, block) {
  const item = create("li", `${block}-step`);
  item.append(create("span", `${block}-key`, key), create("span", `${block}-text`, text));
  return item;
}

function openBoard() {
  state.isBoardOpen = true;
  element("guideBoard").classList.remove("hidden");
  window.addEventListener("keydown", onBoardKey, true);
  element("guideBoardClose").focus({ preventScroll: true });
}

function closeBoard() {
  if (!state.isBoardOpen) return;
  state.isBoardOpen = false;
  element("guideBoard").classList.add("hidden");
  window.removeEventListener("keydown", onBoardKey, true);
}

function onBoardKey(event) {
  if (!CLOSE_KEYS.includes(event.code)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeBoard();
}

function toggleSide() {
  setSideExpanded(element("guideSideToggle").getAttribute("aria-expanded") !== "true");
}

function setSideExpanded(isExpanded) {
  element("guideSideToggle").setAttribute("aria-expanded", String(isExpanded));
  element("guideSide").classList.toggle("is-collapsed", !isExpanded);
}
