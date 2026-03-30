import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

export interface ContainerDetail extends ContainerSummary {
  startedAt: string;
  ports: Array<{ host: number; container: number; protocol: string }>;
  env: string[];
  mounts: Array<{ source: string; destination: string }>;
}

export async function listContainers(): Promise<ContainerSummary[]> {
  const containers = await docker.listContainers({ all: true });
  return containers.map((c) => ({
    id: c.Id,
    name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
    image: c.Image,
    state: c.State,
    status: c.Status,
  }));
}

export async function getContainer(id: string): Promise<ContainerDetail> {
  const container = docker.getContainer(id);
  const info = await container.inspect();
  const ports = Object.entries(info.NetworkSettings.Ports ?? {}).flatMap(
    ([containerPort, bindings]) => {
      const [port, protocol] = containerPort.split("/");
      return (bindings ?? []).map((b) => ({
        host: parseInt(b.HostPort, 10),
        container: parseInt(port, 10),
        protocol: protocol ?? "tcp",
      }));
    }
  );

  return {
    id: info.Id,
    name: info.Name.replace(/^\//, ""),
    image: info.Config.Image,
    state: info.State.Status,
    status: info.State.Status,
    startedAt: info.State.StartedAt,
    ports,
    env: info.Config.Env ?? [],
    mounts: (info.Mounts ?? []).map((m) => ({
      source: m.Source ?? "",
      destination: m.Destination,
    })),
  };
}

export async function containerAction(
  id: string,
  action: "start" | "stop" | "restart"
): Promise<void> {
  const container = docker.getContainer(id);
  switch (action) {
    case "start":
      await container.start();
      break;
    case "stop":
      await container.stop();
      break;
    case "restart":
      await container.restart();
      break;
  }
}

export async function getContainerLogs(
  id: string,
  tail: number = 200
): Promise<string> {
  const container = docker.getContainer(id);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });
  // dockerode returns Buffer or stream; we request Buffer via follow:false (default)
  return logs.toString("utf-8");
}

export async function getContainerStats(): Promise<
  Map<string, { cpu: number; memory: { used: number; limit: number } }>
> {
  const containers = await docker.listContainers();
  const stats = new Map();

  await Promise.all(
    containers.map(async (c) => {
      try {
        const container = docker.getContainer(c.Id);
        const stat = await container.stats({ stream: false });
        const cpuDelta =
          stat.cpu_stats.cpu_usage.total_usage -
          stat.precpu_stats.cpu_usage.total_usage;
        const systemDelta =
          stat.cpu_stats.system_cpu_usage -
          stat.precpu_stats.system_cpu_usage;
        const cpuCount = stat.cpu_stats.online_cpus ?? 1;
        const cpuPercent =
          systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

        stats.set(c.Names[0]?.replace(/^\//, ""), {
          cpu: Math.round(cpuPercent * 100) / 100,
          memory: {
            used: stat.memory_stats.usage ?? 0,
            limit: stat.memory_stats.limit ?? 0,
          },
        });
      } catch {
        // Container may have stopped between list and stats
      }
    })
  );

  return stats;
}
