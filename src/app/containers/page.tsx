import { listContainers, getContainerStats } from "@/lib/docker";
import { ContainerTable } from "@/components/container-table";

export const dynamic = "force-dynamic";

export default async function ContainersPage() {
  const [containers, stats] = await Promise.all([
    listContainers(),
    getContainerStats(),
  ]);

  const enriched = containers.map((c) => {
    const s = stats.get(c.name);
    return {
      ...c,
      cpu: s?.cpu ?? 0,
      memory: s?.memory ?? { used: 0, limit: 0 },
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Containers</h1>
      <ContainerTable containers={enriched} />
    </div>
  );
}
