const TYPE_INTERVAL_MS = 42;
const INTRO_SEGMENTS = [
  { text: "Hi, I'm " },
  { text: "Namish", isAccent: true },
  { text: ".\nI aim to live a " },
  { text: "creative life", isAccent: true },
  { text: ".\nWelcome to my room." },
];
const MESSAGE_LENGTH = INTRO_SEGMENTS.reduce((total, segment) => total + segment.text.length, 0);

export function typeIntroMessage(node) {
  node.classList.remove("done");
  let typedCount = 0;
  const timer = setInterval(() => {
    typedCount += 1;
    renderTypedSegments(node, typedCount);
    if (typedCount < MESSAGE_LENGTH) return;
    clearInterval(timer);
    node.classList.add("done");
  }, TYPE_INTERVAL_MS);
}

function renderTypedSegments(node, typedCount) {
  let remaining = typedCount;
  const parts = [];
  for (const segment of INTRO_SEGMENTS) {
    if (remaining <= 0) break;
    const text = segment.text.slice(0, remaining);
    remaining -= text.length;
    parts.push(segment.isAccent ? createAccent(text) : text);
  }
  node.replaceChildren(...parts);
}

function createAccent(text) {
  const accent = document.createElement("span");
  accent.className = "intro-accent";
  accent.textContent = text;
  return accent;
}
