"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DiskInfo, ParityStatus } from "@/lib/system/unraid";
import {
  HardDrive,
  ShieldCheck,
  Zap,
  Loader2,
} from "lucide-react";

interface StorageOverviewProps {
  disks: DiskInfo[];
  parity: ParityStatus;
  error?: string;
}

function parseSize(s: string): number {
  const match = s.match(/^([\d.]+)([KMGTP]?)i?$/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = (match[2] || "").toUpperCase();
  const multipliers: Record<string, number> = {
    "": 1,
    K: 1024,
    M: 1024 ** 2,
    G: 1024 ** 3,
    T: 1024 ** 4,
    P: 1024 ** 5,
  };
  return val * (multipliers[unit] ?? 1);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export function StorageOverview({ disks, parity, error }: StorageOverviewProps) {
  const [parityLoading, setParityLoading] = useState(false);
  const [parityError, setParityError] = useState<string | null>(null);

  const dataDisks = disks.filter((d) => d.type === "data");
  const cacheDisks = disks.filter((d) => d.type === "cache");

  const totalBytes = dataDisks.reduce((sum, d) => sum + parseSize(d.size), 0);
  const usedBytes = dataDisks.reduce((sum, d) => sum + parseSize(d.used), 0);
  const freeBytes = dataDisks.reduce((sum, d) => sum + parseSize(d.free), 0);
  const usagePercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

  const cacheTotalBytes = cacheDisks.reduce((sum, d) => sum + parseSize(d.size), 0);
  const cacheUsedBytes = cacheDisks.reduce((sum, d) => sum + parseSize(d.used), 0);
  const cacheUsagePercent = cacheTotalBytes > 0 ? (cacheUsedBytes / cacheTotalBytes) * 100 : 0;

  async function handleParityCheck() {
    setParityLoading(true);
    setParityError(null);
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parityCheck" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setParityError(data.error ?? "Failed to start parity check");
      }
    } catch {
      setParityError("Network error");
    }
    setParityLoading(false);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Capacity stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Array Capacity
          </div>
          <div className="my-1 text-3xl font-bold text-blue-500">
            {formatBytes(totalBytes)}
          </div>
          <div className="text-xs text-muted-foreground">
            {dataDisks.length} data disk{dataDisks.length !== 1 ? "s" : ""}
          </div>
        </Card>

        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Used
          </div>
          <div className="my-1 text-3xl font-bold text-amber-500">
            {formatBytes(usedBytes)}
          </div>
          <div className="text-xs text-muted-foreground">
            {usagePercent.toFixed(1)}% of array
          </div>
        </Card>

        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Free
          </div>
          <div className="my-1 text-3xl font-bold text-emerald-500">
            {formatBytes(freeBytes)}
          </div>
          <div className="text-xs text-muted-foreground">
            {(100 - usagePercent).toFixed(1)}% available
          </div>
        </Card>

        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Array Usage
          </div>
          <div className="my-1 text-3xl font-bold text-violet-500">
            {usagePercent.toFixed(1)}%
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Parity + Cache cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Parity Status */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Parity Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={parity.running ? "default" : "secondary"}>
                {parity.running ? "Running" : "Idle"}
              </Badge>
              {parity.running && (
                <span className="text-sm text-muted-foreground">
                  {parity.progress} at {parity.speed}
                </span>
              )}
            </div>

            {parity.running && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: parity.progress }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Errors: </span>
                <span className={parity.errors !== "0" ? "text-destructive font-medium" : ""}>
                  {parity.errors}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Speed: </span>
                <span>{parity.speed}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleParityCheck}
              disabled={parityLoading || parity.running}
            >
              {parityLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="mr-2 h-4 w-4" />
              )}
              Run Parity Check
            </Button>

            {parityError && (
              <p className="text-xs text-destructive">{parityError}</p>
            )}
          </CardContent>
        </Card>

        {/* Cache Pool */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Cache Pool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cacheDisks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cache disks detected</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {cacheDisks.length} device{cacheDisks.length !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-sm text-muted-foreground">NVMe/SSD</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span>{formatBytes(cacheTotalBytes)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Used: </span>
                    <span>{formatBytes(cacheUsedBytes)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Usage</span>
                    <span>{cacheUsagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min(cacheUsagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
