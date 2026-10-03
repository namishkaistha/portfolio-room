import { renderGarmentPhotos } from "./renderGarmentPhotos.js";

window.wardrobeTools = { renderGarmentPhotos };

document.getElementById("renderPhotos").addEventListener("click", async () => {
  for (const [id, dataUrl] of Object.entries(await renderGarmentPhotos())) download(`${id}.webp`, dataUrl);
});

function download(name, href) {
  const link = Object.assign(document.createElement("a"), { href, download: name });
  link.click();
}
