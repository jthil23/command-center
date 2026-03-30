# Phase 2: Media Page + Hunt Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Media page with *arr API integration, manual triggers, queue monitoring, and a full Huntarr-replacement hunt engine with batch processing, rate limiting, and state tracking.

**Architecture:** *arr API clients in `src/lib/arr/`, hunt engine core in `src/lib/hunt/`, API routes in `src/app/api/media/` and `src/app/api/hunt/`, Media page with tabbed UI at `src/app/media/`.

**Tech Stack:** Next.js 15 (existing), Prisma (existing MariaDB schema with HuntState/HuntRun tables), *arr REST APIs, shadcn/ui Tabs

**Spec:** `docs/superpowers/specs/2026-03-30-command-center-design.md` Section 4.3

**Existing code to build on:**
- `src/types/index.ts` — AppConfig, HuntConfig, HuntAppConfig types
- `src/lib/config.ts` — getConfig() for service URLs and API keys
- `src/lib/db.ts` — Prisma client (lazy proxy, Prisma v7 with MariaDB adapter)
- `prisma/schema.prisma` — HuntState, HuntRun models already exist
- `src/lib/icons.ts` — getServiceIcon() for *arr app icons
- `src/app/media/page.tsx` — placeholder page (replace)

**IMPORTANT Prisma v7 notes for all agents:**
- Import from `../../generated/prisma/client` (NOT `@prisma/client`)
- Read `src/lib/db.ts` before writing any code that uses prisma
- The `prisma` export is a lazy Proxy — use it normally, it auto-initializes

---

## File Structure

```
src/
├── lib/
│   └── arr/
│       ├── client.ts          # Base *arr API client (shared HTTP logic)
│       ├── sonarr.ts          # Sonarr-specific API methods
│       ├── radarr.ts          # Radarr-specific API methods
│       ├── common.ts          # Shared types for *arr responses
│       └── seerr.ts           # Seerr/Overseerr API methods
│   └── hunt/
│       ├── engine.ts          # Hunt engine core (orchestrates hunts)
│       ├── scanner.ts         # Missing/cutoff scanner per app
│       ├── rate-limiter.ts    # Hourly API cap tracking
│       └── state.ts           # State tracking (processed items in MariaDB)
├── app/
│   ├── media/
│   │   └── page.tsx           # Media page with tabbed layout
│   └── api/
│       ├── media/
│       │   ├── queues/route.ts       # GET queue status across all *arr apps
│       │   ├── triggers/route.ts     # POST manual triggers (RSS sync, search missing, etc.)
│       │   └── missing/route.ts      # GET missing items for a specific app
│       └── hunt/
│           ├── route.ts              # GET hunt status, POST start/stop hunt
│           ├── config/route.ts       # GET/PUT hunt config per app
│           └── history/route.ts      # GET hunt run history
├── components/
│   ├── media-queues.tsx       # Queue status cards for all *arr apps
│   ├── media-triggers.tsx     # Manual trigger buttons per app
│   ├── missing-items.tsx      # Missing items table with per-item search
│   ├── hunt-dashboard.tsx     # Hunt status, controls, rate limit display
│   └── hunt-history.tsx       # Hunt run history table
└── types/
    └── index.ts               # Add new media/hunt types (extend existing)

__tests__/
├── lib/
│   ├── arr/client.test.ts     # *arr API client tests
│   └── hunt/
│       ├── rate-limiter.test.ts  # Rate limiter tests
│       └── state.test.ts         # State tracking tests
```

---

### Task 1: *arr Base API Client

**Files:**
- Create: `src/lib/arr/client.ts`
- Create: `src/lib/arr/common.ts`
- Create: `__tests__/lib/arr/client.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/arr/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArrClient } from "@/lib/arr/client";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ArrClient", () => {
  let client: ArrClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ArrClient("http://localhost:8989", "test-api-key");
  });

  it("makes GET requests with API key header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: "4.0" }),
    });

    const result = await client.get("/api/v3/system/status");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8989/api/v3/system/status",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Api-Key": "test-api-key" }),
      })
    );
    expect(result).toEqual({ version: "4.0" });
  });

  it("makes POST requests with JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await client.post("/api/v3/command", { name: "RssSync" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8989/api/v3/command",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "RssSync" }),
      })
    );
    expect(result).toEqual({ success: true });
  });

  it("throws on non-OK responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(client.get("/api/v3/system/status")).rejects.toThrow("401");
  });

  it("respects timeout", async () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    );

    const fastClient = new ArrClient("http://localhost:8989", "key", 100);
    await expect(fastClient.get("/test")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/arr/client.test.ts
```

