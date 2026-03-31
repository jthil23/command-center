import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scheduleJob } from "@/lib/scheduler";
import cron from "node-cron";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await prisma.scheduledJob.findMany({
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = jobs.map((job) => {
      const lastExecution = job.executions[0] ?? null;
      return {
        id: job.id,
        name: job.name,
        cronExpr: job.cronExpr,
        jobType: job.jobType,
        config: job.config,
        enabled: job.enabled,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        lastExecution: lastExecution
          ? {
              id: lastExecution.id,
              status: lastExecution.status,
              startedAt: lastExecution.startedAt,
              endedAt: lastExecution.endedAt,
              error: lastExecution.error,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, cronExpr, jobType, config, enabled } = body as {
      name: string;
      cronExpr: string;
      jobType: string;
      config: string;
      enabled?: boolean;
    };

    if (!name || !cronExpr || !jobType) {
      return NextResponse.json(
        { error: "name, cronExpr, and jobType are required" },
        { status: 400 }
      );
    }

    if (!cron.validate(cronExpr)) {
      return NextResponse.json(
        { error: `Invalid cron expression: ${cronExpr}` },
        { status: 400 }
      );
    }

    const job = await prisma.scheduledJob.create({
      data: {
        name,
        cronExpr,
        jobType,
        config: config ?? "{}",
        enabled: enabled ?? true,
      },
    });

    if (job.enabled) {
      scheduleJob(job.id, job.name, job.cronExpr, job.jobType, job.config);
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create job" },
      { status: 500 }
    );
  }
}
