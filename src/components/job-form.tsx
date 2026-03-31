"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const JOB_TYPES = [
  { value: "hunt", label: "Hunt" },
  { value: "containerRestart", label: "Container Restart" },
  { value: "apiCall", label: "API Call" },
  { value: "shellCommand", label: "Shell Command" },
  { value: "maintenance", label: "Maintenance" },
] as const;

export interface JobFormData {
  id?: number;
  name: string;
  cronExpr: string;
  jobType: string;
  config: string;
  enabled: boolean;
}

interface JobFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: JobFormData | null;
  onSubmit: (data: JobFormData) => Promise<void>;
}

export function JobForm({ open, onOpenChange, initialData, onSubmit }: JobFormProps) {
  const [name, setName] = useState("");
  const [cronExpr, setCronExpr] = useState("");
  const [jobType, setJobType] = useState("hunt");
  const [config, setConfig] = useState("{}");
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setCronExpr(initialData.cronExpr);
      setJobType(initialData.jobType);
      setConfig(initialData.config);
      setEnabled(initialData.enabled);
      setError(null);
    } else if (open) {
      setName("");
      setCronExpr("");
      setJobType("hunt");
      setConfig("{}");
      setEnabled(true);
      setError(null);
    }
  }, [open, initialData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !cronExpr.trim() || !jobType) {
      setError("Name, cron expression, and job type are required.");
      return;
    }

    // Validate JSON config
    try {
      JSON.parse(config);
    } catch {
      setError("Config must be valid JSON.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        name: name.trim(),
        cronExpr: cronExpr.trim(),
        jobType,
        config,
        enabled,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Job" : "Add Job"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-name">Name</Label>
            <Input
              id="job-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My scheduled job"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-cron">Cron Expression</Label>
            <Input
              id="job-cron"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              placeholder="*/30 * * * *"
            />
            <p className="text-xs text-muted-foreground">
              Standard cron: minute hour day month weekday (e.g. &quot;0 */6 * * *&quot; = every 6 hours)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Job Type</Label>
            <Select
              value={jobType}
              onValueChange={(val: string | null) => setJobType(val ?? "hunt")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-config">Config (JSON)</Label>
            <textarea
              id="job-config"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              rows={4}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              placeholder='{"key": "value"}'
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              id="job-enabled"
            />
            <Label htmlFor="job-enabled">Enabled</Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
