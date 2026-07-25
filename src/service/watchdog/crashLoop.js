'use strict';

class CrashLoopDetector {
  constructor(maxCrashes = 3, windowMs = 60000) {
    this.maxCrashes = maxCrashes;
    this.windowMs = windowMs;
    this.timestamps = [];
  }

  recordCrash(timestamp = Date.now()) {
    const now = timestamp;
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    this.timestamps.push(now);
    return this.isLooping();
  }

  isLooping() {
    return this.timestamps.length >= this.maxCrashes;
  }

  reset() {
    this.timestamps = [];
  }
}

module.exports = { CrashLoopDetector };
