import { PROJECTS, RESUME_URL } from "./projects.js";
import { emitKeySpark } from "./flourish.js";
import { closeLightbox, closeProjectCard, isLightboxOpen, isProjectCardOpen, openProjectCard, removeCard, renderProjectBoxes } from "./projectCards.js";

const WELCOME_LINES = [
  "welcome to my personal projects.",
  "type `cd projects` to browse.",
  "type `help` for commands.",
];
const WELCOME_TYPE_INTERVAL_MS = 32;

const PROMPT_ROOT = "namish@portfolio ~ %";
const PROMPT_PROJECTS = "namish@portfolio ~/projects %";
const ENTER_COMMAND = "cd projects";
const LIST_COMMAND = "ls";
const HELP_COMMAND = "help";
const CLEAR_COMMAND = "clear";
const EXIT_COMMAND = "exit";
const RESUME_COMMAND = "cat resume";
const HELP_LINES = [
  "available commands:",
  "  cd projects   browse projects",
  "  ls            list projects (inside ~/projects)",
  "  open <slug>   open a project card by slug",
  "  cat resume    download my résumé",
  "  clear         clear the terminal",
  "  exit          leave the laptop",
];
const HOME_COMMAND = "cd ~";
const QUICK_COMMANDS = {
  "~": [ENTER_COMMAND, RESUME_COMMAND, HELP_COMMAND],
  "~/projects": [HOME_COMMAND, RESUME_COMMAND, HELP_COMMAND],
};

const state = {
  cwd: "~",
  history: [],
  input: "",
  onExit: null,
  isTypingWelcome: false,
  welcomeTimer: null,
};

export function openIDE(options = {}) {
  state.cwd = "~";
  state.history = [];
  state.input = "";
  removeCard();
  state.onExit = options.onExit ?? null;
  requirePanel().classList.remove("hidden");
  attachKeyboardInsetListener();
  render();
  typeWelcome(onWelcomeTyped);
}

export function closeIDE() {
  stopWelcomeTyping();
  removeCard();
  requirePanel().classList.add("hidden");
  detachInput();
  detachKeyboardInsetListener();
  resetKeyboardInset();
  const callback = state.onExit;
  state.onExit = null;
  callback?.();
}

// Escape closes a full-screen image, then an open project card, then the laptop.
export function dismissIDELayer() {
  if (isLightboxOpen()) closeLightbox();
  else if (isProjectCardOpen()) closeProjectCard().then(focusInputForDevice);
  else closeIDE();
}

export function isIDEOpen() {
  const panel = document.getElementById("idePanel");
  return Boolean(panel) && !panel.classList.contains("hidden");
}

function typeWelcome(onDone) {
  state.isTypingWelcome = true;
  renderQuickCommands();
  let lineIndex = 0;
  let typedCount = 0;
  state.history.push({ kind: "output", text: "" });
  state.welcomeTimer = setInterval(() => {
    const line = WELCOME_LINES[lineIndex];
    typedCount += 1;
    state.history[state.history.length - 1].text = line.slice(0, typedCount);
    if (typedCount >= line.length) {
      lineIndex += 1;
      typedCount = 0;
      if (lineIndex < WELCOME_LINES.length) state.history.push({ kind: "output", text: "" });
    }
    renderTerminal();
    if (lineIndex >= WELCOME_LINES.length) onDone();
  }, WELCOME_TYPE_INTERVAL_MS);
}

function onWelcomeTyped() {
  stopWelcomeTyping();
  attachInput();
  renderTerminal();
  renderQuickCommands();
  focusInputForDevice();
}

function stopWelcomeTyping() {
  clearInterval(state.welcomeTimer);
  state.welcomeTimer = null;
  state.isTypingWelcome = false;
}

function requirePanel() {
  const panel = document.getElementById("idePanel");
  if (!panel) throw new Error("IDE panel element missing");
  return panel;
}

function requireWindow() {
  const ideWindow = document.getElementById("ideWindow");
  if (!ideWindow) throw new Error("IDE window element missing");
  return ideWindow;
}