Expected: FAIL — `@/lib/arr/client` not found.

- [ ] **Step 3: Write common types**

Create `src/lib/arr/common.ts`:
```typescript
export interface ArrQueueItem {
  id: number;
  title: string;
  status: string;
  size: number;
  sizeleft: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  trackedDownloadStatus?: string;
  trackedDownloadState?: string;
  downloadClient?: string;
}

export interface ArrQueueResponse {
  totalRecords: number;
  records: ArrQueueItem[];
}

export interface SonarrEpisode {
  id: number;
  seriesId: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  airDateUtc?: string;
  monitored: boolean;
  hasFile: boolean;
}

export interface SonarrSeries {
  id: number;
  title: string;
  monitored: boolean;
  statistics?: { episodeFileCount: number; episodeCount: number; percentOfEpisodes: number };
}

export interface RadarrMovie {
  id: number;
  title: string;
  year: number;
  monitored: boolean;
  hasFile: boolean;
  movieFile?: { quality: { quality: { name: string } } };
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
}

export interface MissingItem {
  id: number;
  appId: string;
  title: string;
  subtitle?: string;
  year?: number;
  monitored: boolean;
  airDate?: string;
}

export interface SeerrRequest {
  id: number;
  type: "movie" | "tv";
  status: number;
  media: { tmdbId: number; tvdbId?: number; status: number };
  requestedBy: { displayName: string };
  createdAt: string;
}

export interface HuntResult {
  app: string;
  runType: "missing" | "upgrade";
  itemsFound: number;
  itemsSearched: number;
  errors: number;
  duration: number;
}
```

- [ ] **Step 4: Write base API client**

Create `src/lib/arr/client.ts`:
```typescript
export class ArrClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private timeoutMs: number = 30000
  ) {}

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": this.apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${url.pathname}`);
    }

    return res.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${url.pathname}`);
    }

    return res.json() as Promise<T>;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/arr/client.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/arr/client.ts src/lib/arr/common.ts __tests__/lib/arr/client.test.ts
git commit -m "feat: add base *arr API client with common types"
```

---

### Task 2: Sonarr & Radarr API Clients

**Files:**
- Create: `src/lib/arr/sonarr.ts`
- Create: `src/lib/arr/radarr.ts`

- [ ] **Step 1: Write Sonarr client**

