import { create, element } from "./dom.js";

// How-to-explore instructions, open top-left whenever the visitor is walking
// around the room, until they fold it away.
const STEPS = [
  { key: "Explore", desktop: "Circles on the floor are tied to artifacts you can explore", touch: "Circles on the floor are tied to artifacts you can explore" },
  { key: "Walk", desktop: "W A S D or the arrow keys", touch: "Drag the stick, bottom left" },
  { key: "Go to", desktop: "Click the object or its circle and you'll walk right over", touch: "Tap the object or its circle and you'll walk right over" },
  { key: "Open", desktop: "Space or E when a prompt pops up", touch: "Tap the button, bottom right, when a prompt pops up" },
  { key: "Back", desktop: "Esc, or click outside a window", touch: "Tap outside a window" },
];

export function installGuide(isTouch) {
  const steps = STEPS.map((step) => buildStep(step.key, isTouch ? step.touch : step.desktop));
  element("guideSideSteps").replaceChildren(...steps);
  element("guideSideToggle").addEventListener("click", toggleSide);
}

// The panel belongs to walking around the room, not to the stations, the
// intro or the walk out.
export function showGuideInRoom(isInRoom) {
  element("guideSide").classList.toggle("hidden", !isInRoom);
}

function buildStep(key, text) {
  const item = create("li", "guide-side-step");
  item.append(create("span", "guide-side-key", key), create("span", "guide-side-text", text));
  return item;
}

function toggleSide() {
  setSideExpanded(element("guideSideToggle").getAttribute("aria-expanded") !== "true");
}

function setSideExpanded(isExpanded) {
  element("guideSideToggle").setAttribute("aria-expanded", String(isExpanded));
  element("guideSide").classList.toggle("is-collapsed", !isExpanded);
}
