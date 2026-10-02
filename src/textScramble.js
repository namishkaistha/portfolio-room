const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$/<>*+=";
const GLYPH_CHANGE_MS = 45;

// Letters start as random glyphs and lock into place left to right. Returns a
// function that cancels the animation and shows the final text.
export function scrambleText(element, finalText, durationMs) {
  const start = performance.now();
  let lastGlyphChange = 0;
  let frame = 0;
  const finish = () => {
    cancelAnimationFrame(frame);
    element.textContent = finalText;
  };
  const step = (now) => {
    const progress = Math.min(1, (now - start) / durationMs);
    const lockedCount = Math.floor(progress * finalText.length);
    if (now - lastGlyphChange >= GLYPH_CHANGE_MS) {
      element.textContent = finalText.slice(0, lockedCount) + randomGlyphs(finalText.length - lockedCount);
      lastGlyphChange = now;
    }
    if (progress < 1) frame = requestAnimationFrame(step);
    else finish();
  };
  frame = requestAnimationFrame(step);
  return finish;
}

function randomGlyphs(count) {
  let text = "";
  for (let index = 0; index < count; index += 1) text += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  return text;
}