Create `src/lib/arr/sonarr.ts`:
```typescript
import { ArrClient } from "./client";
import type { ArrQueueResponse, SonarrEpisode, SonarrSeries, MissingItem } from "./common";

export class SonarrClient {
  private client: ArrClient;

  constructor(baseUrl: string, apiKey: string) {
    this.client = new ArrClient(baseUrl, apiKey);
  }

  async getQueue(): Promise<ArrQueueResponse> {
    return this.client.get("/api/v3/queue", {
      pageSize: "50",
      includeUnknownSeriesItems: "true",
    });
  }

  async getMissing(): Promise<MissingItem[]> {
    const series = await this.client.get<SonarrSeries[]>("/api/v3/series");
    const missing: MissingItem[] = [];

    for (const s of series) {
      if (!s.monitored) continue;
      const episodes = await this.client.get<SonarrEpisode[]>("/api/v3/episode", {
        seriesId: String(s.id),
      });

      for (const ep of episodes) {
        if (!ep.monitored || ep.hasFile) continue;
        // Skip future episodes
        if (ep.airDateUtc && new Date(ep.airDateUtc) > new Date()) continue;

        missing.push({
          id: ep.id,
          appId: `sonarr-${ep.id}`,
          title: s.title,
          subtitle: `S${String(ep.seasonNumber).padStart(2, "0")}E${String(ep.episodeNumber).padStart(2, "0")} - ${ep.title}`,
          monitored: ep.monitored,
          airDate: ep.airDateUtc,
        });
      }
    }

    return missing;
  }

  async getCutoffUnmet(): Promise<MissingItem[]> {
    const response = await this.client.get<{ records: Array<{ id: number; series: { title: string }; seasonNumber: number; episodeNumber: number; title: string }> }>(
      "/api/v3/wanted/cutoff",
      { pageSize: "100" }
    );

    return response.records.map((r) => ({
      id: r.id,
      appId: `sonarr-cutoff-${r.id}`,
      title: r.series.title,
      subtitle: `S${String(r.seasonNumber).padStart(2, "0")}E${String(r.episodeNumber).padStart(2, "0")} - ${r.title}`,
      monitored: true,
    }));
  }

  async rssSync(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "RssSync" });
  }

  async searchEpisodes(episodeIds: number[]): Promise<void> {
    await this.client.post("/api/v3/command", {
      name: "EpisodeSearch",
      episodeIds,
    });
  }

  async searchSeason(seriesId: number, seasonNumber: number): Promise<void> {
    await this.client.post("/api/v3/command", {
      name: "SeasonSearch",
      seriesId,
      seasonNumber,
    });
  }

  async searchAllMissing(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "MissingEpisodeSearch" });
  }
}
```

- [ ] **Step 2: Write Radarr client**

Create `src/lib/arr/radarr.ts`:
```typescript
import { ArrClient } from "./client";
import type { ArrQueueResponse, RadarrMovie, MissingItem } from "./common";

export class RadarrClient {
  private client: ArrClient;

  constructor(baseUrl: string, apiKey: string) {
    this.client = new ArrClient(baseUrl, apiKey);
  }

  async getQueue(): Promise<ArrQueueResponse> {
    return this.client.get("/api/v3/queue", { pageSize: "50" });
  }

  async getMissing(): Promise<MissingItem[]> {
    const movies = await this.client.get<RadarrMovie[]>("/api/v3/movie");

    return movies
      .filter((m) => m.monitored && !m.hasFile)
      .filter((m) => {
        // Skip movies not yet released
        const releaseDate = m.digitalRelease ?? m.physicalRelease ?? m.inCinemas;
        if (releaseDate && new Date(releaseDate) > new Date()) return false;
        return true;
      })
      .map((m) => ({
        id: m.id,
        appId: `radarr-${m.id}`,
        title: m.title,
        year: m.year,
        monitored: m.monitored,
      }));
  }

  async getCutoffUnmet(): Promise<MissingItem[]> {
    const response = await this.client.get<{ records: RadarrMovie[] }>(
      "/api/v3/wanted/cutoff",
      { pageSize: "100" }
    );

    return response.records.map((m) => ({
      id: m.id,
      appId: `radarr-cutoff-${m.id}`,
      title: m.title,
      year: m.year,
      monitored: m.monitored,
    }));
  }

  async rssSync(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "RssSync" });
  }

  async searchMovies(movieIds: number[]): Promise<void> {
    await this.client.post("/api/v3/command", {
      name: "MoviesSearch",
      movieIds,
    });
  }

  async searchAllMissing(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "MissingMoviesSearch" });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/arr/sonarr.ts src/lib/arr/radarr.ts
git commit -m "feat: add Sonarr and Radarr API clients"
```

---

### Task 3: Seerr API Client

**Files:**
- Create: `src/lib/arr/seerr.ts`

- [ ] **Step 1: Write Seerr client**

Create `src/lib/arr/seerr.ts`:
```typescript
import type { SeerrRequest } from "./common";

export class SeerrClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  async getPendingRequests(): Promise<SeerrRequest[]> {
    const data = await this.fetch<{ results: SeerrRequest[] }>(
      "/api/v1/request?take=50&filter=pending&sort=added"
    );
    return data.results;
  }

  async approveRequest(requestId: number): Promise<void> {
    await this.fetch(`/api/v1/request/${requestId}/approve`, {
      method: "POST",
    });
  }

  async denyRequest(requestId: number): Promise<void> {
    await this.fetch(`/api/v1/request/${requestId}/decline`, {
      method: "POST",
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/arr/seerr.ts
git commit -m "feat: add Seerr API client with approve/deny"
```

