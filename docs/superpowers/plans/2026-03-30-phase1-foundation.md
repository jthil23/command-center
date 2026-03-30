# Phase 1: Foundation + Dashboard + Containers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deployable Command Center app with a working dashboard, container management, settings page, and CI/CD pipeline.

**Architecture:** Next.js 15 fullstack monolith (App Router) with TypeScript. Server Components for data fetching, Server Actions for mutations, API routes for polling/WebSocket. dockerode for Docker Engine access, Prisma for MariaDB. Single Docker container deployment.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Tremor, dockerode, Prisma (MariaDB), Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-30-command-center-design.md`

---

## File Structure

```
command-center/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with sidebar
│   │   ├── page.tsx                    # Dashboard page
│   │   ├── containers/
│   │   │   ├── page.tsx                # Container list page
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Container detail page
│   │   ├── settings/
│   │   │   └── page.tsx                # Settings page
│   │   └── api/
│   │       ├── containers/
│   │       │   └── route.ts            # Container list API
│   │       ├── containers/[id]/
│   │       │   ├── route.ts            # Container detail API
│   │       │   ├── logs/route.ts       # Container logs API
│   │       │   └── action/route.ts     # Container start/stop/restart
│   │       ├── stats/
│   │       │   └── route.ts            # System stats API (CPU/RAM/GPU)
│   │       └── services/
│   │           └── test/route.ts       # Connection test API
│   ├── lib/
│   │   ├── docker.ts                   # dockerode wrapper
│   │   ├── config.ts                   # YAML config loader + types
│   │   ├── db.ts                       # Prisma client singleton
│   │   └── icons.ts                    # Service icon mapping
│   ├── components/
│   │   ├── sidebar.tsx                 # Sidebar navigation
│   │   ├── stat-card.tsx               # Dashboard stat card
│   │   ├── container-grid.tsx          # Container health grid
│   │   ├── activity-feed.tsx           # Activity feed component
│   │   ├── container-table.tsx         # Container list table
│   │   ├── container-logs.tsx          # Log viewer component
│   │   └── service-form.tsx            # Service connection form
│   └── types/
│       └── index.ts                    # Shared type definitions
├── prisma/
│   └── schema.prisma                   # Database schema
├── public/
│   └── icons/                          # Service logos (SVGs)
├── __tests__/
│   ├── lib/
│   │   ├── docker.test.ts              # Docker wrapper tests
│   │   └── config.test.ts              # Config loader tests
│   └── api/
│       └── containers.test.ts          # Container API tests
├── e2e/
│   └── dashboard.spec.ts              # E2E dashboard tests
├── config.example.yaml                 # Example config file
├── Dockerfile                          # Multi-stage build
├── docker-compose.yml                  # SOL deployment
├── .github/workflows/
│   └── build-push.yml                  # CI/CD pipeline
├── vitest.config.ts                    # Test config
├── tailwind.config.ts                  # Tailwind config
└── package.json
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, etc. (via create-next-app)
- Create: `vitest.config.ts`

- [ ] **Step 1: Create Next.js project**

```bash
cd "G:/Docker/Command Center"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install dockerode prisma @prisma/client yaml node-cron ws lucide-react nuqs @tremor/react recharts
npm install -D @types/dockerode @types/node-cron @types/ws vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

When prompted, select:
- Style: New York
- Base color: Zinc
- CSS variables: yes

- [ ] **Step 4: Add shadcn/ui components**

```bash
npx shadcn@latest add button card badge input label table tabs separator scroll-area sheet dialog dropdown-menu select switch toast sonner tooltip
```

- [ ] **Step 5: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 6: Add test scripts to package.json**

Add to `scripts` in `package.json`:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 7: Verify scaffolding works**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with dependencies"
```

---

### Task 2: Prisma Schema & Database Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider mysql
```

- [ ] **Step 2: Set DATABASE_URL in .env**

Create `.env`:
```
DATABASE_URL="mysql://mainUser:mainPass@192.168.1.103:3366/command_center"
```

- [ ] **Step 3: Write Prisma schema**

Replace `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model HuntState {
  id          Int      @id @default(autoincrement())
  app         String   @db.VarChar(50)
  itemId      String   @db.VarChar(100) @map("item_id")
  itemTitle   String?  @db.VarChar(500) @map("item_title")
  processedAt DateTime @default(now()) @map("processed_at")
  expiresAt   DateTime @map("expires_at")

  @@unique([app, itemId])
  @@index([app, expiresAt])
  @@map("hunt_state")
}

model HuntRun {
  id            Int      @id @default(autoincrement())
  app           String   @db.VarChar(50)
  runType       String   @db.VarChar(20) @map("run_type")
  itemsFound    Int      @default(0) @map("items_found")
  itemsSearched Int      @default(0) @map("items_searched")
  errors        Int      @default(0)
  duration      Int      @default(0)
  status        String   @db.VarChar(20)
  message       String?  @db.Text
  startedAt     DateTime @default(now()) @map("started_at")
  completedAt   DateTime? @map("completed_at")

  @@index([app, startedAt])
  @@map("hunt_runs")
}

model ScheduledJob {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(200)
  cronExpr    String   @db.VarChar(100) @map("cron_expr")
  jobType     String   @db.VarChar(50) @map("job_type")
  config      String   @db.Text
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  executions  JobExecution[]

  @@map("scheduled_jobs")
}

