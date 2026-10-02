import * as THREE from "three";

// The globe's look: warm amber pixel land to match the "TRAVEL" title.
export const GLOBE_STYLE = {
  colors: { land: 0xffc56b, ocean: 0x1c0f08, rim: 0xff8a2a, atmosphere: 0xff7a1a, grid: 0x9a5420, pin: 0xff5a36, hud: 0xffb547, stars: 0xffd9a0 },
  dots: { spacingDegrees: 2.1, size: 0.034, keepFraction: 0.92 },
  blending: THREE.AdditiveBlending,
  graticuleOpacity: 0.2,
  atmosphereStrength: 0.4,
  rimStrength: 0.28,
  starOpacity: 0.5,
};
