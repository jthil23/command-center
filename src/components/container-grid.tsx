"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { Card } from "@/components/ui/card";

interface ContainerGridItem {
  id: string;
  name: string;
  state: string;
}

interface ContainerGridProps {
  containers: ContainerGridItem[];
}

const STATE_STYLES: Record<string, string> = {
  running: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  exited: "border-red-500/30 bg-red-500/10 text-red-500",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  restarting: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  dead: "border-red-500/30 bg-red-500/10 text-red-500",
  created: "border-zinc-500/30 bg-zinc-500/10 text-zinc-500",
};

export function ContainerGrid({ containers }: ContainerGridProps) {
  const running = containers.filter((c) => c.state === "running").length;
  const degraded = containers.filter((c) =>
    ["paused", "restarting"].includes(c.state)
  ).length;
  const down = containers.filter((c) =>
    ["exited", "dead"].includes(c.state)
  ).length;

  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="mb-3 text-sm font-semibold">Container Health</div>
      <div className="grid grid-cols-7 gap-1.5">
        {containers.map((c) => {
          const icon = getServiceIcon(c.name);
          return (
            <Link
              key={c.id}
              href={`/containers/${c.id}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border text-[9px] font-medium transition-colors hover:opacity-80",
                STATE_STYLES[c.state] ?? STATE_STYLES.created
              )}
              title={`${c.name} (${c.state})`}
            >
              {icon ? (
                <Image
                  src={icon}
                  alt={c.name}
                  width={20}
                  height={20}
                  className="opacity-80"
                />
              ) : (
                getServiceInitial(c.name)
              )}
            </Link>
          );
        })}
      </div>
      <div className="mt-2.5 flex gap-3 text-[11px] text-muted-foreground">
        <span className="text-emerald-500">● {running} healthy</span>
        {degraded > 0 && (
          <span className="text-amber-500">● {degraded} degraded</span>
        )}
        {down > 0 && <span className="text-red-500">● {down} down</span>}
      </div>
    </Card>
  );
}
