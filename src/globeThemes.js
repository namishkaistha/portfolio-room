import * as THREE from "three";

export const DEFAULT_THEME = "original";

const PIXEL_DOTS = { spacingDegrees: 2.1, size: 0.034, keepFraction: 0.92, isRound: false };
const SOFT_DOTS = { spacingDegrees: 1.45, size: 0.02, keepFraction: 0.72, isRound: true };

// Each theme restyles the same globe. `blending` is additive on dark
// backdrops (light adds up) and normal on the light postcard backdrop.
export const GLOBE_THEMES = {
  original: {
    label: "Original",
    colors: { land: 0xb8f1ff, ocean: 0x03080d, rim: 0xffb547, atmosphere: 0xffb547, grid: 0x3c8fb0, pin: 0x3fa9ff, hud: 0x7fdcff, stars: 0x9fd8ff },
    dots: SOFT_DOTS,
    pinShape: "orb",
    blending: THREE.AdditiveBlending,
    graticuleOpacity: 0.22,
    atmosphereStrength: 0.55,
    rimStrength: 0.22,
    starOpacity: 0.55,
  },
  arcade: {
    label: "Arcade",
    colors: { land: 0xffc56b, ocean: 0x1c0f08, rim: 0xff8a2a, atmosphere: 0xff7a1a, grid: 0x9a5420, pin: 0xff5a36, hud: 0xffb547, stars: 0xffd9a0 },
    dots: PIXEL_DOTS,
    pinShape: "block",
    blending: THREE.AdditiveBlending,
    graticuleOpacity: 0.2,
    atmosphereStrength: 0.4,
    rimStrength: 0.28,
    starOpacity: 0.5,
  },
  crt: {
    label: "CRT",
    colors: { land: 0xffb000, ocean: 0x040200, rim: 0xffb000, atmosphere: 0xff9900, grid: 0xffb000, pin: 0xfff1c2, hud: 0xffb000, stars: 0xffb000 },
    dots: { spacingDegrees: 1.45, size: 0.027, keepFraction: 0.85, isRound: true },
    pinShape: "block",
    blending: THREE.AdditiveBlending,
    graticuleOpacity: 0.16,
    atmosphereStrength: 0.3,
    rimStrength: 0.2,
    starOpacity: 0.25,
  },
  postcard: {
    label: "Postcard",
    colors: { land: 0xa84a1f, ocean: 0xe3d3ae, rim: 0x8a5a2b, atmosphere: 0xd9a35c, grid: 0x6b4a2a, pin: 0xd6402a, hud: 0x5a3a1e, stars: 0x8a5a2b },
    dots: { spacingDegrees: 1.7, size: 0.026, keepFraction: 0.85, isRound: true },
    pinShape: "orb",
    blending: THREE.NormalBlending,
    graticuleOpacity: 0.3,
    atmosphereStrength: 0.35,
    rimStrength: 0.3,
    starOpacity: 0.18,
  },
};

export function themeIdFromSearch(search) {
  const requested = new URLSearchParams(search).get("globe");
  return Object.hasOwn(GLOBE_THEMES, requested) ? requested : DEFAULT_THEME;
}

// The style switcher is a preview tool, so it only appears with `?globe` in the URL.
export function isPreviewRequested(search) {
  return new URLSearchParams(search).has("globe");
}
