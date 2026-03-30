import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "@/lib/hunt/rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(5); // 5 calls per hour
  });

  it("allows calls under the limit", () => {
    expect(limiter.canCall("sonarr")).toBe(true);
    limiter.recordCall("sonarr");
    limiter.recordCall("sonarr");
    expect(limiter.canCall("sonarr")).toBe(true);
    expect(limiter.remaining("sonarr")).toBe(3);
  });

  it("blocks calls at the limit", () => {
    for (let i = 0; i < 5; i++) limiter.recordCall("sonarr");
    expect(limiter.canCall("sonarr")).toBe(false);
    expect(limiter.remaining("sonarr")).toBe(0);
  });

  it("tracks apps independently", () => {
    for (let i = 0; i < 5; i++) limiter.recordCall("sonarr");
    expect(limiter.canCall("sonarr")).toBe(false);
    expect(limiter.canCall("radarr")).toBe(true);
  });

  it("resets after an hour", () => {
    for (let i = 0; i < 5; i++) limiter.recordCall("sonarr");
    expect(limiter.canCall("sonarr")).toBe(false);
    limiter.reset("sonarr");
    expect(limiter.canCall("sonarr")).toBe(true);
  });
});
