import { listContainers } from "@/lib/docker";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { ContainerGrid } from "@/components/container-grid";
import { ActivityFeed } from "@/components/activity-feed";
import type { SystemStats, ActivityEntry } from "@/types";

export const dynamic = "force-dynamic";

async function fetchPrometheusMetric(
  baseUrl: string,
  query: string
): Promise<number> {
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/query?query=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    const value = data?.data?.result?.[0]?.value?.[1];
    return value ? parseFloat(value) : 0;
  } catch {
    return 0;
  }
}

async function getStats(
  containerCount: number,
  runningCount: number
): Promise<SystemStats> {
  const stats: SystemStats = {
    cpu: { percent: 0, cores: 24, model: "AMD Ryzen 9 3900X" },
    memory: { used: 0, total: 64 * 1024 * 1024 * 1024, percent: 0 },
    storage: { used: 0, total: 70 * 1024 * 1024 * 1024 * 1024, percent: 0 },
    containers: {
      total: containerCount,
      running: runningCount,
      stopped: containerCount - runningCount,
    },
  };

  try {
    const config = getConfig();
    const promUrl = config.services.prometheus?.url;
    if (promUrl) {
      const [cpuPercent, memUsed, memTotal] = await Promise.all([
        fetchPrometheusMetric(
          promUrl,
          '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
        ),
        fetchPrometheusMetric(
          promUrl,
          "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes"
        ),
        fetchPrometheusMetric(promUrl, "node_memory_MemTotal_bytes"),
      ]);

      stats.cpu.percent = Math.round(cpuPercent * 10) / 10;
      stats.memory.used = memUsed;
      stats.memory.total = memTotal || stats.memory.total;
      stats.memory.percent =
        memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0;
    }
  } catch {
    // Prometheus not available — stats stay at defaults
  }

  return stats;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 2 ? 1 : 0)} ${units[i]}`;
}

export default async function DashboardPage() {
  const [containers, recentActivity] = await Promise.all([
    listContainers(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const running = containers.filter((c) => c.state === "running").length;
  const stats = await getStats(containers.length, running);

  const activity: ActivityEntry[] = recentActivity.map((a) => ({
    id: a.id,
    source: a.source,
    type: a.type,
    message: a.message,
    metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
    createdAt: a.createdAt,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Containers"
          value={String(stats.containers.total)}
          subtitle={`${stats.containers.running} running · ${stats.containers.stopped} stopped`}
          color="green"
        />
        <StatCard
          title="CPU Usage"
          value={`${stats.cpu.percent}%`}
          subtitle={`${stats.cpu.model} · ${stats.cpu.cores} threads`}
          color="blue"
        />
        <StatCard
          title="Memory"
          value={formatBytes(stats.memory.used)}
          subtitle={`of ${formatBytes(stats.memory.total)} · ${stats.memory.percent}% used`}
          color="purple"
        />
        <StatCard
          title="Storage"
          value={formatBytes(stats.storage.used)}
          subtitle={`of ${formatBytes(stats.storage.total)} · ${stats.storage.percent}% used`}
          color="yellow"
        />
      </div>

      {/* Container Grid + Activity Feed */}
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <ContainerGrid containers={containers} />
        <ActivityFeed entries={activity} />
      </div>
    </div>
  );
}
