# Phase 3: Storage, System, Automations, Logs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining Command Center pages: Storage (disk array), System (server management), Automations (triggers + scheduled jobs), and Logs (aggregated viewer).

**Architecture:** SSH-based system operations via `ssh2`, Node-RED/HA REST API clients, node-cron scheduler with MariaDB persistence, Docker log streaming.

**Tech Stack:** Next.js 15 (existing), ssh2, node-cron, Prisma (existing), shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-30-command-center-design.md` Sections 4.4-4.7

**IMPORTANT for all agents:**
- Prisma v7: import from `@/lib/db`, it's a lazy proxy
- npm installs require `--legacy-peer-deps`
- Read existing files before writing code that imports from them
- shadcn Select `onValueChange` passes `string | null` — handle with `(val: string | null) => ...`

---

## File Structure

```
src/
├── lib/
│   ├── system/
│   │   ├── ssh.ts              # SSH command execution via ssh2
│   │   └── unraid.ts           # Unraid-specific commands (disks, parity, shares, etc.)
│   ├── scheduler/
│   │   └── index.ts            # Cron job manager using node-cron + Prisma
│   └── automation/
│       ├── nodered.ts          # Node-RED API client
│       └── homeassistant.ts    # Home Assistant API client
├── app/
│   ├── storage/
│   │   └── page.tsx            # Storage page
│   ├── system/
│   │   └── page.tsx            # System page
│   ├── automations/
│   │   └── page.tsx            # Automations page
│   ├── logs/
│   │   └── page.tsx            # Logs page
│   └── api/
│       ├── storage/
│       │   └── route.ts        # GET disk array, POST parity check
│       ├── system/
│       │   ├── route.ts        # GET system info
│       │   └── action/route.ts # POST reboot/shutdown/script
│       ├── automations/
│       │   ├── triggers/route.ts    # GET/POST Node-RED + HA triggers
│       │   └── jobs/
│       │       ├── route.ts         # GET/POST scheduled jobs CRUD
│       │       └── [id]/route.ts    # PUT/DELETE specific job
│       └── logs/
│           └── route.ts        # GET aggregated container logs
├── components/
│   ├── disk-array.tsx          # Disk grid with temps/SMART
│   ├── storage-overview.tsx    # Array overview + parity status
│   ├── system-info.tsx         # Server info cards
│   ├── system-actions.tsx      # Reboot/shutdown/script buttons
│   ├── automation-triggers.tsx # Node-RED + HA trigger cards
│   ├── scheduled-jobs.tsx      # Cron job list + CRUD
│   ├── job-form.tsx            # Create/edit job dialog
│   └── log-viewer.tsx          # Multi-container log viewer
```

---

### Task 1: SSH & Unraid System Library

**Files:**
- Create: `src/lib/system/ssh.ts`
- Create: `src/lib/system/unraid.ts`

- [ ] **Step 1: Write SSH helper**

Create `src/lib/system/ssh.ts`:
```typescript
import { Client } from "ssh2";
import { getConfig } from "@/lib/config";
import { readFileSync } from "fs";

export async function execSSH(command: string): Promise<string> {
  const config = getConfig();
  const { host, user, keyPath } = config.ssh;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) { conn.end(); return reject(err); }
          let stdout = "";
          let stderr = "";
          stream
            .on("data", (data: Buffer) => { stdout += data.toString(); })
            .stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
          stream.on("close", () => {
            conn.end();
            if (stderr && !stdout) reject(new Error(stderr));
            else resolve(stdout.trim());
          });
        });
      })
      .on("error", reject)
      .connect({
        host,
        username: user,
        privateKey: readFileSync(keyPath),
      });
  });
}
```

- [ ] **Step 2: Write Unraid helper**

Create `src/lib/system/unraid.ts` with functions:
- `getSystemInfo()` — hostname, uptime, kernel, CPU model, RAM via uname/uptime/free commands
- `getDiskArray()` — parse `/proc/mdcmd` or `mdcmd status` for disk status, sizes, temps
- `getShareUsage()` — parse `df` output for share mounts
- `getParityStatus()` — check parity sync status
- `triggerParityCheck()` — run `mdcmd check`
- `rebootServer()` — run `reboot`
- `shutdownServer()` — run `poweroff`

Each function calls `execSSH()` with the appropriate command and parses the output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/system/
git commit -m "feat: add SSH and Unraid system library"
```

