class FpsMonitor {
  constructor() {
    this.frameCount = 0;
    this.accumulatedTime = 0;
    this.lastTimestamp = 0;
    this.lastFrameTimestamp = 0;
    this.currentFps = null;

    this.root = document.createElement("div");
    this.root.className = "fps-overlay";

    this.valueElement = document.createElement("span");
    this.valueElement.className = "fps-overlay__value";
    this.valueElement.textContent = "— fps";

    this.root.appendChild(this.valueElement);
    document.body.appendChild(this.root);
    this.refreshDisplay = this.refreshDisplay.bind(this);
    this.displayTimer = window.setInterval(this.refreshDisplay, 250);
    this.refreshDisplay();
  }

  update(time) {
    if (!Number.isFinite(time)) return;
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = time;
      this.lastFrameTimestamp = time;
      return;
    }
    const delta = time - this.lastTimestamp;
    this.lastTimestamp = time;
    if (delta < 0) return;

    this.accumulatedTime += delta;
    this.frameCount += 1;
    this.lastFrameTimestamp = time;

    if (this.accumulatedTime >= 250) {
      const fps = Math.round((this.frameCount * 1000) / this.accumulatedTime);
      this.currentFps = fps;
      this.accumulatedTime = 0;
      this.frameCount = 0;
      this.refreshDisplay();
    }
  }

  refreshDisplay() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const timeSinceLastFrame =
      this.lastFrameTimestamp > 0 ? now - this.lastFrameTimestamp : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(timeSinceLastFrame) || timeSinceLastFrame > 600) {
      this.valueElement.textContent = "idle";
      this.currentFps = null;
      return;
    }

    if (this.currentFps !== null) {
      this.valueElement.textContent = `${this.currentFps} fps`;
    } else {
      this.valueElement.textContent = "— fps";
    }
  }
}

export { FpsMonitor };
