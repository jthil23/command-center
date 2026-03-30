import { NextResponse } from "next/server";
import { listContainers } from "@/lib/docker";
import { getConfig } from "@/lib/config";
import type { SystemStats } from "@/types";

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

export async function GET() {
  try {
    const containers = await listContainers();
    const running = containers.filter((c) => c.state === "running").length;
    const stopped = containers.length - running;

    let stats: SystemStats = {
      cpu: { percent: 0, cores: 24, model: "AMD Ryzen 9 3900X" },
      memory: { used: 0, total: 64 * 1024 * 1024 * 1024, percent: 0 },
      storage: { used: 0, total: 70 * 1024 * 1024 * 1024 * 1024, percent: 0 },
      containers: { total: containers.length, running, stopped },
    };

    // Try fetching from Prometheus if configured
    try {
      const config = getConfig();
      const promUrl = config.services.prometheus?.url;
      if (promUrl) {
        const [cpuPercent, memUsed, memTotal] = await Promise.all([
          fetchPrometheusMetric(
            promUrl,
            '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
          ),
          fetchPrometheusMetric(promUrl, "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes"),
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

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
