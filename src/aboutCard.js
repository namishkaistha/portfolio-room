import { create } from "./dom.js";
import { createIcon } from "./aboutIcons.js";
import { buildPanels } from "./aboutPanels.js";
import { CONTACT_LEAD, CONTACT_LINKS, HEADING, PORTRAIT, RESUME_URL, TABS, TAGLINE } from "./aboutContent.js";
import { createExitSignal } from "./exitSignal.js";

const REVEAL_MS = 720;
const HIDE_MS = 360;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const SHEET_START_SCALE = 0.84;
const SHEET_START_LIFT_PX = 28;
const PORTRAIT_START_SCALE = 1.18;
const PORTRAIT_SETTLE_FACTOR = 1.4;

const state = { card: null };
const exit = createExitSignal();

// Resolves once the card has closed.
export function openAboutCard() {
  const closed = exit.wait();
  removeCard();
  const card = buildCard();
  document.body.append(card);
  state.card = card;
  card.querySelector(".about-close").addEventListener("click", closeAboutCard);
  card.addEventListener("click", closeOnBackdropClick);
  playReveal(card);
  requestAnimationFrame(() => card.classList.add("is-open"));
  card.querySelector(".about-close").focus({ preventScroll: true });
  return closed;
}

export async function closeAboutCard() {
  const { card } = state;
  if (!card) return;
  state.card = null;
  card.classList.remove("is-open");
  await card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: HIDE_MS, easing: EASING, fill: "forwards" }).finished;
  card.remove();
  exit.fire();
}

export function isAboutCardOpen() {
  return state.card !== null;
}

function removeCard() {
  state.card?.remove();
  state.card = null;
}

function closeOnBackdropClick(event) {
  if (event.target === event.currentTarget) closeAboutCard();
}

// The sheet grows out of the zoomed-in photo wall while the portrait settles
// from a closer crop, so the card feels like a continuation of the camera move.
function playReveal(card) {
  const options = { duration: REVEAL_MS, easing: EASING };
  card.animate([{ opacity: 0 }, { opacity: 1 }], options);
  card
    .querySelector(".about-sheet")
    .animate(
      [
        { opacity: 0, transform: `translateY(${SHEET_START_LIFT_PX}px) scale(${SHEET_START_SCALE})` },
        { opacity: 1, transform: "none" },
      ],
      options,
    );
  card
    .querySelector(".about-portrait")
    .animate([{ transform: `scale(${PORTRAIT_START_SCALE})` }, { transform: "none" }], { ...options, duration: REVEAL_MS * PORTRAIT_SETTLE_FACTOR });
}

function buildCard() {
  const card = create("div", "about-card");
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "About Namish");
  const sheet = create("article", "about-sheet");
  const close = create("button", "about-close", "← Back to room");
  close.type = "button";
  sheet.append(close, buildSide(), buildMain());
  card.append(sheet);
  return card;
}

function buildSide() {
  const side = create("div", "about-side");
  const frame = create("figure", "about-frame");
  const image = create("img", "about-portrait");
  image.src = PORTRAIT.src;
  image.alt = PORTRAIT.alt;
  image.decoding = "async";
  frame.append(image);
  side.append(frame, buildResumeLink(), buildContactRow());
  return side;
}

function buildResumeLink() {
  const link = create("a", "about-resume");
  link.href = RESUME_URL;
  link.target = "_blank";
  link.rel = "noopener";
  link.append(createIcon("document"), create("span", "about-resume-label", "Résumé"), create("span", "about-resume-arrow", "↗"));
  return link;
}

function buildContactRow() {
  const row = create("div", "about-contact");
  const links = create("div", "about-contact-links");
  for (const contact of CONTACT_LINKS) links.append(buildContactLink(contact));
  row.append(create("p", "about-contact-lead", CONTACT_LEAD), links);
  return row;
}

function buildContactLink({ label, icon, tint, href }) {
  const link = create("a", "about-contact-link");
  link.href = href;
  link.setAttribute("aria-label", label);
  link.title = label;
  link.style.setProperty("--tint", tint);
  if (!href.startsWith("mailto:")) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  link.append(createIcon(icon));
  return link;
}

function buildMain() {
  const main = create("div", "about-main");
  const panels = buildPanels();
  main.append(create("h2", "about-heading", HEADING), create("p", "about-tagline", TAGLINE), buildTabs(), buildPanelStack(panels));
  selectTab(main, TABS[0].id);
  return main;
}

function buildTabs() {
  const list = create("div", "about-tabs");
  list.setAttribute("role", "tablist");
  list.addEventListener("keydown", moveTabWithArrowKeys);
  for (const { id, label } of TABS) {
    const tab = create("button", "about-tab", label);
    tab.type = "button";
    tab.id = `about-tab-${id}`;
    tab.dataset.tab = id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `about-panel-${id}`);
    tab.addEventListener("click", () => selectTab(list.closest(".about-main"), id));
    list.append(tab);
  }
  return list;
}

function buildPanelStack(panels) {
  const stack = create("div", "about-panels");
  stack.append(...TABS.map(({ id }) => panels[id]));
  return stack;
}

function selectTab(main, id) {
  for (const tab of main.querySelectorAll(".about-tab")) {
    const isSelected = tab.dataset.tab === id;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  }
  for (const { id: panelId } of TABS) {
    main.querySelector(`#about-panel-${panelId}`).classList.toggle("is-active", panelId === id);
  }
}

function moveTabWithArrowKeys(event) {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  if (!step) return;
  const tabs = [...event.currentTarget.querySelectorAll(".about-tab")];
  const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  const next = tabs[(current + step + tabs.length) % tabs.length];
  next.focus();
  next.click();
}
