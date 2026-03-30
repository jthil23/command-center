import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma - use vi.hoisted so the mock object is available when vi.mock is hoisted
const mockPrisma = vi.hoisted(() => ({
  huntState: {
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { HuntStateTracker } from "@/lib/hunt/state";

describe("HuntStateTracker", () => {
  let tracker: HuntStateTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new HuntStateTracker(24); // 24 hour window
  });

  it("reports unprocessed items as not processed", async () => {
    mockPrisma.huntState.findFirst.mockResolvedValue(null);
    const result = await tracker.isProcessed("sonarr", "123");
    expect(result).toBe(false);
  });

  it("reports processed items as processed", async () => {
    mockPrisma.huntState.findFirst.mockResolvedValue({ id: 1 });
    const result = await tracker.isProcessed("sonarr", "123");
    expect(result).toBe(true);
  });

  it("marks items as processed", async () => {
    mockPrisma.huntState.create.mockResolvedValue({ id: 1 });
    await tracker.markProcessed("sonarr", "123", "Test Episode");
    expect(mockPrisma.huntState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        app: "sonarr",
        itemId: "123",
        itemTitle: "Test Episode",
      }),
    });
  });

  it("cleans expired entries", async () => {
    mockPrisma.huntState.deleteMany.mockResolvedValue({ count: 5 });
    const count = await tracker.cleanExpired();
    expect(count).toBe(5);
  });
});