---

### Task 2: Scheduler Library

**Files:**
- Create: `src/lib/scheduler/index.ts`

- [ ] **Step 1: Write scheduler**

Create `src/lib/scheduler/index.ts`:
```typescript
import cron from "node-cron";
import { prisma } from "@/lib/db";

interface SchedulerJob {
  id: number;
  name: string;
  cronExpr: string;
  task: cron.ScheduledTask;
}

const activeJobs = new Map<number, SchedulerJob>();

type JobExecutor = (config: Record<string, unknown>) => Promise<string>;

const executors: Record<string, JobExecutor> = {};

export function registerExecutor(jobType: string, executor: JobExecutor) {
  executors[jobType] = executor;
}

async function executeJob(jobId: number, jobType: string, configJson: string) {
  const config = JSON.parse(configJson);
  const execution = await prisma.jobExecution.create({
    data: { jobId, status: "running" },
  });

  try {
    const executor = executors[jobType];
    if (!executor) throw new Error(`No executor for job type: ${jobType}`);
    const output = await executor(config);

    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: { status: "completed", output, endedAt: new Date() },
    });
  } catch (error) {
    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        endedAt: new Date(),
      },
    });
  }
}

export async function startScheduler() {
  const jobs = await prisma.scheduledJob.findMany({ where: { enabled: true } });

  for (const job of jobs) {
    scheduleJob(job.id, job.name, job.cronExpr, job.jobType, job.config);
  }
}

export function scheduleJob(
  id: number,
  name: string,
  cronExpr: string,
  jobType: string,
  configJson: string
) {
  // Stop existing if rescheduling
  stopJob(id);

  if (!cron.validate(cronExpr)) {
    throw new Error(`Invalid cron expression: ${cronExpr}`);
  }

  const task = cron.schedule(cronExpr, () => {
    executeJob(id, jobType, configJson);
  });

  activeJobs.set(id, { id, name, cronExpr, task });
}

export function stopJob(id: number) {
  const existing = activeJobs.get(id);
  if (existing) {
    existing.task.stop();
    activeJobs.delete(id);
  }
}

export function getActiveJobIds(): number[] {
  return Array.from(activeJobs.keys());
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scheduler/
git commit -m "feat: add cron scheduler with Prisma persistence"
```

---

### Task 3: Node-RED & Home Assistant API Clients

**Files:**
- Create: `src/lib/automation/nodered.ts`
- Create: `src/lib/automation/homeassistant.ts`

- [ ] **Step 1: Write Node-RED client**

Create `src/lib/automation/nodered.ts`:
- `getFlows()` — GET /flows, return list of flows with id, label, disabled status
- `triggerFlow(flowId)` — POST to the flow's HTTP inject endpoint
- `getFlowStatus(flowId)` — GET flow status

- [ ] **Step 2: Write Home Assistant client**

Create `src/lib/automation/homeassistant.ts`:
- `getAutomations()` — GET /api/states, filter for automation entities
- `triggerAutomation(entityId)` — POST /api/services/automation/trigger
- `getEntityState(entityId)` — GET /api/states/{entityId}

Both use the config's service URL and token (HA uses Bearer token, Node-RED uses no auth for local).

- [ ] **Step 3: Commit**

```bash
git add src/lib/automation/
git commit -m "feat: add Node-RED and Home Assistant API clients"
```

---

### Task 4: Storage Page

