"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DiskInfo } from "@/lib/system/unraid";
import { HardDrive, Thermometer } from "lucide-react";

interface DiskArrayProps {
  disks: DiskInfo[];
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

function getTempColor(temp: string): string {
  const num = parseInt(temp, 10);
  if (isNaN(num)) return "text-muted-foreground";
  if (num < 40) return "text-emerald-500";
  if (num <= 50) return "text-amber-500";
  return "text-red-500";
}

function getTempBg(temp: string): string {
  const num = parseInt(temp, 10);
  if (isNaN(num)) return "bg-muted";
  if (num < 40) return "bg-emerald-500/10";
  if (num <= 50) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function getUsagePercent(used: string, size: string): number {
  const usedBytes = parseSize(used);
  const totalBytes = parseSize(size);
  if (totalBytes === 0) return 0;
  return (usedBytes / totalBytes) * 100;
}

function getUsageColor(percent: number): string {
  if (percent < 70) return "bg-emerald-500";
  if (percent < 90) return "bg-amber-500";
  return "bg-red-500";
}

export function DiskArray({ disks }: DiskArrayProps) {
  if (disks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No disks detected. Ensure the server is reachable via SSH.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Disk Array</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {disks.map((disk) => {
          const usagePercent = getUsagePercent(disk.used, disk.size);
          return (
            <Card key={disk.name} className="border-border/40 bg-card/50">
              <CardContent className="space-y-3 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{disk.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={disk.type === "cache" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {disk.type === "cache" ? "Cache" : "Data"}
                    </Badge>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        disk.status === "active" ? "bg-emerald-500" : "bg-gray-500"
                      }`}
                      title={disk.status}
                    />
                  </div>
                </div>

                {/* Size info */}
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Size</span>
                    <div className="font-medium">{disk.size}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Used</span>
                    <div className="font-medium">{disk.used}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Free</span>
                    <div className="font-medium">{disk.free}</div>
                  </div>
                </div>

                {/* Usage bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Usage</span>
                    <span>{usagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${getUsageColor(usagePercent)}`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Temperature */}
                <div
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${getTempBg(disk.temp)}`}
                >
                  <Thermometer className={`h-3.5 w-3.5 ${getTempColor(disk.temp)}`} />
                  <span className={getTempColor(disk.temp)}>
                    {disk.temp === "N/A" ? "Temp N/A" : disk.temp}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
