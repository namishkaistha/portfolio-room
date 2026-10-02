const KNOB_RADIUS = 44;

export class Joystick {
  constructor(baseElement, knobElement, onChange) {
    this.base = baseElement;
    this.knob = knobElement;
    this.onChange = onChange;
    this.activeTouchId = null;
    this.center = { x: 0, y: 0 };
  }

  attach() {
    this.base.addEventListener("touchstart", this.onStart, { passive: false });
    this.base.addEventListener("touchmove", this.onMove, { passive: false });
    this.base.addEventListener("touchend", this.onEnd);
    this.base.addEventListener("touchcancel", this.onEnd);
  }

  onStart = (event) => {
    event.preventDefault();
    if (this.activeTouchId !== null) return;
    const touch = event.changedTouches[0];
    this.activeTouchId = touch.identifier;
    const rect = this.base.getBoundingClientRect();
    this.center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.updateKnob(touch);
  };

  onMove = (event) => {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      if (touch.identifier === this.activeTouchId) this.updateKnob(touch);
    }
  };

  onEnd = (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier !== this.activeTouchId) continue;
      this.activeTouchId = null;
      this.resetKnob();
    }
  };

  updateKnob(touch) {
    const dx = touch.clientX - this.center.x;
    const dy = touch.clientY - this.center.y;
    const maxOffset = this.base.clientWidth / 2 - KNOB_RADIUS / 2;
    const distance = Math.hypot(dx, dy);
    const clamped = distance > maxOffset ? maxOffset / distance : 1;
    const offsetX = dx * clamped;
    const offsetY = dy * clamped;
    this.knob.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    const normalized = Math.max(distance, 0.0001) > maxOffset ? 1 : distance / maxOffset;
    const nx = (dx / Math.max(distance, 0.0001)) * normalized;
    const ny = (dy / Math.max(distance, 0.0001)) * normalized;
    this.onChange(nx, -ny);
  }

  resetKnob() {
    this.knob.style.transform = "translate(0px, 0px)";
    this.onChange(0, 0);
  }
}