model JobExecution {
  id        Int       @id @default(autoincrement())
  jobId     Int       @map("job_id")
  status    String    @db.VarChar(20)
  output    String?   @db.Text
  error     String?   @db.Text
  startedAt DateTime  @default(now()) @map("started_at")
  endedAt   DateTime? @map("ended_at")

  job       ScheduledJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId, startedAt])
  @@map("job_executions")
}

model ActivityLog {
  id        Int      @id @default(autoincrement())
  source    String   @db.VarChar(50)
  type      String   @db.VarChar(50)
  message   String   @db.VarChar(500)
  metadata  String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([source])
  @@map("activity_log")
}
```

- [ ] **Step 4: Create Prisma client singleton**

Create `src/lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration creates all tables in the `command_center` database.

- [ ] **Step 6: Verify Prisma client generation**

```bash
npx prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: add Prisma schema and MariaDB connection"
```

Note: `.env` is gitignored. The `DATABASE_URL` will be passed as an environment variable in Docker.

---

### Task 3: Config System

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/types/index.ts`
- Create: `config.example.yaml`
- Create: `__tests__/lib/config.test.ts`

- [ ] **Step 1: Write config test**

Create `__tests__/lib/config.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseConfig } from "@/lib/config";

const validYaml = `
services:
  sonarr:
    url: http://192.168.1.103:8989
    apiKey: test-key-sonarr
  radarr:
    url: http://192.168.1.103:7878
    apiKey: test-key-radarr
  prometheus:
    url: http://192.168.1.103:9090

ssh:
  host: 192.168.1.103
  user: root
  keyPath: /app/ssh/id_ed25519

hunt:
  defaults:
    batchSize: 10
    intervalMinutes: 60
    hourlyCap: 50
    queueThreshold: 25

polling:
  defaultIntervalSeconds: 30
`;

