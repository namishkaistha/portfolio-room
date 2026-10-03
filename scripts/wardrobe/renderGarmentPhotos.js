import { createGarmentViewer } from "../../src/garmentViewer.js";
import manifest from "../../src/wardrobeManifest.json";

// Renders the still of each garment that the Fashion panel shows, as
// transparent WebP files for public/wardrobe/photos/<garment id>.webp.
const PHOTO = { width: 480, height: 640, yaw: -0.38, tilt: 0.1, mimeType: "image/webp" };

export async function renderGarmentPhotos() {
  const viewer = createGarmentViewer();
  viewer.canvas.style.cssText = `width:${PHOTO.width}px;height:${PHOTO.height}px;position:fixed;left:0;top:0`;
  document.body.append(viewer.canvas);
  const photos = {};
  for (const garment of manifest.garments) {
    await viewer.show(`/wardrobe/${garment.file}`);
    photos[garment.id] = viewer.capture(PHOTO);
  }
  viewer.canvas.remove();
  return photos;
}