function attachInput() {
  const input = requireInput();
  input.value = "";
  input.addEventListener("keydown", onInputKeyDown);
  input.addEventListener("input", onInputChange);
  window.addEventListener("keydown", onStrayKeyDown);
  requirePanel().addEventListener("click", onPanelClick);
}

function detachInput() {
  const input = document.getElementById("ideInput");
  if (!input) return;
  input.removeEventListener("keydown", onInputKeyDown);
  input.removeEventListener("input", onInputChange);
  window.removeEventListener("keydown", onStrayKeyDown);
  requirePanel().removeEventListener("click", onPanelClick);
  input.blur();
}

// Clicking a project box or card moves focus off the hidden input, so typing
// anywhere in the laptop is routed back to the terminal.
function onStrayKeyDown(event) {
  const input = requireInput();
  if (isProjectCardOpen() || document.activeElement === input) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const isPrintable = event.key.length === 1;
  if (!isPrintable && event.key !== "Backspace" && event.key !== "Enter") return;
  event.preventDefault();
  focusInput();
  if (event.key === "Enter") {
    submitInput();
    return;
  }
  input.value = isPrintable ? input.value + event.key : input.value.slice(0, -1);
  state.input = input.value;
  updateInputLine();
  if (isPrintable) sparkFromCaret(event.key);
}

function onPanelClick(event) {
  if (isProjectCardOpen() || event.target.closest("a, button, input")) return;
  focusInputForDevice();
}

function requireInput() {
  const input = document.getElementById("ideInput");
  if (!input) throw new Error("IDE input element missing");
  return input;
}

function onInputChange(event) {
  const isTyping = event.target.value.length > state.input.length;
  state.input = event.target.value;
  updateInputLine();
  if (isTyping) sparkFromCaret(state.input.slice(-1));
}

function sparkFromCaret(character) {
  emitKeySpark(document.querySelector(".ide-line-input .ide-caret"), character);
}

function onInputKeyDown(event) {
  if (event.key === "Enter") {
    submitInput();
    event.preventDefault();
    return;
  }
}

function submitInput() {
  const raw = state.input.trim();
  state.history.push({ kind: "input", text: `${currentPrompt()} ${state.input}` });
  state.input = "";
  requireInput().value = "";
  runCommand(raw);
  render();
}

function runCommand(command) {
  if (command === "") return;
  if (command === ENTER_COMMAND) {
    state.cwd = "~/projects";
    listProjectsInTerminal();
    return;
  }
  if (command === LIST_COMMAND && state.cwd === "~/projects") {
    listProjectsInTerminal();
    return;
  }
  if (command === LIST_COMMAND) {
    state.history.push({ kind: "output", text: "projects  resume.pdf" });
    return;
  }
  if (command === "cd" || command === HOME_COMMAND) {
    state.cwd = "~";
    return;
  }
  if (command === HELP_COMMAND) {
    for (const line of HELP_LINES) state.history.push({ kind: "output", text: line });
    return;
  }
  if (command === CLEAR_COMMAND) {
    state.history = [];
    return;
  }
  if (command === EXIT_COMMAND) {
    closeIDE();
    return;
  }
  if (command === RESUME_COMMAND) {
    state.history.push({ kind: "output", text: `opening ${RESUME_URL} …` });
    window.open(RESUME_URL, "_blank", "noopener");
    return;
  }
  const openMatch = command.match(/^open\s+(\S+)$/);
  if (openMatch) {
    openProjectSlug(openMatch[1].toLowerCase());
    return;
  }
  state.history.push({ kind: "error", text: `command not found: ${command}` });
}

function openProjectSlug(slug) {
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) {
    state.history.push({ kind: "error", text: `open: unknown project '${slug}'` });
    return;
  }
  openCard(slug);
}

function listProjectsInTerminal() {
  state.history.push({ kind: "output", text: PROJECTS.map((p) => p.slug).join("  ") });
}

function currentPrompt() {
  return state.cwd === "~/projects" ? PROMPT_PROJECTS : PROMPT_ROOT;
}

