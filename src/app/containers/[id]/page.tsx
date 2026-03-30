import { getContainer } from "@/lib/docker";
import { ContainerLogs } from "@/components/container-logs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServiceIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

export default async function ContainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const container = await getContainer(id);
  const icon = getServiceIcon(container.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/containers"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {icon && <Image src={icon} alt="" width={24} height={24} />}
        <h1 className="text-2xl font-bold">{container.name}</h1>
        <Badge
          variant="outline"
          className={
            container.state === "running"
              ? "bg-emerald-500/20 text-emerald-500"
              : "bg-red-500/20 text-red-500"
          }
        >
          {container.state}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Image</div>
          <div className="mt-1 text-sm font-medium">{container.image}</div>
        </Card>
        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Started</div>
          <div className="mt-1 text-sm font-medium">
            {new Date(container.startedAt).toLocaleString()}
          </div>
        </Card>
        <Card className="border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Ports</div>
          <div className="mt-1 text-sm font-medium">
            {container.ports.length > 0
              ? container.ports
                  .map((p) => `${p.host}:${p.container}/${p.protocol}`)
                  .join(", ")
              : "None"}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Logs</h2>
        <ContainerLogs containerId={id} />
      </div>
    </div>
  );
}