describe("parseConfig", () => {
  it("parses valid YAML config", () => {
    const config = parseConfig(validYaml);
    expect(config.services.sonarr?.url).toBe("http://192.168.1.103:8989");
    expect(config.services.sonarr?.apiKey).toBe("test-key-sonarr");
    expect(config.services.prometheus?.url).toBe("http://192.168.1.103:9090");
    expect(config.ssh.host).toBe("192.168.1.103");
    expect(config.hunt.defaults.batchSize).toBe(10);
    expect(config.polling.defaultIntervalSeconds).toBe(30);
  });

  it("provides defaults for missing optional fields", () => {
    const minimal = `
services: {}
ssh:
  host: 192.168.1.103
  user: root
  keyPath: /app/ssh/id_ed25519
`;
    const config = parseConfig(minimal);
    expect(config.hunt.defaults.batchSize).toBe(10);
    expect(config.hunt.defaults.intervalMinutes).toBe(60);
    expect(config.hunt.defaults.hourlyCap).toBe(50);
    expect(config.hunt.defaults.queueThreshold).toBe(25);
    expect(config.polling.defaultIntervalSeconds).toBe(30);
  });

  it("throws on invalid YAML", () => {
    expect(() => parseConfig("not: [valid: yaml: {")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/config.test.ts
```

Expected: FAIL — `parseConfig` not found.

- [ ] **Step 3: Write type definitions**

Create `src/types/index.ts`:
```typescript
export interface ServiceConfig {
  url: string;
  apiKey?: string;
  token?: string;
}

export interface SshConfig {
  host: string;
  user: string;
  keyPath: string;
}

export interface HuntAppConfig {
  enabled?: boolean;
  batchSize?: number;
  intervalMinutes?: number;
  hourlyCap?: number;
  queueThreshold?: number;
  searchMode?: "seasonPack" | "individual";
}

export interface HuntConfig {
  defaults: Required<Pick<HuntAppConfig, "batchSize" | "intervalMinutes" | "hourlyCap" | "queueThreshold">>;
  sonarr?: HuntAppConfig;
  radarr?: HuntAppConfig;
  bazarr?: HuntAppConfig;
  whisparr?: HuntAppConfig;
}

export interface PollingConfig {
  defaultIntervalSeconds: number;
}

export interface AppConfig {
  services: Record<string, ServiceConfig>;
  ssh: SshConfig;
  hunt: HuntConfig;
  polling: PollingConfig;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: "running" | "exited" | "paused" | "restarting" | "dead" | "created";
  status: string;
  uptime: string;
  cpu: number;
  memory: { used: number; limit: number; percent: number };
  ports: Array<{ host: number; container: number; protocol: string }>;
}

export interface SystemStats {
  cpu: { percent: number; cores: number; model: string };
  memory: { used: number; total: number; percent: number };
  storage: { used: number; total: number; percent: number };
  gpu?: { utilization: number; vram: { used: number; total: number }; temperature: number; power: number };
  containers: { total: number; running: number; stopped: number };
}

export interface ActivityEntry {
  id: number;
  source: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
```

- [ ] **Step 4: Write config loader**

Create `src/lib/config.ts`:
```typescript
import { parse } from "yaml";
import { readFileSync } from "fs";
import type { AppConfig } from "@/types";

const HUNT_DEFAULTS = {
  batchSize: 10,
  intervalMinutes: 60,
  hourlyCap: 50,
  queueThreshold: 25,
} as const;

const POLLING_DEFAULTS = {
  defaultIntervalSeconds: 30,
} as const;

export function parseConfig(yamlContent: string): AppConfig {
  const raw = parse(yamlContent);

  return {
    services: raw.services ?? {},
    ssh: raw.ssh,
    hunt: {
      defaults: { ...HUNT_DEFAULTS, ...raw.hunt?.defaults },
      sonarr: raw.hunt?.sonarr,
      radarr: raw.hunt?.radarr,
      bazarr: raw.hunt?.bazarr,
      whisparr: raw.hunt?.whisparr,
    },
    polling: { ...POLLING_DEFAULTS, ...raw.polling },
  };
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = process.env.CONFIG_PATH ?? "/app/config.yaml";
  const content = readFileSync(configPath, "utf-8");
  cachedConfig = parseConfig(content);
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/config.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Write example config**

Create `config.example.yaml`:
```yaml
# Command Center Configuration
# Copy to config.yaml and fill in your API keys

services:
  sonarr:
    url: http://192.168.1.103:8989
    apiKey: "your-sonarr-api-key"
  radarr:
    url: http://192.168.1.103:7878
    apiKey: "your-radarr-api-key"
  prowlarr:
    url: http://192.168.1.103:9696
    apiKey: "your-prowlarr-api-key"
  bazarr:
    url: http://192.168.1.103:6767
    apiKey: "your-bazarr-api-key"
  whisparr:
    url: http://192.168.1.103:6969
    apiKey: "your-whisparr-api-key"
  seerr:
    url: http://192.168.1.103:5055
    apiKey: "your-seerr-api-key"
  nzbget:
    url: http://192.168.1.103:6789
    apiKey: "your-nzbget-api-key"
  tdarr:
    url: http://192.168.1.103:8265
  plex:
    url: http://192.168.1.103:32400
    token: "your-plex-token"
  prometheus:
    url: http://192.168.1.103:9090
  nodered:
    url: http://192.168.1.103:1880
  homeassistant:
    url: http://192.168.1.103:8123
    token: "your-ha-long-lived-token"

ssh:
  host: 192.168.1.103
  user: root
  keyPath: /app/ssh/id_ed25519

hunt:
  defaults:
    batchSize: 10
    intervalMinutes: 60
    hourlyCap: 50
    queueThreshold: 25
  sonarr:
    enabled: true
    searchMode: "seasonPack"
    batchSize: 5
  radarr:
    enabled: true
    batchSize: 10

polling:
  defaultIntervalSeconds: 30
```

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/lib/config.ts config.example.yaml __tests__/lib/config.test.ts
git commit -m "feat: add config system with YAML parsing and type definitions"
```

---

### Task 4: Docker Service Library

**Files:**
- Create: `src/lib/docker.ts`
- Create: `__tests__/lib/docker.test.ts`

- [ ] **Step 1: Write docker wrapper test**

Create `__tests__/lib/docker.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type Docker from "dockerode";

// Mock dockerode since we can't connect to a real Docker socket in CI
vi.mock("dockerode", () => {
  const mockContainer = {
    inspect: vi.fn().mockResolvedValue({
      Id: "abc123",
      Name: "/plex",
      Config: { Image: "plexinc/pms-docker:latest" },
      State: { Status: "running", StartedAt: "2026-03-29T00:00:00Z" },
      NetworkSettings: { Ports: { "32400/tcp": [{ HostPort: "32400" }] } },
    }),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),
    logs: vi.fn().mockResolvedValue(Buffer.from("log line 1\nlog line 2\n")),
  };

  return {
    default: vi.fn().mockImplementation(() => ({
      listContainers: vi.fn().mockResolvedValue([
        {
          Id: "abc123",
          Names: ["/plex"],
          Image: "plexinc/pms-docker:latest",
          State: "running",
          Status: "Up 2 days",
        },
        {
          Id: "def456",
          Names: ["/sonarr"],
          Image: "linuxserver/sonarr:latest",
          State: "running",
          Status: "Up 1 day",
        },
      ]),
      getContainer: vi.fn().mockReturnValue(mockContainer),
    })),
  };
});

import {
  listContainers,
  getContainer,
  containerAction,
  getContainerLogs,
} from "@/lib/docker";

describe("docker wrapper", () => {
  it("lists all containers", async () => {
    const containers = await listContainers();
    expect(containers).toHaveLength(2);
    expect(containers[0].name).toBe("plex");
    expect(containers[0].state).toBe("running");
    expect(containers[1].name).toBe("sonarr");
  });

  it("gets container detail", async () => {
    const container = await getContainer("abc123");
    expect(container.name).toBe("plex");
    expect(container.image).toBe("plexinc/pms-docker:latest");
    expect(container.state).toBe("running");
  });

  it("performs container actions", async () => {
    await expect(containerAction("abc123", "restart")).resolves.not.toThrow();
    await expect(containerAction("abc123", "stop")).resolves.not.toThrow();
    await expect(containerAction("abc123", "start")).resolves.not.toThrow();
  });

  it("fetches container logs", async () => {
    const logs = await getContainerLogs("abc123", 100);
    expect(logs).toContain("log line 1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/docker.test.ts
```

Expected: FAIL — module `@/lib/docker` not found.

- [ ] **Step 3: Write docker wrapper**

Create `src/lib/docker.ts`:
```typescript
import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

export interface ContainerDetail extends ContainerSummary {
  startedAt: string;
  ports: Array<{ host: number; container: number; protocol: string }>;
  env: string[];
  mounts: Array<{ source: string; destination: string }>;
}

export async function listContainers(): Promise<ContainerSummary[]> {
  const containers = await docker.listContainers({ all: true });
  return containers.map((c) => ({
    id: c.Id,
    name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
    image: c.Image,
    state: c.State,
    status: c.Status,
  }));
}

export async function getContainer(id: string): Promise<ContainerDetail> {
  const container = docker.getContainer(id);
  const info = await container.inspect();
  const ports = Object.entries(info.NetworkSettings.Ports ?? {}).flatMap(
    ([containerPort, bindings]) => {
      const [port, protocol] = containerPort.split("/");
      return (bindings ?? []).map((b) => ({
        host: parseInt(b.HostPort, 10),
        container: parseInt(port, 10),
        protocol: protocol ?? "tcp",
      }));
    }
  );

  return {
    id: info.Id,
    name: info.Name.replace(/^\//, ""),
    image: info.Config.Image,
    state: info.State.Status,
    status: info.State.Status,
    startedAt: info.State.StartedAt,
    ports,
    env: info.Config.Env ?? [],
    mounts: (info.Mounts ?? []).map((m) => ({
      source: m.Source ?? "",
      destination: m.Destination,
    })),
  };
}

export async function containerAction(
  id: string,
  action: "start" | "stop" | "restart"
): Promise<void> {
  const container = docker.getContainer(id);
  switch (action) {
    case "start":
      await container.start();
      break;
    case "stop":
      await container.stop();
      break;
    case "restart":
      await container.restart();
      break;
  }
}

export async function getContainerLogs(
  id: string,
  tail: number = 200
): Promise<string> {
  const container = docker.getContainer(id);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });
  // dockerode returns Buffer or stream; we request Buffer via follow:false (default)
  return logs.toString("utf-8");
}

export async function getContainerStats(): Promise<
  Map<string, { cpu: number; memory: { used: number; limit: number } }>
> {
  const containers = await docker.listContainers();
  const stats = new Map();

  await Promise.all(
    containers.map(async (c) => {
      try {
        const container = docker.getContainer(c.Id);
        const stat = await container.stats({ stream: false });
        const cpuDelta =
          stat.cpu_stats.cpu_usage.total_usage -
          stat.precpu_stats.cpu_usage.total_usage;
        const systemDelta =
          stat.cpu_stats.system_cpu_usage -
          stat.precpu_stats.system_cpu_usage;
        const cpuCount = stat.cpu_stats.online_cpus ?? 1;
        const cpuPercent =
          systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

        stats.set(c.Names[0]?.replace(/^\//, ""), {
          cpu: Math.round(cpuPercent * 100) / 100,
          memory: {
            used: stat.memory_stats.usage ?? 0,
            limit: stat.memory_stats.limit ?? 0,
          },
        });
      } catch {
        // Container may have stopped between list and stats
      }
    })
  );

  return stats;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/docker.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/docker.ts __tests__/lib/docker.test.ts
git commit -m "feat: add Docker wrapper with container management operations"
```

---

### Task 5: Service Icons

**Files:**
- Create: `src/lib/icons.ts`
- Create: `public/icons/` (SVG files)

- [ ] **Step 1: Create icon mapping**

Create `src/lib/icons.ts`:
```typescript
// Maps container/service names to their icon filenames in /icons/
// Icons sourced from dashboard-icons (https://github.com/walkxcode/dashboard-icons)
const ICON_MAP: Record<string, string> = {
  plex: "plex",
  sonarr: "sonarr",
  radarr: "radarr",
  bazarr: "bazarr",
  prowlarr: "prowlarr",
  whisparr: "whisparr",
  seerr: "overseerr",
  nzbget: "nzbget",
  tdarr: "tdarr",
  stash: "stash",
  "home-assistant": "home-assistant",
  homeassistant: "home-assistant",
  "node-red": "node-red",
  nodered: "node-red",
  mosquitto: "mosquitto",
  "zigbee2mqtt": "zigbee2mqtt",
  ollama: "ollama",
  nextcloud: "nextcloud",
  immich: "immich",
  vaultwarden: "vaultwarden",
  "nginx-proxy-manager": "nginx-proxy-manager",
  adguard: "adguard-home",
  grafana: "grafana",
  prometheus: "prometheus",
  mariadb: "mariadb",
  postgresql: "postgresql",
  postgres: "postgresql",
  redis: "redis",
  notifiarr: "notifiarr",
};

export function getServiceIcon(name: string): string {
  const normalized = name.toLowerCase().replace(/[_\s]/g, "-");
  const icon = ICON_MAP[normalized];
  if (icon) return `/icons/${icon}.svg`;
  return "";
}

export function getServiceInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
```

- [ ] **Step 2: Download service icons**

```bash
mkdir -p "G:/Docker/Command Center/public/icons"
cd "G:/Docker/Command Center/public/icons"

# Download SVG icons from dashboard-icons CDN
ICONS="plex sonarr radarr bazarr prowlarr overseerr nzbget tdarr stash home-assistant node-red mosquitto zigbee2mqtt ollama nextcloud immich vaultwarden nginx-proxy-manager adguard-home grafana prometheus mariadb postgresql redis notifiarr"

for icon in $ICONS; do
  curl -sL "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/${icon}.svg" -o "${icon}.svg"
done
```

- [ ] **Step 3: Verify icons downloaded**

```bash
ls -la "G:/Docker/Command Center/public/icons/" | wc -l
```

Expected: ~25 files (24 icons + header line).

- [ ] **Step 4: Commit**

```bash
git add src/lib/icons.ts public/icons/
git commit -m "feat: add service icons and icon mapping"
```

---

### Task 6: Core Layout & Sidebar

**Files:**
- Create: `src/components/sidebar.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Set up dark theme globals**

Replace `src/app/globals.css` with the shadcn/ui generated CSS plus these additions at the end:
```css
/* Add after the existing shadcn/ui CSS variables */

body {
  font-feature-settings: "rlig" 1, "calt" 1;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}
```

Note: Keep all existing shadcn/ui CSS variables — only append the body and scrollbar styles.

- [ ] **Step 2: Create sidebar component**

Create `src/components/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Container,
  Film,
  HardDrive,
  Zap,
  Server,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/containers", label: "Containers", icon: Container },
  { href: "/media", label: "Media", icon: Film },
  { href: "/storage", label: "Storage", icon: HardDrive },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/system", label: "System", icon: Server },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-5">
        <div>
          <div className="text-sm font-bold tracking-wide text-foreground">
            COMMAND
          </div>
          <div className="text-[10px] tracking-[0.2em] text-muted-foreground">
            CENTER
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Update root layout**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Command Center",
  description: "Unified dashboard and orchestration hub for SOL homeserver",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Sidebar />
        <main className="ml-56 min-h-screen p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create placeholder pages for all routes**

Create `src/app/page.tsx` (Dashboard — will be fleshed out in Task 8):
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

Create `src/app/containers/page.tsx`:
```tsx
export default function ContainersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Containers</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

Create `src/app/media/page.tsx`:
```tsx
export default function MediaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Media</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

Create `src/app/storage/page.tsx`:
```tsx
export default function StoragePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Storage</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

Create `src/app/automations/page.tsx`:
```tsx
export default function AutomationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Automations</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

Create `src/app/system/page.tsx`:
```tsx
export default function SystemPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">System</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

Create `src/app/logs/page.tsx`:
```tsx
export default function LogsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Logs</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

Create `src/app/settings/page.tsx`:
```tsx
export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds. All 8 pages compile.

- [ ] **Step 6: Commit**

```bash
git add src/components/sidebar.tsx src/app/layout.tsx src/app/globals.css src/app/page.tsx src/app/containers/ src/app/media/ src/app/storage/ src/app/automations/ src/app/system/ src/app/logs/ src/app/settings/
git commit -m "feat: add sidebar layout with dark theme and all route placeholders"
```

---

### Task 7: Container API Routes

**Files:**
- Create: `src/app/api/containers/route.ts`
- Create: `src/app/api/containers/[id]/route.ts`
- Create: `src/app/api/containers/[id]/logs/route.ts`
- Create: `src/app/api/containers/[id]/action/route.ts`

- [ ] **Step 1: Container list endpoint**

Create `src/app/api/containers/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { listContainers, getContainerStats } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [containers, stats] = await Promise.all([
      listContainers(),
      getContainerStats(),
    ]);

    const enriched = containers.map((c) => {
      const s = stats.get(c.name);
      return {
        ...c,
        cpu: s?.cpu ?? 0,
        memory: s?.memory ?? { used: 0, limit: 0 },
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list containers" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Container detail endpoint**

Create `src/app/api/containers/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getContainer } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const container = await getContainer(id);
    return NextResponse.json(container);
  } catch (error) {
    return NextResponse.json(
      { error: "Container not found" },
      { status: 404 }
    );
  }
}
```

- [ ] **Step 3: Container logs endpoint**

Create `src/app/api/containers/[id]/logs/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getContainerLogs } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const tail = parseInt(url.searchParams.get("tail") ?? "200", 10);
    const logs = await getContainerLogs(id, tail);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Container action endpoint**

Create `src/app/api/containers/[id]/action/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { containerAction } from "@/lib/docker";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as "start" | "stop" | "restart";

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await containerAction(id, action);

    // Log the activity
    await prisma.activityLog.create({
      data: {
        source: "containers",
        type: action,
        message: `Container ${id.slice(0, 12)} ${action}ed`,
        metadata: JSON.stringify({ containerId: id, action }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to perform action` },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds with all API routes compiled.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/containers/
git commit -m "feat: add container API routes (list, detail, logs, actions)"
```

---

### Task 8: Dashboard Page

**Files:**
- Create: `src/components/stat-card.tsx`
- Create: `src/components/container-grid.tsx`
- Create: `src/components/activity-feed.tsx`
- Create: `src/app/api/stats/route.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: System stats API endpoint**

Create `src/app/api/stats/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { listContainers } from "@/lib/docker";
import { getConfig } from "@/lib/config";
import type { SystemStats } from "@/types";

export const dynamic = "force-dynamic";

async function fetchPrometheusMetric(
  baseUrl: string,
  query: string
): Promise<number> {
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/query?query=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    const value = data?.data?.result?.[0]?.value?.[1];
    return value ? parseFloat(value) : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const containers = await listContainers();
    const running = containers.filter((c) => c.state === "running").length;
    const stopped = containers.length - running;

    let stats: SystemStats = {
      cpu: { percent: 0, cores: 24, model: "AMD Ryzen 9 3900X" },
      memory: { used: 0, total: 64 * 1024 * 1024 * 1024, percent: 0 },
      storage: { used: 0, total: 70 * 1024 * 1024 * 1024 * 1024, percent: 0 },
      containers: { total: containers.length, running, stopped },
    };

    // Try fetching from Prometheus if configured
    try {
      const config = getConfig();
      const promUrl = config.services.prometheus?.url;
      if (promUrl) {
        const [cpuPercent, memUsed, memTotal] = await Promise.all([
          fetchPrometheusMetric(
            promUrl,
            '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
          ),
          fetchPrometheusMetric(promUrl, "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes"),
          fetchPrometheusMetric(promUrl, "node_memory_MemTotal_bytes"),
        ]);

        stats.cpu.percent = Math.round(cpuPercent * 10) / 10;
        stats.memory.used = memUsed;
        stats.memory.total = memTotal || stats.memory.total;
        stats.memory.percent =
          memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0;
      }
    } catch {
      // Prometheus not available — stats stay at defaults
    }

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create stat card component**

Create `src/components/stat-card.tsx`:
```tsx
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: "green" | "blue" | "purple" | "yellow";
}

const COLOR_MAP = {
  green: "text-emerald-500",
  blue: "text-blue-500",
  purple: "text-violet-500",
  yellow: "text-amber-500",
} as const;

export function StatCard({ title, value, subtitle, color }: StatCardProps) {
  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className={cn("my-1 text-3xl font-bold", COLOR_MAP[color])}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </Card>
  );
}
```

- [ ] **Step 3: Create container health grid component**

Create `src/components/container-grid.tsx`:
```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { Card } from "@/components/ui/card";

interface ContainerGridItem {
  id: string;
  name: string;
  state: string;
}

interface ContainerGridProps {
  containers: ContainerGridItem[];
}

const STATE_STYLES: Record<string, string> = {
  running: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  exited: "border-red-500/30 bg-red-500/10 text-red-500",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  restarting: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  dead: "border-red-500/30 bg-red-500/10 text-red-500",
  created: "border-zinc-500/30 bg-zinc-500/10 text-zinc-500",
};

export function ContainerGrid({ containers }: ContainerGridProps) {
  const running = containers.filter((c) => c.state === "running").length;
  const degraded = containers.filter((c) =>
    ["paused", "restarting"].includes(c.state)
  ).length;
  const down = containers.filter((c) =>
    ["exited", "dead"].includes(c.state)
  ).length;

  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="mb-3 text-sm font-semibold">Container Health</div>
      <div className="grid grid-cols-7 gap-1.5">
        {containers.map((c) => {
          const icon = getServiceIcon(c.name);
          return (
            <Link
              key={c.id}
              href={`/containers/${c.id}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border text-[9px] font-medium transition-colors hover:opacity-80",
                STATE_STYLES[c.state] ?? STATE_STYLES.created
              )}
              title={`${c.name} (${c.state})`}
            >
              {icon ? (
                <Image
                  src={icon}
                  alt={c.name}
                  width={20}
                  height={20}
                  className="opacity-80"
                />
              ) : (
                getServiceInitial(c.name)
              )}
            </Link>
          );
        })}
      </div>
      <div className="mt-2.5 flex gap-3 text-[11px] text-muted-foreground">
        <span className="text-emerald-500">● {running} healthy</span>
        {degraded > 0 && (
          <span className="text-amber-500">● {degraded} degraded</span>
        )}
        {down > 0 && <span className="text-red-500">● {down} down</span>}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create activity feed component**

Create `src/components/activity-feed.tsx`:
```tsx
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityEntry } from "@/types";

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

const TYPE_INDICATORS: Record<string, { icon: string; color: string }> = {
  start: { icon: "▲", color: "text-emerald-500" },
  stop: { icon: "▼", color: "text-red-500" },
  restart: { icon: "↻", color: "text-blue-500" },
  error: { icon: "✖", color: "text-red-500" },
  warning: { icon: "⚠", color: "text-amber-500" },
  info: { icon: "●", color: "text-violet-500" },
  grab: { icon: "▲", color: "text-emerald-500" },
  transcode: { icon: "◆", color: "text-blue-500" },
};

export function ActivityFeed({ entries }: ActivityFeedProps) {
  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="mb-3 text-sm font-semibold">Activity Feed</div>
      <ScrollArea className="h-[280px]">
        <div className="space-y-1.5 text-sm">
          {entries.length === 0 && (
            <div className="text-muted-foreground">No recent activity</div>
          )}
          {entries.map((entry) => {
            const indicator = TYPE_INDICATORS[entry.type] ?? TYPE_INDICATORS.info;
            return (
              <div key={entry.id} className="flex items-start gap-2">
                <span className={indicator.color}>{indicator.icon}</span>
                <span className="text-muted-foreground">{entry.message}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
```

- [ ] **Step 5: Build the dashboard page**

Replace `src/app/page.tsx`:
```tsx
import { listContainers } from "@/lib/docker";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { ContainerGrid } from "@/components/container-grid";
import { ActivityFeed } from "@/components/activity-feed";
import type { SystemStats, ActivityEntry } from "@/types";

async function getStats(): Promise<SystemStats> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/stats`,
      { cache: "no-store" }
    );
    return await res.json();
  } catch {
    const containers = await listContainers();
    const running = containers.filter((c) => c.state === "running").length;
    return {
      cpu: { percent: 0, cores: 24, model: "AMD Ryzen 9 3900X" },
      memory: { used: 0, total: 64 * 1024 * 1024 * 1024, percent: 0 },
      storage: { used: 0, total: 70e12, percent: 0 },
      containers: { total: containers.length, running, stopped: containers.length - running },
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 2 ? 1 : 0)} ${units[i]}`;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [containers, stats, recentActivity] = await Promise.all([
    listContainers(),
    getStats(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const activity: ActivityEntry[] = recentActivity.map((a) => ({
    id: a.id,
    source: a.source,
    type: a.type,
    message: a.message,
    metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
    createdAt: a.createdAt,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Containers"
          value={String(stats.containers.total)}
          subtitle={`${stats.containers.running} running · ${stats.containers.stopped} stopped`}
          color="green"
        />
        <StatCard
          title="CPU Usage"
          value={`${stats.cpu.percent}%`}
          subtitle={`${stats.cpu.model} · ${stats.cpu.cores} threads`}
          color="blue"
        />
        <StatCard
          title="Memory"
          value={formatBytes(stats.memory.used)}
          subtitle={`of ${formatBytes(stats.memory.total)} · ${stats.memory.percent}% used`}
          color="purple"
        />
        <StatCard
          title="Storage"
          value={formatBytes(stats.storage.used)}
          subtitle={`of ${formatBytes(stats.storage.total)} · ${stats.storage.percent}% used`}
          color="yellow"
        />
      </div>

      {/* Container Grid + Activity Feed */}
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <ContainerGrid containers={containers} />
        <ActivityFeed entries={activity} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/stat-card.tsx src/components/container-grid.tsx src/components/activity-feed.tsx src/app/api/stats/ src/app/page.tsx
git commit -m "feat: build dashboard page with stat cards, container grid, activity feed"
```

---

### Task 9: Containers Page

**Files:**
- Create: `src/components/container-table.tsx`
- Create: `src/components/container-logs.tsx`
- Modify: `src/app/containers/page.tsx`
- Create: `src/app/containers/[id]/page.tsx`

- [ ] **Step 1: Create container table component**

Create `src/components/container-table.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Square,
  RotateCw,
  Search,
} from "lucide-react";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ContainerRow {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  cpu: number;
  memory: { used: number; limit: number };
}

interface ContainerTableProps {
  containers: ContainerRow[];
}

const STATE_BADGE: Record<string, string> = {
  running: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  exited: "bg-red-500/20 text-red-500 border-red-500/30",
  paused: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  restarting: "bg-amber-500/20 text-amber-500 border-amber-500/30",
};

function formatMemory(bytes: number): string {
  if (bytes === 0) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

async function doAction(id: string, action: string) {
  await fetch(`/api/containers/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  window.location.reload();
}

export function ContainerTable({ containers }: ContainerTableProps) {
  const [filter, setFilter] = useState("");

  const filtered = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.image.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter containers..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">CPU</TableHead>
            <TableHead className="text-right">Memory</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => {
            const icon = getServiceIcon(c.name);
            return (
              <TableRow key={c.id}>
                <TableCell>
                  {icon ? (
                    <Image src={icon} alt="" width={20} height={20} />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                      {getServiceInitial(c.name)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/containers/${c.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.image}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      STATE_BADGE[c.state] ?? STATE_BADGE.exited
                    )}
                  >
                    {c.state}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {c.cpu.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatMemory(c.memory.used)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {c.state !== "running" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => doAction(c.id, "start")}
                        title="Start"
                      >
                        <Play className="h-3.5 w-3.5 text-emerald-500" />
                      </Button>
                    )}
                    {c.state === "running" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => doAction(c.id, "stop")}
                        title="Stop"
                      >
                        <Square className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => doAction(c.id, "restart")}
                      title="Restart"
                    >
                      <RotateCw className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Create container logs component**

Create `src/components/container-logs.tsx`:
```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Download, RefreshCw } from "lucide-react";

interface ContainerLogsProps {
  containerId: string;
}

export function ContainerLogs({ containerId }: ContainerLogsProps) {
  const [logs, setLogs] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/containers/${containerId}/logs?tail=500`);
      const data = await res.json();
      setLogs(data.logs ?? "");
    } catch {
      setLogs("Failed to fetch logs");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [containerId]);

  const lines = logs.split("\n").filter((line) => {
    if (!filter) return true;
    return line.toLowerCase().includes(filter.toLowerCase());
  });

  function handleDownload() {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${containerId.slice(0, 12)}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchLogs} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button variant="outline" size="icon" onClick={handleDownload} title="Download">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[500px] rounded-md border border-border/40 bg-black/50 p-3">
        <pre className="text-xs leading-relaxed text-muted-foreground">
          {lines.map((line, i) => (
            <div key={i} className="hover:bg-white/5">
              {line}
            </div>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 3: Build containers list page**

Replace `src/app/containers/page.tsx`:
```tsx
import { listContainers, getContainerStats } from "@/lib/docker";
import { ContainerTable } from "@/components/container-table";

export const dynamic = "force-dynamic";

export default async function ContainersPage() {
  const [containers, stats] = await Promise.all([
    listContainers(),
    getContainerStats(),
  ]);

  const enriched = containers.map((c) => {
    const s = stats.get(c.name);
    return {
      ...c,
      cpu: s?.cpu ?? 0,
      memory: s?.memory ?? { used: 0, limit: 0 },
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Containers</h1>
      <ContainerTable containers={enriched} />
    </div>
  );
}
```

- [ ] **Step 4: Build container detail page**

Create `src/app/containers/[id]/page.tsx`:
```tsx
import { getContainer } from "@/lib/docker";
import { ContainerLogs } from "@/components/container-logs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServiceIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

export default async function ContainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const container = await getContainer(id);
  const icon = getServiceIcon(container.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/containers"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {icon && <Image src={icon} alt="" width={24} height={24} />}
        <h1 className="text-2xl font-bold">{container.name}</h1>
        <Badge
          variant="outline"
          className={
            container.state === "running"
              ? "bg-emerald-500/20 text-emerald-500"
              : "bg-red-500/20 text-red-500"
          }
        >
          {container.state}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Image</div>
          <div className="mt-1 text-sm font-medium">{container.image}</div>
        </Card>
        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Started</div>
          <div className="mt-1 text-sm font-medium">
            {new Date(container.startedAt).toLocaleString()}
          </div>
        </Card>
        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Ports</div>
          <div className="mt-1 text-sm font-medium">
            {container.ports.length > 0
              ? container.ports
                  .map((p) => `${p.host}:${p.container}/${p.protocol}`)
                  .join(", ")
              : "None"}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Logs</h2>
        <ContainerLogs containerId={id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/container-table.tsx src/components/container-logs.tsx src/app/containers/
git commit -m "feat: build containers page with list, detail, logs, and actions"
```

---

### Task 10: Settings Page — Service Connections

**Files:**
- Create: `src/components/service-form.tsx`
- Create: `src/app/api/services/test/route.ts`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Create connection test API**

Create `src/app/api/services/test/route.ts`:
```typescript
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url, apiKey, token } = await request.json();

    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["X-Api-Key"] = apiKey;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Most *arr apps respond to /api/v3/system/status or /api/v1/system/status
    // Try common health endpoints
    const endpoints = [
      `${url}/api/v3/system/status`,
      `${url}/api/v1/system/status`,
      `${url}/api/v1/health`,
      `${url}/system/status`,
      url,
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          return NextResponse.json({ success: true, status: res.status });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { success: false, error: "Could not connect to service" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Create service connection form**

Create `src/components/service-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";

interface ServiceConfig {
  url: string;
  apiKey?: string;
  token?: string;
}

interface ServiceFormProps {
  name: string;
  config: ServiceConfig;
}

export function ServiceForm({ name, config }: ServiceFormProps) {
  const [status, setStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const icon = getServiceIcon(name);

  async function testConnection() {
    setStatus("testing");
    try {
      const res = await fetch("/api/services/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon ? (
            <Image src={icon} alt="" width={24} height={24} />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold">
              {getServiceInitial(name)}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold capitalize">{name}</div>
            <div className="text-xs text-muted-foreground">{config.url}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "success" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          {status === "error" && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={status === "testing"}
          >
            {status === "testing" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Test
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Build settings page**

Replace `src/app/settings/page.tsx`:
```tsx
import { getConfig } from "@/lib/config";
import { ServiceForm } from "@/components/service-form";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  let config;
  try {
    config = getConfig();
  } catch {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">
          No config.yaml found. Copy config.example.yaml to config.yaml and
          fill in your service details.
        </div>
      </div>
    );
  }

  const services = Object.entries(config.services);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Service Connections</h2>
        <div className="grid grid-cols-2 gap-3">
          {services.map(([name, svc]) => (
            <ServiceForm key={name} name={name} config={svc} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Polling</h2>
        <div className="text-sm text-muted-foreground">
          Default interval: {config.polling.defaultIntervalSeconds}s (configured
          in config.yaml)
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Hunt Engine Defaults</h2>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Batch Size</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.batchSize}
            </div>
          </div>
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Interval</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.intervalMinutes} min
            </div>
          </div>
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Hourly Cap</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.hourlyCap}
            </div>
          </div>
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Queue Threshold</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.queueThreshold}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/service-form.tsx src/app/api/services/ src/app/settings/
git commit -m "feat: build settings page with service connections and test buttons"
```

---

### Task 11: Dockerfile & Docker Compose

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Write multi-stage Dockerfile**

Create `Dockerfile`:
```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma client and schema (needed at runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Config will be mounted as a volume
COPY config.example.yaml /app/config.example.yaml

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV CONFIG_PATH="/app/config.yaml"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Add standalone output to next.config**

Modify `next.config.ts` to add:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 3: Write docker-compose.yml**

Create `docker-compose.yml`:
```yaml
services:
  command-center:
    image: jthil23/command-center:latest
    container_name: command-center
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./config.yaml:/app/config.yaml:ro
      - ~/.ssh/id_ed25519:/app/ssh/id_ed25519:ro
    environment:
      - DATABASE_URL=mysql://mainUser:mainPass@192.168.1.103:3366/command_center
      - CONFIG_PATH=/app/config.yaml
    restart: unless-stopped
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml next.config.ts
git commit -m "feat: add Dockerfile (multi-stage) and docker-compose for SOL deployment"
```

---

### Task 12: CI/CD Pipeline

**Files:**
- Create: `.github/workflows/build-push.yml`

- [ ] **Step 1: Write GitHub Actions workflow**

Create `.github/workflows/build-push.yml`:
```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: docker.io
  IMAGE_NAME: jthil23/command-center

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prisma generate
      - run: npm test

  build-and-push:
    needs: [lint-and-typecheck, test]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest
            type=sha,prefix=

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Verify workflow syntax**

```bash
cat ".github/workflows/build-push.yml" | python3 -c "import yaml, sys; yaml.safe_load(sys.stdin.read()); print('Valid YAML')" 2>/dev/null || echo "Install yamllint or verify manually"
```

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions CI/CD pipeline for Docker Hub"
```

---

### Task 13: Final Integration Test & Push

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

Expected: All commits pushed. GitHub Actions triggers CI/CD pipeline.

- [ ] **Step 4: Verify CI/CD**

```bash
gh run list --limit 1
```

Expected: Workflow is running or completed successfully.
