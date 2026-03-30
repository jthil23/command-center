interface AppCalls {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private calls = new Map<string, AppCalls>();
  private windowMs = 60 * 60 * 1000; // 1 hour

  constructor(private hourlyCap: number) {}

  private getWindow(app: string): AppCalls {
    const now = Date.now();
    const existing = this.calls.get(app);

    if (!existing || now - existing.windowStart >= this.windowMs) {
      const fresh = { count: 0, windowStart: now };
      this.calls.set(app, fresh);
      return fresh;
    }

    return existing;
  }

  canCall(app: string): boolean {
    return this.getWindow(app).count < this.hourlyCap;
  }

  recordCall(app: string): void {
    const window = this.getWindow(app);
    window.count++;
  }

  remaining(app: string): number {
    return Math.max(0, this.hourlyCap - this.getWindow(app).count);
  }

  reset(app: string): void {
    this.calls.delete(app);
  }

  status(app: string): { remaining: number; resetsAt: Date } {
    const window = this.getWindow(app);
    return {
      remaining: Math.max(0, this.hourlyCap - window.count),
      resetsAt: new Date(window.windowStart + this.windowMs),
    };
  }
}
