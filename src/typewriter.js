// Types text into an element and returns a function that finishes it instantly.
export function typewrite(element, text, intervalMs) {
  element.textContent = "";
  element.classList.add("is-typing");
  let typedCount = 0;
  const finish = () => {
    clearInterval(timer);
    element.textContent = text;
    element.classList.remove("is-typing");
  };
  const timer = setInterval(() => {
    typedCount += 1;
    element.textContent = text.slice(0, typedCount);
    if (typedCount >= text.length) finish();
  }, intervalMs);
  return finish;
}
