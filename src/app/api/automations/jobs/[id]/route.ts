import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scheduleJob, stopJob } from "@/lib/scheduler";
import cron from "node-cron";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, cronExpr, jobType, config, enabled } = body as {
      name?: string;
      cronExpr?: string;
      jobType?: string;
      config?: string;
      enabled?: boolean;
    };

    if (cronExpr && !cron.validate(cronExpr)) {
      return NextResponse.json(
        { error: `Invalid cron expression: ${cronExpr}` },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (cronExpr !== undefined) data.cronExpr = cronExpr;
    if (jobType !== undefined) data.jobType = jobType;
    if (config !== undefined) data.config = config;
    if (enabled !== undefined) data.enabled = enabled;

    const job = await prisma.scheduledJob.update({
      where: { id },
      data,
    });

    // Re-schedule or stop based on enabled state
    if (job.enabled) {
      scheduleJob(job.id, job.name, job.cronExpr, job.jobType, job.config);
    } else {
      stopJob(job.id);
    }

    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    stopJob(id);

    await prisma.scheduledJob.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete job" },
      { status: 500 }
    );
  }
}
