import { create } from "./dom.js";

const EXPAND_MS = 460;
const COLLAPSE_MS = 340;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const COLLAPSED_SCALE = 0.6;

const state = { card: null, origin: null, lightbox: null };

export function renderProjectBoxes(container, projects, onOpen) {
  container.replaceChildren(...projects.map((project, index) => createBox(project, index, onOpen)));
}

// Grows the card out of the box that was clicked (or the middle of the screen
// when opened from the terminal), then fades its content in.
export function openProjectCard(project, origin, host) {
  removeCard();
  const card = buildCard(project);
  host.append(card);
  state.card = card;
  state.origin = origin;
  card.querySelector(".cli-card-close").addEventListener("click", closeProjectCard);
  const animation = card.animate(
    [{ transform: transformFrom(origin, card), opacity: 0.6 }, { transform: "none", opacity: 1 }],
    { duration: EXPAND_MS, easing: EASING },
  );
  animation.finished.then(() => card.classList.add("is-open"));
}

export async function closeProjectCard() {
  const { card, origin } = state;
  if (!card) return;
  closeLightbox();
  state.card = null;
  card.classList.remove("is-open");
  const animation = card.animate(
    [{ transform: "none", opacity: 1 }, { transform: transformFrom(origin, card), opacity: 0 }],
    { duration: COLLAPSE_MS, easing: EASING, fill: "forwards" },
  );
  await animation.finished;
  card.remove();
}

export function isLightboxOpen() {
  return state.lightbox !== null;
}

export function closeLightbox() {
  state.lightbox?.remove();
  state.lightbox = null;
}

function openLightbox(image) {
  closeLightbox();
  const lightbox = create("button", "cli-lightbox");
  lightbox.type = "button";
  lightbox.setAttribute("aria-label", "Close full-screen image");
  const full = create("img", "cli-lightbox-image");
  full.src = image.src;
  full.alt = image.alt;
  lightbox.append(full, createCloseHint("cli-lightbox-hint"));
  lightbox.addEventListener("click", closeLightbox);
  state.card.append(lightbox);
  state.lightbox = lightbox;
}

export function isProjectCardOpen() {
  return state.card !== null;
}

export function removeCard() {
  closeLightbox();
  state.card?.remove();
  state.card = null;
}

function createBox(project, index, onOpen) {
  const box = create("button", "cli-box");
  box.type = "button";
  box.dataset.slug = project.slug;
  box.setAttribute("aria-label", `Open ${project.title}`);
  box.append(
    create("span", "cli-box-label", `${String(index + 1).padStart(2, "0")} · ${project.year}`),
    create("span", "cli-box-path", `~/projects/${project.slug}/`),
    create("span", "cli-box-title", project.title),
    create("span", "cli-box-tech", project.tech.slice(0, 3).join(" · ").toLowerCase()),
    create("span", "cli-box-open", "↵ open"),
  );
  box.addEventListener("click", () => onOpen(project.slug));
  return box;
}

function buildCard(project) {
  const card = create("div", "cli-card");
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", project.title);
  const bar = create("div", "cli-card-bar");
  const close = createCloseHint("cli-card-close", "button");
  close.type = "button";
  bar.append(create("span", "cli-card-path", `~/projects/${project.slug}`), close);
  const body = create("div", "cli-card-body");
  body.append(buildMedia(project), buildSummary(project));
  card.append(bar, body);
  return card;
}

function buildSummary(project) {
  const summary = create("div", "cli-card-summary");
  const header = create("header", "cli-card-header");
  header.append(create("h2", "cli-card-title", project.title), create("span", "cli-card-year", project.year));
  const details = create("dl", "cli-card-details");
  for (const detail of project.details) {
    const row = create("div", "cli-card-detail");
    row.append(create("dt", "", `> ${detail.label}`), create("dd", "", detail.text));
    details.append(row);
  }
  summary.append(header, create("div", "cli-card-tech", project.tech.join(" · ").toLowerCase()), details, buildRepoLine(project));
  return summary;
}

function buildRepoLine(project) {
  if (!project.href) return create("div", "cli-card-private", "# code not public");
  const link = create("a", "cli-card-link", `→ ${project.href.replace("https://", "")}`);
  link.href = project.href;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

function buildMedia(project) {
  const media = create("div", "cli-card-media");
  if (project.shots.length === 0) {
    media.append(create("div", "cli-card-noshot", "$ no screenshots — this one lives in the terminal"));
    return media;
  }
  if (project.shots.every((shot) => shot.phone)) {
    media.classList.add("is-phone-row");
    for (const shot of project.shots) {
      const image = createShot(shot);
      image.addEventListener("click", () => openLightbox(image));
      media.append(image);
    }
    return media;
  }
  const main = createShot(project.shots[0]);
  main.classList.add("cli-card-main-shot");
  main.addEventListener("click", () => openLightbox(main));
  media.append(main);
  if (project.shots.length > 1) media.append(buildThumbnails(project.shots, main));
  return media;
}

function buildThumbnails(shots, main) {
  const strip = create("div", "cli-card-thumbs");
  shots.forEach((shot, index) => {
    const thumb = create("button", `cli-card-thumb${index === 0 ? " is-active" : ""}`);
    thumb.type = "button";
    thumb.setAttribute("aria-label", shot.alt);
    thumb.append(createShot(shot));
    thumb.addEventListener("click", () => {
      main.src = shot.src;
      main.alt = shot.alt;
      strip.querySelectorAll(".cli-card-thumb").forEach((other) => other.classList.toggle("is-active", other === thumb));
    });
    strip.append(thumb);
  });
  return strip;
}

function createShot(shot) {
  const image = create("img", "cli-card-shot");
  image.src = shot.src;
  image.alt = shot.alt;
  image.loading = "lazy";
  return image;
}

function transformFrom(origin, card) {
  const to = card.getBoundingClientRect();
  if (!origin?.isConnected) return `scale(${COLLAPSED_SCALE})`;
  const from = origin.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

function createCloseHint(className, tag = "span") {
  const hint = create(tag, className);
  hint.append(create("span", "key-hint", "[esc] "), "close");
  return hint;
}
