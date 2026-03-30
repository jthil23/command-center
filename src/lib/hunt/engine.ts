import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { RateLimiter } from "./rate-limiter";
import { HuntStateTracker } from "./state";
import { scanMissing, scanCutoffUnmet, triggerSearch, getQueueDepth, type SupportedApp } from "./scanner";
import type { HuntResult } from "@/lib/arr/common";

const rateLimiters = new Map<string, RateLimiter>();
const stateTracker = new HuntStateTracker(24);

function getRateLimiter(app: string): RateLimiter {
  if (!rateLimiters.has(app)) {
    const config = getConfig();
    const appConfig = config.hunt[app as keyof typeof config.hunt];
    const hourlyCap = (typeof appConfig === "object" && appConfig?.hourlyCap) || config.hunt.defaults.hourlyCap;
    rateLimiters.set(app, new RateLimiter(hourlyCap));
  }
  return rateLimiters.get(app)!;
}

export interface HuntStatus {
  app: string;
  running: boolean;
  lastRun?: { startedAt: Date; status: string; itemsSearched: number; message?: string | null };
  rateLimit: { remaining: number; resetsAt: Date };
  processedCount: number;
}

const activeHunts = new Set<string>();

export async function getHuntStatus(app: SupportedApp): Promise<HuntStatus> {
  const limiter = getRateLimiter(app);
  const lastRun = await prisma.huntRun.findFirst({
    where: { app },
    orderBy: { startedAt: "desc" },
  });
  const processedCount = await stateTracker.getProcessedCount(app);

  return {
    app,
    running: activeHunts.has(app),
    lastRun: lastRun ? {
      startedAt: lastRun.startedAt,
      status: lastRun.status,
      itemsSearched: lastRun.itemsSearched,
      message: lastRun.message,
    } : undefined,
    rateLimit: limiter.status(app),
    processedCount,
  };
}

export async function runHunt(
  app: SupportedApp,
  runType: "missing" | "upgrade" = "missing"
): Promise<HuntResult> {
  if (activeHunts.has(app)) {
    throw new Error(`Hunt already running for ${app}`);
  }

  activeHunts.add(app);
  const startTime = Date.now();
  const config = getConfig();
  const appConfig = config.hunt[app as keyof typeof config.hunt];
  const batchSize = (typeof appConfig === "object" && appConfig?.batchSize) || config.hunt.defaults.batchSize;
  const queueThreshold = (typeof appConfig === "object" && appConfig?.queueThreshold) || config.hunt.defaults.queueThreshold;
  const limiter = getRateLimiter(app);

  let itemsFound = 0;
  let itemsSearched = 0;
  let errors = 0;
  let message = "";

  try {
    // Check queue depth
    const queueDepth = await getQueueDepth(app);
    if (queueDepth >= queueThreshold) {
      message = `Paused: queue depth (${queueDepth}) exceeds threshold (${queueThreshold})`;
      return saveResult(app, runType, startTime, itemsFound, itemsSearched, errors, "paused", message);
    }

    // Scan for items
    const items = runType === "missing"
      ? await scanMissing(app)
      : await scanCutoffUnmet(app);
    itemsFound = items.length;

    if (items.length === 0) {
      message = "No items found";
      return saveResult(app, runType, startTime, 0, 0, 0, "completed", message);
    }

    // Filter already-processed items
    const unprocessed = [];
    for (const item of items) {
      if (await stateTracker.isProcessed(app, String(item.id))) continue;
      unprocessed.push(item);
      if (unprocessed.length >= batchSize) break;
    }

    if (unprocessed.length === 0) {
      message = `All ${itemsFound} items already processed`;
      return saveResult(app, runType, startTime, itemsFound, 0, 0, "completed", message);
    }

    // Search in batches, respecting rate limit
    const batch = unprocessed.slice(0, batchSize);
    for (const item of batch) {
      if (!limiter.canCall(app)) {
        message = `Rate limited after ${itemsSearched} searches`;
        break;
      }

      try {
        await triggerSearch(app, [item.id]);
        limiter.recordCall(app);
        await stateTracker.markProcessed(app, String(item.id), item.title);
        itemsSearched++;
      } catch (err) {
        errors++;
      }
    }

    message = `Searched ${itemsSearched}/${itemsFound} items`;
    return saveResult(app, runType, startTime, itemsFound, itemsSearched, errors, "completed", message);
  } catch (err) {
    errors++;
    message = err instanceof Error ? err.message : "Unknown error";
    return saveResult(app, runType, startTime, itemsFound, itemsSearched, errors, "error", message);
  } finally {
    activeHunts.delete(app);
  }
}

async function saveResult(
  app: string,
  runType: string,
  startTime: number,
  itemsFound: number,
  itemsSearched: number,
  errors: number,
  status: string,
  message: string
): Promise<HuntResult> {
  const duration = Date.now() - startTime;

  await prisma.huntRun.create({
    data: {
      app,
      runType,
      itemsFound,
      itemsSearched,
      errors,
      duration,
      status,
      message,
      completedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      source: "hunt",
      type: status === "error" ? "error" : "info",
      message: `Hunt ${app} (${runType}): ${message}`,
      metadata: JSON.stringify({ app, runType, itemsFound, itemsSearched, errors }),
    },
  });

  return { app, runType: runType as "missing" | "upgrade", itemsFound, itemsSearched, errors, duration };
}

export async function getHuntHistory(app?: string, limit: number = 20) {
  return prisma.huntRun.findMany({
    where: app ? { app } : undefined,
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}
