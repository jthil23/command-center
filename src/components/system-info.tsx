"use client";

import { Card } from "@/components/ui/card";
import type { SystemInfo as SystemInfoType, NetworkInterface } from "@/lib/system/unraid";

interface SystemInfoProps {
  system: SystemInfoType;
  network: NetworkInterface[];
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function parseRamPercent(used: string, total: string): string {
  const parseGi = (v: string) => {
    const num = parseFloat(v);
    if (v.includes("Gi")) return num;
    if (v.includes("Mi")) return num / 1024;
    return num;
  };
  const u = parseGi(used);
  const t = parseGi(total);
  if (!t || isNaN(u) || isNaN(t)) return "N/A";
  return `${Math.round((u / t) * 100)}%`;
}

export function SystemInfo({ system, network }: SystemInfoProps) {
  const ramPercent = parseRamPercent(system.usedRam, system.totalRam);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Server Card */}
      <Card className="border-border/40 bg-card/50 p-4">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Server
        </div>
        <div className="divide-y divide-border/40">
          <InfoRow label="Hostname" value={system.hostname} />
          <InfoRow label="OS" value="Unraid" />
          <InfoRow label="Uptime" value={system.uptime} />
          <InfoRow label="Kernel" value={system.kernel} />
        </div>
      </Card>

      {/* CPU Card */}
      <Card className="border-border/40 bg-card/50 p-4">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          CPU
        </div>
        <div className="divide-y divide-border/40">
          <InfoRow label="Model" value={system.cpuModel} />
        </div>
      </Card>

      {/* Memory Card */}
      <Card className="border-border/40 bg-card/50 p-4">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Memory
        </div>
        <div className="divide-y divide-border/40">
          <InfoRow label="Total" value={system.totalRam} />
          <InfoRow label="Used" value={system.usedRam} />
          <InfoRow label="Usage" value={ramPercent} />
        </div>
      </Card>

      {/* Network Card */}
      <Card className="border-border/40 bg-card/50 p-4">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Network
        </div>
        {network.length === 0 ? (
          <p className="text-xs text-muted-foreground">No interfaces found</p>
        ) : (
          <div className="space-y-3">
            {network.map((iface) => (
              <div key={iface.interface} className="divide-y divide-border/40">
                <div className="pb-1 text-xs font-semibold">{iface.interface}</div>
                <InfoRow label="IP" value={iface.ip} />
                <InfoRow label="MAC" value={iface.mac} />
                <InfoRow label="Speed" value={iface.speed} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
