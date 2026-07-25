export class CrashLoopDetector {
  public maxCrashes: number;
  public windowMs: number;
  public timestamps: number[];

  constructor(maxCrashes: number = 3, windowMs: number = 60000) {
    this.maxCrashes = maxCrashes;
    this.windowMs = windowMs;
    this.timestamps = [];
  }

  public recordCrash(timestamp: number = Date.now()): boolean {
    const now = timestamp;
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    this.timestamps.push(now);
    return this.isLooping();
  }

  public isLooping(): boolean {
    return this.timestamps.length >= this.maxCrashes;
  }

  public reset(): void {
    this.timestamps = [];
  }
}
