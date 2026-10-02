import { createSvgElement } from "./dom.js";

const ICON_SIZE = 24;
const STROKE_WIDTH = 1.6;
const BLACK_KEY_STROKE_WIDTH = 2.6;

const ICON_SHAPES = {
  code: [
    ["path", { d: "M8 7l-5 5 5 5" }],
    ["path", { d: "M16 7l5 5-5 5" }],
    ["path", { d: "M14 4l-4 16" }],
  ],
  camera: [
    ["path", { d: "M3 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z" }],
    ["path", { d: "M16 11l5-3v8l-5-3" }],
  ],
  music: [
    ["path", { d: "M9 18V6l10-2v12" }],
    ["circle", { cx: 6, cy: 18, r: 3 }],
    ["circle", { cx: 16, cy: 16, r: 3 }],
  ],
  dumbbell: [
    ["path", { d: "M6 7v10" }],
    ["path", { d: "M18 7v10" }],
    ["path", { d: "M3 10v4" }],
    ["path", { d: "M21 10v4" }],
    ["path", { d: "M6 12h12" }],
  ],
  target: [
    ["circle", { cx: 12, cy: 12, r: 9 }],
    ["circle", { cx: 12, cy: 12, r: 5 }],
    ["circle", { cx: 12, cy: 12, r: 1 }],
  ],
  spark: [["path", { d: "M12 3l2.4 6.1L21 12l-6.6 2.9L12 21l-2.4-6.1L3 12l6.6-2.9z" }]],
  linkedin: [
    ["circle", { cx: 6.5, cy: 6.5, r: 1.4 }],
    ["path", { d: "M6.5 10.5V18" }],
    ["path", { d: "M11 18v-7.5" }],
    ["path", { d: "M11 13.5c0-2 1.4-3 3-3s3.2 1 3.2 3.4V18" }],
  ],
  instagram: [
    ["rect", { x: 3.5, y: 3.5, width: 17, height: 17, rx: 5 }],
    ["circle", { cx: 12, cy: 12, r: 4 }],
    ["circle", { cx: 17.2, cy: 6.8, r: 0.6 }],
  ],
  tiktok: [
    ["path", { d: "M14 4v10.2a3.6 3.6 0 1 1-3.6-3.6" }],
    ["path", { d: "M14 4c.3 2.5 2.1 4.1 5 4.3" }],
  ],
  substack: [
    ["path", { d: "M5 5h14" }],
    ["path", { d: "M5 9h14" }],
    ["path", { d: "M5 13h14v7.5l-7-4.2-7 4.2z" }],
  ],
  mail: [
    ["rect", { x: 3, y: 5.5, width: 18, height: 13, rx: 2 }],
    ["path", { d: "M3.5 7.5l8.5 6.2 8.5-6.2" }],
  ],
  document: [
    ["path", { d: "M7 3h7l5 5v13H7z" }],
    ["path", { d: "M14 3v5h5" }],
    ["path", { d: "M10 13h6" }],
    ["path", { d: "M10 17h6" }],
  ],
  piano: [
    ["rect", { x: 3, y: 5, width: 18, height: 14, rx: 1 }],
    ["path", { d: "M6 12v7" }],
    ["path", { d: "M12 12v7" }],
    ["path", { d: "M18 12v7" }],
    ["path", { d: "M9 5v7", class: "piano-key", style: "--k:0", "stroke-width": BLACK_KEY_STROKE_WIDTH }],
    ["path", { d: "M15 5v7", class: "piano-key", style: "--k:1", "stroke-width": BLACK_KEY_STROKE_WIDTH }],
  ],
};

export function createIcon(name) {
  const icon = createSvgElement("svg", {
    viewBox: `0 0 ${ICON_SIZE} ${ICON_SIZE}`,
    class: `icon icon-${name}`,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": STROKE_WIDTH,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  });
  for (const [tag, attributes] of ICON_SHAPES[name]) icon.append(createSvgElement(tag, { pathLength: 1, ...attributes }));
  return icon;
}
