"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface HuntRun {
  id: number;
  app: string;
  runType: string;
  itemsFound: number;
  itemsSearched: number;
  errors: number;
  duration: number;
  status: string;
  message: string | null;
  startedAt: string;
  completedAt: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  error: "bg-red-500/20 text-red-500 border-red-500/30",
  paused: "bg-amber-500/20 text-amber-500 border-amber-500/30",
};

const RUN_TYPE_BADGE: Record<string, string> = {
  missing: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  upgrade: "bg-violet-500/20 text-violet-500 border-violet-500/30",
};

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ALL_APPS = "__all__";

export function HuntHistory() {
  const [runs, setRuns] = useState<HuntRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [appFilter, setAppFilter] = useState(ALL_APPS);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (appFilter !== ALL_APPS) params.set("app", appFilter);
      const res = await fetch(`/api/hunt/history?${params.toString()}`);
      if (res.ok) {
        setRuns(await res.json());
      }
    } catch {
      // retry on next manual refresh
    } finally {
      setLoading(false);
    }
  }, [appFilter]);

  useEffect(() => {
    setLoading(true);
    fetchHistory();
  }, [fetchHistory]);

  const uniqueApps = [...new Set(runs.map((r) => r.app))];

  return (
    <Card className="border-border/40 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Hunt History</span>
          <Select value={appFilter} onValueChange={(val: string | null) => setAppFilter(val ?? "")}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_APPS}>All Apps</SelectItem>
              {uniqueApps.map((app) => (
                <SelectItem key={app} value={app}>
                  <span className="capitalize">{app}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history...
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hunt runs recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Found</TableHead>
                <TableHead className="text-right">Searched</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const icon = getServiceIcon(run.app);
                return (
                  <TableRow key={run.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(run.startedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {icon ? (
                          <Image src={icon} alt="" width={16} height={16} />
                        ) : (
                          <div className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[8px] font-bold">
                            {getServiceInitial(run.app)}
                          </div>
                        )}
                        <span className="text-xs capitalize">{run.app}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          RUN_TYPE_BADGE[run.runType] ?? RUN_TYPE_BADGE.missing
                        )}
                      >
                        {run.runType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {run.itemsFound}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {run.itemsSearched}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm",
                        run.errors > 0 && "text-red-500 font-medium"
                      )}
                    >
                      {run.errors}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDuration(run.duration)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          STATUS_BADGE[run.status] ?? STATUS_BADGE.completed
                        )}
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
