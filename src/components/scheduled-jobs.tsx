"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { JobForm, type JobFormData } from "@/components/job-form";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface LastExecution {
  id: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  error: string | null;
}

interface ScheduledJob {
  id: number;
  name: string;
  cronExpr: string;
  jobType: string;
  config: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecution: LastExecution | null;
}

const CRON_DESCRIPTIONS: Record<string, string> = {
  "* * * * *": "Every minute",
  "*/5 * * * *": "Every 5 minutes",
  "*/10 * * * *": "Every 10 minutes",
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *": "Every hour",
  "0 */2 * * *": "Every 2 hours",
  "0 */4 * * *": "Every 4 hours",
  "0 */6 * * *": "Every 6 hours",
  "0 */12 * * *": "Every 12 hours",
  "0 0 * * *": "Daily at midnight",
  "0 0 * * 0": "Weekly on Sunday",
  "0 0 1 * *": "Monthly on the 1st",
};

function describeCron(expr: string): string {
  return CRON_DESCRIPTIONS[expr] ?? expr;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "running":
      return "secondary" as const;
    case "error":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function ScheduledJobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobFormData | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/automations/jobs");
      const data: ScheduledJob[] = await res.json();
      setJobs(data);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleSubmit(data: JobFormData) {
    const isEdit = !!data.id;
    const url = isEdit
      ? `/api/automations/jobs/${data.id}`
      : "/api/automations/jobs";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        cronExpr: data.cronExpr,
        jobType: data.jobType,
        config: data.config,
        enabled: data.enabled,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error ?? "Request failed");
    }

    await fetchJobs();
  }

  async function handleToggle(job: ScheduledJob) {
    setTogglingIds((prev) => new Set(prev).add(job.id));
    try {
      await fetch(`/api/automations/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !job.enabled }),
      });
      await fetchJobs();
    } catch {
      // ignore
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/automations/jobs/${id}`, { method: "DELETE" });
      await fetchJobs();
    } catch {
      // ignore
    }
  }

  function openCreate() {
    setEditingJob(null);
    setFormOpen(true);
  }

  function openEdit(job: ScheduledJob) {
    setEditingJob({
      id: job.id,
      name: job.name,
      cronExpr: job.cronExpr,
      jobType: job.jobType,
      config: job.config,
      enabled: job.enabled,
    });
    setFormOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Scheduled Jobs</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No scheduled jobs yet. Click &quot;Add Job&quot; to create one.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground" title={job.cronExpr}>
                      {describeCron(job.cronExpr)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.jobType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={job.enabled}
                      onCheckedChange={() => handleToggle(job)}
                      disabled={togglingIds.has(job.id)}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    {job.lastExecution ? (
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={statusBadgeVariant(job.lastExecution.status)}>
                          {job.lastExecution.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(job.lastExecution.startedAt).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(job)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(job.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <JobForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingJob}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
