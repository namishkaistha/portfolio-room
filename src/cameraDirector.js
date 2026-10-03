import { easeInOutCubic } from "./motion.js";

export class CameraDirector {
  constructor(camera, lookTarget) {
    this.camera = camera;
    this.look = lookTarget.clone();
    this.flight = null;
  }

  flyTo(view, seconds) {
    return new Promise((resolve) => {
      this.flight = {
        fromPosition: this.camera.position.clone(),
        fromLook: this.look.clone(),
        view,
        seconds,
        elapsed: 0,
        resolve,
      };
    });
  }

  update(deltaSeconds) {
    if (!this.flight) return;
    const flight = this.flight;
    flight.elapsed += deltaSeconds;
    const progress = Math.min(1, flight.elapsed / flight.seconds);
    const eased = easeInOutCubic(progress);
    this.camera.position.lerpVectors(flight.fromPosition, flight.view.position, eased);
    this.look.lerpVectors(flight.fromLook, flight.view.look, eased);
    this.camera.lookAt(this.look);
    if (progress < 1) return;
    this.flight = null;
    flight.resolve();
  }
}
