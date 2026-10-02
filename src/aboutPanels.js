import { create, replayAnimation } from "./dom.js";
import { buildRevealWords, countWords } from "./wordReveal.js";
import { createIcon } from "./aboutIcons.js";
import { FREE_TIME, FREE_TIME_LEAD, GOALS, GOALS_LEAD, STORY } from "./aboutContent.js";

const POP_CLASS = "is-popping";

export function buildPanels() {
  return {
    story: buildStoryPanel(),
    "free-time": buildFreeTimePanel(),
    goals: buildGoalsPanel(),
  };
}

function buildStoryPanel() {
  const panel = createPanel("story");
  let wordIndex = 0;
  for (const text of STORY) {
    const paragraph = create("p", "about-text");
    paragraph.append(...buildRevealWords(text, wordIndex));
    wordIndex += countWords(text);
    panel.append(paragraph);
  }
  return panel;
}

function buildFreeTimePanel() {
  const panel = createPanel("free-time");
  const grid = create("div", "about-tiles");
  FREE_TIME.forEach((item, index) => grid.append(createTile(item, index)));
  panel.append(create("p", "about-lead about-item", FREE_TIME_LEAD), grid);
  return panel;
}

function createTile({ label, icon }, index) {
  const tile = createPressable("button", "about-tile about-item", index);
  tile.append(createIcon(icon), create("span", "about-tile-label", label));
  return tile;
}

function buildGoalsPanel() {
  const panel = createPanel("goals");
  const list = create("div", "about-goals");
  GOALS.forEach((goal, index) => list.append(createGoal(goal, index)));
  panel.append(create("p", "about-lead about-item", GOALS_LEAD), list);
  return panel;
}

function createGoal({ title, icon }, index) {
  const goal = createPressable("button", "about-goal about-item", index);
  goal.append(create("span", "about-goal-number", String(index + 1).padStart(2, "0")), createIcon(icon), create("span", "about-goal-title", title));
  return goal;
}

function createPressable(tag, className, index) {
  const node = create(tag, className);
  node.type = "button";
  node.style.setProperty("--i", index);
  node.addEventListener("click", () => replayAnimation(node, POP_CLASS));
  return node;
}

function createPanel(id) {
  const panel = create("section", "about-panel");
  panel.id = `about-panel-${id}`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", `about-tab-${id}`);
  return panel;
}
