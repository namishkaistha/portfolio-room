const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function create(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function createSvgElement(tag, attributes) {
  const node = document.createElementNS(SVG_NAMESPACE, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

// Restarts a CSS animation that is driven by a class.
export function replayAnimation(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

export function element(id) {
  return document.getElementById(id);
}

export function isTouchDevice() {
  return matchMedia("(hover: none)").matches || "ontouchstart" in window;
}

// Pointer position over `target` as normalized device coordinates (-1 to 1),
// the form a raycaster expects.
export function pointerToDevice(event, target) {
  const rect = target.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: -((event.clientY - rect.top) / rect.height) * 2 + 1 };
}

// Tapping the dimmed area around a window (not the window itself) steps back out.
export function closeOnBackdropClick(backdrop, close) {
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
}