function render() {
  renderTerminal();
  renderQuickCommands();
  renderGrid();
}

function renderTerminal() {
  const terminal = document.getElementById("ideTerminal");
  if (!terminal) return;
  terminal.innerHTML = "";
  for (const entry of state.history) {
    terminal.appendChild(renderHistoryLine(entry));
  }
  if (state.isTypingWelcome) {
    terminal.lastElementChild?.appendChild(createCaret());
  } else {
    terminal.appendChild(renderInputLine());
  }
  terminal.scrollTop = terminal.scrollHeight;
}

function renderHistoryLine(entry) {
  const line = document.createElement("div");
  line.className = `ide-line ide-line-${entry.kind}`;
  line.textContent = entry.text;
  return line;
}

function renderInputLine() {
  const wrapper = document.createElement("div");
  wrapper.className = "ide-line ide-line-input";
  const promptEl = document.createElement("span");
  promptEl.className = "ide-prompt";
  promptEl.textContent = `${currentPrompt()} `;
  const inputEl = document.createElement("span");
  inputEl.className = "ide-input-echo";
  inputEl.id = "ideInputLive";
  inputEl.textContent = state.input;
  wrapper.append(promptEl, inputEl, createCaret());
  wrapper.addEventListener("click", focusInput);
  return wrapper;
}

function createCaret() {
  const caret = document.createElement("span");
  caret.className = "ide-caret";
  return caret;
}

function updateInputLine() {
  const live = document.getElementById("ideInputLive");
  if (!live) {
    renderTerminal();
    return;
  }
  live.textContent = state.input;
  const terminal = document.getElementById("ideTerminal");
  if (terminal) terminal.scrollTop = terminal.scrollHeight;
}

function renderQuickCommands() {
  const container = document.getElementById("ideQuick");
  if (!container) return;
  const shouldShow = isTouchDevice() && !state.isTypingWelcome;
  container.classList.toggle("hidden", !shouldShow);
  if (shouldShow) container.replaceChildren(...QUICK_COMMANDS[state.cwd].map(createQuickCommand));
}

function createQuickCommand(command) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "ide-quick-chip";
  chip.textContent = command;
  chip.addEventListener("click", () => runQuickCommand(command));
  return chip;
}

function runQuickCommand(command) {
  state.input = command;
  submitInput();
}

function renderGrid() {
  const grid = document.getElementById("ideGrid");
  if (!grid) return;
  const shouldShow = state.cwd === "~/projects";
  grid.classList.toggle("hidden", !shouldShow);
  if (shouldShow) renderProjectBoxes(grid, PROJECTS, openCard);
}

function openCard(slug) {
  const project = PROJECTS.find((candidate) => candidate.slug === slug);
  const origin = document.querySelector(`.cli-box[data-slug="${slug}"]`);
  openProjectCard(project, origin, requireWindow());
}

function focusInput() {
  const input = document.getElementById("ideInput");
  input?.focus();
}

function focusInputForDevice() {
  if (isTouchDevice()) return;
  focusInput();
}

function isTouchDevice() {
  return matchMedia("(hover: none)").matches || "ontouchstart" in window;
}

function attachKeyboardInsetListener() {
  if (!window.visualViewport) return;
  window.visualViewport.addEventListener("resize", handleViewportChange);
  window.visualViewport.addEventListener("scroll", handleViewportChange);
  handleViewportChange();
}

function detachKeyboardInsetListener() {
  if (!window.visualViewport) return;
  window.visualViewport.removeEventListener("resize", handleViewportChange);
  window.visualViewport.removeEventListener("scroll", handleViewportChange);
}

function handleViewportChange() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  document.documentElement.style.setProperty("--kb-inset", `${inset}px`);
  scrollTerminalToBottom();
}

function resetKeyboardInset() {
  document.documentElement.style.setProperty("--kb-inset", "0px");
}

function scrollTerminalToBottom() {
  const terminal = document.getElementById("ideTerminal");
  if (terminal) terminal.scrollTop = terminal.scrollHeight;
}
