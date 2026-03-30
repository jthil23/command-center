"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Square,
  RotateCw,
  Search,
} from "lucide-react";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ContainerRow {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  cpu: number;
  memory: { used: number; limit: number };
}

interface ContainerTableProps {
  containers: ContainerRow[];
}

const STATE_BADGE: Record<string, string> = {
  running: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  exited: "bg-red-500/20 text-red-500 border-red-500/30",
  paused: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  restarting: "bg-amber-500/20 text-amber-500 border-amber-500/30",
};

function formatMemory(bytes: number): string {
  if (bytes === 0) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

async function doAction(id: string, action: string) {
  await fetch(`/api/containers/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  window.location.reload();
}

export function ContainerTable({ containers }: ContainerTableProps) {
  const [filter, setFilter] = useState("");

  const filtered = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.image.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter containers..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">CPU</TableHead>
            <TableHead className="text-right">Memory</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => {
            const icon = getServiceIcon(c.name);
            return (
              <TableRow key={c.id}>
                <TableCell>
                  {icon ? (
                    <Image src={icon} alt="" width={20} height={20} />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                      {getServiceInitial(c.name)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/containers/${c.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.image}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      STATE_BADGE[c.state] ?? STATE_BADGE.exited
                    )}
                  >
                    {c.state}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {c.cpu.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatMemory(c.memory.used)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {c.state !== "running" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => doAction(c.id, "start")}
                        title="Start"
                      >
                        <Play className="h-3.5 w-3.5 text-emerald-500" />
                      </Button>
                    )}
                    {c.state === "running" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => doAction(c.id, "stop")}
                        title="Stop"
                      >
                        <Square className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => doAction(c.id, "restart")}
                      title="Restart"
                    >
                      <RotateCw className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
