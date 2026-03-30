import { prisma } from "@/lib/db";

export class HuntStateTracker {
  private windowHours: number;

  constructor(windowHours: number = 24) {
    this.windowHours = windowHours;
  }

  async isProcessed(app: string, itemId: string): Promise<boolean> {
    const entry = await prisma.huntState.findFirst({
      where: {
        app,
        itemId,
        expiresAt: { gt: new Date() },
      },
    });
    return entry !== null;
  }

  async markProcessed(app: string, itemId: string, itemTitle?: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.windowHours);

    await prisma.huntState.create({
      data: { app, itemId, itemTitle: itemTitle ?? null, expiresAt },
    });
  }

  async cleanExpired(): Promise<number> {
    const result = await prisma.huntState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  async getProcessedCount(app: string): Promise<number> {
    return prisma.huntState.count({
      where: { app, expiresAt: { gt: new Date() } },
    });
  }
}
