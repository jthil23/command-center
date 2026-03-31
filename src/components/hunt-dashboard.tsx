"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Play, Loader2 } from "lucide-react";

interface HuntStatus {
  app: string;
  running: boolean;
  lastRun?: {
    startedAt: string;
    status: string;
    itemsSearched: number;
    message?: string | null;
  };
  rateLimit: { remaining: number; resetsAt: string };
  processedCount: number;
}

const REFRESH_INTERVAL = 15_000;

const STATUS_STYLES: Record<string, string> = {
  running: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  idle: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  paused: "bg-amber-500/20 text-amber-500 border-amber-500/30",
};

function getStatusLabel(status: HuntStatus): { label: string; key: string } {
  if (status.running) return { label: "Running", key: "running" };
  if (status.lastRun?.status === "paused") return { label: "Paused", key: "paused" };
  return { label: "Idle", key: "idle" };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HuntDashboard() {
  const [statuses, setStatuses] = useState<HuntStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [huntingApp, setHuntingApp] = useState<string | null>(null);
  const [runTypes, setRunTypes] = useState<Record<string, string>>({});

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/hunt");
      if (res.ok) {
        setStatuses(await res.json());
      }
    } catch {
      // retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  async function handleHunt(app: string) {
    setHuntingApp(app);
    try {
      await fetch("/api/hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, runType: runTypes[app] || "missing" }),
      });
      await fetchStatuses();
    } finally {
      setHuntingApp(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading hunt status...
      </div>
    );
  }

  if (statuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hunt-enabled apps configured.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {statuses.map((s) => {
        const icon = getServiceIcon(s.app);
        const { label, key } = getStatusLabel(s);
        const hourlyCap = s.rateLimit.remaining + (s.processedCount > 0 ? s.processedCount : 0);
        const ratioUsed = hourlyCap > 0 ? ((hourlyCap - s.rateLimit.remaining) / hourlyCap) * 100 : 0;

        return (
          <Card key={s.app} className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {icon ? (
                  <Image src={icon} alt="" width={20} height={20} />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                    {getServiceInitial(s.app)}
                  </div>
                )}
                <span className="capitalize">{s.app}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-auto text-[10px]",
                    STATUS_STYLES[key] ?? STATUS_STYLES.idle
                  )}
                >
                  {key === "running" && (
                    <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  )}
                  {label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Items processed */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Items processed</span>
                <span className="font-medium">{s.processedCount}</span>
              </div>

              {/* Rate limit */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Rate limit</span>
                  <span className="font-medium">
                    {s.rateLimit.remaining} / {hourlyCap} remaining
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      ratioUsed > 80 ? "bg-amber-500" : "bg-blue-500"
                    )}
                    style={{ width: `${ratioUsed}%` }}
                  />
                </div>
              </div>

              {/* Last run */}
              {s.lastRun && (
                <div className="space-y-0.5 border-t border-border/40 pt-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Last Run
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {formatTime(s.lastRun.startedAt)}
                    </span>
                    <span className="font-medium">
                      {s.lastRun.itemsSearched} searched
                    </span>
                  </div>
                  {s.lastRun.message && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {s.lastRun.message}
                    </p>
                  )}
                </div>
              )}

              {/* Hunt Now */}
              <div className="flex items-center gap-2 border-t border-border/40 pt-3">
                <Select
                  value={runTypes[s.app] || "missing"}
                  onValueChange={(val: string | null) =>
                    setRunTypes((prev) => ({ ...prev, [s.app]: val ?? "missing" }))
                  }
                >
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="missing">Missing</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={s.running || huntingApp !== null}
                  onClick={() => handleHunt(s.app)}
                >
                  {huntingApp === s.app ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Hunt Now
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