**Files:**
- Create: `src/app/api/storage/route.ts`
- Create: `src/components/storage-overview.tsx`
- Create: `src/components/disk-array.tsx`
- Modify: `src/app/storage/page.tsx`

- [ ] **Step 1: Storage API route**

GET returns disk array info (calls Unraid helpers). POST triggers parity check.

- [ ] **Step 2: Storage overview component**

Shows total capacity, used/free, parity status, cache pool status.

- [ ] **Step 3: Disk array component**

Grid of disks with size, used, temperature (color coded), SMART status, spin state.

- [ ] **Step 4: Assemble storage page**

Server Component that fetches data and renders overview + disk grid.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: build storage page with disk array and parity status"
```

---

### Task 5: System Page

**Files:**
- Create: `src/app/api/system/route.ts`
- Create: `src/app/api/system/action/route.ts`
- Create: `src/components/system-info.tsx`
- Create: `src/components/system-actions.tsx`
- Modify: `src/app/system/page.tsx`

- [ ] **Step 1: System API routes**

GET returns system info (hostname, uptime, CPU, RAM, network). POST action route for reboot/shutdown with confirmation.

- [ ] **Step 2: System info component**

Cards showing server details: hostname, OS, uptime, CPU model, RAM, network interfaces.

- [ ] **Step 3: System actions component**

Buttons for reboot/shutdown (with confirmation dialogs using shadcn Dialog), maintenance script runner.

- [ ] **Step 4: Assemble system page**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: build system page with server info and management actions"
```

---

### Task 6: Automations Page

**Files:**
- Create: `src/app/api/automations/triggers/route.ts`
- Create: `src/app/api/automations/jobs/route.ts`
- Create: `src/app/api/automations/jobs/[id]/route.ts`
- Create: `src/components/automation-triggers.tsx`
- Create: `src/components/scheduled-jobs.tsx`
- Create: `src/components/job-form.tsx`
- Modify: `src/app/automations/page.tsx`

- [ ] **Step 1: Trigger API route**

GET lists available Node-RED flows + HA automations. POST fires a specific trigger.

- [ ] **Step 2: Jobs CRUD API routes**

GET lists all scheduled jobs with last execution. POST creates new job. PUT updates job. DELETE removes job.

- [ ] **Step 3: Automation triggers component**

Cards for Node-RED flows and HA automations with "Fire" buttons and execution history.

- [ ] **Step 4: Scheduled jobs component**

Table of cron jobs with name, schedule (human-readable), type, enabled toggle, last run status, next run time. "Add Job" button opens dialog.

- [ ] **Step 5: Job form component**

Dialog/form for creating/editing a job: name, cron expression (with human-readable builder), job type (hunt, container restart, API call, shell command, maintenance), type-specific config fields, enabled toggle.

- [ ] **Step 6: Assemble automations page**

Tabbed layout: Triggers tab + Scheduled Jobs tab.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: build automations page with triggers and scheduled jobs"
```

---

### Task 7: Logs Page

**Files:**
- Create: `src/app/api/logs/route.ts`
- Create: `src/components/log-viewer.tsx`
- Modify: `src/app/logs/page.tsx`

- [ ] **Step 1: Logs API route**

GET returns logs for selected containers. Accepts ?containers=name1,name2&tail=500&search=term. Uses getContainerLogs from docker.ts.

- [ ] **Step 2: Log viewer component**

Client component with:
- Multi-select dropdown for containers (populated from container list)
- Search input for filtering
- Auto-refresh toggle (10s interval)
- Monospace log output with line highlighting
- Download button
- Clear button

- [ ] **Step 3: Assemble logs page**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: build logs page with multi-container aggregated viewer"
```

---

### Task 8: Final Build & Push

- [ ] **Step 1: Run all tests**
- [ ] **Step 2: Run full build**
- [ ] **Step 3: Commit any fixes**
- [ ] **Step 4: Push to GitHub**
