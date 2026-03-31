import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/db";

interface ActiveJob {
  id: number;
  name: string;
  cronExpr: string;
  task: ScheduledTask;
}

const activeJobs = new Map<number, ActiveJob>();

type JobExecutor = (config: Record<string, unknown>) => Promise<string>;

const executors: Record<string, JobExecutor> = {};

export function registerExecutor(jobType: string, executor: JobExecutor) {
  executors[jobType] = executor;
}

async function executeJob(jobId: number, jobType: string, configJson: string) {
  const config = JSON.parse(configJson) as Record<string, unknown>;
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