---

### Task 4: Hunt Engine — Rate Limiter & State Tracker

**Files:**
- Create: `src/lib/hunt/rate-limiter.ts`
- Create: `src/lib/hunt/state.ts`
- Create: `__tests__/lib/hunt/rate-limiter.test.ts`
- Create: `__tests__/lib/hunt/state.test.ts`

- [ ] **Step 1: Write rate limiter test**

Create `__tests__/lib/hunt/rate-limiter.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/hunt/rate-limiter.test.ts
```

- [ ] **Step 3: Write rate limiter**

Create `src/lib/hunt/rate-limiter.ts`:
```typescript
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
```

- [ ] **Step 4: Run rate limiter tests**

```bash
npx vitest run __tests__/lib/hunt/rate-limiter.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Write state tracker test**

Create `__tests__/lib/hunt/state.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HuntStateTracker } from "@/lib/hunt/state";

// Mock Prisma
const mockPrisma = {
  huntState: {
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

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
```

- [ ] **Step 6: Run state test to verify it fails**

```bash
npx vitest run __tests__/lib/hunt/state.test.ts
```

- [ ] **Step 7: Write state tracker**

Create `src/lib/hunt/state.ts`:
```typescript
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
```

- [ ] **Step 8: Run state tests**

```bash
npx vitest run __tests__/lib/hunt/state.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/hunt/rate-limiter.ts src/lib/hunt/state.ts __tests__/lib/hunt/rate-limiter.test.ts __tests__/lib/hunt/state.test.ts
git commit -m "feat: add hunt engine rate limiter and state tracker"
```

---

### Task 5: Hunt Engine Core

**Files:**
- Create: `src/lib/hunt/scanner.ts`
- Create: `src/lib/hunt/engine.ts`

- [ ] **Step 1: Write scanner**

Create `src/lib/hunt/scanner.ts`:
```typescript
import { SonarrClient } from "@/lib/arr/sonarr";
import { RadarrClient } from "@/lib/arr/radarr";
import { getConfig } from "@/lib/config";
import type { MissingItem } from "@/lib/arr/common";

export type SupportedApp = "sonarr" | "radarr";

export function createAppClient(app: SupportedApp): SonarrClient | RadarrClient {
  const config = getConfig();
  const svc = config.services[app];
  if (!svc?.url || !svc?.apiKey) {
    throw new Error(`${app} is not configured (missing url or apiKey)`);
  }

  switch (app) {
    case "sonarr":
      return new SonarrClient(svc.url, svc.apiKey);
    case "radarr":
      return new RadarrClient(svc.url, svc.apiKey);
  }
}

export async function scanMissing(app: SupportedApp): Promise<MissingItem[]> {
  const client = createAppClient(app);
  return client.getMissing();
}

export async function scanCutoffUnmet(app: SupportedApp): Promise<MissingItem[]> {
  const client = createAppClient(app);
  return client.getCutoffUnmet();
}

export async function triggerSearch(app: SupportedApp, itemIds: number[]): Promise<void> {
  const client = createAppClient(app);
  if (app === "sonarr") {
    const sonarr = client as SonarrClient;
    await sonarr.searchEpisodes(itemIds);
  } else {
    const radarr = client as RadarrClient;
    await radarr.searchMovies(itemIds);
  }
}

export async function getQueueDepth(app: SupportedApp): Promise<number> {
  const client = createAppClient(app);
  const queue = await client.getQueue();
  return queue.totalRecords;
}
```

- [ ] **Step 2: Write hunt engine**

Create `src/lib/hunt/engine.ts`:
```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/hunt/scanner.ts src/lib/hunt/engine.ts
git commit -m "feat: add hunt engine core with batch processing and queue awareness"
```

---

### Task 6: Media & Hunt API Routes

**Files:**
- Create: `src/app/api/media/queues/route.ts`
- Create: `src/app/api/media/triggers/route.ts`
- Create: `src/app/api/media/missing/route.ts`
- Create: `src/app/api/hunt/route.ts`
- Create: `src/app/api/hunt/history/route.ts`

- [ ] **Step 1: Queue status API**

Create `src/app/api/media/queues/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { SonarrClient } from "@/lib/arr/sonarr";
import { RadarrClient } from "@/lib/arr/radarr";
import { SeerrClient } from "@/lib/arr/seerr";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  const queues: Record<string, unknown> = {};

  try {
    if (config.services.sonarr?.apiKey) {
      const sonarr = new SonarrClient(config.services.sonarr.url, config.services.sonarr.apiKey);
      queues.sonarr = await sonarr.getQueue();
    }
  } catch { queues.sonarr = { error: "unavailable" }; }

  try {
    if (config.services.radarr?.apiKey) {
      const radarr = new RadarrClient(config.services.radarr.url, config.services.radarr.apiKey);
      queues.radarr = await radarr.getQueue();
    }
  } catch { queues.radarr = { error: "unavailable" }; }

  try {
    if (config.services.seerr?.apiKey) {
      const seerr = new SeerrClient(config.services.seerr.url, config.services.seerr.apiKey);
      queues.seerr = { requests: await seerr.getPendingRequests() };
    }
  } catch { queues.seerr = { error: "unavailable" }; }

  return NextResponse.json(queues);
}
```

- [ ] **Step 2: Trigger API**

Create `src/app/api/media/triggers/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { SonarrClient } from "@/lib/arr/sonarr";
import { RadarrClient } from "@/lib/arr/radarr";
import { SeerrClient } from "@/lib/arr/seerr";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { app, action, id } = await request.json();
  const config = getConfig();

  try {
    if (app === "sonarr" && config.services.sonarr?.apiKey) {
      const sonarr = new SonarrClient(config.services.sonarr.url, config.services.sonarr.apiKey);
      switch (action) {
        case "rssSync": await sonarr.rssSync(); break;
        case "searchMissing": await sonarr.searchAllMissing(); break;
        case "searchEpisode": await sonarr.searchEpisodes([id]); break;
      }
    } else if (app === "radarr" && config.services.radarr?.apiKey) {
      const radarr = new RadarrClient(config.services.radarr.url, config.services.radarr.apiKey);
      switch (action) {
        case "rssSync": await radarr.rssSync(); break;
        case "searchMissing": await radarr.searchAllMissing(); break;
        case "searchMovie": await radarr.searchMovies([id]); break;
      }
    } else if (app === "seerr" && config.services.seerr?.apiKey) {
      const seerr = new SeerrClient(config.services.seerr.url, config.services.seerr.apiKey);
      switch (action) {
        case "approve": await seerr.approveRequest(id); break;
        case "deny": await seerr.denyRequest(id); break;
      }
    } else {
      return NextResponse.json({ error: `${app} not configured` }, { status: 400 });
    }

    await prisma.activityLog.create({
      data: {
        source: "media",
        type: action,
        message: `${app}: ${action}${id ? ` (ID: ${id})` : ""}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Missing items API**

Create `src/app/api/media/missing/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { scanMissing, scanCutoffUnmet, type SupportedApp } from "@/lib/hunt/scanner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const app = url.searchParams.get("app") as SupportedApp;
  const type = url.searchParams.get("type") ?? "missing";

  if (!app || !["sonarr", "radarr"].includes(app)) {
    return NextResponse.json({ error: "Invalid app" }, { status: 400 });
  }

  try {
    const items = type === "cutoff"
      ? await scanCutoffUnmet(app)
      : await scanMissing(app);
    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Hunt control API**

Create `src/app/api/hunt/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getHuntStatus, runHunt, type HuntStatus } from "@/lib/hunt/engine";
import type { SupportedApp } from "@/lib/hunt/scanner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const app = url.searchParams.get("app") as SupportedApp | null;

  const apps: SupportedApp[] = app ? [app] : ["sonarr", "radarr"];
  const statuses: HuntStatus[] = [];

  for (const a of apps) {
    try {
      statuses.push(await getHuntStatus(a));
    } catch {
      // App not configured
    }
  }

  return NextResponse.json(statuses);
}

export async function POST(request: Request) {
  const { app, runType } = await request.json();

  if (!app || !["sonarr", "radarr"].includes(app)) {
    return NextResponse.json({ error: "Invalid app" }, { status: 400 });
  }

  try {
    const result = await runHunt(app, runType ?? "missing");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Hunt history API**

Create `src/app/api/hunt/history/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getHuntHistory } from "@/lib/hunt/engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const app = url.searchParams.get("app") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

  const history = await getHuntHistory(app, limit);
  return NextResponse.json(history);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/media/ src/app/api/hunt/
git commit -m "feat: add media and hunt API routes"
```

---

### Task 7: Media Page UI Components

**Files:**
- Create: `src/components/media-queues.tsx`
- Create: `src/components/media-triggers.tsx`
- Create: `src/components/missing-items.tsx`

- [ ] **Step 1: Write media queues component**

Create `src/components/media-queues.tsx` — client component that fetches `/api/media/queues` and displays download queue cards per app with progress bars and item counts. Use shadcn Card, Badge, and a simple progress bar div.

- [ ] **Step 2: Write media triggers component**

Create `src/components/media-triggers.tsx` — client component with per-app trigger buttons (RSS Sync, Search All Missing, Search Cutoff Unmet). Calls POST `/api/media/triggers`. Use shadcn Button with loading states.

- [ ] **Step 3: Write missing items component**

Create `src/components/missing-items.tsx` — client component that fetches `/api/media/missing?app=X&type=Y` and displays items in a table with per-item "Search" buttons. Use shadcn Table, Button, Badge, and a Select for app/type filtering.

- [ ] **Step 4: Commit**

```bash
git add src/components/media-queues.tsx src/components/media-triggers.tsx src/components/missing-items.tsx
git commit -m "feat: add media queue, trigger, and missing items components"
```

---

### Task 8: Hunt Dashboard UI Components

**Files:**
- Create: `src/components/hunt-dashboard.tsx`
- Create: `src/components/hunt-history.tsx`

- [ ] **Step 1: Write hunt dashboard component**

Create `src/components/hunt-dashboard.tsx` — client component that:
- Fetches `/api/hunt` for status of all configured apps
- Shows per-app cards with: running/idle/paused status, items processed, rate limit remaining, last run info
- "Hunt Now" button per app that POSTs to `/api/hunt`
- Toggle between "missing" and "upgrade" hunt types via Select
- Use shadcn Card, Button, Badge, Select

- [ ] **Step 2: Write hunt history component**

Create `src/components/hunt-history.tsx` — client component that:
- Fetches `/api/hunt/history`
- Displays table with: timestamp, app, run type, items found/searched, errors, duration, status
- Filter by app via Select
- Use shadcn Table, Badge, Select

- [ ] **Step 3: Commit**

```bash
git add src/components/hunt-dashboard.tsx src/components/hunt-history.tsx
git commit -m "feat: add hunt dashboard and history UI components"
```

---

### Task 9: Media Page Assembly

**Files:**
- Modify: `src/app/media/page.tsx`

- [ ] **Step 1: Build the media page**

Replace `src/app/media/page.tsx` with a tabbed layout using shadcn Tabs:
- **Tab 1: Status & Queues** — MediaQueues component
- **Tab 2: Triggers & Missing** — MediaTriggers + MissingItems components
- **Tab 3: Hunt Engine** — HuntDashboard + HuntHistory components

The page itself is a Server Component shell with `export const dynamic = "force-dynamic"`. The tabs contain client components that handle their own data fetching.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with `/media` as a dynamic route.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (existing + new).

- [ ] **Step 4: Commit**

```bash
git add src/app/media/page.tsx
git commit -m "feat: build media page with queues, triggers, and hunt engine tabs"
```

---

### Task 10: Final Build & Push

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

Expected: All commits pushed. CI/CD triggers.
